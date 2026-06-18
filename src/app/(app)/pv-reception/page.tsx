import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { creerPvReception } from "@/lib/actions/pv-reception";

const STATUT_CONFIG: Record<string, { label: string; tone: "green" | "blue" | "orange" | "gray" | "red" | "navy" }> = {
  BROUILLON: { label: "Brouillon",  tone: "gray"   },
  FINALISE:  { label: "Finalisé",   tone: "blue"   },
  SIGNE:     { label: "Signé ✓",    tone: "green"  },
  ARCHIVE:   { label: "Archivé",    tone: "gray"   },
};

const RESULTAT_CONFIG: Record<string, { label: string; color: string }> = {
  ACCEPTE:           { label: "Accepté",              color: "text-green-600 bg-green-100"  },
  ACCEPTE_RESERVES:  { label: "Accepté avec réserves", color: "text-amber-600 bg-amber-100" },
  REFUSE:            { label: "Refusé",                color: "text-red-600 bg-red-100"     },
};

const TYPE_LABELS: Record<string, string> = {
  PRESTATION:  "Prestation",
  MAINTENANCE: "Maintenance",
  FORMATION:   "Formation",
  LIVRAISON:   "Livraison",
  ETUDE:       "Étude",
  AUTRE:       "Autre",
};

export default async function PvReceptionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; resultat?: string }>;
}) {
  const { q, statut, resultat } = await searchParams;

  const [pvrs, fournisseurs, chantiers, clients] = await Promise.all([
    prisma.pvReception.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(resultat ? { resultat } : {}),
        ...(q ? {
          OR: [
            { numero: { contains: q } },
            { objet:  { contains: q } },
            { fournisseur: { nom: { contains: q } } },
            { chantier:    { nom: { contains: q } } },
          ],
        } : {}),
      },
      include: {
        fournisseur: { select: { nom: true } },
        chantier:    { select: { nom: true } },
        client:      { select: { nom: true, raisonSociale: true } },
        reserves:    { select: { id: true, statut: true } },
        lignes:      { select: { id: true, conformite: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, raisonSociale: true } }),
  ]);

  // KPIs
  const signés       = pvrs.filter(p => p.statut === "SIGNE").length;
  const avecReserves = pvrs.filter(p => p.resultat === "ACCEPTE_RESERVES").length;
  const reservesOuvertes = pvrs.flatMap(p => p.reserves).filter(r => r.statut === "OUVERTE").length;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#29ABE2] to-[#1B3F94]">
            <span className="text-lg font-black text-white">✓</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-navy">PV de Réception de Support</h2>
            <p className="text-sm text-slate-500">Production / Exploitation — documents juridiquement conformes</p>
          </div>
        </div>
        <form action={creerPvReception} className="flex flex-wrap items-end gap-2">
          <select name="typeSupport" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="PRESTATION">Prestation de service</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="FORMATION">Formation</option>
            <option value="LIVRAISON">Livraison de fournitures</option>
            <option value="ETUDE">Étude / Prestation intellectuelle</option>
            <option value="AUTRE">Autre</option>
          </select>
          <select name="fournisseurId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Prestataire (optionnel)</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <button type="submit"
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition">
            + Nouveau PV de réception
          </button>
        </form>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: pvrs.length, color: "bg-slate-50 border-slate-200", text: "text-slate-700" },
          { label: "Signés", value: signés, color: "bg-green-50 border-green-200", text: "text-green-700" },
          { label: "Avec réserves", value: avecReserves, color: "bg-amber-50 border-amber-200", text: "text-amber-700" },
          { label: "Réserves ouvertes", value: reservesOuvertes, color: "bg-red-50 border-red-200", text: "text-red-700" },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{kpi.label}</p>
            <p className={`text-3xl font-black ${kpi.text}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q}
          placeholder="Rechercher numéro, objet, prestataire…"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        <select name="statut" defaultValue={statut ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="resultat" defaultValue={resultat ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les résultats</option>
          {Object.entries(RESULTAT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">Filtrer</button>
        {(statut || q || resultat) && (
          <Link href="/pv-reception"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Liste */}
      {pvrs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-slate-600">Aucun PV de réception</p>
          <p className="text-sm text-slate-400 mt-1">Créez votre premier PV en sélectionnant le type ci-dessus.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Objet</th>
                <th className="px-4 py-3">Prestataire / Chantier</th>
                <th className="px-4 py-3">Date réception</th>
                <th className="px-4 py-3">Résultat</th>
                <th className="px-4 py-3">Réserves</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {pvrs.map(pvr => {
                const cfg    = STATUT_CONFIG[pvr.statut] ?? STATUT_CONFIG.BROUILLON;
                const resCfg = pvr.resultat ? RESULTAT_CONFIG[pvr.resultat] : null;
                const reservesOuvertes = pvr.reserves.filter(r => r.statut === "OUVERTE").length;
                const nonConformes    = pvr.lignes.filter(l => l.conformite === "NON_CONFORME").length;
                return (
                  <tr key={pvr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-brand-navy">{pvr.numero}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {TYPE_LABELS[pvr.typeSupport] ?? pvr.typeSupport}
                    </td>
                    <td className="px-4 py-3 max-w-48 truncate text-slate-700 font-medium">
                      {pvr.objet ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{pvr.fournisseur?.nom ?? "—"}</p>
                      {pvr.chantier && <p className="text-xs text-slate-400">{pvr.chantier.nom}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {pvr.dateReception ? formatDate(pvr.dateReception) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {resCfg ? (
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${resCfg.color}`}>
                          {resCfg.label}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {reservesOuvertes > 0 && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">
                          {reservesOuvertes} ouvertes
                        </span>
                      )}
                      {reservesOuvertes === 0 && pvr.reserves.length > 0 && (
                        <span className="text-green-600 text-xs">Toutes levées ✓</span>
                      )}
                      {pvr.reserves.length === 0 && "—"}
                    </td>
                    <td className="px-4 py-3"><Badge tone={cfg.tone}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/pv-reception/${pvr.id}`}
                        className="text-brand-blue text-xs font-medium hover:underline">Ouvrir</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
