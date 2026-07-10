export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatEuros } from "@/lib/format";
import { AdhesionForm } from "@/components/mutuelle/adhesion-form";
import { createAdhesionMutuelle, updateAdhesionMutuelle, deleteAdhesionMutuelle } from "@/lib/actions/mutuelle";
import { Heart } from "lucide-react";

export default async function SalarieAdhesionMutuellePage({
  params,
}: {
  params: Promise<{ salarieId: string }>;
}) {
  const { salarieId } = await params;

  const [salarie, contrats] = await Promise.all([
    prisma.salarie.findUnique({
      where: { id: salarieId },
      include: {
        adhesionMutuelle: {
          include: { contratMutuelle: true, formuleMutuelle: true },
        },
      },
    }),
    prisma.contratMutuelle.findMany({
      where: { actif: true },
      include: { formules: { orderBy: { niveau: "asc" } } },
      orderBy: { organisme: "asc" },
    }),
  ]);

  if (!salarie) notFound();

  const adhesion = salarie.adhesionMutuelle;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/rh/${salarieId}`} className="text-sm text-brand-blue hover:underline">
            ← Retour à {salarie.prenom} {salarie.nom}
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">
            Mutuelle — {salarie.prenom} {salarie.nom}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{salarie.matricule}</p>
        </div>
        {adhesion && (
          <DeleteButton
            action={deleteAdhesionMutuelle.bind(null, adhesion.id, salarieId)}
            confirmMessage={`Supprimer l'adhésion mutuelle de ${salarie.prenom} ${salarie.nom} ?`}
          />
        )}
      </div>

      {/* Résumé adhésion en cours */}
      {adhesion && (
        <div className={`rounded-xl border p-5 shadow-sm ${adhesion.actif ? "border-green-200 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
          <div className="flex items-start gap-3">
            <Heart className={`mt-0.5 h-5 w-5 ${adhesion.actif ? "text-green-600" : "text-slate-400"}`} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-brand-navy">
                  {adhesion.contratMutuelle.organisme} — {adhesion.formuleMutuelle.label}
                </p>
                <Badge tone={adhesion.actif ? "green" : "gray"}>
                  {adhesion.actif ? "Actif" : "Résilié"}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-white px-3 py-2 text-xs">
                  <p className="text-slate-500">Cotisation salarié</p>
                  <p className="font-bold text-brand-navy">{formatEuros(adhesion.formuleMutuelle.cotisationSalarie)}/mois</p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-xs">
                  <p className="text-slate-500">Part patronale</p>
                  <p className="font-bold text-brand-orange">{formatEuros(adhesion.formuleMutuelle.cotisationPatronale)}/mois</p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-xs">
                  <p className="text-slate-500">Date d'adhésion</p>
                  <p className="font-bold text-brand-navy">{formatDate(adhesion.dateAdhesion)}</p>
                </div>
                <div className="rounded-lg bg-white px-3 py-2 text-xs">
                  <p className="text-slate-500">Date de sortie</p>
                  <p className="font-bold text-brand-navy">
                    {adhesion.dateSortie ? formatDate(adhesion.dateSortie) : "—"}
                  </p>
                </div>
              </div>
              {adhesion.formuleMutuelle.garanties && (
                <p className="mt-2 text-xs text-slate-600">{adhesion.formuleMutuelle.garanties}</p>
              )}
              {adhesion.notes && (
                <p className="mt-1 text-xs text-slate-500">{adhesion.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulaire adhésion */}
      {contrats.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
          <Heart className="mx-auto mb-3 h-10 w-10 text-amber-400 opacity-50" />
          <p className="font-medium text-amber-800">Aucun contrat mutuelle actif</p>
          <p className="mt-1 text-sm text-amber-700">
            Configurez d'abord un contrat mutuelle avant d'affilier des salariés.
          </p>
          <Link
            href="/mutuelle/contrat/nouveau"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark"
          >
            Créer un contrat
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 font-semibold text-brand-navy">
            {adhesion ? "Modifier l'adhésion" : "Affilier à la mutuelle"}
          </h3>
          <AdhesionForm
            salarie={salarie}
            adhesion={adhesion ?? undefined}
            contrats={contrats}
            action={
              adhesion
                ? updateAdhesionMutuelle.bind(null, adhesion.id, salarieId)
                : createAdhesionMutuelle.bind(null, salarieId)
            }
          />
        </div>
      )}
    </div>
  );
}
