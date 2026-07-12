export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  TrendingDown,
  Plus,
  Calendar,
  Building2,
  Truck,
  Filter,
  Paperclip,
  FileSpreadsheet,
  FileText,
  CalendarClock,
} from "lucide-react";
import { depensesFiltrees } from "@/lib/depenses-filtre";
import { prisma } from "@/lib/prisma";
import { reconduireDepense } from "@/lib/actions/depenses";
import { formatEuros, urlFichier } from "@/lib/format";
import { LinkButton } from "@/components/ui/button";
import { SelectRedirect } from "@/components/ui/select-redirect";

const CAT_LABELS: Record<string, string> = {
  MATERIAUX: "Matériaux",
  MAIN_OEUVRE: "Main-d'œuvre",
  SOUS_TRAITANCE: "Sous-traitance",
  TRANSPORT: "Transport",
  ADMINISTRATIF: "Administratif",
  LOYER: "Loyer",
  ASSURANCE: "Assurances",
  AMORTISSEMENT: "Amortissement",
  INVESTISSEMENT: "Investissement",
  IMPOT_TAXE: "Impôts & taxes",
  AUTRE: "Autre",
};

const CAT_COLORS: Record<string, string> = {
  MATERIAUX: "bg-blue-100 text-blue-700",
  MAIN_OEUVRE: "bg-indigo-100 text-indigo-700",
  SOUS_TRAITANCE: "bg-orange-100 text-orange-700",
  TRANSPORT: "bg-amber-100 text-amber-700",
  ADMINISTRATIF: "bg-slate-100 text-slate-700",
  LOYER: "bg-purple-100 text-purple-700",
  ASSURANCE: "bg-teal-100 text-teal-700",
  AMORTISSEMENT: "bg-pink-100 text-pink-700",
  INVESTISSEMENT: "bg-emerald-100 text-emerald-700",
  IMPOT_TAXE: "bg-red-100 text-red-700",
  AUTRE: "bg-slate-100 text-slate-500",
};

export default async function DepensesPage({
  searchParams,
}: {
  searchParams: Promise<{ categorie?: string; mois?: string; chantierId?: string }>;
}) {
  const { categorie: catFilter, mois: moisFilter, chantierId: chantierFilter } = await searchParams;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const [depenses, chantiers] = await Promise.all([
    depensesFiltrees(moisFilter, catFilter, chantierFilter),
    prisma.chantier.findMany({ select: { id: true, nom: true, reference: true }, orderBy: { nom: "asc" } }),
  ]);

  const total = depenses.reduce((s, d) => s + d.montant, 0);

  // Totaux par catégorie
  const parCat: Record<string, number> = {};
  for (const d of depenses) {
    parCat[d.categorie] = (parCat[d.categorie] ?? 0) + d.montant;
  }

  // Mois précédents pour le sélecteur
  const moisDispo = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(y, m - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    };
  });

  const moisActuel = moisFilter ?? moisDispo[0].value;

  const exportQuery = [
    `mois=${moisActuel}`,
    catFilter ? `categorie=${catFilter}` : "",
    chantierFilter ? `chantierId=${chantierFilter}` : "",
  ].filter(Boolean).join("&");

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Dépenses</h2>
          <p className="mt-1 text-sm text-slate-500">
            Charges opérationnelles · Loyer · Assurances · Amortissements · Investissements
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/depenses/export-excel?${exportQuery}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Excel
          </a>
          <a
            href={`/apercu/depenses?${exportQuery}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-red-500" />
            PDF
          </a>
          <LinkButton href="/depenses/nouveau">
            <Plus className="h-4 w-4" />
            Nouvelle dépense
          </LinkButton>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-slate-400 shrink-0" />
        <SelectRedirect
          options={moisDispo}
          defaultValue={moisActuel}
          paramName="mois"
          extraParams={[catFilter ? `categorie=${catFilter}` : "", chantierFilter ? `chantierId=${chantierFilter}` : ""].filter(Boolean).join("&") || undefined}
        />
        <SelectRedirect
          options={[
            { value: "", label: "Tous les chantiers" },
            ...chantiers.map((c) => ({ value: c.id, label: `${c.reference} — ${c.nom}` })),
          ]}
          defaultValue={chantierFilter ?? ""}
          paramName="chantierId"
          extraParams={[`mois=${moisActuel}`, catFilter ? `categorie=${catFilter}` : ""].filter(Boolean).join("&") || undefined}
        />
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`?mois=${moisActuel}${chantierFilter ? `&chantierId=${chantierFilter}` : ""}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              !catFilter
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40"
            }`}
          >
            Toutes
          </Link>
          {Object.entries(CAT_LABELS).map(([value, label]) => (
            <Link
              key={value}
              href={`?mois=${moisActuel}&categorie=${value}${chantierFilter ? `&chantierId=${chantierFilter}` : ""}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                catFilter === value
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40"
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total du mois</span>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{formatEuros(total)}</p>
          <p className="text-xs text-slate-400">{depenses.length} dépense{depenses.length > 1 ? "s" : ""}</p>
        </div>
        {Object.entries(parCat)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 2)
          .map(([cat, montant]) => (
            <div key={cat} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${CAT_COLORS[cat] ?? "bg-slate-100 text-slate-600"}`}>
                {CAT_LABELS[cat] ?? cat}
              </span>
              <p className="mt-2 text-lg font-bold text-slate-700">{formatEuros(montant)}</p>
              {total > 0 && (
                <p className="text-xs text-slate-400">{Math.round((montant / total) * 100)} %</p>
              )}
            </div>
          ))}
      </div>

      {/* Tableau */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-brand-navy">
            Liste des dépenses
            {catFilter && ` — ${CAT_LABELS[catFilter] ?? catFilter}`}
          </h3>
        </div>

        {depenses.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <TrendingDown className="mx-auto h-8 w-8 text-slate-300 mb-3" />
            <p className="text-sm text-slate-400">Aucune dépense sur cette période.</p>
            <Link href="/depenses/nouveau" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline">
              <Plus className="h-3 w-3" />
              Ajouter une dépense
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Libellé</th>
                  <th className="px-5 py-3">Catégorie</th>
                  <th className="px-5 py-3">Chantier</th>
                  <th className="px-5 py-3">Fournisseur</th>
                  <th className="px-5 py-3 text-right">Montant</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {depenses.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 text-slate-500 whitespace-nowrap">
                      <Calendar className="inline h-3.5 w-3.5 text-slate-300 mr-1" />
                      {new Date(d.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-5 py-2.5">
                      <Link href={`/depenses/${d.id}`} className="font-medium text-slate-700 hover:text-brand-navy hover:underline">
                        {d.libelle}
                      </Link>
                      {d.factureUrl && (
                        <a
                          href={urlFichier(d.factureUrl)}
                          target="_blank"
                          rel="noreferrer"
                          title={d.factureNom ?? "Facture jointe"}
                          className="ml-1.5 inline-flex text-slate-400 hover:text-brand-blue"
                        >
                          <Paperclip className="inline h-3.5 w-3.5" />
                        </a>
                      )}
                      {d.notes && (
                        <p className="text-xs text-slate-400 truncate max-w-xs">{d.notes}</p>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CAT_COLORS[d.categorie] ?? "bg-slate-100 text-slate-600"}`}>
                        {CAT_LABELS[d.categorie] ?? d.categorie}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {d.chantier ? (
                        <Link href={`/chantiers/${d.chantier.id}`} className="inline-flex items-center gap-1 hover:underline hover:text-brand-navy">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {d.chantier.nom}
                        </Link>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {d.fournisseur ? (
                        <Link href={`/fournisseurs/${d.fournisseur.id}`} className="inline-flex items-center gap-1 hover:underline hover:text-brand-navy">
                          <Truck className="h-3 w-3 text-slate-400" />
                          {d.fournisseur.nom}
                        </Link>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-red-600 whitespace-nowrap">
                      {formatEuros(d.montant)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <form action={reconduireDepense.bind(null, d.id)}>
                        <button
                          type="submit"
                          title="Reconduire en dépense prévisionnelle (mois suivant)"
                          className="rounded p-1 text-slate-300 hover:bg-orange-50 hover:text-brand-orange transition-colors"
                        >
                          <CalendarClock className="h-4 w-4" />
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={5} className="px-5 py-2.5 text-sm font-semibold text-slate-700">Total</td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-red-700">
                    {formatEuros(total)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Répartition par catégorie */}
      {Object.keys(parCat).length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-brand-navy">Répartition par catégorie</h3>
          <div className="flex flex-col gap-2">
            {Object.entries(parCat)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, montant]) => (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1 text-sm">
                    <span className="text-slate-600">{CAT_LABELS[cat] ?? cat}</span>
                    <span className="font-medium text-slate-700">{formatEuros(montant)}</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full bg-red-400"
                      style={{ width: `${total > 0 ? (montant / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
