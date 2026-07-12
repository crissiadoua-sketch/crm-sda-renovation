export const dynamic = "force-dynamic";

import Link from "next/link";
import { ChevronRight, AlertTriangle, Package, TrendingDown, Building2, ArrowDownToLine, BarChart3 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate } from "@/lib/format";
import { SortiRapideForm } from "./sortie-rapide-form";

export default async function FinancesStocksPage() {
  const [articles, mouvementsRecents, chantiers] = await Promise.all([
    prisma.articleStock.findMany({
      where: { actif: true },
      include: {
        mouvements: {
          where: { type: "ENTREE" },
          select: { quantite: true, prixUnitaireHT: true },
        },
        fournisseur: { select: { nom: true } },
      },
      orderBy: { designation: "asc" },
    }),
    prisma.mouvementStock.findMany({
      orderBy: { date: "desc" },
      take: 30,
      include: {
        article: { select: { designation: true, reference: true, unite: true } },
        chantier: { select: { nom: true, reference: true } },
      },
    }),
    prisma.chantier.findMany({
      where: { statut: { in: ["EN_COURS", "PLANIFIE"] } },
      select: { id: true, nom: true, reference: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  // Calcul CUMP par article (Coût Unitaire Moyen Pondéré)
  const articlesAvecCump = articles.map((a) => {
    const entrees = a.mouvements;
    const totalQte = entrees.reduce((s, e) => s + e.quantite, 0);
    const totalVal = entrees.reduce((s, e) => s + e.quantite * (e.prixUnitaireHT ?? 0), 0);
    const cump = totalQte > 0 ? totalVal / totalQte : a.prixUnitaireHT;
    const valeurStock = a.stockActuel * cump;
    const enAlerte = a.stockActuel <= a.stockMinimum;
    return { ...a, cump, valeurStock, enAlerte };
  });

  // KPIs globaux
  const valeurTotale = articlesAvecCump.reduce((s, a) => s + a.valeurStock, 0);
  const nbAlertes = articlesAvecCump.filter((a) => a.enAlerte).length;
  const nbArticles = articlesAvecCump.length;
  const valeurMateriauxSeuls = articlesAvecCump
    .filter((a) => a.categorie === "MATERIAU")
    .reduce((s, a) => s + a.valeurStock, 0);

  // Sorties par chantier (MouvementStock.type = SORTIE groupé par chantierId)
  const sortiesParChantier: Record<string, { nom: string; reference: string; valeur: number; nb: number }> = {};
  for (const m of mouvementsRecents) {
    if (m.type !== "SORTIE" || !m.chantier) continue;
    const key = m.chantier.reference;
    if (!sortiesParChantier[key]) {
      sortiesParChantier[key] = { nom: m.chantier.nom, reference: key, valeur: 0, nb: 0 };
    }
    sortiesParChantier[key].valeur += m.quantite * (m.article ? m.quantite * 0 : 0); // valeur = qte * prixUnitaire du mouvement
    sortiesParChantier[key].nb += 1;
  }

  // Recalcul propre : sorties 30 derniers jours valorisées
  const sortiesAll = await prisma.mouvementStock.findMany({
    where: { type: "SORTIE", chantierId: { not: null } },
    include: {
      article: { select: { prixUnitaireHT: true, designation: true } },
      chantier: { select: { nom: true, reference: true } },
    },
    orderBy: { date: "desc" },
    take: 200,
  });

  const sortiesGroupees: Record<string, { nom: string; reference: string; valeur: number; nb: number }> = {};
  for (const m of sortiesAll) {
    if (!m.chantier) continue;
    const key = m.chantier.reference;
    if (!sortiesGroupees[key]) {
      sortiesGroupees[key] = { nom: m.chantier.nom, reference: key, valeur: 0, nb: 0 };
    }
    const prix = m.prixUnitaireHT ?? m.article.prixUnitaireHT;
    sortiesGroupees[key].valeur += m.quantite * prix;
    sortiesGroupees[key].nb += 1;
  }
  const topSorties = Object.values(sortiesGroupees).sort((a, b) => b.valeur - a.valeur).slice(0, 10);

  // Articles pour le formulaire de sortie rapide
  const articlesForm = articlesAvecCump.map((a) => ({
    id: a.id,
    designation: a.designation,
    reference: a.reference,
    unite: a.unite,
    cump: a.cump,
    stockActuel: a.stockActuel,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Stocks — Vue financière</span>
          </nav>
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-brand-blue" />
            <h2 className="text-xl font-bold text-brand-navy">Stocks — Vue financière</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Valeur CUMP · Alertes réappro · Consommation par chantier
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/stock" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-50">
            <Package className="h-4 w-4" />
            Gestion stock
          </Link>
          <Link href="/comptabilite/travaux-en-cours" className="inline-flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-violet-700 hover:bg-violet-100">
            <BarChart3 className="h-4 w-4" />
            Encours production
          </Link>
        </div>
      </div>

      {/* Alertes réappro */}
      {nbAlertes > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            <strong>{nbAlertes} article{nbAlertes > 1 ? "s" : ""}</strong> sous le seuil de réappro minimum.{" "}
            <Link href="/stock?filtre=alerte" className="underline hover:no-underline">Voir le stock →</Link>
          </span>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Valeur totale stock</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{formatEuros(valeurTotale)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{nbArticles} référence{nbArticles > 1 ? "s" : ""} actives</p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-blue">Matériaux seuls</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{formatEuros(valeurMateriauxSeuls)}</p>
          <p className="text-xs text-brand-blue/70 mt-0.5">Valorisé au CUMP</p>
        </div>
        <div className={`rounded-xl border p-4 shadow-sm ${nbAlertes > 0 ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${nbAlertes > 0 ? "text-red-600" : "text-emerald-600"}`}>Alertes réappro</p>
          <p className={`mt-1 text-2xl font-bold ${nbAlertes > 0 ? "text-red-700" : "text-emerald-700"}`}>{nbAlertes}</p>
          <p className={`text-xs mt-0.5 ${nbAlertes > 0 ? "text-red-500" : "text-emerald-500"}`}>
            {nbAlertes === 0 ? "Tous les stocks OK" : "Articles sous minimum"}
          </p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Mouvements récents</p>
          <p className="mt-1 text-2xl font-bold text-orange-700">{mouvementsRecents.length}</p>
          <p className="text-xs text-orange-500 mt-0.5">30 dernières opérations</p>
        </div>
      </div>

      {/* Tableau articles avec CUMP */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-brand-navy px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Valorisation du stock par article (CUMP)</h3>
          <span className="text-xs text-white/60">Coût Unitaire Moyen Pondéré sur les entrées</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Référence</th>
                <th className="px-4 py-3">Désignation</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3 text-right">Stock actuel</th>
                <th className="px-4 py-3 text-right">CUMP</th>
                <th className="px-4 py-3 text-right">Valeur stock</th>
                <th className="px-4 py-3">Réappro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {articlesAvecCump.map((a) => (
                <tr key={a.id} className={`hover:bg-slate-50/50 ${a.enAlerte ? "bg-red-50/30" : ""}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                    <Link href={`/stock/${a.id}`} className="hover:text-brand-blue">{a.reference}</Link>
                  </td>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{a.designation}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{a.categorie}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className={`font-medium ${a.enAlerte ? "text-red-600" : "text-slate-700"}`}>
                      {a.stockActuel} {a.unite}
                    </span>
                    {a.enAlerte && (
                      <p className="text-[10px] text-red-500">min. {a.stockMinimum}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-slate-600">{formatEuros(a.cump)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-slate-800">{formatEuros(a.valeurStock)}</td>
                  <td className="px-4 py-2.5">
                    {a.enAlerte ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        <AlertTriangle className="h-3 w-3" /> ALERTE
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600">OK</span>
                    )}
                  </td>
                </tr>
              ))}
              {articlesAvecCump.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Aucun article en stock. <Link href="/stock/nouveau" className="text-brand-blue hover:underline">Créer un article →</Link>
                  </td>
                </tr>
              )}
            </tbody>
            {articlesAvecCump.length > 0 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold">
                <tr>
                  <td colSpan={5} className="px-4 py-3 text-slate-700">TOTAL STOCK</td>
                  <td className="px-4 py-3 text-right text-brand-navy">{formatEuros(valeurTotale)}</td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Formulaire sortie rapide avec auto-remplissage */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
          <ArrowDownToLine className="h-4 w-4 text-red-500" />
          <h3 className="font-semibold text-brand-navy">Saisie rapide — Sortie stock vers chantier</h3>
          <span className="text-xs text-slate-400 ml-2">Prix CUMP auto-rempli à la sélection</span>
        </div>
        <div className="px-5 py-4">
          <SortiRapideForm articles={articlesForm} chantiers={chantiers} />
        </div>
      </div>

      {/* Sorties par chantier */}
      {topSorties.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-5 py-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <h3 className="font-semibold text-brand-navy">Consommation stock par chantier</h3>
          </div>
          <div className="divide-y divide-slate-50">
            {topSorties.map((s) => (
              <div key={s.reference} className="flex items-center justify-between px-5 py-3">
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{s.nom}</p>
                    <p className="text-xs text-slate-400">{s.reference} · {s.nb} mouvement{s.nb > 1 ? "s" : ""}</p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-red-600">{formatEuros(s.valeur)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mouvements récents */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h3 className="font-semibold text-brand-navy">Derniers mouvements</h3>
          <Link href="/stock" className="text-xs text-brand-blue hover:underline">Voir tout →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-2.5 text-left">Date</th>
                <th className="px-4 py-2.5 text-left">Article</th>
                <th className="px-4 py-2.5 text-left">Type</th>
                <th className="px-4 py-2.5 text-left">Chantier</th>
                <th className="px-4 py-2.5 text-right">Qté</th>
                <th className="px-4 py-2.5 text-right">Prix unit.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mouvementsRecents.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{formatDate(m.date)}</td>
                  <td className="px-4 py-2">
                    <p className="font-medium text-slate-700">{m.article.designation}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{m.article.reference}</p>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      m.type === "ENTREE" ? "bg-emerald-100 text-emerald-700"
                      : m.type === "SORTIE" ? "bg-red-100 text-red-700"
                      : m.type === "INVENTAIRE" ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>
                      {m.type}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-slate-500 text-xs">
                    {m.chantier ? `${m.chantier.nom}` : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2 text-right font-medium">
                    <span className={m.type === "ENTREE" ? "text-emerald-600" : "text-red-600"}>
                      {m.type === "ENTREE" ? "+" : "-"}{m.quantite} {m.article.unite}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-500">
                    {m.prixUnitaireHT != null ? formatEuros(m.prixUnitaireHT) : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              ))}
              {mouvementsRecents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">Aucun mouvement enregistré.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
