import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";
import { creerEtudeDebourse } from "@/lib/actions/etudes-debourse";

export default async function EtudesDeBoursePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; chantierId?: string }>;
}) {
  const { q, chantierId } = await searchParams;

  const [etudes, chantiers, devis] = await Promise.all([
    prisma.etudeDebourse.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { titre: { contains: q } },
                  { numero: { contains: q } },
                  { responsable: { contains: q } },
                ],
              }
            : {},
          chantierId ? { chantierId } : {},
        ],
      },
      include: {
        chantier: { select: { id: true, nom: true, reference: true } },
        devis: { select: { id: true, numero: true, objet: true } },
        postes: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.chantier.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, reference: true } }),
    prisma.devis.findMany({ orderBy: { numero: "desc" }, select: { id: true, numero: true, objet: true } }),
  ]);

  const totalDSHT = etudes.reduce((s, e) => s + e.totalDSHT, 0);
  const coeffMoyen =
    etudes.length > 0
      ? etudes.reduce((s, e) => s + e.coeffK, 0) / etudes.length
      : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Études déboursés secs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Analyse du coût de revient réel par ouvrage — matériaux, matériel et main d&apos;œuvre.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Études créées</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{etudes.length}</p>
          <p className="mt-1 text-xs text-slate-400">fiches actives</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total DS HT global</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{formatEuros(totalDSHT)}</p>
          <p className="mt-1 text-xs text-slate-400">toutes études confondues</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Coefficient K moyen</p>
          <p className="mt-1 text-2xl font-bold text-brand-orange-dark">
            {coeffMoyen > 0 ? coeffMoyen.toFixed(3) : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-400">PVHT = DS × K</p>
        </div>
      </div>

      {/* Filtres + Création */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Formulaire création */}
        <div className="lg:col-span-1 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-brand-navy">+ Nouvelle étude</h3>
          <form action={creerEtudeDebourse} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                name="titre"
                required
                placeholder="Ex : Maçonnerie R+1 — Bloc A"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Chantier</label>
              <select
                name="chantierId"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">— Choisir un chantier —</option>
                {chantiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.reference} — {c.nom}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Devis associé</label>
              <select
                name="devisId"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              >
                <option value="">— Choisir un devis —</option>
                {devis.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.numero}{d.objet ? ` — ${d.objet}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Responsable</label>
              <input
                name="responsable"
                placeholder="Nom du responsable"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Coefficient K
              </label>
              <input
                name="coeffK"
                type="number"
                step="0.001"
                min="0"
                defaultValue="1.000"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
              />
            </div>
            <button
              type="submit"
              className="mt-1 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy/90 transition-colors"
            >
              Créer l&apos;étude
            </button>
          </form>
        </div>

        {/* Filtres + Tableau */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Filtres */}
          <form className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              name="q"
              defaultValue={q}
              placeholder="Rechercher…"
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
            <select
              name="chantierId"
              defaultValue={chantierId}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              <option value="">Tous les chantiers</option>
              {chantiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.reference} — {c.nom}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Filtrer
            </button>
          </form>

          {/* Tableau */}
          {etudes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
              <p className="text-2xl">📐</p>
              <p className="mt-2 font-medium text-slate-600">Aucune étude déboursés secs</p>
              <p className="mt-1 text-sm text-slate-400">
                Créez votre première étude de prix à gauche.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <th className="px-4 py-3">Numéro</th>
                      <th className="px-4 py-3">Titre</th>
                      <th className="px-4 py-3">Chantier</th>
                      <th className="px-4 py-3">Devis</th>
                      <th className="px-4 py-3">Responsable</th>
                      <th className="px-4 py-3 text-center">Postes</th>
                      <th className="px-4 py-3 text-right">DS Total HT</th>
                      <th className="px-4 py-3 text-right">Matériaux</th>
                      <th className="px-4 py-3 text-right">MO</th>
                      <th className="px-4 py-3 text-center">Coeff K</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {etudes.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs font-semibold text-brand-navy">
                            {e.numero}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {e.titre || <span className="text-slate-300 italic">Sans titre</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {e.chantier ? (
                            <Link
                              href={`/chantiers/${e.chantier.id}`}
                              className="hover:underline text-brand-blue"
                            >
                              {e.chantier.reference}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {e.devis ? (
                            <Link
                              href={`/devis/${e.devis.id}`}
                              className="hover:underline text-brand-blue"
                            >
                              {e.devis.numero}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600 text-xs">{e.responsable || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center rounded-full bg-brand-navy/10 px-2 py-0.5 text-xs font-semibold text-brand-navy">
                            {e.postes.length}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-brand-navy">
                          {formatEuros(e.totalDSHT)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                          {formatEuros(e.totalMateriauxHT)}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-slate-500">
                          {formatEuros(e.totalMOHT)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-mono text-xs font-semibold text-brand-orange-dark">
                            ×{e.coeffK.toFixed(3)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/etude-prix/debourses-secs/${e.id}`}
                            className="rounded-lg bg-brand-blue/10 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/20 transition-colors"
                          >
                            Ouvrir →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
