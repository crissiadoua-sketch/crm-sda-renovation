import Link from "next/link";
import {
  Plus,
  CheckSquare,
  Clock,
  AlertCircle,
  Repeat,
  Calendar,
  User,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { formatDate } from "@/lib/format";
import { updateTacheStatut } from "@/lib/actions/taches";
import { TachesStats } from "@/components/charts/taches-stats";

type Periode = "jour" | "semaine" | "mois" | "trimestre" | "annee";

const PERIODES: { value: Periode; label: string }[] = [
  { value: "jour", label: "Aujourd'hui" },
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
  { value: "trimestre", label: "Ce trimestre" },
  { value: "annee", label: "Cette année" },
];

const STATUT_TONES: Record<string, BadgeTone> = {
  A_FAIRE: "gray",
  EN_COURS: "blue",
  EN_ATTENTE: "orange",
  TERMINEE: "green",
  ANNULEE: "gray",
};

const STATUT_LABELS: Record<string, string> = {
  A_FAIRE: "À faire",
  EN_COURS: "En cours",
  EN_ATTENTE: "En attente",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
};

const PRIORITE_TONES: Record<string, BadgeTone> = {
  FAIBLE: "gray",
  NORMALE: "blue",
  HAUTE: "orange",
  URGENTE: "red",
};

const PERIODICITY_ICONS: Record<string, string> = {
  QUOTIDIENNE: "Quotidien",
  HEBDOMADAIRE: "Hebdo",
  MENSUELLE: "Mensuel",
  TRIMESTRIELLE: "Trimestriel",
  ANNUELLE: "Annuel",
  PONCTUELLE: "Ponctuel",
};

const SERVICE_LABELS: Record<string, string> = {
  SERVICE_DIRECTION: "Direction",
  SERVICE_COMMERCIAL: "Commercial",
  SERVICE_TRAVAUX: "Travaux",
  SERVICE_COMPTABILITE: "Comptabilité",
  SERVICE_RH: "Ressources humaines",
  SERVICE_ACHAT: "Achats",
  SERVICE_ADMIN: "Administratif",
  TOUS: "Tous services",
};

function getDateRange(periode: Periode) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  switch (periode) {
    case "jour":
      return { gte: new Date(y, m, d), lte: new Date(y, m, d, 23, 59, 59) };
    case "semaine": {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
      return { gte: new Date(y, m, d - day), lte: new Date(y, m, d - day + 6, 23, 59, 59) };
    }
    case "mois":
      return { gte: new Date(y, m, 1), lte: new Date(y, m + 1, 0, 23, 59, 59) };
    case "trimestre": {
      const t = Math.floor(m / 3);
      return { gte: new Date(y, t * 3, 1), lte: new Date(y, t * 3 + 3, 0, 23, 59, 59) };
    }
    case "annee":
    default:
      return { gte: new Date(y, 0, 1), lte: new Date(y, 11, 31, 23, 59, 59) };
  }
}

export default async function TachesPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; statut?: string; service?: string; moi?: string }>;
}) {
  const { periode: periodeParam, statut, service, moi } = await searchParams;
  const user = await getUser();

  const periode: Periode =
    (["jour", "semaine", "mois", "trimestre", "annee"] as Periode[]).includes(
      periodeParam as Periode
    )
      ? (periodeParam as Periode)
      : "semaine";

  const dateRange = getDateRange(periode);

  const where: Record<string, unknown> = {};
  if (statut) where.statut = statut;
  if (service) where.service = service;
  if (moi === "1") where.assigneAId = user.id;

  // Filtre par période sur l'échéance OU les tâches récurrentes actives
  const taches = await prisma.tache.findMany({
    where: {
      ...where,
      OR: [
        { dateEcheance: dateRange },
        {
          dateEcheance: null,
          periodicite: { not: "PONCTUELLE" },
          statut: { notIn: ["TERMINEE", "ANNULEE"] },
        },
        { dateEcheance: null, statut: { notIn: ["TERMINEE", "ANNULEE"] } },
      ],
    },
    include: {
      assigneA: { select: { name: true, email: true, role: true } },
      creePar: { select: { name: true } },
      chantier: { select: { nom: true, reference: true } },
    },
    orderBy: [
      { priorite: "desc" },
      { dateEcheance: "asc" },
      { createdAt: "asc" },
    ],
  });

  const total = taches.length;
  const aFaire = taches.filter((t) => t.statut === "A_FAIRE").length;
  const enCours = taches.filter((t) => t.statut === "EN_COURS").length;
  const urgentes = taches.filter((t) => t.priorite === "URGENTE" && !["TERMINEE", "ANNULEE"].includes(t.statut)).length;

  const now = new Date();
  const isAdmin =
    user.role === "DIRIGEANT" ||
    user.role === "ASSISTANT_DIRECTION" ||
    user.role === "DAF" ||
    user.role === "ADMIN";

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total tâches", value: total, icon: CheckSquare, color: "text-brand-blue", bg: "bg-brand-blue/10" },
          { label: "À faire", value: aFaire, icon: Clock, color: "text-slate-600", bg: "bg-slate-100" },
          { label: "En cours", value: enCours, icon: Repeat, color: "text-brand-orange-dark", bg: "bg-brand-orange/10" },
          { label: "Urgentes", value: urgentes, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                <span className={`rounded-full p-1.5 ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-brand-navy">{kpi.value}</p>
              {kpi.label === "Urgentes" && urgentes > 0 && (
                <p className="text-xs text-red-500">Attention requise</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Sélecteur de période */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 text-brand-blue shrink-0" />
        {PERIODES.map(({ value, label }) => {
          const params = new URLSearchParams();
          params.set("periode", value);
          if (statut) params.set("statut", statut);
          if (service) params.set("service", service);
          if (moi) params.set("moi", moi);
          return (
            <Link
              key={value}
              href={`?${params}`}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                periode === value
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Filtres + bouton nouvelle tâche */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtres statut */}
          {["", "A_FAIRE", "EN_COURS", "EN_ATTENTE", "TERMINEE"].map((s) => {
            const params = new URLSearchParams();
            params.set("periode", periode);
            if (s) params.set("statut", s);
            if (service) params.set("service", service);
            if (moi) params.set("moi", moi);
            return (
              <Link
                key={s}
                href={`?${params}`}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  (statut ?? "") === s
                    ? "border-brand-navy bg-brand-navy text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {s ? STATUT_LABELS[s] : "Tous"}
              </Link>
            );
          })}

          {/* Filtre service */}
          <form method="GET" className="flex items-center gap-2">
            <input type="hidden" name="periode" value={periode} />
            {statut && <input type="hidden" name="statut" value={statut} />}
            {moi && <input type="hidden" name="moi" value={moi} />}
            <AutoSubmitSelect
              name="service"
              defaultValue={service ?? ""}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 focus:border-brand-blue focus:outline-none"
            >
              <option value="">Tous services</option>
              {Object.entries(SERVICE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </AutoSubmitSelect>
          </form>

          {/* Filtre mes tâches */}
          <Link
            href={`?periode=${periode}${statut ? `&statut=${statut}` : ""}${service ? `&service=${service}` : ""}${moi === "1" ? "" : "&moi=1"}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition flex items-center gap-1 ${
              moi === "1"
                ? "border-brand-orange bg-brand-orange text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            <User className="h-3 w-3" />
            Mes tâches
          </Link>
        </div>

        {isAdmin && (
          <LinkButton href="/taches/nouveau">
            <Plus className="h-4 w-4" />
            Nouvelle tâche
          </LinkButton>
        )}
      </div>

      {/* Tableau des tâches */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Tâche</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Périodicité</th>
              <th className="px-4 py-3">Assigné à</th>
              <th className="px-4 py-3">Échéance</th>
              <th className="px-4 py-3">Priorité</th>
              <th className="px-4 py-3">Statut</th>
              {isAdmin && <th className="px-4 py-3">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {taches.map((tache) => {
              const enRetard =
                tache.dateEcheance &&
                tache.dateEcheance < now &&
                !["TERMINEE", "ANNULEE"].includes(tache.statut);
              return (
                <tr
                  key={tache.id}
                  className={`hover:bg-slate-50 ${tache.statut === "TERMINEE" ? "opacity-60" : ""} ${enRetard ? "bg-red-50/30" : ""}`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/taches/${tache.id}`} className="font-medium text-brand-navy hover:underline">
                      {tache.titre}
                    </Link>
                    {tache.chantier && (
                      <p className="text-xs text-slate-400">
                        {tache.chantier.reference} — {tache.chantier.nom}
                      </p>
                    )}
                    {tache.description && (
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{tache.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {SERVICE_LABELS[tache.service ?? ""] ?? tache.service ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Repeat className="h-3 w-3" />
                      {PERIODICITY_ICONS[tache.periodicite] ?? tache.periodicite}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {tache.assigneA ? (
                      <div>
                        <p>{tache.assigneA.name}</p>
                        <p className="text-xs text-slate-400">{tache.assigneA.role}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400">Non assigné</span>
                    )}
                  </td>
                  <td className={`px-4 py-3 ${enRetard ? "font-medium text-red-600" : "text-slate-600"}`}>
                    {tache.dateEcheance ? formatDate(tache.dateEcheance) : "—"}
                    {enRetard && " ⚠"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={PRIORITE_TONES[tache.priorite] ?? "gray"}>
                      {tache.priorite}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={STATUT_TONES[tache.statut] ?? "gray"}>
                      {STATUT_LABELS[tache.statut] ?? tache.statut}
                    </Badge>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/taches/${tache.id}`}
                          className="rounded px-2 py-1 text-xs text-brand-blue hover:bg-brand-blue/10"
                        >
                          Éditer
                        </Link>
                        {tache.statut !== "TERMINEE" && (
                          <form
                            action={updateTacheStatut.bind(null, tache.id, "TERMINEE")}
                          >
                            <button
                              type="submit"
                              className="rounded px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50"
                            >
                              ✓ Terminée
                            </button>
                          </form>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
            {taches.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                  Aucune tâche sur cette période.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Kanban par statut (vue rapide) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["A_FAIRE", "EN_COURS", "EN_ATTENTE", "TERMINEE"].map((s) => {
          const items = taches.filter((t) => t.statut === s);
          return (
            <div key={s} className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className={`border-b border-slate-100 px-4 py-3 flex items-center justify-between`}>
                <span className="text-sm font-semibold text-slate-700">{STATUT_LABELS[s]}</span>
                <Badge tone={STATUT_TONES[s] ?? "gray"}>{items.length}</Badge>
              </div>
              <div className="divide-y divide-slate-50 p-2">
                {items.slice(0, 5).map((t) => (
                  <Link
                    key={t.id}
                    href={`/taches/${t.id}`}
                    className="block rounded-lg p-2 text-xs hover:bg-slate-50"
                  >
                    <p className="font-medium text-slate-700 line-clamp-1">{t.titre}</p>
                    {t.assigneA && (
                      <p className="text-slate-400">{t.assigneA.name}</p>
                    )}
                    {t.dateEcheance && (
                      <p className="text-slate-400">{formatDate(t.dateEcheance)}</p>
                    )}
                  </Link>
                ))}
                {items.length === 0 && (
                  <p className="px-2 py-4 text-center text-xs text-slate-300">Vide</p>
                )}
                {items.length > 5 && (
                  <p className="px-2 py-1 text-center text-xs text-brand-blue">
                    +{items.length - 5} autres
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Visualisations graphiques par service / statut / priorité */}
      <div className="border-t border-slate-200 pt-2">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
          Synthèse graphique
        </h3>
        <TachesStats />
      </div>
    </div>
  );
}
