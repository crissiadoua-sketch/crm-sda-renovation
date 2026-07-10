export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DepenseForm } from "@/components/depenses/depense-form";
import { updateDepense, deleteDepense } from "@/lib/actions/depenses";
import { formatEuros } from "@/lib/format";

const CAT_LABELS: Record<string, string> = {
  MATERIAUX: "Matériaux & fournitures",
  MAIN_OEUVRE: "Main-d'œuvre externe",
  SOUS_TRAITANCE: "Sous-traitance",
  TRANSPORT: "Transport / carburant",
  ADMINISTRATIF: "Administratif",
  LOYER: "Loyer & charges locatives",
  ASSURANCE: "Assurances",
  AMORTISSEMENT: "Amortissements",
  INVESTISSEMENT: "Investissements",
  IMPOT_TAXE: "Impôts & taxes",
  AUTRE: "Autre / Divers",
};

export default async function DepenseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [depense, chantiers, fournisseurs] = await Promise.all([
    prisma.depense.findUnique({
      where: { id },
      include: {
        chantier: { select: { id: true, nom: true, reference: true } },
        fournisseur: { select: { id: true, nom: true } },
      },
    }),
    prisma.chantier.findMany({
      select: { id: true, nom: true, reference: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fournisseur.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  if (!depense) notFound();

  const updateAction = updateDepense.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/depenses" className="text-sm text-brand-blue hover:underline">
            ← Retour aux dépenses
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">{depense.libelle}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {new Date(depense.date).toLocaleDateString("fr-FR")} ·{" "}
            {CAT_LABELS[depense.categorie] ?? depense.categorie}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-red-600">{formatEuros(depense.montant)}</p>
          {depense.chantier && (
            <Link href={`/chantiers/${depense.chantier.id}`} className="text-xs text-brand-blue hover:underline">
              Chantier : {depense.chantier.nom}
            </Link>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-brand-navy">Modifier</h3>
        <DepenseForm
          action={updateAction}
          chantiers={chantiers}
          fournisseurs={fournisseurs}
          submitLabel="Mettre à jour"
          defaultValues={{
            libelle: depense.libelle,
            montant: depense.montant,
            date: new Date(depense.date).toISOString().slice(0, 10),
            categorie: depense.categorie,
            chantierId: depense.chantierId,
            fournisseurId: depense.fournisseurId,
            notes: depense.notes,
            factureUrl: depense.factureUrl,
            factureNom: depense.factureNom,
          }}
        />
      </div>

      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
        <p className="mb-2 text-sm font-semibold text-red-700">Zone dangereuse</p>
        <p className="mb-3 text-xs text-red-600">La suppression est irréversible.</p>
        <form action={deleteDepense.bind(null, id)}>
          <button
            type="submit"
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
          >
            Supprimer cette dépense
          </button>
        </form>
      </div>
    </div>
  );
}
