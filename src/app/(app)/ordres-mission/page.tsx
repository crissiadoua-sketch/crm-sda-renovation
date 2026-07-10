export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { NouvelOmForm } from "@/components/ordres-mission/nouvel-om-form";

const STATUT_CONFIG: Record<string, { label: string; tone: "green" | "blue" | "orange" | "gray" | "red" | "navy" }> = {
  BROUILLON: { label: "Brouillon",  tone: "gray"   },
  ENVOYE:    { label: "Envoyé",     tone: "blue"   },
  EN_COURS:  { label: "En cours",   tone: "orange" },
  TERMINE:   { label: "Terminé",    tone: "green"  },
  ANNULE:    { label: "Annulé",     tone: "red"    },
};

export default async function OrdresMissionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string }>;
}) {
  const { q, statut } = await searchParams;

  const [oms, interimaires] = await Promise.all([
    prisma.ordreMission.findMany({
      where: {
        ...(statut ? { statut } : {}),
        ...(q ? {
          OR: [
            { numero: { contains: q } },
            { titre:  { contains: q } },
            { interimaire: { nom:    { contains: q } } },
            { interimaire: { prenom: { contains: q } } },
            { interimaire: { agence: { contains: q } } },
          ],
        } : {}),
      },
      include: {
        interimaire: { select: { nom: true, prenom: true, corpsEtat: true, agence: true } },
        chantier:    { select: { nom: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.interimaire.findMany({
      where: { actif: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: { id: true, nom: true, prenom: true, corpsEtat: true, agence: true },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Ordres de mission</h2>
          <p className="mt-1 text-sm text-slate-500">
            {oms.length} ordre{oms.length !== 1 ? "s" : ""} · Destinés aux intérimaires / agences d&apos;intérim
          </p>
        </div>
        <NouvelOmForm interimaires={interimaires} />
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input name="q" type="search" defaultValue={q} placeholder="Rechercher numéro, titre, intérimaire, agence…"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        <select name="statut" defaultValue={statut ?? ""} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Tous les statuts</option>
          {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">Filtrer</button>
        {(statut || q) && (
          <Link href="/ordres-mission" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Réinitialiser
          </Link>
        )}
      </form>

      {oms.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun ordre de mission.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Numéro</th>
                <th className="px-4 py-3">Objet</th>
                <th className="px-4 py-3">Intérimaire</th>
                <th className="px-4 py-3">Agence</th>
                <th className="px-4 py-3">Chantier</th>
                <th className="px-4 py-3">Début</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {oms.map(om => {
                const cfg = STATUT_CONFIG[om.statut] ?? STATUT_CONFIG.BROUILLON;
                const interimaire = om.interimaire
                  ? `${om.interimaire.prenom} ${om.interimaire.nom}`
                  : "—";
                return (
                  <tr key={om.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-navy">{om.numero}</td>
                    <td className="px-4 py-3 font-medium text-slate-700 max-w-[180px] truncate">{om.titre}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{interimaire}</div>
                      {om.interimaire?.corpsEtat && (
                        <div className="text-xs text-slate-400">{om.interimaire.corpsEtat}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{om.interimaire?.agence ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">{om.chantier?.nom ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(om.dateDebut)}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{om.dateFin ? formatDate(om.dateFin) : "—"}</td>
                    <td className="px-4 py-3"><Badge tone={cfg.tone}>{cfg.label}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/ordres-mission/${om.id}`} className="text-brand-blue text-xs hover:underline font-medium">
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
