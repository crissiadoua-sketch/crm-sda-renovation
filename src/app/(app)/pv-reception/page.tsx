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
  searchParams: Promise<{ q?: string; statut?: string; resultat?: string; categorie?: string }>;
}) {
  const { q, statut, resultat } = await searchParams;

  const categorie = (await searchParams).categorie;

  const [pvrs, fournisseurs, chantiers, clients, sousTraitants] = await Promise.all([
    prisma.pvReception.findMany({
      where: {
        ...(categorie ? { categorie } : {}),
        ...(statut ? { statut } : {}),
        ...(resultat ? { resultat } : {}),
        ...(q ? {
          OR: [
            { numero: { contains: q } },
            { objet:  { contains: q } },
            { fournisseur:  { nom: { contains: q } } },
            { sousTraitant: { nom: { contains: q } } },
            { client:       { nom: { contains: q } } },
            { chantier:     { nom: { contains: q } } },
          ],
        } : {}),
      },
      include: {
        fournisseur:  { select: { nom: true } },
        sousTraitant: { select: { nom: true } },
        chantier:     { select: { nom: true } },
        client:       { select: { nom: true, raisonSociale: true } },
        reserves:     { select: { id: true, statut: true } },
        lignes:       { select: { id: true, conformite: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, include: { client: { select: { id: true, nom: true, raisonSociale: true } } } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, raisonSociale: true } }),
    prisma.sousTraitant.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, specialite: true } }),
  ]);

  // KPIs
  const signés       = pvrs.filter(p => p.statut === "SIGNE").length;
  const avecReserves = pvrs.filter(p => p.resultat === "ACCEPTE_RESERVES").length;
  const reservesOuvertes = pvrs.flatMap(p => p.reserves).filter(r => r.statut === "OUVERTE").length;
  const nbTravauxClient = pvrs.filter(p => p.categorie === "TRAVAUX_CLIENT").length;
  const nbTravauxST     = pvrs.filter(p => p.categorie === "TRAVAUX_SOUS_TRAITANT").length;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#29ABE2] to-[#1B3F94]">
            <span className="text-lg font-black text-white">✓</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-navy">PV de Réception</h2>
            <p className="text-sm text-slate-500">Travaux client · Travaux sous-traitant · Prestations support</p>
          </div>
        </div>

        {/* ── 3 boutons de création ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* PV Travaux Client */}
          <form action={creerPvReception} className="flex flex-col gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-3">
            <input type="hidden" name="categorie" value="TRAVAUX_CLIENT" />
            <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">🏗 PV Travaux — Client</p>
            <p className="text-[11px] text-emerald-600">Réception des travaux réalisés par SDA Rénovation, remis au maître d'ouvrage.</p>
            <select name="chantierId" className="rounded-lg border border-emerald-200 bg-white px-2 py-1.5 text-xs">
              <option value="">Chantier (optionnel)</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
            <button type="submit" className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition">
              + Créer PV Travaux Client
            </button>
          </form>

          {/* PV Travaux Sous-traitant */}
          <form action={creerPvReception} className="flex flex-col gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 p-3">
            <input type="hidden" name="categorie" value="TRAVAUX_SOUS_TRAITANT" />
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wide">🔧 PV Travaux — Sous-traitant</p>
            <p className="text-[11px] text-amber-600">Réception des travaux d'un sous-traitant, émis par SDA Rénovation.</p>
            <select name="sousTraitantId" className="rounded-lg border border-amber-200 bg-white px-2 py-1.5 text-xs">
              <option value="">Sous-traitant (optionnel)</option>
              {sousTraitants.map(s => <option key={s.id} value={s.id}>{s.nom}{s.specialite ? ` — ${s.specialite}` : ""}</option>)}
            </select>
            <button type="submit" className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition">
              + Créer PV Travaux Sous-traitant
            </button>
          </form>

          {/* PV Support */}
          <form action={creerPvReception} className="flex flex-col gap-2 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
            <input type="hidden" name="categorie" value="SUPPORT" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">📋 PV Réception — Support</p>
            <p className="text-[11px] text-slate-500">Prestation, maintenance, formation, livraison, étude…</p>
            <select name="typeSupport" className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs">
              <option value="PRESTATION">Prestation de service</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="FORMATION">Formation</option>
              <option value="LIVRAISON">Livraison de fournitures</option>
              <option value="ETUDE">Étude / Prestation intellectuelle</option>
              <option value="AUTRE">Autre</option>
            </select>
            <button type="submit" className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition">
              + Créer PV Support
            </button>
          </form>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: pvrs.length, color: "bg-slate-50 border-slate-200", text: "text-slate-700", href: "/pv-reception" },
          { label: "Travaux clients", value: nbTravauxClient, color: "bg-emerald-50 border-emerald-200", text: "text-emerald-700", href: "/pv-reception?categorie=TRAVAUX_CLIENT" },
          { label: "Travaux ST", value: nbTravauxST, color: "bg-amber-50 border-amber-200", text: "text-amber-700", href: "/pv-reception?categorie=TRAVAUX_SOUS_TRAITANT" },
          { label: "Signés", value: signés, color: "bg-blue-50 border-blue-200", text: "text-blue-700", href: "/pv-reception?statut=SIGNE" },
          { label: "Avec réserves", value: avecReserves, color: "bg-orange-50 border-orange-200", text: "text-orange-700", href: "/pv-reception?resultat=ACCEPTE_RESERVES" },
          { label: "Réserves ouvertes", value: reservesOuvertes, color: "bg-red-50 border-red-200", text: "text-red-700", href: "/pv-reception" },
        ].map(kpi => (
          <Link key={kpi.label} href={kpi.href} className={`rounded-xl border p-4 hover:opacity-80 transition ${kpi.color}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{kpi.label}</p>
            <p className={`text-3xl font-black ${kpi.text}`}>{kpi.value}</p>
          </Link>
        ))}
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q}
          placeholder="Rechercher numéro, objet, client, sous-traitant…"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        <select name="categorie" defaultValue={(await searchParams).categorie ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les types</option>
          <option value="TRAVAUX_CLIENT">Travaux client</option>
          <option value="TRAVAUX_SOUS_TRAITANT">Travaux sous-traitant</option>
          <option value="SUPPORT">Support / Prestation</option>
        </select>
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
        {(statut || q || resultat || (await searchParams).categorie) && (
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
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Objet</th>
                <th className="px-4 py-3">Partie / Chantier</th>
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
                const partieNom =
                  pvr.categorie === "TRAVAUX_CLIENT"         ? (pvr.client?.raisonSociale ?? pvr.client?.nom ?? "—") :
                  pvr.categorie === "TRAVAUX_SOUS_TRAITANT"  ? (pvr.sousTraitant?.nom ?? "—") :
                  (pvr.fournisseur?.nom ?? "—");
                const catLabel =
                  pvr.categorie === "TRAVAUX_CLIENT"        ? { label: "🏗 Travaux client",  cls: "bg-emerald-100 text-emerald-700" } :
                  pvr.categorie === "TRAVAUX_SOUS_TRAITANT" ? { label: "🔧 Travaux ST",      cls: "bg-amber-100 text-amber-700"    } :
                  { label: TYPE_LABELS[pvr.typeSupport] ?? pvr.typeSupport, cls: "bg-slate-100 text-slate-600" };
                return (
                  <tr key={pvr.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-brand-navy">{pvr.numero}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${catLabel.cls}`}>{catLabel.label}</span>
                    </td>
                    <td className="px-4 py-3 max-w-48 truncate text-slate-700 font-medium">
                      {pvr.objet ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{partieNom}</p>
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
