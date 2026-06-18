import { prisma } from "@/lib/prisma";
import { FileExplorer, type DossierNode } from "@/components/documents/file-explorer";

function buildTree(
  nodes: { id: string; nom: string; systeme: boolean; parentId: string | null; ordre: number }[],
  parentId: string | null = null,
): DossierNode[] {
  return nodes
    .filter((n) => n.parentId === parentId)
    .sort((a, b) => a.ordre - b.ordre)
    .map((n) => ({
      ...n,
      enfants: buildTree(nodes, n.id),
    }));
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ dossier?: string }>;
}) {
  const { dossier: selectedDossierId } = await searchParams;

  const [dossierRows, documentRows] = await Promise.all([
    prisma.dossier.findMany({
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
      select: { id: true, nom: true, systeme: true, parentId: true, ordre: true },
    }),
    prisma.document.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, nom: true, type: true, chemin: true, taille: true,
        description: true, dossierId: true, createdAt: true,
      },
    }),
  ]);

  const tree = buildTree(dossierRows);
  const allDossiers = dossierRows.map((d) => ({ id: d.id, nom: d.nom, parentId: d.parentId }));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-brand-navy">Documents</h2>
        <p className="mt-1 text-sm text-slate-500">
          {documentRows.length} fichier{documentRows.length !== 1 ? "s" : ""} · Arborescence SAS SDA Rénovation
        </p>
      </div>

      <FileExplorer
        dossiers={tree}
        documents={documentRows}
        allDossiers={allDossiers}
        selectedDossierId={selectedDossierId ?? null}
      />
    </div>
  );
}
