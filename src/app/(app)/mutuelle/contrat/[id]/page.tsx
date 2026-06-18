import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatEuros } from "@/lib/format";
import { ContratMutuellForm } from "@/components/mutuelle/contrat-mutuelle-form";
import { FormulePanel } from "@/components/mutuelle/formule-panel";
import {
  updateContratMutuelle,
  deleteContratMutuelle,
} from "@/lib/actions/mutuelle";

export default async function ContratMutuellePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contrat = await prisma.contratMutuelle.findUnique({
    where: { id },
    include: {
      formules: { orderBy: { niveau: "asc" } },
      adhesions: {
        include: { salarie: true, formuleMutuelle: true },
        orderBy: { dateAdhesion: "desc" },
      },
    },
  });

  if (!contrat) notFound();

  const updateAction = updateContratMutuelle.bind(null, id);
  const deleteAction = deleteContratMutuelle.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/mutuelle" className="text-sm text-brand-blue hover:underline">
            ← Retour à la mutuelle
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-brand-navy">{contrat.organisme}</h2>
            <Badge tone={contrat.actif ? "green" : "gray"}>
              {contrat.actif ? "Actif" : "Inactif"}
            </Badge>
          </div>
          {contrat.numeroContrat && (
            <p className="mt-0.5 text-sm text-slate-500">N° {contrat.numeroContrat}</p>
          )}
          {contrat.dateEffet && (
            <p className="text-xs text-slate-400">
              Prise d'effet : {formatDate(contrat.dateEffet)}
              {contrat.dateFin && ` · Fin : ${formatDate(contrat.dateFin)}`}
            </p>
          )}
        </div>
        <DeleteButton
          action={deleteAction}
          confirmMessage={`Supprimer le contrat ${contrat.organisme} ? Toutes les formules et adhésions seront supprimées.`}
        />
      </div>

      {/* Formules */}
      <FormulePanel contrat={contrat} />

      {/* Adhésions */}
      {contrat.adhesions.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-brand-navy">
            Adhésions ({contrat.adhesions.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-4">Salarié</th>
                  <th className="pb-2 pr-4">Formule</th>
                  <th className="pb-2 pr-4 text-right">Cotis. salarié</th>
                  <th className="pb-2 pr-4 text-right">Cotis. patronale</th>
                  <th className="pb-2 pr-4">Date adhésion</th>
                  <th className="pb-2">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {contrat.adhesions.map((adh) => (
                  <tr key={adh.id} className="hover:bg-slate-50">
                    <td className="py-2 pr-4">
                      <Link
                        href={`/rh/${adh.salarieId}/mutuelle`}
                        className="font-medium text-brand-blue hover:underline"
                      >
                        {adh.salarie.prenom} {adh.salarie.nom}
                      </Link>
                      <p className="text-xs text-slate-400">{adh.salarie.matricule}</p>
                    </td>
                    <td className="py-2 pr-4 text-slate-600">{adh.formuleMutuelle.label}</td>
                    <td className="py-2 pr-4 text-right">{formatEuros(adh.formuleMutuelle.cotisationSalarie)}</td>
                    <td className="py-2 pr-4 text-right">{formatEuros(adh.formuleMutuelle.cotisationPatronale)}</td>
                    <td className="py-2 pr-4 text-xs text-slate-500">{formatDate(adh.dateAdhesion)}</td>
                    <td className="py-2">
                      <Badge tone={adh.actif ? "green" : "gray"}>
                        {adh.actif ? "Actif" : "Résilié"}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modifier le contrat */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Modifier le contrat</h3>
        <ContratMutuellForm contrat={contrat} action={updateAction} />
      </div>
    </div>
  );
}
