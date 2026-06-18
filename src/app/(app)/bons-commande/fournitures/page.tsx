import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatEuros, formatDate } from "@/lib/format";
import { creerBonCommandeFournitures } from "@/lib/actions/bons-commande-fournitures";

const STATUT_CONFIG: Record<string, { label: string; tone: "green" | "blue" | "orange" | "gray" | "red" | "navy" }> = {
  BROUILLON:      { label: "Brouillon",          tone: "gray"   },
  EN_ATTENTE:     { label: "En attente valid.",   tone: "orange" },
  VALIDE:         { label: "Validé",              tone: "navy"   },
  ENVOYE:         { label: "Envoyé",              tone: "blue"   },
  RECU:           { label: "Reçu ✓",             tone: "green"  },
  ANNULE:         { label: "Annulé",              tone: "red"    },
};

const TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  BUREAU:   { label: "Bureau",    emoji: "🖥️",  color: "bg-blue-100 text-blue-700"   },
  ENTREPOT: { label: "Entrepôt",  emoji: "🏭",  color: "bg-amber-100 text-amber-700" },
  MIXTE:    { label: "Mixte",     emoji: "📦",  color: "bg-slate-100 text-slate-700" },
};

const SERVICE_LABELS: Record<string, string> = {
  ADMINISTRATION: "Administration",
  DIRECTION:      "Direction",
  PRODUCTION:     "Production",
  COMMERCIAL:     "Commercial",
  AUTRE:          "Autre",
};

export default async function BonsCommandeFournituresPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; type?: string }>;
}) {
  const { q, statut, type } = await searchParams;

  const [bcfs, fournisseurs] = await Promise.all([
    prisma.bonCommandeFournitures.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(type   ? { type }   : {}),
        ...(q ? {
          OR: [
            { numero:      { contains: q } },
            { fournisseur: { nom: { contains: q } } },
            { service:     { contains: q } },
          ],
        } : {}),
      },
      include: {
        fournisseur: { select: { nom: true } },
        lignes:      { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  // KPIs
  const totalHT  = bcfs.filter(b => b.statut !== "ANNULE").reduce((s, b) => s + b.totalHT, 0);
  const totalTTC = bcfs.filter(b => b.statut !== "ANNULE").reduce((s, b) => s + b.totalTTC, 0);
  const enAttente = bcfs.filter(b => b.statut === "EN_ATTENTE").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/bons-commande" className="hover:text-brand-blue">Bons de commande</Link>
        <span>/</span>
        <span className="text-brand-navy font-semibold">Fournitures Bureau & Entrepôt</span>
      </div>

      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#29ABE2] to-[#1B3F94]">
            <span className="text-lg font-black text-white">F</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-navy">BC Fournitures Bureau & Entrepôt</h2>
            <p className="text-sm text-slate-500">Service Administratif · {bcfs.length} commande(s)</p>
          </div>
        </div>

        <form action={creerBonCommandeFournitures} className="flex flex-wrap items-end gap-2">
          <select name="type" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="BUREAU">Bureau</option>
            <option value="ENTREPOT">Entrepôt</option>
            <option value="MIXTE">Mixte</option>
          </select>
          <select name="service" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {Object.entries(SERVICE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select name="fournisseurId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">— Fournisseur —</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <button type="submit"
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition">
            + Nouveau BC fournitures
          </button>
        </form>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Total commandes</p>
          <p className="text-3xl font-black text-brand-navy">{bcfs.length}</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs text-amber-600 uppercase tracking-wide font-semibold">En attente valid.</p>
          <p className="text-3xl font-black text-amber-700">{enAttente}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Total HT</p>
          <p className="text-2xl font-black text-brand-navy">{formatEuros(totalHT)}</p>
        </div>
        <div className="rounded-xl border border-brand-navy/20 bg-brand-navy/5 p-4">
          <p className="text-xs text-brand-navy uppercase tracking-wide font-semibold">Total TTC</p>
          <p className="text-2xl font-black text-brand-navy">{formatEuros(totalTTC)}</p>
        </div>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q}
          placeholder="Rechercher numéro, fournisseur, service…"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        <select name="type" defaultValue={type ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les types</option>
          <option value="BUREAU">Bureau</option>
          <option value="ENTREPOT">Entrepôt</option>
          <option value="MIXTE">Mixte</option>
        </select>
        <select name="statut" defaultValue={statut ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">Filtrer</button>
        {(statut || q || type) && (
          <Link href="/bons-commande/fournitures"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Tableau */}
      {bcfs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-4xl mb-3">📎</p>
          <p className="font-semibold text-slate-600">Aucun bon de commande fournitures</p>
          <p className="text-sm text-slate-400 mt-1">Sélectionnez un type, un service et un fournisseur pour créer le premier BC.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Service / Demandeur</th>
                <th className="px-4 py-3">Date commande</th>
                <th className="px-4 py-3">Livraison souhaitée</th>
                <th className="px-4 py-3 text-right">HT</th>
                <th className="px-4 py-3 text-right">TTC</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bcfs.map(bcf => {
                const cfg  = STATUT_CONFIG[bcf.statut] ?? STATUT_CONFIG.BROUILLON;
                const tcfg = TYPE_CONFIG[bcf.type] ?? TYPE_CONFIG.BUREAU;
                return (
                  <tr key={bcf.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-brand-navy">{bcf.numero}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tcfg.color}`}>
                        {tcfg.emoji} {tcfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{bcf.fournisseur.nom}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{SERVICE_LABELS[bcf.service] ?? bcf.service}</p>
                      {bcf.demandeurNom && <p className="text-xs text-slate-400">{bcf.demandeurNom}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(bcf.dateCommande)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {bcf.dateSouhaitee ? formatDate(bcf.dateSouhaitee) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-medium">{formatEuros(bcf.totalHT)}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-navy">{formatEuros(bcf.totalTTC)}</td>
                    <td className="px-4 py-3"><Badge tone={cfg.tone}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/bons-commande/fournitures/${bcf.id}`}
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
