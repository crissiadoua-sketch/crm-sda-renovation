export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, Search, AlertTriangle, Package, TrendingUp, BarChart2, Truck, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/fields";
import { formatEuros } from "@/lib/format";
import { estDelaiLivraisonEleve } from "@/lib/delai-livraison";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { EmplacementSwitcher, GammeSwitcher } from "@/components/stock/emplacement-switcher";

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

export const GAMME_LABELS: Record<string, string> = {
  ECO: "Économique",
  OPT: "Optimisée",
  COM: "Complète",
};

const GAMME_TONES: Record<string, string> = {
  ECO: "bg-emerald-100 text-emerald-700 border-emerald-300",
  OPT: "bg-blue-100 text-blue-700 border-blue-300",
  COM: "bg-amber-100 text-amber-700 border-amber-300",
};

const GAMME_ACTIVE: Record<string, string> = {
  ECO: "border-emerald-600 bg-emerald-600 text-white",
  OPT: "border-blue-600 bg-blue-600 text-white",
  COM: "border-amber-500 bg-amber-500 text-white",
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
    gamme?: string;
  }>;
}) {
  const { q, corps, categorie, emplacement, alerte, gamme } = await searchParams;

  const where: Record<string, unknown> = { actif: true };
  if (corps) where.corpsEtat = corps;
  if (categorie) where.categorie = categorie;
  if (emplacement) where.emplacement = emplacement;
  if (gamme === "NONE") where.gammeOffre = null;
  else if (gamme) where.gammeOffre = gamme;
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
      fournisseur: { select: { id: true, nom: true } },
      _count: { select: { mouvements: true } },
      stocksParEmplacement: {
        include: { chantier: { select: { id: true, nom: true, reference: true } } },
        orderBy: { emplacement: "asc" },
      },
    },
    orderBy: [{ corpsEtat: "asc" }, { gammeOffre: "asc" }, { designation: "asc" }],
  });

  const articlesFiltres =
    alerte === "1" ? articles.filter((a) => a.stockActuel <= a.stockMinimum) : articles;

  const totalArticles = articlesFiltres.length;
  const valeurStock = articlesFiltres.reduce((acc, a) => acc + a.stockActuel * a.prixUnitaireHT, 0);
  const enAlerte = articles.filter((a) => a.stockActuel <= a.stockMinimum && a.stockMinimum > 0).length;
  const articlesRupture = articles.filter((a) => a.stockActuel <= 0).length;

  // Stats gammes
  const nbEco = articles.filter((a) => a.gammeOffre === "ECO").length;
  const nbOpt = articles.filter((a) => a.gammeOffre === "OPT").length;
  const nbCom = articles.filter((a) => a.gammeOffre === "COM").length;
  const nbNonTagge = articles.filter((a) => !a.gammeOffre).length;

  // Regrouper par corps d'état → gamme
  type ArticleWithFou = typeof articlesFiltres[0];
  const parCorps = articlesFiltres.reduce<Record<string, Record<string, ArticleWithFou[]>>>((acc, a) => {
    if (!acc[a.corpsEtat]) acc[a.corpsEtat] = {};
    const g = a.gammeOffre ?? "NONE";
    if (!acc[a.corpsEtat][g]) acc[a.corpsEtat][g] = [];
    acc[a.corpsEtat][g].push(a);
    return acc;
  }, {});

  const buildParams = (extra: Record<string, string>) => {
    const base: Record<string, string> = {};
    if (q) base.q = q;
    if (corps) base.corps = corps;
    if (categorie) base.categorie = categorie;
    if (emplacement) base.emplacement = emplacement;
    if (alerte) base.alerte = alerte;
    if (gamme) base.gamme = gamme;
    return new URLSearchParams({ ...base, ...extra }).toString();
  };

  return (
    <FullscreenToggle>
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

      {/* Filtre gamme d'offre — barre principale */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <span className="mr-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Gamme d&apos;offre</span>
        {[
          { key: "",     label: `Toutes (${articles.length})` },
          { key: "ECO",  label: `ECO — Économique (${nbEco})` },
          { key: "OPT",  label: `OPT — Optimisée (${nbOpt})` },
          { key: "COM",  label: `COM — Complète (${nbCom})` },
          { key: "NONE", label: `Non classé (${nbNonTagge})` },
        ].map(({ key, label }) => {
          const isActive = (gamme ?? "") === key;
          const params = buildParams(key ? { gamme: key } : {});
          const colorMap: Record<string, string> = {
            ECO:  isActive ? GAMME_ACTIVE.ECO  : "border-emerald-200 text-emerald-700 hover:border-emerald-400 bg-white",
            OPT:  isActive ? GAMME_ACTIVE.OPT  : "border-blue-200 text-blue-700 hover:border-blue-400 bg-white",
            COM:  isActive ? GAMME_ACTIVE.COM  : "border-amber-200 text-amber-700 hover:border-amber-400 bg-white",
            NONE: isActive ? "border-slate-600 bg-slate-600 text-white" : "border-slate-200 text-slate-500 hover:border-slate-400 bg-white",
            "":   isActive ? "border-brand-navy bg-brand-navy text-white" : "border-slate-200 text-slate-600 hover:border-slate-300 bg-white",
          };
          return (
            <Link
              key={key}
              href={`?${key ? buildParams({ gamme: key }) : buildParams({})}`}
              className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition ${colorMap[key] ?? colorMap[""]}`}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {/* Filtres par corps d'état */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`?${buildParams({ corps: "" })}`}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${!corps ? "border-brand-navy bg-brand-navy text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}
        >
          Tous corps d&apos;état
        </Link>
        {Object.entries(CORPS_ETAT).map(([code, label]) => (
          <Link
            key={code}
            href={`?${buildParams({ corps: code })}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${corps === code ? "border-brand-blue bg-brand-blue text-white" : "border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40"}`}
          >
            {code} — {label.split(" /")[0]}
          </Link>
        ))}
      </div>

      {/* Barre de filtres secondaires */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <form className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" name="q" defaultValue={q ?? ""} placeholder="Référence, désignation…"
              className={`${inputClasses} pl-9 w-56`} />
            {corps && <input type="hidden" name="corps" value={corps} />}
            {categorie && <input type="hidden" name="categorie" value={categorie} />}
            {emplacement && <input type="hidden" name="emplacement" value={emplacement} />}
            {gamme && <input type="hidden" name="gamme" value={gamme} />}
          </form>
          {["", ...Object.keys(CATEGORIE_LABELS)].map((cat) => (
            <Link key={cat} href={`?${buildParams(cat ? { categorie: cat } : { categorie: "" })}`}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${(categorie ?? "") === cat ? "border-brand-orange bg-brand-orange text-white" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"}`}>
              {cat ? CATEGORIE_LABELS[cat] : "Toutes catégories"}
            </Link>
          ))}
          <Link
            href={`?${buildParams(alerte === "1" ? { alerte: "" } : { alerte: "1" })}`}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition flex items-center gap-1 ${alerte === "1" ? "border-red-500 bg-red-500 text-white" : "border-red-200 text-red-600 hover:border-red-400"}`}
          >
            <AlertTriangle className="h-3 w-3" /> Alertes seulement
          </Link>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/stock/import" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600">
            <Upload className="h-4 w-4" /> Importer facture/devis
          </LinkButton>
          <LinkButton href="/stock/nouveau">
            <Plus className="h-4 w-4" /> Nouvel article
          </LinkButton>
        </div>
      </div>

      {/* Tableau groupé par corps d'état → gamme */}
      {Object.keys(parCorps).length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-400 shadow-sm">
          Aucun article trouvé.
        </div>
      ) : (
        Object.entries(parCorps).map(([code, parGamme]) => {
          const totalItems = Object.values(parGamme).flat().length;
          const valeur = Object.values(parGamme).flat().reduce((acc, a) => acc + a.stockActuel * a.prixUnitaireHT, 0);
          return (
            <div key={code} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {/* En-tête corps d'état */}
              <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-brand-blue px-2 py-0.5 text-xs font-bold text-white">{code}</span>
                  <span className="font-semibold text-brand-navy">{CORPS_ETAT[code] ?? code}</span>
                  <span className="text-xs text-slate-400">({totalItems} article{totalItems > 1 ? "s" : ""})</span>
                  {/* Badges gammes présentes */}
                  <div className="flex gap-1 ml-2">
                    {(["ECO","OPT","COM"] as const).map((g) =>
                      parGamme[g]?.length ? (
                        <span key={g} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${GAMME_TONES[g]}`}>{g}</span>
                      ) : null
                    )}
                    {parGamme["NONE"]?.length ? (
                      <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        {parGamme["NONE"].length} non classé{parGamme["NONE"].length > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className="text-sm font-medium text-slate-600">Valeur : {formatEuros(valeur)}</span>
              </div>

              {/* Sous-sections par gamme */}
              {(["ECO","OPT","COM","NONE"] as const).map((g) => {
                const items = parGamme[g];
                if (!items?.length) return null;
                const isNone = g === "NONE";
                const gammeLabel = isNone ? "Non classé" : `${g} — ${GAMME_LABELS[g]}`;
                const bgBand = isNone ? "bg-slate-50" : g === "ECO" ? "bg-emerald-50/60" : g === "OPT" ? "bg-blue-50/60" : "bg-amber-50/60";
                const borderBand = isNone ? "border-slate-200" : g === "ECO" ? "border-emerald-200" : g === "OPT" ? "border-blue-200" : "border-amber-200";
                return (
                  <div key={g}>
                    {/* Bandeau gamme */}
                    <div className={`flex items-center gap-2 border-b px-4 py-1.5 ${bgBand} ${borderBand}`}>
                      {!isNone && (
                        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${GAMME_TONES[g]}`}>{g}</span>
                      )}
                      <span className={`text-[11px] font-semibold ${isNone ? "text-slate-400" : "text-slate-600"}`}>{gammeLabel}</span>
                      <span className="text-[10px] text-slate-400">({items.length} article{items.length > 1 ? "s" : ""})</span>
                    </div>
                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Réf.</th>
                          <th className="px-4 py-2">Désignation</th>
                          <th className="px-4 py-2">Catégorie</th>
                          <th className="px-4 py-2">Emplacement</th>
                          <th className="px-4 py-2">Gamme</th>
                          <th className="px-4 py-2 text-right">PU HT</th>
                          <th className="px-4 py-2">Stock par emplacement</th>
                          <th className="px-4 py-2 text-right">Total</th>
                          <th className="px-4 py-2">Fournisseur</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {items.map((a) => {
                          const enAlerte = a.stockActuel <= a.stockMinimum && a.stockMinimum > 0;
                          const enRupture = a.stockActuel <= 0;
                          return (
                            <tr key={a.id} className={`hover:bg-slate-50 ${enRupture ? "bg-red-50/40" : enAlerte ? "bg-amber-50/40" : ""}`}>
                              <td className="px-4 py-2.5">
                                <Link href={`/stock/${a.id}`} className="font-mono text-xs font-semibold text-brand-navy hover:underline">
                                  {a.reference}
                                </Link>
                              </td>
                              <td className="px-4 py-2.5">
                                <Link href={`/stock/${a.id}`} className="font-medium text-slate-700 hover:underline">{a.designation}</Link>
                                {a.refFournisseur && <p className="text-xs text-slate-400">Réf. four. : {a.refFournisseur}</p>}
                                {estDelaiLivraisonEleve(a.delaiLivraisonJours) && (
                                  <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-orange-600">
                                    <Truck className="h-3 w-3" /> Délai {a.delaiLivraisonJours} j.
                                  </p>
                                )}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIE_TONES[a.categorie] ?? "bg-slate-100 text-slate-600"}`}>
                                  {CATEGORIE_LABELS[a.categorie] ?? a.categorie}
                                </span>
                              </td>
                              {/* Switcher emplacement inline — D / B / C */}
                              <td className="px-4 py-2.5">
                                <EmplacementSwitcher id={a.id} current={a.emplacement} />
                              </td>
                              {/* Switcher gamme inline — ECO / OPT / COM */}
                              <td className="px-4 py-2.5">
                                <GammeSwitcher id={a.id} current={a.gammeOffre} />
                              </td>
                              <td className="px-4 py-2.5 text-right font-medium text-slate-700">{formatEuros(a.prixUnitaireHT)}</td>
                              {/* Stock par emplacement */}
                              <td className="px-4 py-2.5">
                                <div className="flex flex-wrap gap-1">
                                  {a.stocksParEmplacement.length === 0 ? (
                                    <span className="text-xs text-slate-400">—</span>
                                  ) : (
                                    a.stocksParEmplacement.map((s) => {
                                      const bg = s.emplacement === "DEPOT" ? "bg-brand-navy/10 text-brand-navy" : s.emplacement === "BUREAU" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700";
                                      const shortEmp = s.emplacement === "DEPOT" ? "D" : s.emplacement === "BUREAU" ? "B" : "C";
                                      const label = (
                                        <>
                                          {shortEmp}{s.chantier ? ` ${s.chantier.reference}` : ""}
                                          <span className="ml-0.5 font-normal">{s.quantite} {a.unite}</span>
                                        </>
                                      );
                                      return s.chantier ? (
                                        <Link key={s.id} href={`/chantiers/${s.chantier.id}`}
                                          title={`${s.emplacement} — ${s.chantier.nom}`}
                                          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold hover:opacity-80 ${bg}`}>
                                          {label}
                                        </Link>
                                      ) : (
                                        <span key={s.id} title={s.emplacement}
                                          className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${bg}`}>
                                          {label}
                                        </span>
                                      );
                                    })
                                  )}
                                </div>
                              </td>
                              {/* Total */}
                              <td className={`px-4 py-2.5 text-right font-bold text-sm ${enRupture ? "text-red-600" : enAlerte ? "text-amber-600" : "text-emerald-600"}`}>
                                {a.stockActuel} {a.unite}
                                {enRupture && <span className="ml-1 text-[10px]">⚠ RUPTURE</span>}
                                {!enRupture && enAlerte && <span className="ml-1 text-[10px]">⚠</span>}
                              </td>
                              <td className="px-4 py-2.5 text-xs">
                                {a.fournisseur ? (
                                  <Link href={`/fournisseurs/${a.fournisseur.id}`} className="text-brand-blue hover:underline">
                                    {a.fournisseur.nom}
                                  </Link>
                                ) : <span className="text-slate-400">—</span>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          );
        })
      )}
    </div>
    </FullscreenToggle>
  );
}
