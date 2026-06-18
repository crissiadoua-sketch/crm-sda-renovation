"use client";

import { useActionState, useState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ClientState } from "@/lib/actions/clients";
import type { Client } from "@/generated/prisma/client";
import { CLIENT_TYPES, CLIENT_TYPE_LABELS, isParticulier } from "@/lib/reference";

type Action = (prevState: ClientState, formData: FormData) => Promise<ClientState>;

export function ClientForm({ client, action }: { client?: Client; action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  const [type, setType] = useState(client?.type ?? "PA");

  const particulier = isParticulier(type);
  const errors = state?.errors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.errors && Object.keys(state.errors).length > 0 && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
          Veuillez corriger les erreurs ci-dessous.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Type de client" htmlFor="type" error={errors.type}>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={inputClasses}
          >
            {CLIENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t} — {CLIENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Statut" htmlFor="statut" error={errors.statut}>
          <select
            id="statut"
            name="statut"
            defaultValue={client?.statut ?? "ACTIF"}
            className={inputClasses}
          >
            <option value="ACTIF">Actif</option>
            <option value="PROSPECT">Prospect</option>
            <option value="ARCHIVE">Archivé</option>
          </select>
        </Field>

        <Field label="Source" htmlFor="source" error={errors.source}>
          <select id="source" name="source" defaultValue={client?.source ?? ""} className={inputClasses}>
            <option value="">—</option>
            <option value="SITE_WEB">Site web</option>
            <option value="TELEPHONE">Téléphone</option>
            <option value="RECOMMANDATION">Recommandation</option>
            <option value="GOOGLE">Google</option>
            <option value="AUTRE">Autre</option>
          </select>
        </Field>
      </div>

      {particulier ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Field label="Civilité" htmlFor="civilite" error={errors.civilite}>
            <select id="civilite" name="civilite" defaultValue={client?.civilite ?? ""} className={inputClasses}>
              <option value="">—</option>
              <option value="M.">M.</option>
              <option value="Mme">Mme</option>
            </select>
          </Field>
          <Field label="Nom" htmlFor="nom" error={errors.nom} className="sm:col-span-2">
            <input id="nom" name="nom" defaultValue={client?.nom ?? ""} required className={inputClasses} />
          </Field>
          <Field label="Prénom" htmlFor="prenom" error={errors.prenom}>
            <input id="prenom" name="prenom" defaultValue={client?.prenom ?? ""} className={inputClasses} />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Raison sociale / Dénomination" htmlFor="raisonSociale" error={errors.raisonSociale} className="sm:col-span-2">
            <input
              id="raisonSociale"
              name="raisonSociale"
              defaultValue={client?.raisonSociale ?? ""}
              className={inputClasses}
              placeholder="Ex : Syndicat des copropriétaires Les Tilleuls"
            />
          </Field>
          <Field label="SIRET" htmlFor="siret" error={errors.siret}>
            <input id="siret" name="siret" defaultValue={client?.siret ?? ""} className={inputClasses} />
          </Field>
          <Field label="Nom du contact" htmlFor="nom" error={errors.nom} className="sm:col-span-2">
            <input id="nom" name="nom" defaultValue={client?.nom ?? ""} required className={inputClasses} placeholder="Nom du responsable" />
          </Field>
          <Field label="Prénom du contact" htmlFor="prenom" error={errors.prenom}>
            <input id="prenom" name="prenom" defaultValue={client?.prenom ?? ""} className={inputClasses} />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor="email" error={errors.email}>
          <input id="email" name="email" type="email" defaultValue={client?.email ?? ""} className={inputClasses} />
        </Field>
        <Field label="Téléphone" htmlFor="telephone" error={errors.telephone}>
          <input id="telephone" name="telephone" defaultValue={client?.telephone ?? ""} className={inputClasses} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Adresse" htmlFor="adresse" error={errors.adresse} className="sm:col-span-1">
          <input id="adresse" name="adresse" defaultValue={client?.adresse ?? ""} className={inputClasses} />
        </Field>
        <Field label="Code postal" htmlFor="codePostal" error={errors.codePostal}>
          <input id="codePostal" name="codePostal" defaultValue={client?.codePostal ?? ""} className={inputClasses} />
        </Field>
        <Field label="Ville" htmlFor="ville" error={errors.ville}>
          <input id="ville" name="ville" defaultValue={client?.ville ?? ""} className={inputClasses} />
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes" error={errors.notes}>
        <textarea id="notes" name="notes" rows={3} defaultValue={client?.notes ?? ""} className={inputClasses} />
      </Field>

      {/* Champs cachés pour garantir la soumission de tous les champs attendus par le serveur */}
      {particulier && <input type="hidden" name="raisonSociale" value="" />}
      {particulier && <input type="hidden" name="siret" value="" />}
      {!particulier && <input type="hidden" name="civilite" value="" />}

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
      </div>
    </form>
  );
}
