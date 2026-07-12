export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { inputClasses } from "@/components/ui/fields";

const modeleTones: Record<string, BadgeTone> = {
  APPEL_OFFRE: "navy",
  PERSONNALISE: "orange",
};
const modeleLabels: Record<string, string> = {
  APPEL_OFFRE: "Appel d'offres",
  PERSONNALISE: "Personnalisé",
};

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  VALIDE: "green",
  TRANSMIS: "blue",
};
const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDE: "Validé",
  TRANSMIS: "Transmis",
};

export default async function PPSPSListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; chantierId?: string }>;
}) {
  const { q, chantierId } = await searchParams;

  const [docs, chantiers] = await Promise.all([
    prisma.pPSPS.findMany({
      where: chantierId ? { chantierId } : undefined,
      include: {
        chantier: { select: { nom: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.chantier.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  // Text filter client-side (titles + chantier.nom)
  const filtered = q
    ? docs.filter(
        (d) =>
          d.titre.toLowerCase().includes(q.toLowerCase()) ||
          d.chantier.nom.toLowerCase().includes(q.toLowerCase()),
      )
    : docs;

  const total = docs.length;
  const brouillons = docs.filter((d) => d.statut === "BROUILLON").length;
  const valides = docs.filter((d) => d.statut === "VALIDE").length;
  const transmis = docs.filter((d) => d.statut === "TRANSMIS").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">PPSPS — Plans de Prévention</h2>
          <p className="mt-1 text-sm text-slate-500">
            {total} document{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtre par chantier */}
          <form method="get" className="flex items-center gap-2">
            <select
              name="chantierId"
              defaultValue={chantierId ?? ""}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
            >
              <option value="">Tous les chantiers</option>
              {chantiers.map((c) => (
                <option key={c.id} value={c.id}>{c.nom}</option>
              ))}
            </select>
            {q && <input type="hidden" name="q" value={q} />}
            <button
              type="submit"
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Filtrer
            </button>
            {chantierId && (
              <Link
                href={q ? `/ppsps?q=${encodeURIComponent(q)}` : "/ppsps"}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition"
              >
                ✕
              </Link>
            )}
          </form>
          <LinkButton href="/ppsps/nouveau">
            <Plus className="h-4 w-4" />
            Créer un PPSPS
          </LinkButton>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3 text-sm text-brand-blue-dark">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
        <p>
          Le <strong>PPSPS</strong> (Plan Particulier de Sécurité et de Protection de la Santé) est
          obligatoire pour les chantiers soumis à coordination SPS (décret n°94-1159 du
          26 décembre 1994).
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Brouillons</p>
          <p className="mt-1 text-2xl font-bold text-slate-500">{brouillons}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Validés</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{valides}</p>
        </div>
        <div className="rounded-xl border border-brand-blue/20 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Transmis</p>
          <p className="mt-1 text-2xl font-bold text-brand-blue-dark">{transmis}</p>
        </div>
      </div>

      {/* Text search */}
      <form className="flex items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher par titre ou chantier…"
          className={`${inputClasses} max-w-xs`}
        />
        {chantierId && <input type="hidden" name="chantierId" value={chantierId} />}
      </form>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">
            {q || chantierId
              ? "Aucun résultat pour cette recherche."
              : "Aucun PPSPS créé pour le moment."}
          </p>
          {!q && !chantierId && (
            <LinkButton href="/ppsps/nouveau" className="mt-4">
              <Plus className="h-4 w-4" />
              Créer le premier PPSPS
            </LinkButton>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Chantier</th>
                <th className="px-4 py-3">Modèle</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Effectif prévu</th>
                <th className="px-4 py-3">Début</th>
                <th className="px-4 py-3">Fin</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/ppsps/${doc.id}`}
                      className="font-medium text-brand-navy hover:underline"
                    >
                      {doc.titre}
                    </Link>
                    {doc.reference && (
                      <p className="text-xs font-mono text-slate-400">{doc.reference}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/chantiers/${doc.chantierId}`}
                      className="text-slate-600 hover:text-brand-blue hover:underline"
                    >
                      {doc.chantier.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={modeleTones[doc.modele] ?? "gray"}>
                      {modeleLabels[doc.modele] ?? doc.modele}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statutTones[doc.statut] ?? "gray"}>
                      {statutLabels[doc.statut] ?? doc.statut}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {doc.effectifPrevu != null ? `${doc.effectifPrevu} pers.` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {doc.dateDebutChantier ? formatDate(doc.dateDebutChantier) : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {doc.dateFinChantier ? formatDate(doc.dateFinChantier) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/ppsps/${doc.id}`}
                      className="text-xs text-brand-blue hover:underline"
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
