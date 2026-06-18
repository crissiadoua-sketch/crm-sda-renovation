"use client";

import { useActionState, useState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { toDateInputValue } from "@/lib/format";
import type { AdhesionState } from "@/lib/actions/mutuelle";
import type {
  Salarie,
  AdhesionMutuelle,
  ContratMutuelle,
  FormuleMutuelle,
} from "@/generated/prisma/client";

type ContratWithFormules = ContratMutuelle & { formules: FormuleMutuelle[] };
type Action = (prev: AdhesionState, formData: FormData) => Promise<AdhesionState>;

export function AdhesionForm({
  salarie,
  adhesion,
  contrats,
  action,
}: {
  salarie: Salarie;
  adhesion?: AdhesionMutuelle;
  contrats: ContratWithFormules[];
  action: Action;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  const [selectedContratId, setSelectedContratId] = useState(
    adhesion?.contratMutuelleId ?? contrats[0]?.id ?? "",
  );

  const contratSelectionne = contrats.find((c) => c.id === selectedContratId);
  const formules = contratSelectionne?.formules ?? [];

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Contrat mutuelle *" error={errors.contratMutuelleId?.[0]}>
          <select
            name="contratMutuelleId"
            value={selectedContratId}
            onChange={(e) => setSelectedContratId(e.target.value)}
            className={inputClasses}
          >
            {contrats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.organisme}{c.numeroContrat ? ` — N° ${c.numeroContrat}` : ""}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Formule *" error={errors.formuleMutuelleId?.[0]}>
          <select
            name="formuleMutuelleId"
            defaultValue={adhesion?.formuleMutuelleId ?? ""}
            className={inputClasses}
          >
            <option value="">-- Choisir une formule --</option>
            {formules.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} — Salarié {f.cotisationSalarie.toFixed(2)} € / Patron {f.cotisationPatronale.toFixed(2)} €
              </option>
            ))}
          </select>
        </Field>

        <Field label="Date d'adhésion *" error={errors.dateAdhesion?.[0]}>
          <input
            type="date"
            name="dateAdhesion"
            defaultValue={
              adhesion?.dateAdhesion
                ? toDateInputValue(adhesion.dateAdhesion)
                : new Date().toISOString().slice(0, 10)
            }
            className={inputClasses}
          />
        </Field>

        <Field label="Date de sortie (résiliation)" error={errors.dateSortie?.[0]}>
          <input
            type="date"
            name="dateSortie"
            defaultValue={adhesion?.dateSortie ? toDateInputValue(adhesion.dateSortie) : ""}
            className={inputClasses}
          />
        </Field>
      </div>

      {adhesion && (
        <Field label="Statut" error={errors.actif?.[0]}>
          <select name="actif" defaultValue={String(adhesion.actif)} className={inputClasses}>
            <option value="true">Actif</option>
            <option value="false">Résilié</option>
          </select>
        </Field>
      )}

      <Field label="Notes internes" error={errors.notes?.[0]}>
        <textarea
          name="notes"
          rows={2}
          defaultValue={adhesion?.notes ?? ""}
          placeholder="Ex. demande de portabilité, bénéficiaires enregistrés..."
          className={inputClasses}
        />
      </Field>

      {formules.length > 0 && (
        <div className="rounded-lg bg-blue-50 px-4 py-3 text-xs text-brand-navy">
          <p className="font-semibold">Rappel légal</p>
          <p className="mt-0.5 text-slate-600">
            La cotisation salariale est une retenue sur salaire (non soumise à charges sociales dans la limite des plafonds légaux).
            Elle apparaîtra sur le bulletin de paie de {salarie.prenom} {salarie.nom}.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton>{adhesion ? "Enregistrer les modifications" : "Affilier le salarié"}</SubmitButton>
      </div>
    </form>
  );
}
