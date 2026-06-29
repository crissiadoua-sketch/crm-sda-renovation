"use client";

import { useActionState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ImportReleveState } from "@/lib/actions/rapprochement";

type Action = (prevState: ImportReleveState, formData: FormData) => Promise<ImportReleveState>;

export function ImportReleveForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-brand-navy">Importer un relevé</h3>
      {state?.error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nom du relevé" htmlFor="nom">
          <input id="nom" name="nom" required placeholder="Ex : Société Générale — Juin 2026" className={inputClasses} />
        </Field>
        <Field label="Banque (optionnel)" htmlFor="banque">
          <input id="banque" name="banque" placeholder="Ex : Société Générale" className={inputClasses} />
        </Field>
        <Field label="Fichier (.csv, .ofx ou .pdf)" htmlFor="fichier">
          <input id="fichier" name="fichier" type="file" accept=".csv,.ofx,.pdf,text/csv,application/pdf" required className={inputClasses} />
        </Field>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Export CSV attendu : colonnes Date, Libellé, Montant (ou Débit/Crédit séparés). Export OFX standard également pris en charge.
        PDF : pris en charge en best effort si le texte est sélectionnable (export direct banque) — une vérification des lignes importées est recommandée.
      </p>
      <div className="mt-4 flex justify-end">
        <SubmitButton pendingLabel="Import…">Importer</SubmitButton>
      </div>
    </form>
  );
}
