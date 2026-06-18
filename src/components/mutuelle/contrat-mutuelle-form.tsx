"use client";

import { useActionState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { toDateInputValue } from "@/lib/format";
import type { ContratState } from "@/lib/actions/mutuelle";
import type { ContratMutuelle } from "@/generated/prisma/client";

type Action = (prev: ContratState, formData: FormData) => Promise<ContratState>;

const ORGANISMES = [
  "Pro BTP",
  "Malakoff Humanis",
  "Apicil",
  "AG2R La Mondiale",
  "Humanis",
  "Klesia",
  "Mutex",
  "Autre",
];

export function ContratMutuellForm({
  contrat,
  action,
}: {
  contrat?: ContratMutuelle;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Organisme *" error={errors.organisme?.[0]}>
          <select name="organisme" defaultValue={contrat?.organisme ?? ""} className={inputClasses}>
            <option value="">-- Choisir un organisme --</option>
            {ORGANISMES.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        </Field>

        <Field label="N° de contrat" error={errors.numeroContrat?.[0]}>
          <input
            type="text"
            name="numeroContrat"
            defaultValue={contrat?.numeroContrat ?? ""}
            placeholder="ex. 12345678"
            className={inputClasses}
          />
        </Field>

        <Field label="Date d'effet" error={errors.dateEffet?.[0]}>
          <input
            type="date"
            name="dateEffet"
            defaultValue={contrat?.dateEffet ? toDateInputValue(contrat.dateEffet) : ""}
            className={inputClasses}
          />
        </Field>

        <Field label="Date de fin (optionnel)" error={errors.dateFin?.[0]}>
          <input
            type="date"
            name="dateFin"
            defaultValue={contrat?.dateFin ? toDateInputValue(contrat.dateFin) : ""}
            className={inputClasses}
          />
        </Field>
      </div>

      <Field label="Description / Notes" error={errors.description?.[0]}>
        <textarea
          name="description"
          rows={3}
          defaultValue={contrat?.description ?? ""}
          placeholder="Informations complémentaires sur le contrat..."
          className={inputClasses}
        />
      </Field>

      {contrat && (
        <Field label="Statut" error={errors.actif?.[0]}>
          <select name="actif" defaultValue={String(contrat.actif)} className={inputClasses}>
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </Field>
      )}

      <div className="flex justify-end">
        <SubmitButton>{contrat ? "Enregistrer" : "Créer le contrat"}</SubmitButton>
      </div>
    </form>
  );
}
