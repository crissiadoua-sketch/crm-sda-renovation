"use client";

import { useActionState, useState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { toDateInputValue } from "@/lib/format";
import { couleurParDefaut } from "@/lib/intervenant-couleur";
import {
  COEFFICIENTS_OUVRIERS,
  POSITIONS_ETAM,
  POSITIONS_CADRES,
  CCN_LABELS,
  type TypeCcn,
} from "@/lib/ccn-batiment";
import type { SalarieState } from "@/lib/actions/rh";
import type { Salarie } from "@/generated/prisma/client";

type Action = (prev: SalarieState, formData: FormData) => Promise<SalarieState>;

export function SalarieForm({ salarie, action }: { salarie?: Salarie; action: Action }) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};
  const [typeCcn, setTypeCcn] = useState<TypeCcn>((salarie?.typeCcn as TypeCcn) ?? "OUVRIERS");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {/* Identité */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nom" htmlFor="nom" error={errors.nom}>
          <input id="nom" name="nom" defaultValue={salarie?.nom ?? ""} required className={inputClasses} />
        </Field>
        <Field label="Prénom" htmlFor="prenom" error={errors.prenom}>
          <input id="prenom" name="prenom" defaultValue={salarie?.prenom ?? ""} required className={inputClasses} />
        </Field>
        <Field label="N° de Sécurité Sociale" htmlFor="numeroSS" error={errors.numeroSS}>
          <input
            id="numeroSS"
            name="numeroSS"
            defaultValue={salarie?.numeroSS ?? ""}
            placeholder="1 XX XX XX XXX XXX XX"
            maxLength={17}
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Date de naissance" htmlFor="dateNaissance" error={errors.dateNaissance}>
          <input
            id="dateNaissance"
            name="dateNaissance"
            type="date"
            defaultValue={toDateInputValue(salarie?.dateNaissance)}
            className={inputClasses}
          />
        </Field>
        <Field label="Date d'embauche" htmlFor="dateEmbauche" error={errors.dateEmbauche}>
          <input
            id="dateEmbauche"
            name="dateEmbauche"
            type="date"
            defaultValue={toDateInputValue(salarie?.dateEmbauche) || toDateInputValue(new Date())}
            required
            className={inputClasses}
          />
        </Field>
        <Field label="Date de sortie" htmlFor="dateSortie" error={errors.dateSortie}>
          <input
            id="dateSortie"
            name="dateSortie"
            type="date"
            defaultValue={toDateInputValue(salarie?.dateSortie)}
            className={inputClasses}
          />
        </Field>
      </div>

      {/* Contrat & CCN */}
      <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
        <p className="mb-3 text-sm font-semibold text-brand-navy">Classification conventionnelle</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Type de contrat" htmlFor="typeContrat" error={errors.typeContrat}>
            <select id="typeContrat" name="typeContrat" defaultValue={salarie?.typeContrat ?? "CDI"} className={inputClasses}>
              <option value="CDI">CDI</option>
              <option value="CDD">CDD</option>
              <option value="INTERIM">Intérim</option>
              <option value="APPRENTISSAGE">Apprentissage</option>
            </select>
          </Field>
          <Field label="Convention collective" htmlFor="typeCcn" error={errors.typeCcn}>
            <select
              id="typeCcn"
              name="typeCcn"
              value={typeCcn}
              onChange={(e) => setTypeCcn(e.target.value as TypeCcn)}
              className={inputClasses}
            >
              {(Object.entries(CCN_LABELS) as [TypeCcn, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </Field>

          {typeCcn === "OUVRIERS" && (
            <Field label="Coefficient" htmlFor="coefficient" error={errors.coefficient} className="sm:col-span-2">
              <select
                id="coefficient"
                name="coefficient"
                defaultValue={salarie?.coefficient ?? ""}
                className={inputClasses}
              >
                <option value="">— Choisir un coefficient —</option>
                {COEFFICIENTS_OUVRIERS.map((c) => (
                  <option key={c.coefficient} value={c.coefficient}>
                    {c.coefficient} — {c.qualification} ({c.tauxHoraire.toFixed(2)} €/h min.)
                  </option>
                ))}
              </select>
            </Field>
          )}

          {typeCcn === "ETAM" && (
            <Field label="Position ETAM" htmlFor="position" error={errors.position} className="sm:col-span-2">
              <select id="position" name="position" defaultValue={salarie?.position ?? ""} className={inputClasses}>
                <option value="">— Choisir une position —</option>
                {POSITIONS_ETAM.map((p) => (
                  <option key={p.position} value={p.position}>
                    {p.position} — {p.libelle} (min. {p.salaireMensuelMin.toFixed(0)} €/mois)
                  </option>
                ))}
              </select>
            </Field>
          )}

          {typeCcn === "CADRES" && (
            <Field label="Position Cadre" htmlFor="position" error={errors.position} className="sm:col-span-2">
              <select id="position" name="position" defaultValue={salarie?.position ?? ""} className={inputClasses}>
                <option value="">— Choisir une position —</option>
                {POSITIONS_CADRES.map((p) => (
                  <option key={p.position} value={p.position}>
                    {p.position} — {p.libelle} (min. {p.salaireMensuelMin.toFixed(0)} €/mois)
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="Qualification / Emploi" htmlFor="qualification" error={errors.qualification}>
            <input
              id="qualification"
              name="qualification"
              defaultValue={salarie?.qualification ?? ""}
              placeholder="Ex. Maçon coffreur, Conducteur de travaux…"
              className={inputClasses}
            />
          </Field>
          <Field label="Statut RH" htmlFor="statutRH" error={errors.statutRH}>
            <select id="statutRH" name="statutRH" defaultValue={salarie?.statutRH ?? "ACTIF"} className={inputClasses}>
              <option value="ACTIF">Actif</option>
              <option value="CONGE">En congé</option>
              <option value="RUPTURE">Rupture de contrat</option>
              <option value="INACTIF">Inactif</option>
            </select>
          </Field>
        </div>
      </div>

      {/* Salaire */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Salaire de base mensuel brut (€)" htmlFor="salaireBase" error={errors.salaireBase}>
          <input
            id="salaireBase"
            name="salaireBase"
            type="number"
            step="0.01"
            min="0"
            defaultValue={salarie?.salaireBase ?? ""}
            placeholder="Ex. 2100.00"
            required
            className={inputClasses}
          />
        </Field>
        <Field label="Heures mensuelles de base" htmlFor="heuresMois" error={errors.heuresMois}>
          <input
            id="heuresMois"
            name="heuresMois"
            type="number"
            step="0.01"
            min="0"
            defaultValue={salarie?.heuresMois ?? 151.67}
            className={inputClasses}
          />
        </Field>
      </div>

      {/* Coordonnées */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Adresse" htmlFor="adresse" error={errors.adresse} className="sm:col-span-2">
          <input id="adresse" name="adresse" defaultValue={salarie?.adresse ?? ""} className={inputClasses} />
        </Field>
        <Field label="Code postal" htmlFor="codePostal" error={errors.codePostal}>
          <input id="codePostal" name="codePostal" defaultValue={salarie?.codePostal ?? ""} className={inputClasses} />
        </Field>
        <Field label="Ville" htmlFor="ville" error={errors.ville}>
          <input id="ville" name="ville" defaultValue={salarie?.ville ?? ""} className={inputClasses} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email}>
          <input id="email" name="email" type="email" defaultValue={salarie?.email ?? ""} className={inputClasses} />
        </Field>
        <Field label="Téléphone" htmlFor="telephone" error={errors.telephone}>
          <input id="telephone" name="telephone" defaultValue={salarie?.telephone ?? ""} className={inputClasses} />
        </Field>
      </div>

      <Field label="N° matricule CIBTP (congés payés BTP)" htmlFor="numeroCIBTP" error={errors.numeroCIBTP}>
        <input
          id="numeroCIBTP"
          name="numeroCIBTP"
          defaultValue={salarie?.numeroCIBTP ?? ""}
          placeholder="Matricule caisse CIBTP Occitanie"
          className={inputClasses}
        />
      </Field>

      <Field label="Couleur d'identification (planning Gantt)" htmlFor="couleur" error={errors.couleur}>
        <input
          id="couleur"
          name="couleur"
          type="color"
          defaultValue={salarie?.couleur ?? couleurParDefaut(salarie?.id ?? `${salarie?.nom ?? ""}${salarie?.prenom ?? ""}`)}
          className="h-10 w-20 cursor-pointer rounded-md border border-slate-200"
        />
      </Field>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">
          {salarie ? "Mettre à jour la fiche" : "Créer le salarié"}
        </SubmitButton>
      </div>
    </form>
  );
}
