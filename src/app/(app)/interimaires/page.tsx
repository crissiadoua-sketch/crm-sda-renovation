import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS, CORPS_ETAT_BADGE_TONES, type CorpsEtatCode } from "@/lib/corps-etat";
import { formatEuros } from "@/lib/format";

const QUALIFICATION_LABELS: Record<string, string> = {
  MANOEUVRE: "Manœuvre",
  OUVRIER: "Ouvrier",
  COMPAGNON: "Compagnon",
  CHEF_EQUIPE: "Chef d'équipe",
  CHEF_CHANTIER: "Chef de chantier",
  MAITRISE: "Maîtrise",
};

function getCurrentWeek(): string {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const weekNum = Math.ceil(
    ((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7,
  );
  return `${year}-W${String(weekNum).padStart(2, "0")}`;
}

export default async function InterimairesPage({
  searchParams,
}: {
  searchParams: Promise<{ corps?: string; agence?: string }>;
}) {
  const { corps, agence } = await searchParams;

  const interimaires = await prisma.interimaire.findMany({
    where: {
      ...(corps ? { corpsEtat: corps } : {}),
      ...(agence ? { agence: { contains: agence } } : {}),
    },
    include: {
      heures: {
        orderBy: { semaine: "desc" },
        take: 1,
      },
    },
    orderBy: [{ nom: "asc" }, { prenom: "asc" }],
  });

  const currentWeek = getCurrentWeek();

  // KPI semaine courante
  const allHeuresSemaine = await prisma.suiviHeureInterimaire.findMany({
    where: { semaine: currentWeek },
  });
  const totalHSemaine = allHeuresSemaine.reduce(
    (s, h) => s + h.heuresTravaillees + h.heuresSupp25 + h.heuresSupp50,
    0,
  );
  const totalCoutSemaine = allHeuresSemaine.reduce((s, h) => s + h.coutTotalHT, 0);

  // KPI mois courant (approximation: 4 dernières semaines)
  const allHeuresMois = await prisma.suiviHeureInterimaire.findMany({
    where: {
      semaine: { gte: `${new Date().getFullYear()}-W01` },
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
  });
  const totalCoutMois = allHeuresMois.reduce((s, h) => s + h.coutTotalHT, 0);

  const actifCount = interimaires.filter((i) => i.actif).length;

  // Agences uniques pour filtre
  const agences = [...new Set(interimaires.map((i) => i.agence).filter(Boolean))] as string[];

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Intérimaires</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gestion des intérimaires et suivi des heures par chantier
          </p>
        </div>
        <LinkButton href="/interimaires/nouveau">+ Ajouter un intérimaire</LinkButton>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Actifs</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{actifCount}</p>
          <p className="text-xs text-slate-400">intérimaires</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">H semaine</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{totalHSemaine.toFixed(1)}</p>
          <p className="text-xs text-slate-400">heures cette semaine</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Coût semaine</p>
          <p className="mt-1 text-2xl font-bold text-brand-orange">{formatEuros(totalCoutSemaine)}</p>
          <p className="text-xs text-slate-400">HT cette semaine</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Coût mois</p>
          <p className="mt-1 text-2xl font-bold text-brand-orange">{formatEuros(totalCoutMois)}</p>
          <p className="text-xs text-slate-400">HT ce mois</p>
        </div>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <select
          name="corps"
          defaultValue={corps ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="">Tous les corps d'état</option>
          {CORPS_ETAT_CODES.map((code) => (
            <option key={code} value={code}>{code} — {CORPS_ETAT_LABELS[code]}</option>
          ))}
        </select>
        {agences.length > 0 && (
          <select
            name="agence"
            defaultValue={agence ?? ""}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="">Toutes les agences</option>
            {agences.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        )}
        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark transition"
        >
          Filtrer
        </button>
        {(corps || agence) && (
          <Link
            href="/interimaires"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Liste */}
      {interimaires.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun intérimaire enregistré.</p>
          <LinkButton href="/interimaires/nouveau" className="mt-4">
            Ajouter le premier intérimaire
          </LinkButton>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-4 py-3">Nom / Prénom</th>
                  <th className="px-4 py-3">Agence</th>
                  <th className="px-4 py-3">Corps d'état</th>
                  <th className="px-4 py-3">Qualification</th>
                  <th className="px-4 py-3 text-right">Taux HT €/h</th>
                  <th className="px-4 py-3 text-right">Taux agence %</th>
                  <th className="px-4 py-3 text-center">Dernière semaine</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {interimaires.map((i) => (
                  <tr key={i.id} className={`hover:bg-slate-50 ${!i.actif ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3">
                      <Link
                        href={`/interimaires/${i.id}`}
                        className="font-medium text-brand-navy hover:text-brand-blue hover:underline"
                      >
                        {i.nom} {i.prenom}
                      </Link>
                      <p className="text-xs text-slate-400 font-mono">{i.reference}</p>
                      {!i.actif && <span className="text-xs text-slate-400 italic">Inactif</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{i.agence ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Badge tone={CORPS_ETAT_BADGE_TONES[i.corpsEtat as CorpsEtatCode] ?? "gray"}>
                        {i.corpsEtat}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {QUALIFICATION_LABELS[i.qualification] ?? i.qualification}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatEuros(i.tauxHoraireHT)}</td>
                    <td className="px-4 py-3 text-right text-slate-400">{i.tauxAgenceHT} %</td>
                    <td className="px-4 py-3 text-center">
                      {i.heures[0] ? (
                        <span className="text-xs text-slate-500">{i.heures[0].semaine}</span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/interimaires/${i.id}`} className="text-xs text-brand-blue hover:underline">
                        Voir / Saisir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
