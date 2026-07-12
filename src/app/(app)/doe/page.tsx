export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

const modeleTones: Record<string, BadgeTone> = {
  MARCHE_PUBLIC: "navy",
  PERSONNALISE: "orange",
};

const modeleLabels: Record<string, string> = {
  MARCHE_PUBLIC: "Marché public",
  PERSONNALISE: "Personnalisé",
};

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  FINAL: "green",
  TRANSMIS: "blue",
};

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  FINAL: "Final",
  TRANSMIS: "Transmis",
};

export default async function DOEListPage({
  searchParams,
}: {
  searchParams: Promise<{ chantierId?: string }>;
}) {
  const { chantierId } = await searchParams;

  const [docs, chantiers] = await Promise.all([
    prisma.dOE.findMany({
      where: chantierId ? { chantierId } : undefined,
      include: {
        chantier: { select: { nom: true } },
        devis: { select: { numero: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.chantier.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  const total = docs.length;
  const brouillons = docs.filter((d) => d.statut === "BROUILLON").length;
  const finals = docs.filter((d) => d.statut === "FINAL").length;
  const transmis = docs.filter((d) => d.statut === "TRANSMIS").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">
            DOE — Dossiers des Ouvrages Exécutés
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {total} dossier{total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form method="get" className="flex gap-2">
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
            <button type="submit" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              Filtrer
            </button>
            {chantierId && (
              <Link href="/doe" className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition">
                ✕
              </Link>
            )}
          </form>
          <LinkButton href="/doe/nouveau">
            <Plus className="h-4 w-4" />
            Créer un DOE
          </LinkButton>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{total}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Brouillons</p>
          <p className="mt-1 text-2xl font-bold text-slate-600">{brouillons}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Finaux</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">{finals}</p>
        </div>
        <div className="rounded-xl border border-brand-blue/20 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Transmis</p>
          <p className="mt-1 text-2xl font-bold text-brand-blue-dark">{transmis}</p>
        </div>
      </div>

      {/* Table */}
      {docs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">Aucun DOE créé pour le moment.</p>
          <LinkButton href="/doe/nouveau" className="mt-4">
            <Plus className="h-4 w-4" />
            Créer le premier DOE
          </LinkButton>
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
                <th className="px-4 py-3">Créé le</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/doe/${doc.id}`}
                      className="font-medium text-brand-navy hover:underline"
                    >
                      {doc.titre}
                    </Link>
                    {doc.reference && (
                      <p className="text-xs text-slate-400 font-mono">{doc.reference}</p>
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
                  <td className="px-4 py-3 text-slate-500">{formatDate(doc.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/doe/${doc.id}`}
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
