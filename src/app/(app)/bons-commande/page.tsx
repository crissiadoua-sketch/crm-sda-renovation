import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatEuros, formatDate } from "@/lib/format";
import { creerBonCommande } from "@/lib/actions/bons-commande";

const STATUT_CONFIG: Record<string, { label: string; tone: "green" | "blue" | "orange" | "gray" | "red" | "navy" }> = {
  BROUILLON:     { label: "Brouillon",       tone: "gray"   },
  ENVOYE:        { label: "Envoyé",          tone: "blue"   },
  CONFIRME:      { label: "Confirmé",        tone: "navy"   },
  RECU_PARTIEL:  { label: "Reçu partiel.",   tone: "orange" },
  RECU:          { label: "Reçu complet",    tone: "green"  },
  ANNULE:        { label: "Annulé",          tone: "red"    },
  EN_ATTENTE:    { label: "En attente",      tone: "orange" },
  VALIDE:        { label: "Validé",          tone: "green"  },
};

export default async function BonsCommandePage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string; chantierId?: string }>;
}) {
  const { statut, q, chantierId } = await searchParams;

  const [bcs, bcbs, bcfs, fournisseurs, chantiers] = await Promise.all([
    prisma.bonCommande.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(chantierId ? { chantierId } : {}),
        ...(q ? { OR: [{ numero: { contains: q } }, { fournisseur: { nom: { contains: q } } }] } : {}),
      },
      include: {
        fournisseur: { select: { nom: true } },
        chantier:    { select: { id: true, nom: true } },
        lignes:      { select: { id: true } },
        bonsLivraison: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bonCommandeBeton.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(chantierId ? { chantierId } : {}),
        ...(q ? { OR: [{ numero: { contains: q } }, { fournisseur: { nom: { contains: q } } }] } : {}),
      },
      include: {
        fournisseur: { select: { nom: true } },
        chantier:    { select: { id: true, nom: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.bonCommandeFournitures.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(chantierId ? { chantierId } : {}),
        ...(q ? { OR: [{ numero: { contains: q } }, { fournisseur: { nom: { contains: q } } }] } : {}),
      },
      include: {
        fournisseur: { select: { nom: true } },
        chantier:    { select: { id: true, nom: true } },
        lignes:      { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true } }),
  ]);

  const totalHT =
    bcs.filter(b => b.statut !== "ANNULE").reduce((s, b) => s + b.totalHT, 0)
    + bcbs.filter(b => b.statut !== "ANNULE").reduce((s, b) => s + b.totalHT, 0)
    + bcfs.filter(b => b.statut !== "ANNULE").reduce((s, b) => s + b.totalHT, 0);

  const totalCount = bcs.length + bcbs.length + bcfs.length;
  const chantierFiltre = chantierId ? chantiers.find(c => c.id === chantierId) : null;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Bons de commande</h2>
          <p className="mt-1 text-sm text-slate-500">
            {totalCount} commande{totalCount > 1 ? "s" : ""}
            {chantierFiltre && <> · <span className="font-medium text-brand-navy">{chantierFiltre.nom}</span></>}
            {" · "}Total engagé HT : <strong>{formatEuros(totalHT)}</strong>
          </p>
        </div>
        {/* Création rapide BC */}
        <form action={creerBonCommande} className="flex flex-wrap items-end gap-2">
          <select name="fournisseurId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">— Fournisseur —</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <select name="chantierId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Chantier (optionnel)</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition">
            + Nouveau BC
          </button>
        </form>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q} placeholder="Rechercher numéro, fournisseur…"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        <select name="chantierId" defaultValue={chantierId ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les chantiers</option>
          {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <select name="statut" defaultValue={statut ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">Filtrer</button>
        {(statut || q || chantierId) && (
          <Link href="/bons-commande" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Réinitialiser</Link>
        )}
      </form>

      {/* Liste */}
      {totalCount === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun bon de commande.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Chantier</th>
                <th className="px-4 py-3">Désignation</th>
                <th className="px-4 py-3 text-right">Total HT</th>
                <th className="px-4 py-3 text-right">Total TTC</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">

              {/* ── BC Béton ── */}
              {bcbs.length > 0 && (
                <tr className="bg-slate-100/60">
                  <td colSpan={9} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    🧱 Béton prêt à l'emploi ({bcbs.length})
                  </td>
                </tr>
              )}
              {bcbs.map((bcb) => {
                const cfg = STATUT_CONFIG[bcb.statut] ?? STATUT_CONFIG.BROUILLON;
                return (
                  <tr key={bcb.id} className="hover:bg-blue-50/40 transition-colors bg-blue-50/20">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">
                      {bcb.numero}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{bcb.fournisseur.nom}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {bcb.chantier
                        ? <Link href={`/chantiers/${bcb.chantier.id}`} className="hover:underline text-brand-blue">{bcb.chantier.nom}</Link>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {bcb.classeResistance ?? "Béton"}{bcb.qteTotale ? ` — ${bcb.qteTotale} m³` : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-navy">
                      {bcb.totalHT > 0 ? formatEuros(bcb.totalHT) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {bcb.totalTTC > 0 ? formatEuros(bcb.totalTTC) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3"><Badge tone={cfg.tone}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(bcb.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/bons-commande/beton/${bcb.id}`} className="text-brand-blue text-xs hover:underline font-medium">
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {/* ── BC Fournitures ── */}
              {bcfs.length > 0 && (
                <tr className="bg-slate-100/60">
                  <td colSpan={9} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    📦 Fournitures ({bcfs.length})
                  </td>
                </tr>
              )}
              {bcfs.map((bcf) => {
                const cfg = STATUT_CONFIG[bcf.statut] ?? STATUT_CONFIG.BROUILLON;
                return (
                  <tr key={bcf.id} className="hover:bg-amber-50/40 transition-colors bg-amber-50/10">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">
                      {bcf.numero}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{bcf.fournisseur.nom}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {bcf.chantier
                        ? <Link href={`/chantiers/${bcf.chantier.id}`} className="hover:underline text-brand-blue">{bcf.chantier.nom}</Link>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {bcf.lignes.length} ligne{bcf.lignes.length > 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-navy">
                      {bcf.totalHT > 0 ? formatEuros(bcf.totalHT) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {bcf.totalTTC > 0 ? formatEuros(bcf.totalTTC) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3"><Badge tone={cfg.tone}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(bcf.dateCommande)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/bons-commande/fournitures/${bcf.id}`} className="text-brand-blue text-xs hover:underline font-medium">
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {/* ── BC classiques (matériaux chantier) ── */}
              {bcs.length > 0 && (
                <tr className="bg-slate-100/60">
                  <td colSpan={9} className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    🏗 Matériaux chantier ({bcs.length})
                  </td>
                </tr>
              )}
              {bcs.map((bc) => {
                const cfg = STATUT_CONFIG[bc.statut] ?? STATUT_CONFIG.BROUILLON;
                return (
                  <tr key={bc.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{bc.numero}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{bc.fournisseur.nom}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {bc.chantier
                        ? <Link href={`/chantiers/${bc.chantier.id}`} className="hover:underline text-brand-blue">{bc.chantier.nom}</Link>
                        : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {bc.lignes.length} ligne{bc.lignes.length > 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-navy">{formatEuros(bc.totalHT)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatEuros(bc.totalTTC)}</td>
                    <td className="px-4 py-3"><Badge tone={cfg.tone}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(bc.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/bons-commande/${bc.id}`} className="text-brand-blue text-xs hover:underline font-medium">
                        Ouvrir
                      </Link>
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
