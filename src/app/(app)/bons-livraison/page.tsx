export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { creerBonLivraison } from "@/lib/actions/bons-livraison";

const STATUT_CONFIG: Record<string, { label: string; tone: "green" | "blue" | "orange" | "gray" | "red" | "navy" }> = {
  ATTENDU:  { label: "Attendu",       tone: "blue"   },
  PARTIEL:  { label: "Reçu partiel",  tone: "orange" },
  COMPLET:  { label: "Reçu complet",  tone: "green"  },
};

export default async function BonsLivraisonPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string; q?: string; chantierId?: string }>;
}) {
  const { statut, q, chantierId } = await searchParams;

  const [bls, fournisseurs, chantiers, bcsDisponibles] = await Promise.all([
    prisma.bonLivraison.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(chantierId ? { chantierId } : {}),
        ...(q ? { OR: [{ numero: { contains: q } }, { fournisseur: { nom: { contains: q } } }] } : {}),
      },
      include: {
        fournisseur: { select: { nom: true } },
        chantier:    { select: { nom: true } },
        bonCommande: { select: { numero: true } },
        lignes:      { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true } }),
    prisma.bonCommande.findMany({
      where: { statut: { notIn: ["ANNULE", "RECU"] } },
      orderBy: { createdAt: "desc" },
      select: { id: true, numero: true, fournisseur: { select: { nom: true } } },
    }),
  ]);

  const enAttente = bls.filter(b => b.statut === "ATTENDU").length;
  const partiel   = bls.filter(b => b.statut === "PARTIEL").length;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Bons de livraison</h2>
          <p className="mt-1 text-sm text-slate-500">
            {bls.length} BL · <span className="text-amber-600">{enAttente} en attente</span>
            {partiel > 0 && <> · <span className="text-orange-600">{partiel} partiels</span></>}
          </p>
        </div>

        {/* Création rapide */}
        <form action={creerBonLivraison} className="flex flex-wrap items-end gap-2">
          <select name="fournisseurId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">— Fournisseur —</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <select name="chantierId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Chantier (optionnel)</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <select name="bonCommandeId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Lier à un BC (optionnel)</option>
            {bcsDisponibles.map(bc => (
              <option key={bc.id} value={bc.id}>{bc.numero} — {bc.fournisseur.nom}</option>
            ))}
          </select>
          <button type="submit" className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition">
            + Nouveau BL
          </button>
        </form>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q} placeholder="Rechercher numéro, fournisseur…"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        <select name="statut" defaultValue={statut ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="chantierId" defaultValue={chantierId ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les chantiers</option>
          {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">Filtrer</button>
        {(statut || q || chantierId) && (
          <Link href="/bons-livraison" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Réinitialiser</Link>
        )}
      </form>

      {/* Liste */}
      {bls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun bon de livraison.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Fournisseur</th>
                <th className="px-4 py-3">Chantier</th>
                <th className="px-4 py-3">BC lié</th>
                <th className="px-4 py-3 text-center">Lignes</th>
                <th className="px-4 py-3">Livraison prévue</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bls.map((bl) => {
                const cfg = STATUT_CONFIG[bl.statut] ?? STATUT_CONFIG.ATTENDU;
                return (
                  <tr key={bl.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{bl.numero}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{bl.fournisseur.nom}</td>
                    <td className="px-4 py-3 text-slate-500">{bl.chantier?.nom ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {bl.bonCommande ? (
                        <Link href={`/bons-commande/${(bl as typeof bl & { bonCommandeId?: string }).bonCommandeId}`} className="text-brand-blue hover:underline">
                          {bl.bonCommande.numero}
                        </Link>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-500">{bl.lignes.length}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {bl.dateLivraison ? formatDate(bl.dateLivraison) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={cfg.tone}>{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/bons-livraison/${bl.id}`} className="text-brand-blue text-xs hover:underline font-medium">
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
