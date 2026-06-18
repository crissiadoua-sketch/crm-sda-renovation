"use client";

import { useActionState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormuleState } from "@/lib/actions/mutuelle";
import type { FormuleMutuelle } from "@/generated/prisma/client";

type Action = (prev: FormuleState, formData: FormData) => Promise<FormuleState>;

const NIVEAUX = [
  { value: "BASE", label: "Base (obligatoire)" },
  { value: "OPTION_1", label: "Option 1" },
  { value: "OPTION_2", label: "Option 2" },
  { value: "OPTION_3", label: "Option 3" },
];

export function FormuleForm({
  formule,
  action,
  onCancel,
}: {
  formule?: FormuleMutuelle;
  action: Action;
  onCancel?: () => void;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Niveau" error={errors.niveau?.[0]}>
          <select name="niveau" defaultValue={formule?.niveau ?? "BASE"} className={inputClasses}>
            {NIVEAUX.map((n) => (
              <option key={n.value} value={n.value}>{n.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Libellé de la formule *" error={errors.label?.[0]}>
          <input
            type="text"
            name="label"
            defaultValue={formule?.label ?? ""}
            placeholder="ex. Formule Essentielle"
            className={inputClasses}
          />
        </Field>

        <Field label="Cotisation salarié (€/mois) *" error={errors.cotisationSalarie?.[0]}>
          <input
            type="number"
            name="cotisationSalarie"
            defaultValue={formule?.cotisationSalarie ?? 0}
            min="0"
            step="0.01"
            className={inputClasses}
          />
        </Field>

        <Field label="Cotisation patronale (€/mois) *" error={errors.cotisationPatronale?.[0]}>
          <input
            type="number"
            name="cotisationPatronale"
            defaultValue={formule?.cotisationPatronale ?? 0}
            min="0"
            step="0.01"
            className={inputClasses}
          />
        </Field>
      </div>

      <Field label="Garanties (description libre)" error={errors.garanties?.[0]}>
        <textarea
          name="garanties"
          rows={3}
          defaultValue={formule?.garanties ?? ""}
          placeholder="ex. Hospitalisation 200%, Optique 200€/an, Dentaire 125%..."
          className={inputClasses}
        />
      </Field>

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
            Annuler
          </button>
        )}
        <SubmitButton>{formule ? "Enregistrer" : "Ajouter la formule"}</SubmitButton>
      </div>
    </form>
  );
}
