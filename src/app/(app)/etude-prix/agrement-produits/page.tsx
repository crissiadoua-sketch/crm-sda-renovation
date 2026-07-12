export const dynamic = "force-dynamic";

import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { inputClasses, selectClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { creerFicheAgrement } from "@/lib/actions/fiches-agrement";
import { formatDate } from "@/lib/format";

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  SOUMIS: "blue",
  VISA_SANS_OBS: "green",
  VISA_AVEC_OBS: "orange",
  SUSPENDU: "orange",
  REFUSE: "red",
};

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "Soumis",
  VISA_SANS_OBS: "Visé sans obs.",
  VISA_AVEC_OBS: "Visé avec obs.",
  SUSPENDU: "Suspendu",
  REFUSE: "Refusé",
};

const avisLabels: Record<string, string> = {
  VISA_SANS_OBS: "Visé SO",
  VISA_AVEC_OBS: "Visé AO",
  SUSPENDU: "Suspendu",
};

const avisTones: Record<string, BadgeTone> = {
  VISA_SANS_OBS: "green",
  VISA_AVEC_OBS: "orange",
  SUSPENDU: "orange",
};

export default async function AgrementProduitsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; modele?: string; chantierId?: string }>;
}) {
  const { q, statut, modele, chantierId } = await searchParams;

  const fiches = await prisma.ficheAgrementProduit.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { numero: { contains: q } },
                { operation: { contains: q } },
                { marque: { contains: q } },
                { chantier: { nom: { contains: q } } },
              ],
            }
          : {},
        statut ? { statut } : {},
        modele ? { modele } : {},
        chantierId ? { chantierId } : {},
      ],
    },
    include: { chantier: true, devis: true },
    orderBy: { createdAt: "desc" },
  });

  const chantiers = await prisma.chantier.findMany({
    select: { id: true, nom: true, reference: true },
    orderBy: { nom: "asc" },
  });

  const total = fiches.length;
  const enCours = fiches.filter((f) => f.statut === "SOUMIS").length;
  const viseSansObs = fiches.filter((f) => f.statut === "VISA_SANS_OBS").length;
  const viseAvecObs = fiches.filter(
    (f) => f.statut === "VISA_AVEC_OBS" || f.statut === "SUSPENDU"
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">Fiches d'agrément produit</h1>
        <p className="mt-1 text-sm text-slate-500">Gestion des agréments FAP</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total FAP", value: total, tone: "navy" as BadgeTone },
          { label: "En cours (soumis)", value: enCours, tone: "blue" as BadgeTone },
          { label: "Visés sans obs.", value: viseSansObs, tone: "green" as BadgeTone },
          { label: "Avec obs. / Suspendus", value: viseAvecObs, tone: "orange" as BadgeTone },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-500">{kpi.label}</p>
            <p className="mt-1 text-2xl font-bold text-brand-navy">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      <form
        action={creerFicheAgrement}
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <h2 className="mb-4 font-semibold text-brand-navy">Nouvelle fiche d'agrément</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Modèle</label>
            <select name="modele" className={selectClasses} defaultValue="SDA">
              <option value="SDA">SDA</option>
              <option value="APPEL_OFFRE">Appel d'offre</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Chantier</label>
            <select name="chantierId" className={selectClasses}>
              <option value="">— Aucun —</option>
              {chantiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.reference} — {c.nom}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Opération</label>
            <input
              type="text"
              name="operation"
              placeholder="Ex : Isolation ITE Bât A"
              className={inputClasses}
            />
          </div>
          <div className="flex items-end">
            <SubmitButton className="w-full" pendingLabel="Création…">
              Créer la fiche
            </SubmitButton>
          </div>
        </div>
      </form>

      {/* Filtres */}
      <form method="get" className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher…"
            className={`${inputClasses} pl-9`}
          />
        </div>
        <select name="statut" defaultValue={statut ?? ""} className={`${selectClasses} w-44`}>
          <option value="">Tous statuts</option>
          {Object.entries(statutLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="modele" defaultValue={modele ?? ""} className={`${selectClasses} w-40`}>
          <option value="">Tous modèles</option>
          <option value="SDA">SDA</option>
          <option value="APPEL_OFFRE">Appel d'offre</option>
        </select>
        <select name="chantierId" defaultValue={chantierId ?? ""} className={`${selectClasses} w-52`}>
          <option value="">Tous les chantiers</option>
          {chantiers.map((c) => (
            <option key={c.id} value={c.id}>{c.reference} — {c.nom}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Filtrer
        </button>
        {(q || statut || modele || chantierId) && (
          <Link href="/etude-prix/agrement-produits" className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Réinitialiser
          </Link>
        )}
      </form>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Numéro</th>
              <th className="px-4 py-3">Modèle</th>
              <th className="px-4 py-3">Opération / Chantier</th>
              <th className="px-4 py-3">Lot</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Niveau</th>
              <th className="px-4 py-3">Marque</th>
              <th className="px-4 py-3">MO</th>
              <th className="px-4 py-3">MOE</th>
              <th className="px-4 py-3">BC</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fiches.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-8 text-center text-slate-400">
                  Aucune fiche d'agrément
                </td>
              </tr>
            )}
            {fiches.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-brand-navy">
                  {f.numero}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {f.modele === "APPEL_OFFRE" ? "Appel d'offre" : "SDA"}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-700">{f.operation ?? "—"}</p>
                  {f.chantier && (
                    <Link href={`/chantiers/${f.chantier.id}`} className="text-xs text-brand-blue hover:underline">
                      {f.chantier.nom}
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{f.lot ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{f.zone ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{f.niveau ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{f.marque ?? "—"}</td>
                <td className="px-4 py-3">
                  {f.avisMO ? (
                    <Badge tone={avisTones[f.avisMO] ?? "gray"}>
                      {avisLabels[f.avisMO] ?? f.avisMO}
                    </Badge>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {f.avisMOE ? (
                    <Badge tone={avisTones[f.avisMOE] ?? "gray"}>
                      {avisLabels[f.avisMOE] ?? f.avisMOE}
                    </Badge>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {f.avisBC ? (
                    <Badge tone={avisTones[f.avisBC] ?? "gray"}>
                      {avisLabels[f.avisBC] ?? f.avisBC}
                    </Badge>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statutTones[f.statut] ?? "gray"}>
                    {statutLabels[f.statut] ?? f.statut}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/etude-prix/agrement-produits/${f.id}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue/5"
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
