import Link from "next/link";
import { notFound } from "next/navigation";
import { FileSpreadsheet, FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getOrCreateMetre, saveMetre, envoyerLignesVersDevis } from "@/lib/actions/metre";
import MetreCanvas from "@/components/metre/metre-canvas";
import type { UniteAffichage } from "@/lib/metre-units";

export default async function ChantierMetrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [chantier, devis] = await Promise.all([
    prisma.chantier.findUnique({ where: { id }, select: { id: true, nom: true, reference: true } }),
    prisma.devis.findMany({
      where: { chantierId: id, statut: { not: "REFUSE" } },
      select: { id: true, numero: true },
      orderBy: { dateCreation: "desc" },
    }),
  ]);
  if (!chantier) notFound();

  const metre = await getOrCreateMetre(id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/chantiers/${chantier.id}`} className="text-sm text-brand-blue hover:underline">
            ← Retour au chantier
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">Métré — {chantier.nom}</h2>
          <p className="mt-1 text-sm text-slate-500">{chantier.reference}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/metre/export-excel?chantierId=${chantier.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Excel
          </a>
          <a
            href={`/apercu/metre/${chantier.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-red-500" />
            PDF
          </a>
        </div>
      </div>

      <MetreCanvas
        chantierId={chantier.id}
        metreId={metre.id}
        initialFichierUrl={metre.fichierUrl}
        initialFichierNom={metre.fichierNom}
        initialUniteAffichage={metre.uniteAffichage as UniteAffichage}
        initialDonneesCanvas={metre.donneesCanvas}
        initialLignes={metre.lignes.map((l) => ({
          id: l.id,
          designation: l.designation,
          type: l.type as "LONGUEUR" | "SURFACE" | "QUANTITE",
          valeurMm: l.valeurMm,
          uniteCible: l.uniteCible as "ml" | "m2" | "u",
        }))}
        devisOptions={devis}
        saveAction={saveMetre.bind(null, metre.id, chantier.id)}
        envoyerAction={envoyerLignesVersDevis}
      />
    </div>
  );
}
