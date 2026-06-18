"use client";

import { useActionState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import type { SousTraitantState } from "@/lib/actions/sous-traitants";
import type { SousTraitant } from "@/generated/prisma/client";

type Action = (prevState: SousTraitantState, formData: FormData) => Promise<SousTraitantState>;

export function SousTraitantForm({
  sousTraitant,
  action,
}: {
  sousTraitant?: SousTraitant;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nom / Raison sociale" htmlFor="nom" error={errors.nom}>
          <input id="nom" name="nom" defaultValue={sousTraitant?.nom ?? ""} required className={inputClasses} />
        </Field>
        <Field label="Spécialité" htmlFor="specialite" error={errors.specialite}>
          <input
            id="specialite"
            name="specialite"
            defaultValue={sousTraitant?.specialite ?? ""}
            placeholder="Plomberie, électricité, carrelage…"
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Contact" htmlFor="contact" error={errors.contact}>
          <input id="contact" name="contact" defaultValue={sousTraitant?.contact ?? ""} className={inputClasses} />
        </Field>
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <input id="email" name="email" type="email" defaultValue={sousTraitant?.email ?? ""} className={inputClasses} />
        </Field>
        <Field label="Téléphone" htmlFor="telephone" error={errors.telephone}>
          <input id="telephone" name="telephone" defaultValue={sousTraitant?.telephone ?? ""} className={inputClasses} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Adresse" htmlFor="adresse" error={errors.adresse}>
          <input id="adresse" name="adresse" defaultValue={sousTraitant?.adresse ?? ""} className={inputClasses} />
        </Field>
        <Field label="Taux horaire (€/h)" htmlFor="tauxHoraire" error={errors.tauxHoraire}>
          <input
            id="tauxHoraire"
            name="tauxHoraire"
            type="number"
            step="0.01"
            min="0"
            defaultValue={sousTraitant?.tauxHoraire ?? ""}
            className={inputClasses}
          />
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes" error={errors.notes}>
        <textarea id="notes" name="notes" rows={3} defaultValue={sousTraitant?.notes ?? ""} className={inputClasses} />
      </Field>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
