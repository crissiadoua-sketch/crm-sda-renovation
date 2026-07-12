export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatEuros, formatDate } from "@/lib/format";
import { creerBonCommandeBeton } from "@/lib/actions/bons-commande-beton";

const STATUT_CONFIG: Record<string, { label: string; tone: "green" | "blue" | "orange" | "gray" | "red" | "navy" }> = {
  BROUILLON: { label: "Brouillon",  tone: "gray"   },
  ENVOYE:    { label: "Envoyé",     tone: "blue"   },
  CONFIRME:  { label: "Confirmé",   tone: "navy"   },
  LIVRE:     { label: "Livré ✓",    tone: "green"  },
  ANNULE:    { label: "Annulé",     tone: "red"    },
};

export default async function BonsCommandeBetonPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; chantierId?: string; fournisseurId?: string }>;
}) {
  const { q, statut, chantierId, fournisseurId } = await searchParams;

  const [bcbs, fournisseurs, chantiers] = await Promise.all([
    prisma.bonCommandeBeton.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(q ? { OR: [{ numero: { contains: q } }, { fournisseur: { nom: { contains: q } } }, { nomChantier: { contains: q } }] } : {}),
      },
      include: {
        fournisseur: { select: { nom: true } },
        chantier:    { select: { nom: true } },
        livraisons:  { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true } }),
  ]);

  const qteTotal = bcbs.filter(b => b.statut !== "ANNULE").reduce((s, b) => s + b.qteTotale, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/bons-commande" className="hover:text-brand-blue">Bons de commande</Link>
        <span>/</span>
        <span className="text-brand-navy font-semibold">Béton</span>
      </div>

      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-navy">
              <span className="text-lg font-black text-white">B</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-brand-navy">Bons de commande Béton</h2>
              <p className="text-sm text-slate-500">
                {bcbs.length} BC · {qteTotal.toFixed(1)} m³ commandés · Norme NF EN 206 / CN
              </p>
            </div>
          </div>
        </div>

        <form action={creerBonCommandeBeton} className="flex flex-wrap items-end gap-2">
          <select name="fournisseurId" required defaultValue={fournisseurId ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">— Centrale à béton —</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <select name="chantierId" defaultValue={chantierId ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Chantier (optionnel)</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button type="submit"
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition">
            + Nouveau BC Béton
          </button>
        </form>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q} placeholder="Rechercher numéro, fournisseur, chantier…"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        <select name="statut" defaultValue={statut ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">Filtrer</button>
        {(statut || q) && (
          <Link href="/bons-commande/beton" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Alerte NF EN 206 */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>NF EN 206/CN — NA.7.5 :</strong> En France, tout ajout d'eau sur le chantier autre que celui lié à un adjuvant
        prévu dans la formulation du béton est interdit. Les bons de commande générés comportent cette mention obligatoire.
      </div>

      {/* Liste */}
      {bcbs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun bon de commande béton.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Centrale</th>
                <th className="px-4 py-3">Chantier</th>
                <th className="px-4 py-3">Classe</th>
                <th className="px-4 py-3 text-right">m³ total</th>
                <th className="px-4 py-3 text-right">Prix / m³</th>
                <th className="px-4 py-3">Livraison</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bcbs.map(bcb => {
                const cfg = STATUT_CONFIG[bcb.statut] ?? STATUT_CONFIG.BROUILLON;
                return (
                  <tr key={bcb.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{bcb.numero}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{bcb.fournisseur.nom}</td>
                    <td className="px-4 py-3 text-slate-500">{bcb.nomChantier ?? bcb.chantier?.nom ?? "—"}</td>
                    <td className="px-4 py-3">
                      {bcb.classeResistance ? (
                        <span className="rounded-full bg-brand-navy/10 px-2 py-0.5 text-[10px] font-bold text-brand-navy">
                          {bcb.classeResistance}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-navy">{bcb.qteTotale} m³</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {bcb.prixM3 != null ? `${bcb.prixM3.toFixed(2)} €` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {bcb.dateLivraison ? formatDate(bcb.dateLivraison) : "—"}
                      {bcb.heureDebut ? ` · ${bcb.heureDebut}` : ""}
                    </td>
                    <td className="px-4 py-3"><Badge tone={cfg.tone}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/bons-commande/beton/${bcb.id}`}
                        className="text-brand-blue text-xs hover:underline font-medium">
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
