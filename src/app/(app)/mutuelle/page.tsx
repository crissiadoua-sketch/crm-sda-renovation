export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatDate, formatEuros } from "@/lib/format";
import { Heart, Users, Euro, ShieldCheck } from "lucide-react";

const statutBadge: Record<string, BadgeTone> = {
  true: "green",
  false: "gray",
};

export default async function MutuellePage() {
  const [contrats, salaries, adhesions] = await Promise.all([
    prisma.contratMutuelle.findMany({
      include: {
        formules: { orderBy: { niveau: "asc" } },
        _count: { select: { adhesions: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.salarie.findMany({
      where: { statutRH: "ACTIF" },
      include: {
        adhesionMutuelle: {
          include: { formuleMutuelle: true, contratMutuelle: true },
        },
      },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
    }),
    prisma.adhesionMutuelle.findMany({ where: { actif: true } }),
  ]);

  const contratActif = contrats.find((c) => c.actif);
  const totalSalariesActifs = salaries.length;
  const totalAdhesions = adhesions.length;
  const totalCotisationsSalaries = adhesions.reduce((sum, a) => {
    const formule = contratActif?.formules.find((f) => f.id === a.formuleMutuelleId);
    return sum + (formule?.cotisationSalarie ?? 0);
  }, 0);
  const totalCotisationsPatronales = adhesions.reduce((sum, a) => {
    const formule = contratActif?.formules.find((f) => f.id === a.formuleMutuelleId);
    return sum + (formule?.cotisationPatronale ?? 0);
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Mutuelle d'entreprise</h2>
          <p className="mt-1 text-sm text-slate-500">
            Complémentaire santé collective — Loi ANI (obligatoire depuis le 1er janvier 2016)
          </p>
        </div>
        <LinkButton href="/mutuelle/contrat/nouveau">+ Nouveau contrat</LinkButton>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Users className="h-4 w-4" />
            Salariés couverts
          </div>
          <p className="mt-1 text-2xl font-bold text-brand-navy">
            {totalAdhesions}
            <span className="text-sm font-normal text-slate-400"> / {totalSalariesActifs}</span>
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Heart className="h-4 w-4" />
            Contrats actifs
          </div>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{contrats.filter((c) => c.actif).length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Euro className="h-4 w-4" />
            Cotis. salariales /mois
          </div>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{formatEuros(totalCotisationsSalaries)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <ShieldCheck className="h-4 w-4" />
            Cotis. patronales /mois
          </div>
          <p className="mt-1 text-2xl font-bold text-brand-orange">{formatEuros(totalCotisationsPatronales)}</p>
        </div>
      </div>

      {/* Contrats */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-brand-navy">Contrats mutuelle</h3>
        </div>
        {contrats.length === 0 ? (
          <div className="py-10 text-center text-slate-400">
            <Heart className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p className="font-medium">Aucun contrat mutuelle configuré</p>
            <p className="mt-1 text-sm">Commencez par ajouter votre contrat de complémentaire santé.</p>
            <LinkButton href="/mutuelle/contrat/nouveau" className="mt-4">
              Ajouter un contrat
            </LinkButton>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {contrats.map((contrat) => (
              <div
                key={contrat.id}
                className={`rounded-lg border p-4 ${contrat.actif ? "border-brand-blue/30 bg-blue-50/30" : "border-slate-200 bg-slate-50"}`}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-brand-navy">{contrat.organisme}</span>
                      <Badge tone={statutBadge[String(contrat.actif)] ?? "gray"}>
                        {contrat.actif ? "Actif" : "Inactif"}
                      </Badge>
                    </div>
                    {contrat.numeroContrat && (
                      <p className="text-sm text-slate-500">N° {contrat.numeroContrat}</p>
                    )}
                    {contrat.dateEffet && (
                      <p className="text-xs text-slate-400">
                        Prise d'effet : {formatDate(contrat.dateEffet)}
                        {contrat.dateFin && ` · Fin : ${formatDate(contrat.dateFin)}`}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">
                      {contrat._count.adhesions} adhésion{contrat._count.adhesions > 1 ? "s" : ""}
                    </span>
                    <Link
                      href={`/mutuelle/contrat/${contrat.id}`}
                      className="rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-blue-dark"
                    >
                      Gérer
                    </Link>
                  </div>
                </div>
                {contrat.formules.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {contrat.formules.map((f) => (
                      <div key={f.id} className="rounded-lg border border-slate-200 bg-white p-2 text-xs">
                        <p className="font-medium text-brand-navy">{f.label}</p>
                        <p className="text-slate-500">Salarié : {formatEuros(f.cotisationSalarie)}/mois</p>
                        <p className="text-slate-500">Patron : {formatEuros(f.cotisationPatronale)}/mois</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tableau des salariés */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Adhésions salariés</h3>
        {salaries.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">Aucun salarié actif.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="pb-2 pr-4">Salarié</th>
                  <th className="pb-2 pr-4">Organisme</th>
                  <th className="pb-2 pr-4">Formule</th>
                  <th className="pb-2 pr-4 text-right">Cotis. salarié</th>
                  <th className="pb-2 pr-4 text-right">Cotis. patronale</th>
                  <th className="pb-2 pr-4">Adhésion</th>
                  <th className="pb-2">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {salaries.map((s) => {
                  const adh = s.adhesionMutuelle;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2 pr-4">
                        <Link
                          href={`/rh/${s.id}/mutuelle`}
                          className="font-medium text-brand-blue hover:underline"
                        >
                          {s.prenom} {s.nom}
                        </Link>
                        <p className="text-xs text-slate-400">{s.matricule}</p>
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {adh?.contratMutuelle.organisme ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 pr-4 text-slate-600">
                        {adh?.formuleMutuelle.label ?? <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {adh ? formatEuros(adh.formuleMutuelle.cotisationSalarie) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 pr-4 text-right">
                        {adh ? formatEuros(adh.formuleMutuelle.cotisationPatronale) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 pr-4 text-xs text-slate-500">
                        {adh ? formatDate(adh.dateAdhesion) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2">
                        {adh ? (
                          <Badge tone={adh.actif ? "green" : "gray"}>
                            {adh.actif ? "Actif" : "Résilié"}
                          </Badge>
                        ) : (
                          <Link
                            href={`/rh/${s.id}/mutuelle`}
                            className="text-xs text-brand-orange hover:underline"
                          >
                            + Affilier
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info légale */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold">Obligation légale — Loi ANI du 14 juin 2013</p>
        <p className="mt-1 text-xs text-amber-700">
          Depuis le 1er janvier 2016, tout employeur du secteur privé doit proposer une complémentaire santé collective
          à ses salariés. L'employeur doit prendre en charge au minimum 50 % de la cotisation de base. En BTP, la
          convention collective prévoit un régime de prévoyance spécifique via <strong>Pro BTP</strong>.
        </p>
      </div>
    </div>
  );
}
