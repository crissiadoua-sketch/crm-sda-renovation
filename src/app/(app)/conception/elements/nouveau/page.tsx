import Link from "next/link";
import { createElementCatalogue } from "@/lib/actions/conception";

const CATEGORIES = [
  { value: "MENUISERIE_INT", label: "Menuiserie intérieure" },
  { value: "MOBILIER", label: "Mobilier & design" },
  { value: "MATERIAUX", label: "Matériaux" },
  { value: "MENUISERIE_EXT", label: "Menuiserie extérieure" },
  { value: "CHARPENTE", label: "Charpente" },
  { value: "COUVERTURE", label: "Couverture & zingerie" },
  { value: "RAVALEMENT", label: "Ravalement" },
  { value: "MATIERES_PREM", label: "Matières premières" },
  { value: "PLOMBERIE", label: "Plomberie & sanitaire" },
  { value: "CVC", label: "CVC & VMC" },
  { value: "ELECTRICITE", label: "Électricité" },
];

export default function NouvelElementPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/conception"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour au catalogue
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h1 className="text-xl font-bold text-brand-navy">Nouvel élément de catalogue</h1>
            <p className="mt-1 text-sm text-slate-500">
              Ajoutez un matériau, équipement ou élément d&apos;agencement à votre catalogue BTP.
            </p>
          </div>

          <form
            action={createElementCatalogue}
            encType="multipart/form-data"
            className="divide-y divide-slate-100"
          >
            {/* Section identification */}
            <div className="px-6 py-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Identification</h2>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Désignation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="designation"
                    required
                    placeholder="ex. Parquet massif chêne 14mm"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    name="categorie"
                    defaultValue="MATERIAUX"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sous-catégorie</label>
                  <input
                    type="text"
                    name="sousCategorie"
                    placeholder="ex. Parquet & revêtement"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Référence</label>
                  <input
                    type="text"
                    name="reference"
                    placeholder="ex. REF-12345"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marque</label>
                  <input
                    type="text"
                    name="marque"
                    placeholder="ex. Boen, Tarkett…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unité</label>
                  <input
                    type="text"
                    name="unite"
                    placeholder="ex. m², ml, unité, sac…"
                    defaultValue="unité"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur</label>
                  <input
                    type="text"
                    name="fournisseur"
                    placeholder="ex. Leroy Merlin, Rexel…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>
            </div>

            {/* Section matériaux */}
            <div className="px-6 py-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Caractéristiques</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Matière</label>
                  <input
                    type="text"
                    name="matiere"
                    placeholder="ex. Chêne massif"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Finition</label>
                  <input
                    type="text"
                    name="finition"
                    placeholder="ex. Huilé naturel"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Couleur</label>
                  <input
                    type="text"
                    name="couleur"
                    placeholder="ex. Blanc, RAL 7016…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Prix unitaire HT (€)</label>
                  <input
                    type="number"
                    name="prixUnitHT"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>
            </div>

            {/* Section description */}
            <div className="px-6 py-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Informations complémentaires</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Description détaillée, caractéristiques techniques…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes internes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Notes, remarques, conseils de pose…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue resize-y"
                />
              </div>
            </div>

            {/* Section image */}
            <div className="px-6 py-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Image</h2>
              <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 text-center">
                <svg
                  className="mx-auto mb-2 h-8 w-8 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <label className="cursor-pointer text-sm text-brand-blue hover:text-brand-blue-dark">
                  <span>Choisir une image</span>
                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    className="sr-only"
                  />
                </label>
                <p className="mt-1 text-xs text-slate-400">JPG, PNG, WebP — max 10 MB</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-6 py-4">
              <Link
                href="/conception"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Créer l&apos;élément
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
