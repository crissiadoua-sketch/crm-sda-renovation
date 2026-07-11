"use client";

import { useActionState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { toDateInputValue } from "@/lib/format";
import type { DevisState } from "@/lib/actions/devis";
import type { Devis, Chantier } from "@/generated/prisma/client";

type Action = (prevState: DevisState, formData: FormData) => Promise<DevisState>;

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
};

export function DevisForm({
  devis,
  chantiers,
  defaultChantierId,
  action,
  isSigne,
}: {
  devis?: Devis;
  chantiers: Chantier[];
  defaultChantierId?: string;
  action: Action;
  isSigne?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Chantier" htmlFor="chantierId" error={errors.chantierId} className="sm:col-span-2">
          <select
            id="chantierId"
            name="chantierId"
            defaultValue={devis?.chantierId ?? defaultChantierId ?? ""}
            required
            className={inputClasses}
          >
            <option value="" disabled>
              Sélectionner un chantier…
            </option>
            {chantiers.map((chantier) => (
              <option key={chantier.id} value={chantier.id}>
                {chantier.reference} — {chantier.nom}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statut" htmlFor="statut" error={errors.statut}>
          {isSigne ? (
            <>
              <input type="hidden" name="statut" value={devis?.statut ?? "ACCEPTE"} />
              <div className={`${inputClasses} flex items-center gap-2 cursor-not-allowed opacity-75 bg-slate-50`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <span className="text-sm">{statutLabels[devis?.statut ?? "ACCEPTE"]}</span>
              </div>
            </>
          ) : (
            <select id="statut" name="statut" defaultValue={devis?.statut ?? "BROUILLON"} className={inputClasses}>
              {Object.entries(statutLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}
        </Field>
      </div>

      <Field label="Date de validité de l'offre" htmlFor="dateValidite" error={errors.dateValidite} className="sm:max-w-xs">
        <input
          id="dateValidite"
          name="dateValidite"
          type="date"
          defaultValue={toDateInputValue(devis?.dateValidite)}
          className={inputClasses}
        />
      </Field>

      <Field label="Objet du devis" htmlFor="objet" error={errors.objet}>
        <input
          id="objet"
          name="objet"
          defaultValue={devis?.objet ?? ""}
          placeholder="Ex. Rénovation complète d'un appartement T3"
          className={inputClasses}
        />
      </Field>

      <div className="rounded-xl border border-slate-200 p-4">
        <p className="mb-3 text-sm font-semibold text-brand-navy">
          Informations dossier de consultation des entreprises (DCE) — pour le modèle « Appel d'offres »
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Référence du marché" htmlFor="referenceMarche" error={errors.referenceMarche}>
            <input
              id="referenceMarche"
              name="referenceMarche"
              defaultValue={devis?.referenceMarche ?? ""}
              className={inputClasses}
            />
          </Field>
          <Field label="Lot / corps d'état" htmlFor="lot" error={errors.lot}>
            <input id="lot" name="lot" defaultValue={devis?.lot ?? ""} className={inputClasses} />
          </Field>
          <Field label="Maître d'ouvrage" htmlFor="maitreOuvrage" error={errors.maitreOuvrage}>
            <input
              id="maitreOuvrage"
              name="maitreOuvrage"
              defaultValue={devis?.maitreOuvrage ?? ""}
              className={inputClasses}
            />
          </Field>
          <Field label="Maître d'œuvre" htmlFor="maitreOeuvre" error={errors.maitreOeuvre}>
            <input
              id="maitreOeuvre"
              name="maitreOeuvre"
              defaultValue={devis?.maitreOeuvre ?? ""}
              className={inputClasses}
            />
          </Field>
          <Field label="Délai d'exécution" htmlFor="delaiExecution" error={errors.delaiExecution}>
            <input
              id="delaiExecution"
              name="delaiExecution"
              defaultValue={devis?.delaiExecution ?? ""}
              placeholder="Ex. 6 semaines"
              className={inputClasses}
            />
          </Field>
          <Field label="Modalités de règlement" htmlFor="modaliteReglement" error={errors.modaliteReglement}>
            <input
              id="modaliteReglement"
              name="modaliteReglement"
              defaultValue={devis?.modaliteReglement ?? ""}
              placeholder="Ex. 30% à la commande, 40% à mi-chantier, 30% à la réception"
              className={inputClasses}
            />
          </Field>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
