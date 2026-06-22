"use client";

import { useMemo, useState } from "react";
import { Field, inputClasses, selectClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  calculerPoutre,
  calculerDalle,
  calculerPoteau,
  calculerDallage,
  TYPE_ELEMENT_LABELS,
  MATERIAU_LABELS,
  CONDITION_POUTRE_LABELS,
  CONDITION_DALLE_LABELS,
  NIVEAU_CHARGE_LABELS,
  USAGE_DALLAGE_LABELS,
  PORTANCE_SOL_LABELS,
  PRESETS_USAGE,
  type TypeElement,
  type Materiau,
  type ConditionPoutre,
  type ConditionDalle,
  type NiveauCharge,
  type UsageDallage,
  type PortanceSol,
} from "@/lib/calcul-structurel/pre-dimensionnement";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  chantiers: { id: string; nom: string; reference: string }[];
  submitLabel: string;
  initial?: {
    titre?: string | null;
    typeElement?: string;
    materiau?: string;
    portee?: number | null;
    condition?: string | null;
    niveauCharge?: string | null;
    usageDallage?: string | null;
    portanceSol?: string | null;
    surface?: number | null;
    effortNormal?: number | null;
    hauteurLibre?: number | null;
    resistance?: number | null;
    chantierId?: string | null;
    responsable?: string | null;
    notes?: string | null;
  };
};

const RESISTANCE_DEFAUT: Record<Materiau, number> = { BETON: 25, ACIER: 235, BOIS: 21 };

export function PreDimensionnementForm({ action, chantiers, submitLabel, initial }: Props) {
  const [typeElement, setTypeElement] = useState<TypeElement>((initial?.typeElement as TypeElement) ?? "POUTRE");
  const [materiau, setMateriau] = useState<Materiau>((initial?.materiau as Materiau) ?? "BETON");
  const [portee, setPortee] = useState<string>(initial?.portee != null ? String(initial.portee) : "5");
  const [condition, setCondition] = useState<string>(initial?.condition ?? "ISOSTATIQUE");
  const [niveauCharge, setNiveauCharge] = useState<NiveauCharge>((initial?.niveauCharge as NiveauCharge) ?? "NORMALE");
  const [usageDallage, setUsageDallage] = useState<UsageDallage>((initial?.usageDallage as UsageDallage) ?? "INDUSTRIEL");
  const [portanceSol, setPortanceSol] = useState<PortanceSol>((initial?.portanceSol as PortanceSol) ?? "SABLE_GRAVE_COMPACTE");
  const [surface, setSurface] = useState<string>(initial?.surface != null ? String(initial.surface) : "");
  const [effortNormal, setEffortNormal] = useState<string>(initial?.effortNormal != null ? String(initial.effortNormal) : "300");
  const [hauteurLibre, setHauteurLibre] = useState<string>(initial?.hauteurLibre != null ? String(initial.hauteurLibre) : "");
  const [resistance, setResistance] = useState<string>(initial?.resistance != null ? String(initial.resistance) : "");
  const [usagePreset, setUsagePreset] = useState<string>("");

  function appliquerPreset(label: string) {
    setUsagePreset(label);
    const preset = PRESETS_USAGE.find((p) => p.label === label);
    if (!preset) return;
    setTypeElement(preset.typeElement);
    setMateriau(preset.materiau);
    if (preset.portee != null) setPortee(String(preset.portee));
    if (preset.condition) setCondition(preset.condition);
    if (preset.niveauCharge) setNiveauCharge(preset.niveauCharge);
    if (preset.usageDallage) setUsageDallage(preset.usageDallage);
    if (preset.portanceSol) setPortanceSol(preset.portanceSol);
  }

  const resultat = useMemo(() => {
    try {
      if (typeElement === "POUTRE") {
        const p = parseFloat(portee);
        if (!p || p <= 0) return null;
        return calculerPoutre({ materiau, portee: p, condition: condition as ConditionPoutre, niveauCharge });
      }
      if (typeElement === "DALLE") {
        const p = parseFloat(portee);
        if (!p || p <= 0) return null;
        return calculerDalle({ materiau, portee: p, condition: condition as ConditionDalle, niveauCharge });
      }
      if (typeElement === "DALLAGE") {
        return calculerDallage({
          usageDallage,
          niveauCharge,
          portanceSol,
          surface: surface ? parseFloat(surface) : undefined,
        });
      }
      const n = parseFloat(effortNormal);
      if (!n || n <= 0) return null;
      return calculerPoteau({
        materiau,
        effortNormal: n,
        hauteurLibre: hauteurLibre ? parseFloat(hauteurLibre) : undefined,
        resistance: resistance ? parseFloat(resistance) : undefined,
      });
    } catch {
      return null;
    }
  }, [typeElement, materiau, portee, condition, niveauCharge, usageDallage, portanceSol, surface, effortNormal, hauteurLibre, resistance]);

  const presetsFiltres = PRESETS_USAGE.filter((p) => p.typeElement === typeElement);

  return (
    <form action={action} className="flex flex-col gap-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        ⚠️ Pré-dimensionnement par ratios forfaitaires — ordre de grandeur avant calcul détaillé. Ne remplace pas une note de
        calcul réglementaire ni la validation d&apos;un ingénieur structure indépendant.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Titre" htmlFor="titre">
          <input id="titre" name="titre" type="text" defaultValue={initial?.titre ?? ""} placeholder="Ex : Poutre plancher R+1" className={inputClasses} />
        </Field>
        <Field label="Chantier (optionnel)" htmlFor="chantierId">
          <select id="chantierId" name="chantierId" defaultValue={initial?.chantierId ?? ""} className={selectClasses}>
            <option value="">— Aucun —</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>{c.reference} — {c.nom}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Type d'élément" htmlFor="typeElement" required>
          <select
            id="typeElement"
            name="typeElement"
            value={typeElement}
            onChange={(e) => setTypeElement(e.target.value as TypeElement)}
            className={selectClasses}
          >
            {Object.entries(TYPE_ELEMENT_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Matériau" htmlFor="materiau" required>
          <select
            id="materiau"
            name="materiau"
            value={materiau}
            onChange={(e) => setMateriau(e.target.value as Materiau)}
            className={selectClasses}
          >
            {Object.entries(MATERIAU_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Préset d'usage courant (pré-remplissage)" htmlFor="usagePreset">
          <select
            id="usagePreset"
            name="usagePreset"
            value={usagePreset}
            onChange={(e) => appliquerPreset(e.target.value)}
            className={selectClasses}
          >
            <option value="">— Saisie libre —</option>
            {presetsFiltres.map((p) => (
              <option key={p.label} value={p.label}>{p.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {(typeElement === "POUTRE" || typeElement === "DALLE") && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label={typeElement === "DALLE" ? "Plus petite portée (m)" : "Portée (m)"} htmlFor="portee" required>
            <input
              id="portee"
              name="portee"
              type="number"
              step="0.1"
              min="0.1"
              value={portee}
              onChange={(e) => setPortee(e.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Condition d'appui" htmlFor="condition" required>
            <select id="condition" name="condition" value={condition} onChange={(e) => setCondition(e.target.value)} className={selectClasses}>
              {Object.entries(typeElement === "POUTRE" ? CONDITION_POUTRE_LABELS : CONDITION_DALLE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Niveau de charge" htmlFor="niveauCharge" required>
            <select
              id="niveauCharge"
              name="niveauCharge"
              value={niveauCharge}
              onChange={(e) => setNiveauCharge(e.target.value as NiveauCharge)}
              className={selectClasses}
            >
              {Object.entries(NIVEAU_CHARGE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {typeElement === "DALLAGE" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Usage du dallage" htmlFor="usageDallage" required>
            <select
              id="usageDallage"
              name="usageDallage"
              value={usageDallage}
              onChange={(e) => setUsageDallage(e.target.value as UsageDallage)}
              className={selectClasses}
            >
              {Object.entries(USAGE_DALLAGE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Niveau de charge / trafic" htmlFor="niveauCharge" required>
            <select
              id="niveauCharge"
              name="niveauCharge"
              value={niveauCharge}
              onChange={(e) => setNiveauCharge(e.target.value as NiveauCharge)}
              className={selectClasses}
            >
              {Object.entries(NIVEAU_CHARGE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Type de sol support" htmlFor="portanceSol" required>
            <select
              id="portanceSol"
              name="portanceSol"
              value={portanceSol}
              onChange={(e) => setPortanceSol(e.target.value as PortanceSol)}
              className={selectClasses}
            >
              {Object.entries(PORTANCE_SOL_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="Surface du dallage (m², optionnel — active le métré)" htmlFor="surface">
            <input
              id="surface"
              name="surface"
              type="number"
              step="0.1"
              min="0"
              value={surface}
              onChange={(e) => setSurface(e.target.value)}
              placeholder="Ex : 500"
              className={inputClasses}
            />
          </Field>
        </div>
      )}

      {typeElement === "POTEAU" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Effort normal Nu (kN)" htmlFor="effortNormal" required>
            <input
              id="effortNormal"
              name="effortNormal"
              type="number"
              step="1"
              min="1"
              value={effortNormal}
              onChange={(e) => setEffortNormal(e.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field label="Hauteur libre (m, optionnel)" htmlFor="hauteurLibre">
            <input
              id="hauteurLibre"
              name="hauteurLibre"
              type="number"
              step="0.1"
              min="0"
              value={hauteurLibre}
              onChange={(e) => setHauteurLibre(e.target.value)}
              className={inputClasses}
            />
          </Field>
          <Field
            label={`Résistance matériau (MPa, défaut ${RESISTANCE_DEFAUT[materiau]})`}
            htmlFor="resistance"
          >
            <input
              id="resistance"
              name="resistance"
              type="number"
              step="1"
              min="1"
              value={resistance}
              onChange={(e) => setResistance(e.target.value)}
              placeholder={String(RESISTANCE_DEFAUT[materiau])}
              className={inputClasses}
            />
          </Field>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Responsable" htmlFor="responsable">
          <input id="responsable" name="responsable" type="text" defaultValue={initial?.responsable ?? ""} className={inputClasses} />
        </Field>
        <Field label="Notes" htmlFor="notes">
          <input id="notes" name="notes" type="text" defaultValue={initial?.notes ?? ""} className={inputClasses} />
        </Field>
      </div>

      <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-4">
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-blue">Aperçu du résultat</p>
        {resultat ? (
          <>
            <p className="text-lg font-bold text-brand-navy">{resultat.label}</p>
            <p className="mt-1 text-xs text-slate-500">{resultat.formule}</p>
          </>
        ) : (
          <p className="text-sm text-slate-400">Renseignez les paramètres pour voir l&apos;estimation.</p>
        )}
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Calcul en cours…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
