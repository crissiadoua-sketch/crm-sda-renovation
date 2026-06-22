import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { urlFichier } from "@/lib/format";

const TYPE_LABELS: Record<string, string> = {
  PLAN: "Plan",
  RENDU_3D: "Rendu 3D",
  COUPE: "Coupe",
  FACADE: "Façade",
  IMPLANTATION: "Implantation",
  CALEPINAGE: "Calepinage",
};

const SOURCE_LABELS: Record<string, string> = {
  ARCHICAD: "ArchiCAD",
  SKETCHUP: "SketchUp",
  CEDREO: "CEDREO",
  AUTOCAD: "AutoCAD",
  AUTRE: "Autre",
};

const TYPE_COLORS: Record<string, string> = {
  PLAN: "bg-blue-100 text-blue-800",
  RENDU_3D: "bg-purple-100 text-purple-800",
  COUPE: "bg-orange-100 text-orange-800",
  FACADE: "bg-teal-100 text-teal-800",
  IMPLANTATION: "bg-green-100 text-green-800",
  CALEPINAGE: "bg-yellow-100 text-yellow-800",
};

const SOURCE_COLORS: Record<string, string> = {
  ARCHICAD: "bg-red-100 text-red-700",
  SKETCHUP: "bg-sky-100 text-sky-700",
  CEDREO: "bg-indigo-100 text-indigo-700",
  AUTOCAD: "bg-slate-100 text-slate-700",
  AUTRE: "bg-gray-100 text-gray-700",
};

function isImage(fichier: string) {
  return /\.(jpg|jpeg|png|webp)$/i.test(fichier);
}

function isPdf(fichier: string) {
  return /\.pdf$/i.test(fichier);
}

export default async function PlansPage() {
  const plans = await prisma.planConception.findMany({
    include: { chantier: { select: { nom: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Group by type
  const plansByType: Record<string, typeof plans> = {};
  for (const plan of plans) {
    const type = plan.type ?? "PLAN";
    if (!plansByType[type]) plansByType[type] = [];
    plansByType[type].push(plan);
  }

  const typeOrder = ["PLAN", "RENDU_3D", "FACADE", "COUPE", "IMPLANTATION", "CALEPINAGE"];
  const sortedTypes = [
    ...typeOrder.filter((t) => plansByType[t]?.length),
    ...Object.keys(plansByType).filter((t) => !typeOrder.includes(t)),
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Plans &amp; Rendus importés</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {plans.length} fichier{plans.length !== 1 ? "s" : ""} importé{plans.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/conception"
              className="text-sm text-slate-500 hover:text-brand-blue transition-colors"
            >
              ← Catalogue
            </Link>
            <Link
              href="/conception/plans/nouveau"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Importer un plan
            </Link>
          </div>
        </div>

        {/* Info banner */}
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-700">
              Importez vos plans exportés depuis <strong>ArchiCAD</strong>, <strong>SketchUp</strong>,{" "}
              <strong>CEDREO</strong>, <strong>AutoCAD</strong> — formats supportés :{" "}
              <span className="font-medium">PDF, JPG, PNG, WebP</span>
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        {plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
            <div className="mb-4 rounded-full bg-brand-blue/10 p-5">
              <svg className="h-10 w-10 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-brand-navy">Aucun plan importé</h2>
            <p className="mb-6 max-w-sm text-sm text-slate-500">
              Importez vos premiers plans depuis ArchiCAD, SketchUp, CEDREO ou AutoCAD.
            </p>
            <Link
              href="/conception/plans/nouveau"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-orange px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-orange-dark transition-colors"
            >
              Importer un premier plan
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {sortedTypes.map((type) => {
              const typePlans = plansByType[type] ?? [];
              if (!typePlans.length) return null;
              return (
                <section key={type}>
                  <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_COLORS[type] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {TYPE_LABELS[type] ?? type}
                    </span>
                    <span className="text-slate-400 font-normal">
                      {typePlans.length} fichier{typePlans.length !== 1 ? "s" : ""}
                    </span>
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {typePlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
                      >
                        {/* Preview zone */}
                        <div className="relative h-36 bg-slate-100 flex items-center justify-center">
                          {isImage(plan.fichier) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={urlFichier(plan.fichier)}
                              alt={plan.titre}
                              className="h-full w-full object-cover"
                            />
                          ) : isPdf(plan.fichier) ? (
                            <div className="flex flex-col items-center gap-2">
                              <div className="rounded-lg bg-red-100 p-3">
                                <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">PDF</span>
                            </div>
                          ) : (
                            <svg className="h-10 w-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          )}
                        </div>

                        {/* Card body */}
                        <div className="flex flex-col flex-1 p-4">
                          <div className="mb-2 flex flex-wrap items-center gap-1.5">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[plan.type ?? "PLAN"] ?? "bg-slate-100 text-slate-700"}`}>
                              {TYPE_LABELS[plan.type ?? "PLAN"] ?? plan.type}
                            </span>
                            {plan.source && (
                              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_COLORS[plan.source] ?? "bg-gray-100 text-gray-700"}`}>
                                {SOURCE_LABELS[plan.source] ?? plan.source}
                              </span>
                            )}
                          </div>

                          <h3 className="mb-1 text-sm font-semibold text-brand-navy line-clamp-2">{plan.titre}</h3>

                          {plan.description && (
                            <p className="mb-2 text-xs text-slate-500 line-clamp-2">{plan.description}</p>
                          )}

                          {plan.chantier && (
                            <p className="text-xs text-slate-600">
                              <span className="font-medium">Chantier :</span> {plan.chantier.nom}
                            </p>
                          )}

                          <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
                            <time className="text-xs text-slate-400">
                              {new Date(plan.createdAt).toLocaleDateString("fr-FR", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </time>
                            <a
                              href={urlFichier(plan.fichier)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              {isPdf(plan.fichier) ? "Télécharger" : "Voir"}
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
