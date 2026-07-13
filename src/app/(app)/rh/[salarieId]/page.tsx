export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { SalarieForm } from "@/components/rh/salarie-form";
import { updateSalarie, deleteSalarie } from "@/lib/actions/rh";
import { DeleteButton } from "@/components/ui/delete-button";
import { LinkButton, buttonClasses } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuros } from "@/lib/format";
import { CCN_LABELS, type TypeCcn } from "@/lib/ccn-batiment";
import { Heart } from "lucide-react";

const bulletinStatutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  VALIDE: "blue",
  PAYE: "green",
};

const bulletinStatutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDE: "Validé",
  PAYE: "Payé",
};

const MOIS_FR = [
  "Janvier","Février","Mars","Avril","Mai","Juin",
  "Juillet","Août","Septembre","Octobre","Novembre","Décembre",
];

function periodLabel(periode: string) {
  const [year, month] = periode.split("-");
  return `${MOIS_FR[Number(month) - 1] ?? month} ${year}`;
}

export default async function SalarieDetailPage({
  params,
}: {
  params: Promise<{ salarieId: string }>;
}) {
  const { salarieId } = await params;

  const salarie = await prisma.salarie.findUnique({
    where: { id: salarieId },
    include: {
      bulletins: { orderBy: { periode: "desc" } },
      adhesionMutuelle: { include: { formuleMutuelle: true, contratMutuelle: true } },
    },
  });

  if (!salarie) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/rh" className="text-sm text-brand-blue hover:underline">
            ← Retour aux salariés
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">
            {salarie.prenom} {salarie.nom}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {salarie.matricule} · {CCN_LABELS[salarie.typeCcn as TypeCcn]} ·{" "}
            {salarie.qualification || "Qualification non précisée"}
          </p>
          <p className="text-sm text-slate-500">
            Embauché le {formatDate(salarie.dateEmbauche)} · Salaire de base :{" "}
            <strong>{formatEuros(salarie.salaireBase)}</strong>
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <LinkButton href={`/rh/${salarieId}/bulletins/nouveau`}>+ Nouveau bulletin</LinkButton>
          <Link
            href={`/rh/${salarieId}/mutuelle`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Heart className="h-4 w-4 text-rose-500" />
            {salarie.adhesionMutuelle?.actif ? "Mutuelle active" : "Gérer la mutuelle"}
          </Link>
          <DeleteButton
            action={deleteSalarie.bind(null, salarie.id)}
            confirmMessage={`Supprimer la fiche de ${salarie.prenom} ${salarie.nom} et tous ses bulletins ? Cette action est irréversible.`}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-brand-navy">
          Bulletins de paie{salarie.bulletins.length > 0 && <span className="ml-2 text-sm font-normal text-slate-400">({salarie.bulletins.length})</span>}
        </h3>
        {salarie.bulletins.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Aucun bulletin enregistré pour ce salarié.{" "}
            <Link href={`/rh/${salarieId}/bulletins/nouveau`} className="text-brand-blue hover:underline">
              Créer le premier bulletin →
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-4">Période</th>
                  <th className="pb-2 pr-4 text-right">Brut</th>
                  <th className="pb-2 pr-4 text-right">Net imposable</th>
                  <th className="pb-2 pr-4 text-right">Net à payer</th>
                  <th className="pb-2 pr-4">Statut</th>
                  <th className="pb-2">Paiement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {salarie.bulletins.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/rh/${salarieId}/bulletins/${b.id}`}
                        className="font-medium text-brand-blue hover:underline"
                      >
                        {periodLabel(b.periode)}
                      </Link>
                    </td>
                    <td className="py-2 pr-4 text-right">{formatEuros(b.totalBrut)}</td>
                    <td className="py-2 pr-4 text-right">{formatEuros(b.netImposable)}</td>
                    <td className="py-2 pr-4 text-right font-semibold text-brand-navy">
                      {formatEuros(b.netAPayer)}
                    </td>
                    <td className="py-2 pr-4">
                      <Badge tone={bulletinStatutTones[b.statut] ?? "gray"}>
                        {bulletinStatutLabels[b.statut] ?? b.statut}
                      </Badge>
                    </td>
                    <td className="py-2 text-slate-500 text-xs">
                      {b.datePaiement ? formatDate(b.datePaiement) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Modifier la fiche salarié</h3>
        <SalarieForm salarie={salarie} action={updateSalarie.bind(null, salarie.id)} />
      </div>
    </div>
  );
}
