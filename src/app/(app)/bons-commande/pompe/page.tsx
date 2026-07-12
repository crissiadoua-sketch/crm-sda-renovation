export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { creerBonReservationPompe } from "@/lib/actions/bons-reservation-pompe";

const STATUT_CONFIG: Record<string, { label: string; tone: "green" | "blue" | "orange" | "gray" | "red" | "navy" }> = {
  BROUILLON: { label: "Brouillon", tone: "gray"  },
  ENVOYE:    { label: "Envoyé",    tone: "blue"  },
  CONFIRME:  { label: "Confirmé",  tone: "navy"  },
  ANNULE:    { label: "Annulé",    tone: "red"   },
};

export default async function BonsReservationPompePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; chantierId?: string }>;
}) {
  const { q, statut, chantierId } = await searchParams;

  const [brps, fournisseurs, chantiers, clients] = await Promise.all([
    prisma.bonReservationPompe.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(chantierId ? { chantierId } : {}),
        ...(q ? {
          OR: [
            { numero:       { contains: q } },
            { fournisseur:  { nom: { contains: q } } },
            { nomChantier:  { contains: q } },
          ],
        } : {}),
      },
      include: {
        fournisseur: { select: { nom: true } },
        chantier:    { select: { nom: true } },
        client:      { select: { raisonSociale: true, nom: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, raisonSociale: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/bons-commande" className="hover:text-brand-blue">Bons de commande</Link>
        <span>/</span>
        <span className="text-brand-navy font-semibold">Réservation Pompe</span>
      </div>

      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#29ABE2] to-[#1B3F94]">
            <span className="text-lg font-black text-white">P</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-brand-navy">Réservations Pompe à Béton</h2>
            <p className="text-sm text-slate-500">{brps.length} réservation(s)</p>
          </div>
        </div>

        <form action={creerBonReservationPompe} className="flex flex-wrap items-end gap-2">
          <select name="fournisseurId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">— Société pompage —</option>
            {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </select>
          <select name="chantierId" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Chantier (optionnel)</option>
            {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
          <button type="submit"
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:opacity-90 transition">
            + Nouvelle réservation
          </button>
        </form>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q}
          placeholder="Rechercher numéro, pompage, chantier…"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        <select name="statut" defaultValue={statut ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select name="chantierId" defaultValue={chantierId ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les chantiers</option>
          {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">
          Filtrer
        </button>
        {(statut || q || chantierId) && (
          <Link href="/bons-commande/pompe"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Liste */}
      {brps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-4xl mb-3">🏗️</p>
          <p className="font-semibold text-slate-600">Aucune réservation de pompe</p>
          <p className="text-sm text-slate-400 mt-1">Créez votre première réservation ci-dessus.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Société pompage</th>
                <th className="px-4 py-3">Chantier / Client</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Arrivée pompe</th>
                <th className="px-4 py-3 text-right">Cubage m³</th>
                <th className="px-4 py-3">Type pompe</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {brps.map(brp => {
                const cfg = STATUT_CONFIG[brp.statut] ?? STATUT_CONFIG.BROUILLON;
                const chantierLabel = brp.nomChantier ?? brp.chantier?.nom;
                const clientLabel   = brp.client?.raisonSociale ?? brp.client?.nom;
                return (
                  <tr key={brp.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-brand-navy">{brp.numero}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      <Link href={`/fournisseurs/${brp.fournisseurId}`} className="hover:underline text-brand-blue">
                        {brp.fournisseur.nom}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {brp.chantierId ? (
                        <Link href={`/chantiers/${brp.chantierId}`} className="font-medium text-brand-blue hover:underline">
                          {chantierLabel ?? "—"}
                        </Link>
                      ) : (
                        <p className="text-slate-700 font-medium">{chantierLabel ?? "—"}</p>
                      )}
                      {clientLabel && <p className="text-xs text-slate-400">{clientLabel}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {brp.dateReservation ? formatDate(brp.dateReservation) : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {brp.heureArriveePompe ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-brand-navy">
                      {brp.cubagePrévu != null ? `${brp.cubagePrévu} m³` : "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {brp.typePompe ?? "—"}
                      {brp.avecFleche && brp.flecheMetres ? ` · Flèche ${brp.flecheMetres}m` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={cfg.tone}>{cfg.label}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/bons-commande/pompe/${brp.id}`}
                        className="text-brand-blue text-xs font-medium hover:underline">
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
