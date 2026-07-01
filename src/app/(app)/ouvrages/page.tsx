import Link from "next/link";
import React from "react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import {
  CORPS_ETAT_CODES,
  CORPS_ETAT_LABELS,
  CORPS_ETAT_BADGE_TONES,
  type CorpsEtatCode,
} from "@/lib/corps-etat";
import { formatEuros } from "@/lib/format";
import { parseStyle, styleToCSS } from "@/lib/style-texte";

// ---------------------------------------------------------------------------
// Colonnes par offre
// ---------------------------------------------------------------------------

const OFFRES = [
  { key: "eco",  label: "OFFRE ÉCONOMIQUE", color: "bg-emerald-50 text-emerald-700",  border: "border-emerald-200" },
  { key: "opt",  label: "OFFRE OPTIMISÉE",  color: "bg-blue-50 text-blue-700",        border: "border-blue-200"    },
  { key: "prem", label: "OFFRE PREMIUM",    color: "bg-violet-50 text-violet-700",    border: "border-violet-200"  },
] as const;

type Ouvrage = Awaited<ReturnType<typeof prisma.ouvrage.findMany>>[0];

function offreValues(o: Ouvrage, key: "eco" | "opt" | "prem") {
  return {
    tempsPose:      o[`${key}TempsPose`      as keyof Ouvrage] as number,
    prixPose:       o[`${key}PrixPose`       as keyof Ouvrage] as number,
    prixFourniture: o[`${key}PrixFourniture` as keyof Ouvrage] as number,
    prixTotal:      o[`${key}PrixTotal`      as keyof Ouvrage] as number,
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function OuvragesPage({
  searchParams,
}: {
  searchParams: Promise<{ corps?: string; q?: string }>;
}) {
  const { corps, q } = await searchParams;

  const ouvrages = await prisma.ouvrage.findMany({
    where: {
      ...(corps ? { corpsEtat: corps } : {}),
      ...(q
        ? {
            OR: [
              { designation: { contains: q } },
              { code: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ corpsEtat: "asc" }, { code: "asc" }],
  });

  // Grouper par corps d'état
  const grouped = CORPS_ETAT_CODES.reduce<Record<string, typeof ouvrages>>((acc, code) => {
    acc[code] = ouvrages.filter((o) => o.corpsEtat === code);
    return acc;
  }, {} as Record<string, typeof ouvrages>);

  const total = ouvrages.length;

  return (
    <FullscreenToggle>
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Bibliothèque d'ouvrages — BPU</h2>
          <p className="mt-1 text-sm text-slate-500">
            {total} ouvrage{total !== 1 ? "s" : ""} · Prix HT par lot · 3 niveaux d'offre
          </p>
        </div>
        <LinkButton href="/ouvrages/nouveau">+ Ajouter un ouvrage</LinkButton>
      </div>

      {/* Légende des offres */}
      <div className="flex flex-wrap gap-3">
        {OFFRES.map((o) => (
          <span
            key={o.key}
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider ${o.color} ${o.border}`}
          >
            {o.label}
          </span>
        ))}
        <span className="text-xs text-slate-400 self-center ml-2">
          Colonnes : Temps de pose · Pose seule · P.U référence (figé, pour l'actualisation des prix)
        </span>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Rechercher (code, désignation…)"
          className="flex-1 min-w-48 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
        <select
          name="corps"
          defaultValue={corps ?? ""}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="">Tous les lots</option>
          {CORPS_ETAT_CODES.map((code) => (
            <option key={code} value={code}>
              {code} — {CORPS_ETAT_LABELS[code]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark transition"
        >
          Filtrer
        </button>
        {(corps || q) && (
          <Link
            href="/ouvrages"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Contenu */}
      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-400">
            {q || corps ? "Aucun ouvrage ne correspond à vos critères." : "La bibliothèque est vide."}
          </p>
          <LinkButton href="/ouvrages/nouveau" className="mt-4">
            Ajouter le premier ouvrage
          </LinkButton>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {CORPS_ETAT_CODES.map((ce) => {
            const items = grouped[ce];
            if (!items || items.length === 0) return null;
            return (
              <div key={ce} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {/* En-tête du lot */}
                <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <Badge tone={CORPS_ETAT_BADGE_TONES[ce as CorpsEtatCode]}>{ce}</Badge>
                  <h3 className="font-bold text-brand-navy text-sm uppercase tracking-wide">
                    LOT {ce} — {CORPS_ETAT_LABELS[ce as CorpsEtatCode]}
                  </h3>
                  <span className="ml-auto text-xs text-slate-400">
                    {items.length} article{items.length > 1 ? "s" : ""}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    {/* En-têtes groupés */}
                    <thead>
                      {/* Ligne 1 : groupes d'offres */}
                      <tr>
                        <th colSpan={3} className="border-b border-r border-slate-200 bg-white px-3 py-2"></th>
                        {OFFRES.map((offre) => (
                          <th
                            key={offre.key}
                            colSpan={3}
                            className={`border-b border-r border-slate-200 px-3 py-2 text-center font-black uppercase tracking-widest ${offre.color}`}
                          >
                            {offre.label}
                          </th>
                        ))}
                        <th className="border-b border-slate-200 bg-white px-3 py-2"></th>
                      </tr>
                      {/* Ligne 2 : sous-colonnes */}
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                        <th className="px-3 py-2 text-left border-r border-slate-100">Code</th>
                        <th className="px-3 py-2 text-left">Désignation</th>
                        <th className="px-3 py-2 text-center border-r border-slate-200">U</th>
                        {OFFRES.map((offre) => (
                          <React.Fragment key={offre.key}>
                            <th className={`px-2 py-2 text-center ${offre.color} opacity-80`}>Tps (h)</th>
                            <th className={`px-2 py-2 text-right ${offre.color} opacity-80`}>Pose €</th>
                            <th className={`px-2 py-2 text-right border-r border-slate-200 font-black text-slate-500`}>P.U référence</th>
                          </React.Fragment>
                        ))}
                        <th className="px-3 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {items.map((o) => (
                        <tr
                          key={o.id}
                          className={`hover:bg-slate-50 transition-colors ${!o.actif ? "opacity-40" : ""}`}
                        >
                          {/* Code */}
                          <td className="px-3 py-2 font-mono text-slate-400 whitespace-nowrap border-r border-slate-100">
                            {o.code}
                          </td>
                          {/* Désignation */}
                          <td className="px-3 py-2 min-w-[180px]">
                            <Link
                              href={`/ouvrages/${o.id}`}
                              className="font-semibold text-brand-navy hover:text-brand-blue hover:underline"
                              style={styleToCSS(parseStyle(o.styleTexte))}
                            >
                              {o.designation}
                            </Link>
                            {o.description && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                {o.description}
                              </p>
                            )}
                            {!o.actif && (
                              <span className="text-[10px] italic text-slate-400">Inactif</span>
                            )}
                          </td>
                          {/* Unité */}
                          <td className="px-3 py-2 text-center text-slate-500 border-r border-slate-200 whitespace-nowrap">
                            {o.unite}
                          </td>
                          {/* 3 offres × 5 colonnes (dont prix de référence, figé, identique pour les 3) */}
                          {OFFRES.map((offre) => {
                            const v = offreValues(o, offre.key);
                            return (
                              <React.Fragment key={offre.key}>
                                <td className="px-2 py-2 text-center text-slate-500 whitespace-nowrap">
                                  {v.tempsPose > 0 ? v.tempsPose.toFixed(3) : "—"}
                                </td>
                                <td className="px-2 py-2 text-right text-slate-500 whitespace-nowrap">
                                  {v.prixPose > 0 ? formatEuros(v.prixPose) : "—"}
                                </td>
                                <td className="px-2 py-2 text-right font-semibold text-slate-500 border-r border-slate-200 whitespace-nowrap">
                                  {o.prixUnitaire > 0 ? formatEuros(o.prixUnitaire) : "—"}
                                </td>
                              </React.Fragment>
                            );
                          })}
                          {/* Action */}
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <Link
                              href={`/ouvrages/${o.id}`}
                              className="text-brand-blue hover:underline font-medium"
                            >
                              Modifier
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
    </FullscreenToggle>
  );
}
