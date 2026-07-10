export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatEuros, formatDate } from "@/lib/format";
import { creerContrat } from "@/lib/actions/contrats-sous-traitance";

const STATUT_CONFIG: Record<string, { label: string; tone: "green" | "blue" | "orange" | "gray" | "red" | "navy" }> = {
  BROUILLON: { label: "Brouillon",  tone: "gray"   },
  ENVOYE:    { label: "Envoyé",     tone: "blue"   },
  SIGNE:     { label: "Signé ✓",   tone: "green"  },
  TERMINE:   { label: "Terminé",   tone: "navy"   },
  RESILIE:   { label: "Résilié",   tone: "orange" },
  ANNULE:    { label: "Annulé",    tone: "red"    },
};

export default async function ContratsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  const { q, statut } = await searchParams;

  const [contrats, sousTraitants, chantiers] = await Promise.all([
    prisma.contratSousTraitance.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(q ? { OR: [{ numero: { contains: q } }, { sousTraitant: { nom: { contains: q } } }] } : {}),
      },
      include: {
        sousTraitant: { select: { nom: true } },
        chantier:     { select: { nom: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sousTraitant.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Contrats de sous-traitance</h2>
          <p className="mt-1 text-sm text-slate-500">{contrats.length} contrat{contrats.length !== 1 ? "s" : ""}</p>
        </div>

        <form action={creerContrat} className="flex flex-wrap items-end gap-2">
          <select name="sousTraitantId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">— Sous-traitant —</option>
            {sousTraitants.map(s => <option key={s.id} value={s.id}>{s.nom}</option>)}
          </select>
          <select name="chantierId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">— Chantier —</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition">
            + Nouveau contrat
          </button>
        </form>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q} placeholder="Rechercher numéro, sous-traitant…"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        <select name="statut" defaultValue={statut ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">Filtrer</button>
        {(statut || q) && (
          <Link href="/contrats-sous-traitance" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Réinitialiser</Link>
        )}
      </form>

      {contrats.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun contrat de sous-traitance.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Sous-traitant</th>
                <th className="px-4 py-3">Chantier</th>
                <th className="px-4 py-3">Lot / Objet</th>
                <th className="px-4 py-3 text-right">Montant HT</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Signé le</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {contrats.map(c => {
                const cfg = STATUT_CONFIG[c.statut] ?? STATUT_CONFIG.BROUILLON;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{c.numero}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{c.sousTraitant.nom}</td>
                    <td className="px-4 py-3 text-slate-500">{c.chantier.nom}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[160px] truncate">{c.lot ?? c.objet ?? "—"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-brand-navy">
                      {c.montantHT != null ? formatEuros(c.montantHT) : "—"}
                    </td>
                    <td className="px-4 py-3"><Badge tone={cfg.tone}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {c.dateSignature ? formatDate(c.dateSignature) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/contrats-sous-traitance/${c.id}`} className="text-brand-blue text-xs hover:underline font-medium">
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
