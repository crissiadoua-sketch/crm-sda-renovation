import Link from "next/link";
import { Plus, Search, TrendingUp, Clock, AlertCircle, CheckCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { inputClasses } from "@/components/ui/fields";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  ENVOYEE: "blue",
  PAYEE_PARTIELLE: "orange",
  PAYEE: "green",
  EN_RETARD: "red",
  ANNULEE: "gray",
};

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  PAYEE_PARTIELLE: "Paiement partiel",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
  ANNULEE: "Annulée",
};

const typeBadgeTones: Record<string, BadgeTone> = {
  STANDARD: "navy",
  ACOMPTE: "blue",
  SITUATION: "orange",
  SOLDE: "green",
  AVOIR: "red",
};

const typeLabels: Record<string, string> = {
  STANDARD: "Facture",
  ACOMPTE: "Acompte",
  SITUATION: "Situation",
  SOLDE: "Solde",
  AVOIR: "Avoir",
};

const STATUTS = [
  { value: "", label: "Tous les statuts" },
  { value: "BROUILLON", label: "Brouillon" },
  { value: "ENVOYEE", label: "Envoyée" },
  { value: "PAYEE_PARTIELLE", label: "Paiement partiel" },
  { value: "PAYEE", label: "Payée" },
  { value: "EN_RETARD", label: "En retard" },
  { value: "ANNULEE", label: "Annulée" },
];

const TYPES = [
  { value: "", label: "Tous les types" },
  { value: "STANDARD", label: "Facture" },
  { value: "ACOMPTE", label: "Acompte" },
  { value: "SITUATION", label: "Situation" },
  { value: "SOLDE", label: "Solde" },
  { value: "AVOIR", label: "Avoir" },
];

export default async function FacturesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; type?: string }>;
}) {
  const { q, statut, type } = await searchParams;

  const where: Record<string, unknown> = {};
  if (statut) where.statut = statut;
  if (type) where.type = type;
  if (q) {
    where.OR = [
      { numero: { contains: q } },
      { client: { nom: { contains: q } } },
      { client: { raisonSociale: { contains: q } } },
      { chantier: { nom: { contains: q } } },
    ];
  }

  const [factures, totaux] = await Promise.all([
    prisma.facture.findMany({
      where,
      include: { client: true, chantier: { select: { nom: true, reference: true } } },
      orderBy: { dateEmission: "desc" },
    }),
    prisma.facture.groupBy({
      by: ["statut"],
      _sum: { totalTTC: true, montantPaye: true },
      _count: { id: true },
    }),
  ]);

  const totalFacture = factures.reduce((acc, f) => acc + f.totalTTC, 0);
  const totalEncaisse = factures.reduce((acc, f) => acc + f.montantPaye, 0);
  const totalEnAttente = factures
    .filter((f) => ["ENVOYEE", "PAYEE_PARTIELLE"].includes(f.statut))
    .reduce((acc, f) => acc + (f.totalTTC - f.montantPaye), 0);
  const totalEnRetard = factures
    .filter((f) => f.statut === "EN_RETARD")
    .reduce((acc, f) => acc + (f.totalTTC - f.montantPaye), 0);

  const kpis = [
    {
      label: "Total facturé",
      value: formatEuros(totalFacture),
      sub: `${factures.length} facture${factures.length > 1 ? "s" : ""}`,
      icon: TrendingUp,
      color: "text-brand-blue",
      bg: "bg-brand-blue/10",
    },
    {
      label: "Encaissé",
      value: formatEuros(totalEncaisse),
      sub: totalFacture > 0 ? `${Math.round((totalEncaisse / totalFacture) * 100)} %` : "—",
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "En attente",
      value: formatEuros(totalEnAttente),
      sub: "Envoyées ou partielles",
      icon: Clock,
      color: "text-brand-orange-dark",
      bg: "bg-brand-orange/10",
    },
    {
      label: "En retard",
      value: formatEuros(totalEnRetard),
      sub: `${factures.filter((f) => f.statut === "EN_RETARD").length} facture${factures.filter((f) => f.statut === "EN_RETARD").length > 1 ? "s" : ""}`,
      icon: AlertCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
  ];

  const now = new Date();

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {kpi.label}
                </span>
                <span className={`rounded-full p-1.5 ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </span>
              </div>
              <p className="text-xl font-bold text-brand-navy">{kpi.value}</p>
              <p className="text-xs text-slate-400">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Barre de statuts rapides */}
      <div className="flex flex-wrap gap-2">
        {STATUTS.map(({ value, label }) => {
          const isActive = (statut ?? "") === value;
          const href = value
            ? `?${new URLSearchParams({ ...(q ? { q } : {}), statut: value, ...(type ? { type } : {}) })}`
            : `?${new URLSearchParams({ ...(q ? { q } : {}), ...(type ? { type } : {}) })}`;
          return (
            <Link
              key={value}
              href={href}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Filtres + bouton nouveau */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <form className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Rechercher…"
              className={`${inputClasses} pl-9 w-56`}
            />
            {statut && <input type="hidden" name="statut" value={statut} />}
            {type && <input type="hidden" name="type" value={type} />}
          </form>
          <select
            name="type"
            defaultValue={type ?? ""}
            onChange={(e) => {
              // handled client-side — this is a server component, use link instead
            }}
            className={`${inputClasses} w-44`}
            suppressHydrationWarning
          >
            {TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <LinkButton href="/factures/nouveau">
          <Plus className="h-4 w-4" />
          Nouvelle facture
        </LinkButton>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">N°</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Chantier</th>
              <th className="px-4 py-3">Émission</th>
              <th className="px-4 py-3">Échéance</th>
              <th className="px-4 py-3 text-right">Total TTC</th>
              <th className="px-4 py-3 text-right">Payé</th>
              <th className="px-4 py-3 text-right">Reste dû</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {factures.map((facture) => {
              const resteDu = Math.max(0, facture.totalTTC - facture.montantPaye);
              const isOverdue =
                facture.statut === "EN_RETARD" ||
                (facture.dateEcheance &&
                  facture.dateEcheance < now &&
                  !["PAYEE", "ANNULEE"].includes(facture.statut));
              return (
                <tr key={facture.id} className={`hover:bg-slate-50 ${isOverdue ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-3">
                    <Link href={`/factures/${facture.id}`} className="font-medium text-brand-navy hover:underline">
                      {facture.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={typeBadgeTones[facture.type] ?? "gray"}>
                      {typeLabels[facture.type] ?? facture.type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{clientDisplayName(facture.client)}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{facture.chantier.nom}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(facture.dateEmission)}</td>
                  <td className={`px-4 py-3 ${isOverdue ? "font-medium text-red-600" : "text-slate-600"}`}>
                    {formatDate(facture.dateEcheance)}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-700">
                    {formatEuros(facture.totalTTC)}
                  </td>
                  <td className="px-4 py-3 text-right text-emerald-600">
                    {formatEuros(facture.montantPaye)}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold ${resteDu > 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {resteDu > 0 ? formatEuros(resteDu) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statutTones[facture.statut] ?? "gray"}>
                      {statutLabels[facture.statut] ?? facture.statut}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {factures.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                  Aucune facture trouvée.
                </td>
              </tr>
            )}
          </tbody>
          {factures.length > 0 && (
            <tfoot className="bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <td colSpan={6} className="px-4 py-3">Total ({factures.length} facture{factures.length > 1 ? "s" : ""})</td>
                <td className="px-4 py-3 text-right">{formatEuros(totalFacture)}</td>
                <td className="px-4 py-3 text-right text-emerald-600">{formatEuros(totalEncaisse)}</td>
                <td className="px-4 py-3 text-right text-red-600">{formatEuros(Math.max(0, totalFacture - totalEncaisse))}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
