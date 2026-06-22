import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateElementCatalogue, deleteElementCatalogue } from "@/lib/actions/conception";
import { notFound } from "next/navigation";
import { DeleteButton } from "@/components/ui/delete-button";
import { urlFichier } from "@/lib/format";

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

export default async function EditElementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const element = await prisma.elementCatalogue.findUnique({ where: { id } });

  if (!element) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50">
        <div className="rounded-xl border border-slate-200 bg-white px-10 py-12 text-center shadow-sm">
          <svg className="mx-auto mb-4 h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="mb-2 text-xl font-bold text-brand-navy">Élément introuvable</h1>
          <p className="mb-5 text-sm text-slate-500">Cet élément de catalogue n&apos;existe pas ou a été supprimé.</p>
          <Link
            href="/conception"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark transition-colors"
          >
            Retour au catalogue
          </Link>
        </div>
      </div>
    );
  }

  const updateAction = updateElementCatalogue.bind(null, id);
  const deleteAction = deleteElementCatalogue.bind(null, id);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/conception"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Catalogue
          </Link>
          <svg className="h-3 w-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm text-slate-700 font-medium truncate max-w-[300px]">{element.designation}</span>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h1 className="text-xl font-bold text-brand-navy">Modifier l&apos;élément</h1>
              <p className="mt-1 text-sm text-slate-500">
                Référence ID : <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">{element.id}</code>
              </p>
            </div>
            {/* Delete button */}
            <DeleteButton
              action={deleteAction}
              confirmMessage={`Supprimer "${element.designation}" ? Cette action est irréversible.`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Supprimer
            </DeleteButton>
          </div>

          <form
            action={updateAction}
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
                    defaultValue={element.designation}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Catégorie</label>
                  <select
                    name="categorie"
                    defaultValue={element.categorie}
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
                    defaultValue={element.sousCategorie ?? ""}
                    placeholder="ex. Parquet & revêtement"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Référence</label>
                  <input
                    type="text"
                    name="reference"
                    defaultValue={element.reference ?? ""}
                    placeholder="ex. REF-12345"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Marque</label>
                  <input
                    type="text"
                    name="marque"
                    defaultValue={element.marque ?? ""}
                    placeholder="ex. Boen, Tarkett…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Unité</label>
                  <input
                    type="text"
                    name="unite"
                    defaultValue={element.unite ?? "unité"}
                    placeholder="ex. m², ml, unité, sac…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Fournisseur</label>
                  <input
                    type="text"
                    name="fournisseur"
                    defaultValue={element.fournisseur ?? ""}
                    placeholder="ex. Leroy Merlin, Rexel…"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>
              </div>
            </div>

            {/* Section caractéristiques */}
            <div className="px-6 py-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Caractéristiques</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Matière</label>
                  <input
                    type="text"
                    name="matiere"
                    defaultValue={element.matiere ?? ""}
                    placeholder="ex. Chêne massif"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Finition</label>
                  <input
                    type="text"
                    name="finition"
                    defaultValue={element.finition ?? ""}
                    placeholder="ex. Huilé naturel"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Couleur</label>
                  <input
                    type="text"
                    name="couleur"
                    defaultValue={element.couleur ?? ""}
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
                    defaultValue={element.prixUnitHT ?? ""}
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
                  defaultValue={element.description ?? ""}
                  placeholder="Description détaillée, caractéristiques techniques…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue resize-y"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes internes</label>
                <textarea
                  name="notes"
                  rows={2}
                  defaultValue={element.notes ?? ""}
                  placeholder="Notes, remarques, conseils de pose…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue resize-y"
                />
              </div>
            </div>

            {/* Section image */}
            <div className="px-6 py-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Image</h2>

              {element.image ? (
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urlFichier(element.image)}
                    alt={element.designation}
                    className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                  />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Image actuelle</p>
                    <code className="block text-xs text-slate-400 break-all">{element.image}</code>
                    <p className="mt-2 text-xs text-slate-400">
                      Choisissez un nouveau fichier pour remplacer l&apos;image actuelle.
                    </p>
                  </div>
                </div>
              ) : null}

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
                  <span>{element.image ? "Remplacer l'image" : "Choisir une image"}</span>
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
                Enregistrer les modifications
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
