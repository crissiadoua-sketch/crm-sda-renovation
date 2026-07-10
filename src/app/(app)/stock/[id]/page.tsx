export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateArticleStock, deleteArticleStock, createMouvement } from "@/lib/actions/stock";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { formatEuros } from "@/lib/format";
import { CORPS_ETAT, CATEGORIE_LABELS, EMPLACEMENT_LABELS, GAMME_LABELS } from "../page";
import { TrendingUp, TrendingDown, Package, History, Truck } from "lucide-react";
import { estDelaiLivraisonEleve } from "@/lib/delai-livraison";

const INDEX_MATIERES = [
  { value: "", label: "— Aucun —" },
  { value: "ACIER", label: "Acier" },
  { value: "CUIVRE", label: "Cuivre" },
  { value: "ALUMINIUM", label: "Aluminium" },
  { value: "ZINC", label: "Zinc" },
  { value: "PLOMB", label: "Plomb" },
  { value: "BOIS", label: "Bois / Panneaux" },
  { value: "PVC", label: "PVC / Plastiques" },
  { value: "BITUME", label: "Bitume / Pétrole" },
  { value: "CIMENT", label: "Ciment / Béton" },
  { value: "ISOLATION", label: "Matériaux d'isolation" },
  { value: "AUTRE", label: "Autre" },
];

const MOUVEMENT_LABELS: Record<string, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  INVENTAIRE: "Inventaire",
  TRANSFERT: "Transfert",
  PERTE: "Perte / Casse",
};

const MOUVEMENT_TONES: Record<string, string> = {
  ENTREE: "text-emerald-600",
  SORTIE: "text-red-600",
  INVENTAIRE: "text-brand-blue",
  TRANSFERT: "text-slate-600",
  PERTE: "text-red-400",
};

export default async function ArticleStockDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [article, fournisseurs, chantiers] = await Promise.all([
    prisma.articleStock.findUnique({
      where: { id },
      include: {
        fournisseur: { select: { nom: true } },
        mouvements: {
          orderBy: { date: "desc" },
          take: 20,
          include: { chantier: { select: { nom: true, reference: true } } },
        },
        historiquesPrix: {
          orderBy: { dateMAJ: "desc" },
          take: 10,
        },
      },
    }),
    prisma.fournisseur.findMany({ select: { id: true, nom: true }, orderBy: { nom: "asc" } }),
    prisma.chantier.findMany({
      where: { statut: { in: ["EN_COURS", "PROSPECT", "DEVIS_ENVOYE"] } },
      select: { id: true, nom: true, reference: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  if (!article) notFound();

  const updateAction = updateArticleStock.bind(null, id);
  const mouvementAction = createMouvement;

  const enAlerte = article.stockActuel <= article.stockMinimum && article.stockMinimum > 0;
  const enRupture = article.stockActuel <= 0;

  const dernierPrix = article.historiquesPrix[0];
  const variation = dernierPrix?.variation;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/stock" className="text-sm text-brand-blue hover:underline">
            ← Retour au stock
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <span className="rounded bg-brand-blue px-2 py-0.5 text-xs font-bold text-white font-mono">
              {article.reference}
            </span>
            <h2 className="text-xl font-bold text-brand-navy">{article.designation}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {CORPS_ETAT[article.corpsEtat] ?? article.corpsEtat} · {CATEGORIE_LABELS[article.categorie] ?? article.categorie} · {EMPLACEMENT_LABELS[article.emplacement] ?? article.emplacement}
          </p>
        </div>
        <DeleteButton
          action={deleteArticleStock.bind(null, id)}
          confirmMessage={`Supprimer l'article « ${article.designation} » et tout son historique ?`}
        />
      </div>

      {/* Alertes */}
      {enRupture && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700">
          ⚠ RUPTURE DE STOCK — Stock actuel : {article.stockActuel} {article.unite}
        </div>
      )}
      {!enRupture && enAlerte && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700">
          ⚠ Stock en alerte — {article.stockActuel} {article.unite} restant (seuil min. : {article.stockMinimum} {article.unite})
        </div>
      )}
      {estDelaiLivraisonEleve(article.delaiLivraisonJours) && (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-semibold text-orange-700">
          <Truck className="h-4 w-4" /> Délai de livraison habituellement élevé — {article.delaiLivraisonJours} jours. Anticipez la commande.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* KPIs stock */}
        <div className="grid grid-cols-2 gap-3 lg:col-span-3 lg:grid-cols-4">
          {[
            { label: "Stock actuel", value: `${article.stockActuel} ${article.unite}`, icon: Package, color: enRupture ? "text-red-600" : "text-brand-navy" },
            { label: "Valeur en stock", value: formatEuros(article.stockActuel * article.prixUnitaireHT), icon: TrendingUp, color: "text-emerald-600" },
            { label: "Prix unitaire HT", value: formatEuros(article.prixUnitaireHT), icon: TrendingDown, color: "text-brand-blue" },
            { label: "Mouvements (30 j.)", value: article.mouvements.length.toString(), icon: History, color: "text-slate-600" },
          ].map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</span>
                  <Icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                <p className={`mt-2 text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            );
          })}
        </div>

        {/* Formulaire de saisie mouvement */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-brand-navy">Saisir un mouvement</h3>
          <form action={mouvementAction} className="flex flex-col gap-3">
            <input type="hidden" name="articleId" value={id} />

            <div className="grid grid-cols-2 gap-3">
              <Field label="Type de mouvement" htmlFor="type">
                <select id="type" name="type" className={inputClasses}>
                  <option value="ENTREE">⬇ Entrée (livraison, achat)</option>
                  <option value="SORTIE">⬆ Sortie (consommation)</option>
                  <option value="TRANSFERT">⇄ Transfert entre emplacements</option>
                  <option value="INVENTAIRE">📋 Inventaire (réajustement)</option>
                  <option value="PERTE">✕ Perte / Casse</option>
                </select>
              </Field>
              <Field label="Quantité" htmlFor="quantite">
                <input id="quantite" name="quantite" type="number" step="0.01" min="0.01" required className={inputClasses} placeholder={`En ${article.unite}`} />
              </Field>
            </div>

            {/* Emplacement source */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Emplacement source" htmlFor="emplacement">
                <select id="emplacement" name="emplacement" className={inputClasses}>
                  <option value="DEPOT">Dépôt</option>
                  <option value="BUREAU">Bureau</option>
                  <option value="CHANTIER">Chantier (préciser ci-dessous)</option>
                </select>
              </Field>
              <Field label="Chantier source (si Chantier)" htmlFor="chantierId">
                <select id="chantierId" name="chantierId" className={inputClasses}>
                  <option value="">— Aucun / Dépôt —</option>
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>{c.reference} — {c.nom}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Emplacement destination (TRANSFERT) */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
              <p className="mb-2 text-xs font-semibold text-blue-700">Destination (Transfert uniquement)</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Emplacement destination" htmlFor="emplacementDest">
                  <select id="emplacementDest" name="emplacementDest" className={inputClasses}>
                    <option value="">— Inutilisé —</option>
                    <option value="DEPOT">Dépôt</option>
                    <option value="BUREAU">Bureau</option>
                    <option value="CHANTIER">Chantier (préciser ci-dessous)</option>
                  </select>
                </Field>
                <Field label="Chantier destination" htmlFor="chantierId_dest">
                  <select id="chantierId_dest" name="chantierId_dest" className={inputClasses}>
                    <option value="">— Aucun / Dépôt —</option>
                    {chantiers.map((c) => (
                      <option key={c.id} value={c.id}>{c.reference} — {c.nom}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Motif" htmlFor="motif">
                <select id="motif" name="motif" className={inputClasses}>
                  <option value="">— Sélectionner —</option>
                  <option value="LIVRAISON">Livraison fournisseur</option>
                  <option value="CHANTIER">Consommation chantier</option>
                  <option value="BON_COMMANDE">Bon de commande</option>
                  <option value="APPROVISIONNEMENT">Approvisionnement chantier</option>
                  <option value="PERTE">Perte / Casse</option>
                  <option value="AJUSTEMENT">Ajustement inventaire</option>
                </select>
              </Field>
              <Field label="Réf. document lié (BL, BC, devis…)" htmlFor="refDocument">
                <input id="refDocument" name="refDocument" placeholder="BL-2026-001, BC-2026-005…" className={inputClasses} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Prix unitaire HT (€)" htmlFor="prixUnitaireHT">
                <input id="prixUnitaireHT" name="prixUnitaireHT" type="number" step="0.01" min="0" defaultValue={article.prixUnitaireHT} className={inputClasses} />
              </Field>
              <Field label="Notes" htmlFor="notes">
                <input id="notes" name="notes" className={inputClasses} placeholder="Observation…" />
              </Field>
            </div>

            <SubmitButton pendingLabel="Enregistrement…">Enregistrer le mouvement</SubmitButton>
          </form>
        </div>

        {/* Historique des mouvements */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-brand-navy">Historique des mouvements</h3>
          </div>
          {article.mouvements.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">Aucun mouvement enregistré.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-right">Quantité</th>
                    <th className="px-4 py-2 text-left">Emplacement</th>
                    <th className="px-4 py-2 text-right">PU HT</th>
                    <th className="px-4 py-2 text-left">Motif / Réf. document</th>
                    <th className="px-4 py-2 text-left">Chantier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {article.mouvements.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-500">
                        {new Date(m.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className={`px-4 py-2 font-medium ${MOUVEMENT_TONES[m.type] ?? "text-slate-600"}`}>
                        {MOUVEMENT_LABELS[m.type] ?? m.type}
                      </td>
                      <td className={`px-4 py-2 text-right font-semibold ${m.type === "ENTREE" || m.type === "INVENTAIRE" ? "text-emerald-600" : "text-red-600"}`}>
                        {m.type === "ENTREE" || m.type === "INVENTAIRE" ? "+" : "-"}{m.quantite} {article.unite}
                      </td>
                      <td className="px-4 py-2 text-xs">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${
                          m.emplacement === "DEPOT" ? "bg-brand-navy/10 text-brand-navy" :
                          m.emplacement === "BUREAU" ? "bg-purple-100 text-purple-700" :
                          "bg-emerald-100 text-emerald-700"
                        }`}>
                          {m.emplacement}
                          {m.emplacementDest ? ` → ${m.emplacementDest}` : ""}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-slate-600">
                        {m.prixUnitaireHT ? formatEuros(m.prixUnitaireHT) : "—"}
                      </td>
                      <td className="px-4 py-2 text-slate-500 text-xs">
                        {m.motif ?? "—"}{m.refDocument ? ` · ${m.refDocument}` : ""}
                      </td>
                      <td className="px-4 py-2 text-slate-500 text-xs">
                        {m.chantier ? `${m.chantier.reference} — ${m.chantier.nom}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Historique des prix */}
      {article.historiquesPrix.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center gap-3">
            <h3 className="font-semibold text-brand-navy">Historique des prix</h3>
            {article.indexMatiere && (
              <span className="rounded-full bg-brand-orange/10 px-2.5 py-0.5 text-xs font-medium text-brand-orange-dark">
                Suivi cours : {article.indexMatiere}
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left">Date MAJ</th>
                  <th className="px-4 py-2 text-right">Prix HT</th>
                  <th className="px-4 py-2 text-right">Variation</th>
                  <th className="px-4 py-2 text-left">Source</th>
                  <th className="px-4 py-2 text-left">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {article.historiquesPrix.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-600">
                      {new Date(h.dateMAJ).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-slate-700">
                      {formatEuros(h.prixHT)}
                    </td>
                    <td className={`px-4 py-2 text-right font-semibold ${
                      h.variation == null ? "text-slate-400"
                        : h.variation > 0 ? "text-red-600"
                        : h.variation < 0 ? "text-emerald-600"
                        : "text-slate-500"
                    }`}>
                      {h.variation != null
                        ? `${h.variation > 0 ? "+" : ""}${h.variation.toFixed(2)} %`
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{h.source}</td>
                    <td className="px-4 py-2 text-slate-400 text-xs">{h.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Formulaire de modification */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-5 font-semibold text-brand-navy">Modifier l&apos;article</h3>
        <form action={updateAction} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Corps d'état" htmlFor="corpsEtat">
              <select id="corpsEtat" name="corpsEtat" defaultValue={article.corpsEtat} className={inputClasses}>
                {Object.entries(CORPS_ETAT).map(([code, label]) => (
                  <option key={code} value={code}>{code} — {label}</option>
                ))}
              </select>
            </Field>
            <Field label="Catégorie" htmlFor="categorie">
              <select id="categorie" name="categorie" defaultValue={article.categorie} className={inputClasses}>
                {Object.entries(CATEGORIE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
            <Field label="Emplacement" htmlFor="emplacement">
              <select id="emplacement" name="emplacement" defaultValue={article.emplacement} className={inputClasses}>
                {Object.entries(EMPLACEMENT_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Désignation *" htmlFor="designation">
              <input id="designation" name="designation" required defaultValue={article.designation} className={inputClasses} />
            </Field>
            <Field label="Gamme d'offre" htmlFor="gammeOffre">
              <select id="gammeOffre" name="gammeOffre" defaultValue={article.gammeOffre ?? ""} className={inputClasses}>
                <option value="">— Non classé —</option>
                {Object.entries(GAMME_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{v} — {l}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Unité" htmlFor="unite">
              <select id="unite" name="unite" defaultValue={article.unite} className={inputClasses}>
                {["u", "ml", "m²", "m³", "L", "kg", "t", "rouleau", "boîte", "sac", "palette"].map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>
            <Field label="Conditionnement" htmlFor="conditionnement">
              <input id="conditionnement" name="conditionnement" defaultValue={article.conditionnement ?? ""} className={inputClasses} />
            </Field>
            <Field label="Ratio consommation" htmlFor="ratioConsommation">
              <input id="ratioConsommation" name="ratioConsommation" type="number" step="0.01" defaultValue={article.ratioConsommation} className={inputClasses} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Field label="Prix HT (€) — déclenche hist. si modifié" htmlFor="prixUnitaireHT" className="sm:col-span-1">
              <input id="prixUnitaireHT" name="prixUnitaireHT" type="number" step="0.01" min="0" defaultValue={article.prixUnitaireHT} className={inputClasses} />
            </Field>
            <Field label="Fournisseur" htmlFor="fournisseurId" className="sm:col-span-2">
              <select id="fournisseurId" name="fournisseurId" defaultValue={article.fournisseurId ?? ""} className={inputClasses}>
                <option value="">— Aucun —</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </Field>
            <Field label="Réf. fournisseur" htmlFor="refFournisseur">
              <input id="refFournisseur" name="refFournisseur" defaultValue={article.refFournisseur ?? ""} className={inputClasses} />
            </Field>
          </div>

          <Field label="Délai de livraison habituel (jours)" htmlFor="delaiLivraisonJours" className="sm:max-w-xs">
            <input
              id="delaiLivraisonJours"
              name="delaiLivraisonJours"
              type="number"
              step="1"
              min="0"
              defaultValue={article.delaiLivraisonJours ?? ""}
              placeholder="Ex : 21"
              className={inputClasses}
            />
            <p className="mt-1 text-xs text-slate-400">
              Au-delà de 15 jours, une alerte s&apos;affiche pour anticiper la commande.
            </p>
          </Field>

          <Field label="Index matière première" htmlFor="indexMatiere">
            <select id="indexMatiere" name="indexMatiere" defaultValue={article.indexMatiere ?? ""} className={`${inputClasses} sm:max-w-xs`}>
              {INDEX_MATIERES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Seuil minimum (alerte)" htmlFor="stockMinimum">
              <input id="stockMinimum" name="stockMinimum" type="number" step="0.01" min="0" defaultValue={article.stockMinimum} className={inputClasses} />
            </Field>
            <Field label="Stock maximum" htmlFor="stockMaximum">
              <input id="stockMaximum" name="stockMaximum" type="number" step="0.01" min="0" defaultValue={article.stockMaximum ?? ""} className={inputClasses} />
            </Field>
          </div>

          <Field label="Notes" htmlFor="notes">
            <textarea id="notes" name="notes" rows={2} defaultValue={article.notes ?? ""} className={inputClasses} />
          </Field>

          <div className="flex justify-end">
            <SubmitButton pendingLabel="Enregistrement…">Enregistrer les modifications</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
