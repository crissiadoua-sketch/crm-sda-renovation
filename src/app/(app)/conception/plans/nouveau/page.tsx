import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { uploadPlanConception } from "@/lib/actions/conception";

const TYPES = [
  { value: "PLAN", label: "Plan" },
  { value: "RENDU_3D", label: "Rendu 3D" },
  { value: "COUPE", label: "Coupe" },
  { value: "FACADE", label: "Façade" },
  { value: "IMPLANTATION", label: "Implantation" },
  { value: "CALEPINAGE", label: "Calepinage" },
];

const SOURCES = [
  { value: "ARCHICAD", label: "ArchiCAD" },
  { value: "SKETCHUP", label: "SketchUp" },
  { value: "CEDREO", label: "CEDREO" },
  { value: "AUTOCAD", label: "AutoCAD" },
  { value: "AUTRE", label: "Autre" },
];

export default async function NouveauPlanPage() {
  const chantiers = await prisma.chantier.findMany({
    where: { statut: { not: "ANNULE" } },
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/conception/plans"
            className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-blue transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Plans &amp; Rendus
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h1 className="text-xl font-bold text-brand-navy">Importer un plan</h1>
            <p className="mt-1 text-sm text-slate-500">
              Importez un plan exporté depuis ArchiCAD, SketchUp, CEDREO ou AutoCAD.
            </p>
          </div>

          <form
            action={uploadPlanConception}
            encType="multipart/form-data"
            className="divide-y divide-slate-100"
          >
            {/* Informations générales */}
            <div className="px-6 py-5 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Informations</h2>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Titre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="titre"
                  required
                  placeholder="ex. Plan de masse RDC — version 3"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  name="description"
                  rows={2}
                  placeholder="Notes sur ce plan, version, date de l'export…"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue resize-y"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type de document</label>
                  <select
                    name="type"
                    defaultValue="PLAN"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Logiciel source</label>
                  <select
                    name="source"
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  >
                    <option value="">-- Non précisé --</option>
                    {SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {chantiers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Chantier associé</label>
                  <select
                    name="chantierId"
                    defaultValue=""
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  >
                    <option value="">-- Aucun chantier --</option>
                    {chantiers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Upload fichier */}
            <div className="px-6 py-5 space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Fichier</h2>

              <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center hover:border-brand-blue transition-colors">
                <svg
                  className="mx-auto mb-3 h-10 w-10 text-slate-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <label className="cursor-pointer">
                  <span className="text-sm font-medium text-brand-blue hover:text-brand-blue-dark">
                    Choisir un fichier
                  </span>
                  <input
                    type="file"
                    name="fichier"
                    required
                    accept=".pdf,.jpg,.jpeg,.png,.webp,image/*,application/pdf"
                    className="sr-only"
                  />
                </label>
                <p className="mt-1.5 text-xs text-slate-400">
                  Formats acceptés : PDF, JPG, PNG, WebP — taille max : 20 MB
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between px-6 py-4">
              <Link
                href="/conception/plans"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </Link>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition-colors"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importer le plan
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
