"use client";

import { useActionState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FournisseurState } from "@/lib/actions/fournisseurs";
import type { Fournisseur } from "@/generated/prisma/client";

type Action = (prevState: FournisseurState, formData: FormData) => Promise<FournisseurState>;

export function FournisseurForm({
  fournisseur,
  action,
}: {
  fournisseur?: Fournisseur;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nom" htmlFor="nom" error={errors.nom}>
          <input id="nom" name="nom" defaultValue={fournisseur?.nom ?? ""} required className={inputClasses} />
        </Field>
        <Field label="Contact" htmlFor="contact" error={errors.contact}>
          <input id="contact" name="contact" defaultValue={fournisseur?.contact ?? ""} className={inputClasses} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <input id="email" name="email" type="email" defaultValue={fournisseur?.email ?? ""} className={inputClasses} />
        </Field>
        <Field label="Téléphone" htmlFor="telephone" error={errors.telephone}>
          <input id="telephone" name="telephone" defaultValue={fournisseur?.telephone ?? ""} className={inputClasses} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Adresse" htmlFor="adresse" error={errors.adresse}>
          <input id="adresse" name="adresse" defaultValue={fournisseur?.adresse ?? ""} className={inputClasses} />
        </Field>
        <Field label="Code postal" htmlFor="codePostal" error={errors.codePostal}>
          <input id="codePostal" name="codePostal" defaultValue={fournisseur?.codePostal ?? ""} className={inputClasses} />
        </Field>
        <Field label="Ville" htmlFor="ville" error={errors.ville}>
          <input id="ville" name="ville" defaultValue={fournisseur?.ville ?? ""} className={inputClasses} />
        </Field>
      </div>

      <Field label="SIRET" htmlFor="siret" error={errors.siret}>
        <input id="siret" name="siret" defaultValue={fournisseur?.siret ?? ""} className={inputClasses} />
      </Field>

      <Field label="Notes" htmlFor="notes" error={errors.notes}>
        <textarea id="notes" name="notes" rows={3} defaultValue={fournisseur?.notes ?? ""} className={inputClasses} />
      </Field>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
