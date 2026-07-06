import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createArticleStock } from "@/lib/actions/stock";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { CORPS_ETAT, CATEGORIE_LABELS, EMPLACEMENT_LABELS, GAMME_LABELS } from "../page";

const INDEX_MATIERES = [
  { value: "", label: "— Aucun suivi cours matière —" },
  { value: "ACIER", label: "Acier (London Metal Exchange)" },
  { value: "CUIVRE", label: "Cuivre (London Metal Exchange)" },
  { value: "ALUMINIUM", label: "Aluminium (LME)" },
  { value: "ZINC", label: "Zinc (LME)" },
  { value: "PLOMB", label: "Plomb (LME)" },
  { value: "BOIS", label: "Bois / Panneaux (IPEX)" },
  { value: "PVC", label: "PVC / Plastiques (ICIS)" },
  { value: "BITUME", label: "Bitume / Pétrole (ICE)" },
  { value: "CIMENT", label: "Ciment / Béton" },
  { value: "ISOLATION", label: "Matériaux d'isolation (laine roche/verre)" },
  { value: "AUTRE", label: "Autre matière première" },
];

export default async function NouvelArticleStockPage() {
  const fournisseurs = await prisma.fournisseur.findMany({
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/stock" className="text-sm text-brand-blue hover:underline">
          ← Retour au stock
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouvel article</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createArticleStock} className="flex flex-col gap-5">
          {/* Identification */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-navy">
              Identification
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Corps d'état *" htmlFor="corpsEtat" className="sm:col-span-1">
                <select id="corpsEtat" name="corpsEtat" required className={inputClasses}>
                  {Object.entries(CORPS_ETAT).map(([code, label]) => (
                    <option key={code} value={code}>{code} — {label}</option>
                  ))}
                </select>
              </Field>

              <Field label="Catégorie *" htmlFor="categorie">
                <select id="categorie" name="categorie" required className={inputClasses}>
                  {Object.entries(CATEGORIE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>

              <Field label="Emplacement *" htmlFor="emplacement">
                <select id="emplacement" name="emplacement" required className={inputClasses}>
                  {Object.entries(EMPLACEMENT_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Gamme d'offre" htmlFor="gammeOffre">
                <select id="gammeOffre" name="gammeOffre" className={inputClasses}>
                  <option value="">— Non classé —</option>
                  {Object.entries(GAMME_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{v} — {l}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Associe cet article à une gamme d&apos;offre (1 article par gamme par corps d&apos;état).
                </p>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Désignation *" htmlFor="designation">
                <input
                  id="designation"
                  name="designation"
                  required
                  placeholder="Ex : Tube PER 16/20 mm — rouleau 25 ml"
                  className={inputClasses}
                />
              </Field>
            </div>
          </div>

          {/* Unités & conditionnement */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-navy">
              Unités & Conditionnement
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Unité de stock" htmlFor="unite">
                <select id="unite" name="unite" defaultValue="u" className={inputClasses}>
                  {["u", "ml", "m²", "m³", "L", "kg", "t", "rouleau", "boîte", "sac", "palette"].map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </Field>

              <Field label="Conditionnement" htmlFor="conditionnement">
                <input
                  id="conditionnement"
                  name="conditionnement"
                  placeholder="Ex : Rouleau 25 ml, Sac 25 kg…"
                  className={inputClasses}
                />
              </Field>

              <Field label="Ratio consommation / unité" htmlFor="ratioConsommation">
                <input
                  id="ratioConsommation"
                  name="ratioConsommation"
                  type="number"
                  step="0.01"
                  min="0.01"
                  defaultValue="1"
                  className={inputClasses}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Ex : 1.05 = 5 % de perte inclus. Utilisé pour estimer la consommation réelle dans les devis.
                </p>
              </Field>
            </div>
          </div>

          {/* Prix & fournisseur */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-navy">
              Prix & Fournisseur
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label="Prix unitaire HT (€) *" htmlFor="prixUnitaireHT">
                <input
                  id="prixUnitaireHT"
                  name="prixUnitaireHT"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  required
                  className={inputClasses}
                />
              </Field>

              <Field label="Fournisseur principal" htmlFor="fournisseurId" className="sm:col-span-2">
                <select id="fournisseurId" name="fournisseurId" className={inputClasses}>
                  <option value="">— Aucun fournisseur —</option>
                  {fournisseurs.map((f) => (
                    <option key={f.id} value={f.id}>{f.nom}</option>
                  ))}
                </select>
              </Field>

              <Field label="Réf. fournisseur" htmlFor="refFournisseur">
                <input
                  id="refFournisseur"
                  name="refFournisseur"
                  placeholder="Référence catalogue"
                  className={inputClasses}
                />
              </Field>

              <Field label="Délai de livraison habituel (jours)" htmlFor="delaiLivraisonJours">
                <input
                  id="delaiLivraisonJours"
                  name="delaiLivraisonJours"
                  type="number"
                  step="1"
                  min="0"
                  placeholder="Ex : 21"
                  className={inputClasses}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Au-delà de 15 jours, une alerte s&apos;affiche pour anticiper la commande.
                </p>
              </Field>
            </div>

            <div className="mt-4">
              <Field label="Index matière première (cours bourse)" htmlFor="indexMatiere">
                <select id="indexMatiere" name="indexMatiere" className={inputClasses}>
                  {INDEX_MATIERES.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-slate-400">
                  Permet de surveiller l&apos;évolution du cours de la matière pour anticiper les hausses fournisseur.
                  La mise à jour hebdomadaire vous est notifiée dans le tableau de stock.
                </p>
              </Field>
            </div>
          </div>

          {/* Niveaux de stock */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-navy">
              Niveaux de stock
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Stock actuel" htmlFor="stockActuel">
                <input
                  id="stockActuel"
                  name="stockActuel"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  className={inputClasses}
                />
              </Field>

              <Field label="Seuil minimum (alerte)" htmlFor="stockMinimum">
                <input
                  id="stockMinimum"
                  name="stockMinimum"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  className={inputClasses}
                />
                <p className="mt-1 text-xs text-slate-400">
                  En dessous de ce seuil, une alerte s&apos;affiche.
                </p>
              </Field>

              <Field label="Stock maximum (optionnel)" htmlFor="stockMaximum">
                <input
                  id="stockMaximum"
                  name="stockMaximum"
                  type="number"
                  step="0.01"
                  min="0"
                  className={inputClasses}
                  placeholder="Capacité max."
                />
              </Field>
            </div>
          </div>

          <Field label="Notes" htmlFor="notes">
            <textarea id="notes" name="notes" rows={2} className={inputClasses} />
          </Field>

          <div className="flex justify-end gap-3">
            <Link
              href="/stock"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </Link>
            <SubmitButton pendingLabel="Création…">Créer l'article</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
