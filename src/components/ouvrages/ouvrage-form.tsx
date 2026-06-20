"use client";

import { useActionState, useState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS, UNITES_COURANTES } from "@/lib/corps-etat";
import type { OuvrageState } from "@/lib/actions/ouvrages";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OffreValues {
  tempsPose:      number;
  prixPose:       number;
  prixFourniture: number;
}

type OffreKey = "eco" | "opt" | "prem";

const OFFRES: { key: OffreKey; label: string; color: string; bg: string; border: string; description: string }[] = [
  {
    key:         "eco",
    label:       "OFFRE ÉCONOMIQUE",
    color:       "text-emerald-700",
    bg:          "bg-emerald-50",
    border:      "border-emerald-200",
    description: "Matériaux entrée de gamme, prestations standards",
  },
  {
    key:         "opt",
    label:       "OFFRE OPTIMISÉE",
    color:       "text-blue-700",
    bg:          "bg-blue-50",
    border:      "border-blue-200",
    description: "Rapport qualité/prix optimal — offre recommandée",
  },
  {
    key:         "prem",
    label:       "OFFRE PREMIUM",
    color:       "text-violet-700",
    bg:          "bg-violet-50",
    border:      "border-violet-200",
    description: "Matériaux haut de gamme, finitions soignées",
  },
];

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

// ---------------------------------------------------------------------------
// Composant panneau d'une offre
// ---------------------------------------------------------------------------

function OffrePanel({
  offre,
  values,
  onChange,
}: {
  offre: (typeof OFFRES)[0];
  values: OffreValues;
  onChange: (key: OffreKey, field: keyof OffreValues, val: number) => void;
}) {
  const total = Math.round((values.prixPose + values.prixFourniture) * 100) / 100;

  return (
    <div className={`rounded-xl border-2 ${offre.border} ${offre.bg} p-4`}>
      {/* En-tête offre */}
      <div className="mb-3">
        <p className={`text-xs font-black uppercase tracking-widest ${offre.color}`}>
          {offre.label}
        </p>
        <p className="text-[10px] text-slate-500 mt-0.5">{offre.description}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Temps de pose */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Temps de pose (h/u)
          </label>
          <input
            name={`${offre.key}TempsPose`}
            type="number"
            step="0.001"
            min="0"
            value={values.tempsPose}
            onChange={(e) => onChange(offre.key, "tempsPose", parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        {/* Pose seule */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Pose seule HT (€)
          </label>
          <input
            name={`${offre.key}PrixPose`}
            type="number"
            step="0.01"
            min="0"
            value={values.prixPose}
            onChange={(e) => onChange(offre.key, "prixPose", parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        {/* Fourniture seule */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Fourniture seule HT (€)
          </label>
          <input
            name={`${offre.key}PrixFourniture`}
            type="number"
            step="0.01"
            min="0"
            value={values.prixFourniture}
            onChange={(e) => onChange(offre.key, "prixFourniture", parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
          />
        </div>

        {/* Total auto-calculé */}
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Fournitures + pose HT
          </label>
          <div className={`rounded-lg border-2 ${offre.border} bg-white px-2.5 py-1.5 text-sm font-bold ${offre.color}`}>
            {total.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
          {/* Hidden input pour le total */}
          <input type="hidden" name={`${offre.key}PrixTotal`} value={total} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Formulaire principal
// ---------------------------------------------------------------------------

type OuvrageFormProps = {
  action: (prev: OuvrageState, data: FormData) => Promise<OuvrageState>;
  defaultValues?: {
    corpsEtat?:        string;
    designation?:      string;
    unite?:            string;
    tauxTVA?:          number;
    description?:      string;
    actif?:            boolean;
    // Offre éco
    ecoTempsPose?:       number;
    ecoPrixPose?:        number;
    ecoPrixFourniture?:  number;
    // Offre opt
    optTempsPose?:       number;
    optPrixPose?:        number;
    optPrixFourniture?:  number;
    // Offre prem
    premTempsPose?:      number;
    premPrixPose?:       number;
    premPrixFourniture?: number;
  };
  isEdit?: boolean;
};

export function OuvrageForm({ action, defaultValues, isEdit }: OuvrageFormProps) {
  const [state, formAction] = useActionState(action, undefined);

  const [offres, setOffres] = useState<Record<OffreKey, OffreValues>>({
    eco: {
      tempsPose:      defaultValues?.ecoTempsPose ?? 0,
      prixPose:       defaultValues?.ecoPrixPose ?? 0,
      prixFourniture: defaultValues?.ecoPrixFourniture ?? 0,
    },
    opt: {
      tempsPose:      defaultValues?.optTempsPose ?? 0,
      prixPose:       defaultValues?.optPrixPose ?? 0,
      prixFourniture: defaultValues?.optPrixFourniture ?? 0,
    },
    prem: {
      tempsPose:      defaultValues?.premTempsPose ?? 0,
      prixPose:       defaultValues?.premPrixPose ?? 0,
      prixFourniture: defaultValues?.premPrixFourniture ?? 0,
    },
  });

  const handleChange = (key: OffreKey, field: keyof OffreValues, val: number) => {
    setOffres((prev) => ({ ...prev, [key]: { ...prev[key], [field]: val } }));
  };

  const err = state?.errors as Record<string, string[]> | undefined;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.message && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{state.message}</p>
      )}

      {/* Identité de l'ouvrage */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold text-brand-navy">Identification</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Corps d'état *" error={err?.corpsEtat?.[0]}>
            <select name="corpsEtat" defaultValue={defaultValues?.corpsEtat ?? ""} className={inputClasses} required>
              <option value="">— Choisir —</option>
              {CORPS_ETAT_CODES.map((code) => (
                <option key={code} value={code}>{code} — {CORPS_ETAT_LABELS[code]}</option>
              ))}
            </select>
          </Field>

          <Field label="Unité *" error={err?.unite?.[0]}>
            <select name="unite" defaultValue={defaultValues?.unite ?? "m²"} className={inputClasses}>
              {UNITES_COURANTES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </Field>

          <Field label="Taux TVA (%)" error={err?.tauxTVA?.[0]}>
            <select name="tauxTVA" defaultValue={defaultValues?.tauxTVA ?? 10} className={inputClasses}>
              <option value="5.5">5,5 % — Rénovation énergétique</option>
              <option value="10">10 % — Travaux logement &gt; 2 ans</option>
              <option value="20">20 % — Taux normal</option>
            </select>
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Désignation *" error={err?.designation?.[0]}>
            <textarea
              ref={autoGrow}
              name="designation"
              defaultValue={defaultValues?.designation}
              onInput={(e) => autoGrow(e.currentTarget)}
              rows={2}
              className={`${inputClasses} resize-none overflow-hidden`}
              placeholder="ex. Fourniture et pose de carrelage grès cérame 60×60"
              required
            />
          </Field>
        </div>

        <div className="mt-3">
          <Field label="Description technique (optionnel)">
            <textarea
              name="description"
              defaultValue={defaultValues?.description ?? ""}
              className={`${inputClasses} min-h-[60px] resize-y`}
              placeholder="Marque, référence, norme, épaisseur…"
            />
          </Field>
        </div>
      </div>

      {/* Les 3 offres */}
      <div>
        <p className="mb-3 text-sm font-semibold text-brand-navy">
          Bordereau de prix — 3 niveaux d'offre
        </p>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {OFFRES.map((offre) => (
            <OffrePanel
              key={offre.key}
              offre={offre}
              values={offres[offre.key]}
              onChange={handleChange}
            />
          ))}
        </div>

        {/* Récapitulatif comparatif */}
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="px-3 py-2 text-left text-slate-500 font-semibold">Offre</th>
                <th className="px-3 py-2 text-center text-slate-500 font-semibold">Temps de pose</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">Pose seule</th>
                <th className="px-3 py-2 text-right text-slate-500 font-semibold">Fourniture seule</th>
                <th className="px-3 py-2 text-right font-bold text-slate-600">Fournitures + pose</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {OFFRES.map((offre) => {
                const v = offres[offre.key];
                const total = Math.round((v.prixPose + v.prixFourniture) * 100) / 100;
                return (
                  <tr key={offre.key} className="bg-white">
                    <td className={`px-3 py-2 font-bold ${offre.color}`}>{offre.label}</td>
                    <td className="px-3 py-2 text-center text-slate-600">{v.tempsPose.toFixed(3)} h</td>
                    <td className="px-3 py-2 text-right text-slate-600">{v.prixPose.toFixed(2)} €</td>
                    <td className="px-3 py-2 text-right text-slate-600">{v.prixFourniture.toFixed(2)} €</td>
                    <td className={`px-3 py-2 text-right font-bold ${offre.color}`}>{total.toFixed(2)} €</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            id="actif"
            name="actif"
            type="checkbox"
            defaultChecked={defaultValues?.actif !== false}
            className="h-4 w-4 rounded border-slate-300 text-brand-orange focus:ring-brand-orange"
          />
          <label htmlFor="actif" className="text-sm text-slate-700">
            Ouvrage actif (visible dans les devis)
          </label>
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton>{isEdit ? "Enregistrer les modifications" : "Ajouter à la bibliothèque"}</SubmitButton>
      </div>
    </form>
  );
}
