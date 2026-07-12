"use client";

import { useActionState, useRef } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { toDateInputValue, clientDisplayName } from "@/lib/format";
import type { ChantierState } from "@/lib/actions/chantiers";
import type { Chantier, Client } from "@/generated/prisma/client";

type Action = (prevState: ChantierState, formData: FormData) => Promise<ChantierState>;

// Subset passed for address auto-fill
type ClientAdresse = {
  id: string;
  adresse: string | null;
  codePostal: string | null;
  ville: string | null;
};

const statutLabels: Record<string, string> = {
  PROSPECT: "Prospect",
  DEVIS_ENVOYE: "Devis envoyé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

export function ChantierForm({
  chantier,
  clients,
  clientsAdresses,
  defaultReference,
  defaultClientId,
  action,
}: {
  chantier?: Chantier;
  clients: Client[];
  clientsAdresses?: ClientAdresse[];
  defaultReference?: string;
  defaultClientId?: string;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  const adresseRef = useRef<HTMLInputElement>(null);
  const cpRef = useRef<HTMLInputElement>(null);
  const villeRef = useRef<HTMLInputElement>(null);

  function handleClientChange(e: React.ChangeEvent<HTMLSelectElement>) {
    if (chantier) return; // Only auto-fill on creation, not edit
    const clientId = e.target.value;
    const data = clientsAdresses?.find((c) => c.id === clientId);
    if (!data) return;
    if (adresseRef.current && data.adresse) adresseRef.current.value = data.adresse;
    if (cpRef.current && data.codePostal) cpRef.current.value = data.codePostal;
    if (villeRef.current && data.ville) villeRef.current.value = data.ville;
  }

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Référence" htmlFor="reference" error={errors.reference}>
          <input
            id="reference"
            name="reference"
            defaultValue={chantier?.reference ?? defaultReference ?? ""}
            required
            className={inputClasses}
          />
        </Field>
        <Field label="Nom du chantier" htmlFor="nom" error={errors.nom} className="sm:col-span-2">
          <input id="nom" name="nom" defaultValue={chantier?.nom ?? ""} required className={inputClasses} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Client" htmlFor="clientId" error={errors.clientId}>
          <select
            id="clientId"
            name="clientId"
            defaultValue={chantier?.clientId ?? defaultClientId ?? ""}
            required
            onChange={handleClientChange}
            className={inputClasses}
          >
            <option value="" disabled>
              Sélectionner un client…
            </option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {clientDisplayName(client)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Statut" htmlFor="statut" error={errors.statut}>
          <select id="statut" name="statut" defaultValue={chantier?.statut ?? "PROSPECT"} className={inputClasses}>
            {Object.entries(statutLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Adresse du chantier" htmlFor="adresse" error={errors.adresse}>
          <input
            id="adresse"
            name="adresse"
            ref={adresseRef}
            defaultValue={chantier?.adresse ?? ""}
            className={inputClasses}
          />
        </Field>
        <Field label="Code postal" htmlFor="codePostal" error={errors.codePostal}>
          <input
            id="codePostal"
            name="codePostal"
            ref={cpRef}
            defaultValue={chantier?.codePostal ?? ""}
            className={inputClasses}
          />
        </Field>
        <Field label="Ville" htmlFor="ville" error={errors.ville}>
          <input
            id="ville"
            name="ville"
            ref={villeRef}
            defaultValue={chantier?.ville ?? ""}
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Date de début" htmlFor="dateDebut" error={errors.dateDebut}>
          <input
            id="dateDebut"
            name="dateDebut"
            type="date"
            defaultValue={toDateInputValue(chantier?.dateDebut)}
            className={inputClasses}
          />
        </Field>
        <Field label="Date de fin" htmlFor="dateFin" error={errors.dateFin}>
          <input
            id="dateFin"
            name="dateFin"
            type="date"
            defaultValue={toDateInputValue(chantier?.dateFin)}
            className={inputClasses}
          />
        </Field>
        <Field label="Budget estimé (€ HT)" htmlFor="budgetEstime" error={errors.budgetEstime}>
          <input
            id="budgetEstime"
            name="budgetEstime"
            type="number"
            step="0.01"
            min="0"
            defaultValue={chantier?.budgetEstime ?? ""}
            className={inputClasses}
          />
        </Field>
      </div>

      <Field label="Description" htmlFor="description" error={errors.description}>
        <textarea id="description" name="description" rows={3} defaultValue={chantier?.description ?? ""} className={inputClasses} />
      </Field>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
