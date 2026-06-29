"use client";

import { useActionState } from "react";
import { inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { toDateInputValue } from "@/lib/format";
import { saveBilanExercice, type SaveBilanState } from "@/lib/actions/bilan";
import type { BilanExercice } from "@/generated/prisma/client";

type Champ = { key: string; label: string };

function MoneyField({ champ, defaultValue }: { champ: Champ; defaultValue: number | null | undefined }) {
  return (
    <div>
      <label htmlFor={champ.key} className="mb-1 block text-xs font-medium text-slate-600">
        {champ.label}
      </label>
      <input
        id={champ.key}
        name={champ.key}
        type="number"
        step="0.01"
        defaultValue={defaultValue ?? ""}
        placeholder="0,00"
        className={inputClasses}
      />
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h4 className="mb-3 font-semibold text-brand-navy">{titre}</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{children}</div>
    </div>
  );
}

const ACTIF_CIRCULANT: Champ[] = [
  { key: "stocksEnCours", label: "Stocks et en-cours" },
  { key: "avancesAcomptesVerses", label: "Avances et acomptes versés sur commandes" },
  { key: "autresCreances", label: "Autres créances" },
  { key: "valeursMobilieresPlacement", label: "Valeurs mobilières de placement" },
  { key: "disponibilites", label: "Disponibilités" },
  { key: "chargesConstateesAvance", label: "Charges constatées d'avance" },
];

const CAPITAUX_PROPRES: Champ[] = [
  { key: "capitalSocial", label: "Capital social ou individuel" },
  { key: "primesEmissionFusionApport", label: "Primes d'émission, de fusion, d'apport" },
  { key: "reserves", label: "Réserves" },
  { key: "reportANouveau", label: "Report à nouveau" },
  { key: "subventionsInvestissement", label: "Subventions d'investissement" },
  { key: "provisionsReglementees", label: "Provisions réglementées" },
];

const DETTES: Champ[] = [
  { key: "provisionsRisquesCharges", label: "Provisions pour risques et charges" },
  { key: "empruntsDettesEtablissementsCredit", label: "Emprunts et dettes — établissements de crédit" },
  { key: "empruntsDettesFinancieresDiverses", label: "Emprunts et dettes financières diverses" },
  { key: "avancesAcomptesRecus", label: "Avances et acomptes reçus sur commandes" },
  { key: "dettesFournisseursManuel", label: "Dettes fournisseurs et comptes rattachés" },
  { key: "dettesFiscalesSociales", label: "Dettes fiscales et sociales" },
  { key: "autresDettes", label: "Autres dettes" },
  { key: "produitsConstatesAvance", label: "Produits constatés d'avance" },
];

const PRODUITS_MANUELS: Champ[] = [
  { key: "venteMarchandises", label: "Ventes de marchandises" },
  { key: "productionStockee", label: "Production stockée" },
  { key: "productionImmobilisee", label: "Production immobilisée" },
  { key: "subventionsExploitation", label: "Subventions d'exploitation" },
  { key: "reprisesProvisions", label: "Reprises sur provisions, transferts de charges" },
  { key: "autresProduitsExploitation", label: "Autres produits" },
];

const CHARGES_MANUELLES: Champ[] = [
  { key: "variationStock", label: "Variation de stock" },
  { key: "impotsTaxesVersementsAssimiles", label: "Impôts, taxes et versements assimilés" },
  { key: "salairesTraitements", label: "Salaires et traitements" },
  { key: "chargesSociales", label: "Charges sociales" },
  { key: "dotationsAmortissementsProvisions", label: "Dotations aux amortissements et provisions" },
  { key: "autresChargesExploitation", label: "Autres charges" },
];

const FINANCIER_EXCEPTIONNEL: Champ[] = [
  { key: "produitsFinanciers", label: "Produits financiers" },
  { key: "chargesFinancieres", label: "Charges financières" },
  { key: "produitsExceptionnels", label: "Produits exceptionnels" },
  { key: "chargesExceptionnelles", label: "Charges exceptionnelles" },
  { key: "participationSalaries", label: "Participation des salariés" },
  { key: "impotsBenefices", label: "Impôts sur les bénéfices" },
];

export function BilanForm({
  annee,
  defaultValues,
  creancesClientsAuto,
}: {
  annee: number;
  defaultValues: BilanExercice | null;
  creancesClientsAuto: number;
}) {
  const [state, formAction] = useActionState<SaveBilanState, FormData>(saveBilanExercice, undefined);
  const v = defaultValues;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="annee" value={annee} />

      {state?.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      {state?.success && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Bilan enregistré.
        </p>
      )}

      <Section titre="Exercice">
        <div>
          <label htmlFor="dateDebutExercice" className="mb-1 block text-xs font-medium text-slate-600">
            Date de début d'exercice
          </label>
          <input
            id="dateDebutExercice"
            name="dateDebutExercice"
            type="date"
            defaultValue={toDateInputValue(v?.dateDebutExercice)}
            className={inputClasses}
          />
        </div>
        <div>
          <label htmlFor="dateFinExercice" className="mb-1 block text-xs font-medium text-slate-600">
            Date de fin d'exercice
          </label>
          <input
            id="dateFinExercice"
            name="dateFinExercice"
            type="date"
            defaultValue={toDateInputValue(v?.dateFinExercice)}
            className={inputClasses}
          />
        </div>
      </Section>

      <Section titre="Actif immobilisé (valeurs brutes et amortissements)">
        {([
          ["immobIncorporellesBrut", "Immobilisations incorporelles — Brut"],
          ["immobIncorporellesAmort", "Immobilisations incorporelles — Amortissements"],
          ["immobCorporellesBrut", "Immobilisations corporelles — Brut"],
          ["immobCorporellesAmort", "Immobilisations corporelles — Amortissements"],
          ["immobFinancieresBrut", "Immobilisations financières — Brut"],
          ["immobFinancieresAmort", "Immobilisations financières — Amortissements"],
        ] as const).map(([key, label]) => (
          <MoneyField key={key} champ={{ key, label }} defaultValue={v?.[key]} />
        ))}
        <MoneyField champ={{ key: "capitalSouscritNonAppele", label: "Capital souscrit non appelé" }} defaultValue={v?.capitalSouscritNonAppele} />
      </Section>

      <Section titre="Actif circulant">
        {ACTIF_CIRCULANT.map((c) => (
          <MoneyField key={c.key} champ={c} defaultValue={v?.[c.key as keyof BilanExercice] as number | null} />
        ))}
        <div>
          <label htmlFor="creancesClientsManuel" className="mb-1 block text-xs font-medium text-slate-600">
            Créances clients et comptes rattachés
          </label>
          <input
            id="creancesClientsManuel"
            name="creancesClientsManuel"
            type="number"
            step="0.01"
            defaultValue={v?.creancesClientsManuel ?? ""}
            placeholder={`Auto-calculé : ${creancesClientsAuto.toFixed(2)} €`}
            className={inputClasses}
          />
          <p className="mt-1 text-xs text-slate-400">
            Laisser vide pour utiliser le calcul automatique (factures impayées de l'exercice).
          </p>
        </div>
      </Section>

      <Section titre="Capitaux propres">
        {CAPITAUX_PROPRES.map((c) => (
          <MoneyField key={c.key} champ={c} defaultValue={v?.[c.key as keyof BilanExercice] as number | null} />
        ))}
      </Section>

      <Section titre="Provisions et dettes">
        {DETTES.map((c) => (
          <MoneyField key={c.key} champ={c} defaultValue={v?.[c.key as keyof BilanExercice] as number | null} />
        ))}
      </Section>

      <Section titre="Compte de résultat — produits (hors chiffre d'affaires facturé, déjà calculé)">
        {PRODUITS_MANUELS.map((c) => (
          <MoneyField key={c.key} champ={c} defaultValue={v?.[c.key as keyof BilanExercice] as number | null} />
        ))}
      </Section>

      <Section titre="Compte de résultat — charges (hors achats et dépenses, déjà calculés)">
        {CHARGES_MANUELLES.map((c) => (
          <MoneyField key={c.key} champ={c} defaultValue={v?.[c.key as keyof BilanExercice] as number | null} />
        ))}
      </Section>

      <Section titre="Résultat financier, exceptionnel et impôts">
        {FINANCIER_EXCEPTIONNEL.map((c) => (
          <MoneyField key={c.key} champ={c} defaultValue={v?.[c.key as keyof BilanExercice] as number | null} />
        ))}
      </Section>

      <div>
        <label htmlFor="notes" className="mb-1 block text-xs font-medium text-slate-600">
          Notes (annexes, observations de l'expert-comptable...)
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={v?.notes ?? ""} className={inputClasses} />
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer le bilan</SubmitButton>
      </div>
    </form>
  );
}
