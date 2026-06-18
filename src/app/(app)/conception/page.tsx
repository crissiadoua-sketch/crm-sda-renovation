import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { seedCatalogue } from "@/lib/actions/conception";

const CATEGORY_LABELS: Record<string, string> = {
  MENUISERIE_INT: "Menuiserie intérieure",
  MOBILIER: "Mobilier & design",
  MATERIAUX: "Matériaux",
  MENUISERIE_EXT: "Menuiserie extérieure",
  CHARPENTE: "Charpente",
  COUVERTURE: "Couverture & zingerie",
  RAVALEMENT: "Ravalement",
  MATIERES_PREM: "Matières premières",
  PLOMBERIE: "Plomberie & sanitaire",
  CVC: "CVC & VMC",
  ELECTRICITE: "Électricité",
};

const CATEGORY_COLORS: Record<string, string> = {
  MENUISERIE_INT: "bg-amber-100 text-amber-800",
  MOBILIER: "bg-purple-100 text-purple-800",
  MATERIAUX: "bg-stone-100 text-stone-800",
  MENUISERIE_EXT: "bg-orange-100 text-orange-800",
  CHARPENTE: "bg-yellow-100 text-yellow-800",
  COUVERTURE: "bg-sky-100 text-sky-800",
  RAVALEMENT: "bg-lime-100 text-lime-800",
  MATIERES_PREM: "bg-teal-100 text-teal-800",
  PLOMBERIE: "bg-blue-100 text-blue-800",
  CVC: "bg-cyan-100 text-cyan-800",
  ELECTRICITE: "bg-yellow-100 text-yellow-900",
};

const PILL_COLORS = [
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-purple-100 text-purple-800 border-purple-200",
  "bg-stone-100 text-stone-800 border-stone-200",
  "bg-orange-100 text-orange-800 border-orange-200",
  "bg-yellow-100 text-yellow-800 border-yellow-200",
  "bg-sky-100 text-sky-800 border-sky-200",
  "bg-lime-100 text-lime-800 border-lime-200",
  "bg-teal-100 text-teal-800 border-teal-200",
  "bg-blue-100 text-blue-800 border-blue-200",
  "bg-cyan-100 text-cyan-800 border-cyan-200",
  "bg-red-100 text-red-800 border-red-200",
];

export default async function ConceptionPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  const { q, cat } = await searchParams;

  const elements = await prisma.elementCatalogue.findMany({
    where: {
      actif: true,
      ...(cat ? { categorie: cat } : {}),
      ...(q
        ? {
            OR: [
              { designation: { contains: q } },
              { matiere: { contains: q } },
              { finition: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ categorie: "asc" }, { designation: "asc" }],
  });

  const totalElements = await prisma.elementCatalogue.count({ where: { actif: true } });

  // Count per category (all, unfiltered)
  const allElements = await prisma.elementCatalogue.findMany({
    where: { actif: true },
    select: { categorie: true },
  });
  const countByCategory: Record<string, number> = {};
  for (const el of allElements) {
    countByCategory[el.categorie] = (countByCategory[el.categorie] ?? 0) + 1;
  }
  const categoryEntries = Object.entries(countByCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Conception &amp; Matériaux</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Catalogue de référence BTP — matériaux, équipements &amp; éléments d&apos;agencement
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/conception/vectorisation"
              className="inline-flex items-center gap-2 rounded-lg border border-brand-orange/60 bg-brand-orange/10 px-3 py-2 text-sm font-medium text-brand-orange-dark hover:bg-brand-orange/20 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Vectoriser un plan
            </Link>
            <Link
              href="/conception/dessiner"
              className="inline-flex items-center gap-2 rounded-lg border border-brand-blue px-3 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Dessiner un plan
            </Link>
            <Link
              href="/conception/elements/nouveau"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-3 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un élément
            </Link>
          </div>
        </div>

        {/* Stats bar */}
        {totalElements > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-600">
              {totalElements} élément{totalElements > 1 ? "s" : ""} au total
            </span>
            <span className="text-slate-300">|</span>
            {categoryEntries.map(([cat, count], i) => (
              <Link
                key={cat}
                href={`/conception?cat=${cat}`}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-opacity hover:opacity-80 ${PILL_COLORS[i % PILL_COLORS.length]}`}
              >
                {CATEGORY_LABELS[cat] ?? cat}
                <span className="font-bold">{count}</span>
              </Link>
            ))}
            {(q || cat) && (
              <Link
                href="/conception"
                className="ml-2 text-xs text-slate-400 underline hover:text-slate-600"
              >
                Effacer les filtres
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-3">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Rechercher désignation, matière, finition…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <select
            name="cat"
            defaultValue={cat ?? ""}
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
          >
            <option value="">Toutes les catégories</option>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark transition-colors"
          >
            Filtrer
          </button>
          <form
            action={async () => {
              "use server";
              await seedCatalogue();
            }}
          >
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Charger les éléments BTP
            </button>
          </form>
        </form>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {totalElements === 0 ? (
          /* Empty state — seed CTA */
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="mb-4 rounded-full bg-brand-orange/10 p-5">
              <svg className="h-10 w-10 text-brand-orange" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-brand-navy">Catalogue vide</h2>
            <p className="mb-6 max-w-md text-sm text-slate-500">
              Chargez les 110 éléments de référence BTP pour démarrer rapidement avec des matériaux, équipements et
              éléments d&apos;agencement pré-configurés.
            </p>
            <form
              action={async () => {
                "use server";
                await seedCatalogue();
              }}
            >
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-6 py-3 text-sm font-semibold text-white hover:bg-brand-orange-dark transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Charger les 110 éléments de référence BTP
              </button>
            </form>
          </div>
        ) : elements.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
            <p className="text-slate-500">Aucun élément ne correspond à votre recherche.</p>
            <Link href="/conception" className="mt-3 inline-block text-sm text-brand-blue hover:underline">
              Effacer les filtres
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {elements.map((el) => (
              <Link
                key={el.id}
                href={`/conception/elements/${el.id}`}
                className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      CATEGORY_COLORS[el.categorie] ?? "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {CATEGORY_LABELS[el.categorie] ?? el.categorie}
                  </span>
                  {el.unite && (
                    <span className="shrink-0 text-xs text-slate-400">/{el.unite}</span>
                  )}
                </div>

                <h3 className="mb-1 text-sm font-semibold text-brand-navy group-hover:text-brand-blue transition-colors line-clamp-2">
                  {el.designation}
                </h3>

                {el.sousCategorie && (
                  <p className="mb-2 text-xs text-slate-500">{el.sousCategorie}</p>
                )}

                <div className="mt-auto space-y-1 border-t border-slate-100 pt-2">
                  {el.matiere && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Matière :</span> {el.matiere}
                    </p>
                  )}
                  {el.finition && (
                    <p className="text-xs text-slate-600">
                      <span className="font-medium">Finition :</span> {el.finition}
                    </p>
                  )}
                  {el.prixUnitHT != null && (
                    <p className="text-xs font-semibold text-brand-orange">
                      {el.prixUnitHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT/{el.unite}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
