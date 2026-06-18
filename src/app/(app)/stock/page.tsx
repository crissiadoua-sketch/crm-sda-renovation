import Link from "next/link";
import { Plus, Search, AlertTriangle, Package, TrendingUp, BarChart2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/fields";
import { formatEuros } from "@/lib/format";

export const CORPS_ETAT: Record<string, string> = {
  GO: "Gros Œuvre / Maçonnerie",
  CHA: "Charpente",
  COU: "Couverture",
  ETA: "Étanchéité",
  MEX: "Menuiseries extérieures",
  MIN: "Menuiseries intérieures",
  PLA: "Plâtrerie / Cloisons",
  ISO: "Isolation",
  CAR: "Carrelage / Revêtements sols",
  PEI: "Peinture / Revêtements muraux",
  PLO: "Plomberie / Sanitaires",
  ELE: "Électricité",
  CVC: "Chauffage / Ventilation / Clim",
  VRD: "Voirie / Réseaux Divers",
  DEM: "Démolition",
  BUR: "Bureau / Administratif",
  GEN: "Général / Multi-corps",
};

export const CATEGORIE_LABELS: Record<string, string> = {
  MATERIAU: "Matériaux",
  FOURNITURE: "Fournitures",
  OUTILLAGE: "Outillage",
  EPI: "EPI / Sécurité",
  CONSOMMABLE: "Consommables",
};

export const EMPLACEMENT_LABELS: Record<string, string> = {
  DEPOT: "Dépôt",
  BUREAU: "Bureau",
  CHANTIER: "Chantier",
};

const CATEGORIE_TONES: Record<string, string> = {
  MATERIAU: "bg-blue-100 text-blue-700",
  FOURNITURE: "bg-green-100 text-green-700",
  OUTILLAGE: "bg-orange-100 text-orange-700",
  EPI: "bg-red-100 text-red-700",
  CONSOMMABLE: "bg-slate-100 text-slate-600",
};

const EMPLACEMENT_TONES: Record<string, string> = {
  DEPOT: "bg-brand-navy/10 text-brand-navy",
  BUREAU: "bg-purple-100 text-purple-700",
  CHANTIER: "bg-emerald-100 text-emerald-700",
};

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    corps?: string;
    categorie?: string;
    emplacement?: string;
    alerte?: string;
  }>;
}) {
  const { q, corps, categorie, emplacement, alerte } = await searchParams;

  const where: Record<string, unknown> = { actif: true };
  if (corps) where.corpsEtat = corps;
  if (categorie) where.categorie = categorie;
  if (emplacement) where.emplacement = emplacement;
  if (q) {
    where.OR = [
      { reference: { contains: q } },
      { designation: { contains: q } },
      { refFournisseur: { contains: q } },
    ];
  }

  const articles = await prisma.articleStock.findMany({
    where: {
      ...where,
      ...(alerte === "1"
        ? { stockActuel: { lte: prisma.articleStock.fields.stockMinimum } }
        : {}),
    },
    include: {
      fournisseur: { select: { nom: true } },
      _count: { select: { mouvements: true } },
    },
    orderBy: [{ corpsEtat: "asc" }, { designation: "asc" }],
  });

  // Filtrer les articles en alerte en JS si prisma ne supporte pas la comparaison de champs
  const articlesFiltres =
    alerte === "1" ? articles.filter((a) => a.stockActuel <= a.stockMinimum) : articles;

  const totalArticles = articlesFiltres.length;
  const valeurStock = articlesFiltres.reduce((acc, a) => acc + a.stockActuel * a.prixUnitaireHT, 0);
  const enAlerte = articles.filter((a) => a.stockActuel <= a.stockMinimum && a.stockMinimum > 0).length;
  const articlesRupture = articles.filter((a) => a.stockActuel <= 0).length;

  // Regrouper par corps d'état pour l'affichage
  const parCorps = articlesFiltres.reduce<Record<string, typeof articlesFiltres>>((acc, a) => {
    if (!acc[a.corpsEtat]) acc[a.corpsEtat] = [];
    acc[a.corpsEtat].push(a);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Articles en stock", value: totalArticles, icon: Package, color: "text-brand-blue", bg: "bg-brand-blue/10" },
          { label: "Valeur du stock", value: formatEuros(valeurStock), icon: BarChart2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "En alerte stock", value: enAlerte, icon: AlertTriangle, color: "text-brand-orange-dark", bg: "bg-brand-orange/10" },
          { label: "En rupture", value: articlesRupture, icon: TrendingUp, color: "text-red-600", bg: "bg-red-50" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                <span className={`rounded-full p-1.5 ${kpi.bg}`}>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </span>
              </div>
              <p className={`mt-2 text-2xl font-bold ${kpi.label === "En rupture" && articlesRupture > 0 ? "text-red-600" : "text-brand-navy"}`}>
                {kpi.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Filtres par corps d'état */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(categorie ? { categorie } : {}), ...(emplacement ? { emplacement } : {}) })}`}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${!corps ? "border-brand-navy bg-brand-navy text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
        >
          Tous corps d'état
        </Link>
        {Object.entries(CORPS_ETAT).map(([code, label]) => {
          const params = new URLSearchParams({ ...(q ? { q } : {}), corps: code, ...(categorie ? { categorie } : {}), ...(emplacement ? { emplacement } : {}) });
          return (
            <Link
              key={code}
              href={`?${params}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${corps === code ? "border-brand-blue bg-brand-blue text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40"}`}
            >
              {code} — {label.split(" /")[0]}
            </Link>
          );
        })}
      </div>

      {/* Barre de filtres */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Référence, désignation…"
              className={`${inputClasses} pl-9 w-56`}
            />
            {corps && <input type="hidden" name="corps" value={corps} />}
            {categorie && <input type="hidden" name="categorie" value={categorie} />}
            {emplacement && <input type="hidden" name="emplacement" value={emplacement} />}
          </form>

          {/* Filtre catégorie */}
          {["", ...Object.keys(CATEGORIE_LABELS)].map((cat) => {
            const params = new URLSearchParams({ ...(q ? { q } : {}), ...(corps ? { corps } : {}), ...(cat ? { categorie: cat } : {}), ...(emplacement ? { emplacement } : {}) });
            return (
              <Link
                key={cat}
                href={`?${params}`}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${(categorie ?? "") === cat ? "border-brand-orange bg-brand-orange text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
              >
                {cat ? CATEGORIE_LABELS[cat] : "Toutes catégories"}
              </Link>
            );
          })}

          {/* Filtre emplacement */}
          {["", "DEPOT", "BUREAU", "CHANTIER"].map((emp) => {
            const params = new URLSearchParams({ ...(q ? { q } : {}), ...(corps ? { corps } : {}), ...(categorie ? { categorie } : {}), ...(emp ? { emplacement: emp } : {}) });
            return (
              <Link
                key={emp}
                href={`?${params}`}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${(emplacement ?? "") === emp ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
              >
                {emp ? EMPLACEMENT_LABELS[emp] : "Tous emplacements"}
              </Link>
            );
          })}

          {/* Alerte stock */}
          <Link
            href={`?${new URLSearchParams({ ...(q ? { q } : {}), ...(corps ? { corps } : {}), ...(categorie ? { categorie } : {}), ...(emplacement ? { emplacement } : {}), ...(alerte === "1" ? {} : { alerte: "1" }) })}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition flex items-center gap-1 ${alerte === "1" ? "border-red-500 bg-red-500 text-white" : "border-red-200 text-red-600 hover:border-red-400"}`}
          >
            <AlertTriangle className="h-3 w-3" />
            Alertes seulement
          </Link>
        </div>

        <LinkButton href="/stock/nouveau">
          <Plus className="h-4 w-4" />
          Nouvel article
        </LinkButton>
      </div>

      {/* Tableau groupé par corps d'état */}
      {Object.keys(parCorps).length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400 shadow-sm">
          Aucun article trouvé.
        </div>
      ) : (
        Object.entries(parCorps).map(([code, items]) => (
          <div key={code} className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-brand-blue px-2 py-0.5 text-xs font-bold text-white">{code}</span>
                <span className="font-semibold text-brand-navy">{CORPS_ETAT[code] ?? code}</span>
                <span className="text-xs text-slate-400">({items.length} article{items.length > 1 ? "s" : ""})</span>
              </div>
              <span className="text-sm font-medium text-slate-600">
                Valeur : {formatEuros(items.reduce((acc, a) => acc + a.stockActuel * a.prixUnitaireHT, 0))}
              </span>
            </div>
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2">Réf.</th>
                  <th className="px-4 py-2">Désignation</th>
                  <th className="px-4 py-2">Catégorie</th>
                  <th className="px-4 py-2">Emplacement</th>
                  <th className="px-4 py-2">Unité</th>
                  <th className="px-4 py-2">Conditionnement</th>
                  <th className="px-4 py-2">Ratio conso.</th>
                  <th className="px-4 py-2 text-right">PU HT</th>
                  <th className="px-4 py-2 text-right">Stock</th>
                  <th className="px-4 py-2 text-right">Seuil min.</th>
                  <th className="px-4 py-2 text-right">Valeur HT</th>
                  <th className="px-4 py-2">Fournisseur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((a) => {
                  const enAlerte = a.stockActuel <= a.stockMinimum && a.stockMinimum > 0;
                  const enRupture = a.stockActuel <= 0;
                  return (
                    <tr
                      key={a.id}
                      className={`hover:bg-slate-50 ${enRupture ? "bg-red-50/40" : enAlerte ? "bg-amber-50/40" : ""}`}
                    >
                      <td className="px-4 py-2.5">
                        <Link href={`/stock/${a.id}`} className="font-mono text-xs font-semibold text-brand-navy hover:underline">
                          {a.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link href={`/stock/${a.id}`} className="font-medium text-slate-700 hover:underline">
                          {a.designation}
                        </Link>
                        {a.refFournisseur && (
                          <p className="text-xs text-slate-400">Réf. four. : {a.refFournisseur}</p>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIE_TONES[a.categorie] ?? "bg-slate-100 text-slate-600"}`}>
                          {CATEGORIE_LABELS[a.categorie] ?? a.categorie}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${EMPLACEMENT_TONES[a.emplacement] ?? "bg-slate-100 text-slate-600"}`}>
                          {EMPLACEMENT_LABELS[a.emplacement] ?? a.emplacement}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{a.unite}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{a.conditionnement ?? "—"}</td>
                      <td className="px-4 py-2.5 text-center text-slate-600">{a.ratioConsommation.toFixed(2)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-700">{formatEuros(a.prixUnitaireHT)}</td>
                      <td className={`px-4 py-2.5 text-right font-bold ${enRupture ? "text-red-600" : enAlerte ? "text-amber-600" : "text-emerald-600"}`}>
                        {a.stockActuel} {a.unite}
                        {enRupture && " ⚠ RUPTURE"}
                        {!enRupture && enAlerte && " ⚠"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-500">{a.stockMinimum} {a.unite}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                        {formatEuros(a.stockActuel * a.prixUnitaireHT)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {a.fournisseur?.nom ?? "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
