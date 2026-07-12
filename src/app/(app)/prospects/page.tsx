export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { AutoSubmitSelect } from "@/components/ui/auto-submit-select";
import { formatDate } from "@/lib/format";
import { creerProspect, convertirEnClient, changerStatutProspect } from "@/lib/actions/prospects";

const STATUT_CONFIG: Record<string, { label: string; tone: "green" | "blue" | "orange" | "gray" | "red" | "navy" }> = {
  NOUVEAU:      { label: "Nouveau",       tone: "blue"   },
  CONTACTE:     { label: "Contacté",      tone: "orange" },
  DEVIS_ENVOYE: { label: "Devis envoyé",  tone: "navy"   },
  GAGNE:        { label: "Gagné ✓",       tone: "green"  },
  PERDU:        { label: "Perdu",         tone: "red"    },
};

const SOURCE_LABELS: Record<string, string> = {
  SITE_WEB:       "Site web",
  TELEPHONE:      "Téléphone",
  EMAIL:          "Email",
  RECOMMANDATION: "Recommandation",
  AUTRE:          "Autre",
};

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  const { q, statut } = await searchParams;

  const prospects = await prisma.prospect.findMany({
    where: {
      ...(statut ? { statut } : {}),
      ...(q ? {
        OR: [
          { nom: { contains: q } },
          { prenom: { contains: q } },
          { email: { contains: q } },
          { telephone: { contains: q } },
          { ville: { contains: q } },
        ],
      } : {}),
    },
    include: { client: { select: { id: true, nom: true, raisonSociale: true } } },
    orderBy: { createdAt: "desc" },
  });

  const stats = {
    total:   prospects.length,
    nouveau: prospects.filter(p => p.statut === "NOUVEAU").length,
    gagne:   prospects.filter(p => p.statut === "GAGNE").length,
    perdu:   prospects.filter(p => p.statut === "PERDU").length,
  };

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Prospects</h2>
          <p className="mt-1 text-sm text-slate-500">
            {stats.total} prospect{stats.total !== 1 ? "s" : ""} ·{" "}
            <span className="text-blue-600">{stats.nouveau} nouveau{stats.nouveau !== 1 ? "x" : ""}</span> ·{" "}
            <span className="text-emerald-600">{stats.gagne} gagné{stats.gagne !== 1 ? "s" : ""}</span>
          </p>
        </div>

        {/* Ajout rapide */}
        <form action={creerProspect} className="flex flex-wrap items-end gap-2">
          <input name="nom" type="text" required placeholder="Nom *" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-36" />
          <input name="prenom" type="text" placeholder="Prénom" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-28" />
          <input name="telephone" type="tel" placeholder="Téléphone" className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-36" />
          <select name="source" className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {Object.entries(SOURCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <button type="submit" className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition">
            + Ajouter
          </button>
        </form>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q} placeholder="Rechercher nom, email, ville…"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        <select name="statut" defaultValue={statut ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">Filtrer</button>
        {(statut || q) && (
          <Link href="/prospects" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">Réinitialiser</Link>
        )}
      </form>

      {/* Pipeline Kanban simplifié */}
      <div className="grid grid-cols-5 gap-3">
        {Object.entries(STATUT_CONFIG).map(([key, cfg]) => {
          const count = prospects.filter(p => p.statut === key).length;
          return (
            <div key={key} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm text-center">
              <Badge tone={cfg.tone}>{cfg.label}</Badge>
              <p className="mt-1 text-2xl font-bold text-brand-navy">{count}</p>
            </div>
          );
        })}
      </div>

      {/* Liste */}
      {prospects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun prospect.</p>
          <p className="text-xs text-slate-400 mt-1">Les demandes du site web arrivent ici automatiquement via l'API /api/leads</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Ville</th>
                <th className="px-4 py-3">Travaux</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {prospects.map(p => {
                const cfg = STATUT_CONFIG[p.statut] ?? STATUT_CONFIG.NOUVEAU;
                return (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-brand-navy">
                        {p.prenom ? `${p.prenom} ${p.nom}` : p.nom}
                      </p>
                      {p.societe && <p className="text-xs text-slate-400">{p.societe}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {p.telephone && <p>{p.telephone}</p>}
                      {p.email && <p className="truncate max-w-[140px]">{p.email}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{p.ville ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-[120px] truncate">{p.travaux ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{SOURCE_LABELS[p.source] ?? p.source}</td>
                    <td className="px-4 py-3">
                      <form action={changerStatutProspect.bind(null, p.id)}>
                        <AutoSubmitSelect name="statut" defaultValue={p.statut}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs">
                          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </AutoSubmitSelect>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{formatDate(p.createdAt)}</td>
                    <td className="px-4 py-3">
                      {p.clientId ? (
                        <Link href={`/clients/${p.clientId}`} className="text-emerald-600 text-xs hover:underline font-medium">
                          {p.client?.raisonSociale ?? p.client?.nom ?? "Voir client"} →
                        </Link>
                      ) : (
                        <form action={convertirEnClient.bind(null, p.id)}>
                          <button type="submit" className="text-brand-blue text-xs hover:underline font-medium whitespace-nowrap">
                            → Convertir client
                          </button>
                        </form>
                      )}
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
