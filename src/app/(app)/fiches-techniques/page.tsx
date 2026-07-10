export const dynamic = "force-dynamic";

import Link from "next/link";
import { FileText, ExternalLink, Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { inputClasses } from "@/components/ui/fields";
import { urlFichier } from "@/lib/format";
import {
  CORPS_ETAT_CODES,
  CORPS_ETAT_LABELS,
  type CorpsEtatCode,
} from "@/lib/corps-etat";

const CATEGORIES = ["PRODUIT", "MATERIAU", "CONSOMMABLE", "EQUIPEMENT"] as const;
type Categorie = (typeof CATEGORIES)[number];

const categorieLabels: Record<Categorie, string> = {
  PRODUIT: "Produit",
  MATERIAU: "Matériau",
  CONSOMMABLE: "Consommable",
  EQUIPEMENT: "Équipement",
};

const categorieTones: Record<Categorie, BadgeTone> = {
  PRODUIT: "blue",
  MATERIAU: "orange",
  CONSOMMABLE: "green",
  EQUIPEMENT: "navy",
};

const CORPS_ETAT_LABELS_PAGE: Record<string, string> = {
  TER: "Terrassement",
  MAC: "Maçonnerie",
  DAL: "Dallage",
  COV: "Carrelage/Revêtement",
  RAV: "Ravalement",
  PLA: "Plâtrerie",
  MEN: "Menuiserie",
  RSD: "Réseau sec (Électricité)",
  RSS: "Réseau sec (Plomberie)",
  PEI: "Peinture",
  SER: "Serrurerie",
  AUTRE: "Autre",
};

export default async function FichesTechniquesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string; corps?: string }>;
}) {
  const { q, cat, corps } = await searchParams;

  const where = {
    actif: true,
    ...(cat ? { categorie: cat } : {}),
    ...(corps ? { corpsEtat: corps } : {}),
    ...(q
      ? {
          OR: [
            { designation: { contains: q } },
            { marque: { contains: q } },
            { reference: { contains: q } },
            { description: { contains: q } },
          ],
        }
      : {}),
  };

  const [fiches, allFiches] = await Promise.all([
    prisma.ficheTechnique.findMany({
      where,
      orderBy: [{ corpsEtat: "asc" }, { designation: "asc" }],
    }),
    prisma.ficheTechnique.findMany({
      where: { actif: true },
      select: { corpsEtat: true, categorie: true },
    }),
  ]);

  const total = await prisma.ficheTechnique.count({ where: { actif: true } });

  // KPIs par corps d'état
  const corpsEtatCounts = CORPS_ETAT_CODES.reduce<Record<string, number>>((acc, code) => {
    acc[code] = allFiches.filter((f) => f.corpsEtat === code).length;
    return acc;
  }, {});

  const hasFilters = !!(q || cat || corps);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Fiches techniques</h2>
          <p className="mt-1 text-sm text-slate-500">
            {total} fiche{total !== 1 ? "s" : ""} au catalogue
          </p>
        </div>
        <LinkButton href="/fiches-techniques/nouveau">
          <Plus className="h-4 w-4" />
          Ajouter une fiche
        </LinkButton>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total fiches</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{total}</p>
        </div>
        {(["PRODUIT", "MATERIAU", "CONSOMMABLE", "EQUIPEMENT"] as Categorie[]).map((cat_) => (
          <div key={cat_} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
              {categorieLabels[cat_]}
            </p>
            <p className="mt-1 text-2xl font-bold text-brand-navy">
              {allFiches.filter((f) => f.categorie === cat_).length}
            </p>
          </div>
        ))}
      </div>

      {/* Corps d'état counts */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-brand-navy">Répartition par corps d&apos;état</p>
        <div className="flex flex-wrap gap-2">
          {CORPS_ETAT_CODES.filter((c) => corpsEtatCounts[c] > 0).map((code) => (
            <Link
              key={code}
              href={`/fiches-techniques?corps=${code}`}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 hover:border-brand-blue/40 hover:bg-slate-50 transition"
            >
              <span className="font-bold text-brand-navy">{code}</span>
              <span>{CORPS_ETAT_LABELS[code as CorpsEtatCode]}</span>
              <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
                {corpsEtatCounts[code]}
              </span>
            </Link>
          ))}
          {CORPS_ETAT_CODES.every((c) => corpsEtatCounts[c] === 0) && (
            <span className="text-sm text-slate-400">Aucune fiche</span>
          )}
        </div>
      </div>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher une fiche…"
            className={`${inputClasses} pl-9`}
          />
        </div>
        <select
          name="cat"
          defaultValue={cat ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {categorieLabels[c]}
            </option>
          ))}
        </select>
        <select
          name="corps"
          defaultValue={corps ?? ""}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="">Tous les corps d&apos;état</option>
          {CORPS_ETAT_CODES.map((code) => (
            <option key={code} value={code}>
              {code} — {CORPS_ETAT_LABELS[code as CorpsEtatCode]}
            </option>
          ))}
          <option value="AUTRE">AUTRE — Autre</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark transition"
        >
          Filtrer
        </button>
        {hasFilters && (
          <Link
            href="/fiches-techniques"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Grille de fiches */}
      {fiches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="text-slate-500">
            {hasFilters
              ? "Aucune fiche ne correspond à vos critères."
              : "Le catalogue est vide. Ajoutez votre première fiche technique."}
          </p>
          {!hasFilters && (
            <LinkButton href="/fiches-techniques/nouveau" className="mt-4">
              <Plus className="h-4 w-4" />
              Ajouter une fiche
            </LinkButton>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fiches.map((fiche) => {
            const cat_ = fiche.categorie as Categorie;
            return (
              <div
                key={fiche.id}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-blue/30 transition"
              >
                {/* Badges */}
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge tone={categorieTones[cat_] ?? "gray"}>
                    {categorieLabels[cat_] ?? fiche.categorie}
                  </Badge>
                  <Badge tone="gray">{fiche.corpsEtat}</Badge>
                </div>

                {/* Title */}
                <h3 className="mb-1 font-semibold text-brand-navy leading-snug">
                  {fiche.designation}
                </h3>

                {/* Marque / Ref */}
                {(fiche.marque || fiche.reference) && (
                  <p className="mb-2 text-sm text-slate-500">
                    {fiche.marque && <span className="font-medium">{fiche.marque}</span>}
                    {fiche.marque && fiche.reference && " · "}
                    {fiche.reference && <span className="font-mono text-xs">{fiche.reference}</span>}
                  </p>
                )}

                {/* Normes */}
                {fiche.normes && (
                  <p className="mb-2 text-xs text-slate-400">
                    <span className="font-medium text-slate-500">Normes : </span>
                    {fiche.normes}
                  </p>
                )}

                {/* Description */}
                {fiche.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-slate-600">{fiche.description}</p>
                )}

                {/* Actions */}
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                  {fiche.fichierPdf && (
                    <a
                      href={urlFichier(fiche.fichierPdf)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
                    >
                      <FileText className="h-4 w-4" />
                      Voir la fiche PDF
                    </a>
                  )}
                  {fiche.lienUrl && (
                    <a
                      href={fiche.lienUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-brand-blue hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Lien
                    </a>
                  )}
                  <Link
                    href={`/fiches-techniques/${fiche.id}`}
                    className="ml-auto text-xs text-slate-400 hover:text-brand-navy hover:underline"
                  >
                    Modifier
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
