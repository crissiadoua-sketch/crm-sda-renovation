export const dynamic = "force-dynamic";

import Link from "next/link";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS } from "@/lib/corps-etat";
import { createTempsUnitaire } from "@/lib/actions/temps-unitaires";

const NATURES = [
  { value: "PREPARATION", label: "Préparation" },
  { value: "POSE", label: "Pose" },
  { value: "FINITION", label: "Finition" },
  { value: "DIVERS", label: "Divers" },
];

const DIFFICULTES = [
  { value: "FACILE", label: "Facile" },
  { value: "MOYEN", label: "Moyen" },
  { value: "DIFFICILE", label: "Difficile" },
  { value: "TRES_DIFFICILE", label: "Très difficile" },
];

const UNITES = ["m²", "ml", "m³", "u", "h", "kg", "forfait"];

export default function NouveauTempsUnitairePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/temps-unitaires" className="text-sm text-brand-blue hover:underline">
          ← Retour aux temps unitaires
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouveau temps unitaire</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createTempsUnitaire} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Corps d'état *">
              <select name="corpsEtat" required className={inputClasses}>
                <option value="">Sélectionner…</option>
                {CORPS_ETAT_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code} — {CORPS_ETAT_LABELS[code]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nature de la tâche">
              <select name="nature" defaultValue="POSE" className={inputClasses}>
                {NATURES.map((n) => (
                  <option key={n.value} value={n.value}>{n.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Désignation *" className="sm:col-span-2">
              <input
                name="designation"
                type="text"
                required
                placeholder="ex. Pose carrelage grès cérame 60x60"
                className={inputClasses}
              />
            </Field>

            <Field label="Unité">
              <select name="unite" defaultValue="m²" className={inputClasses}>
                {UNITES.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </Field>

            <Field label="Temps unitaire (h/unité)">
              <input
                name="tempsUnitaire"
                type="number"
                step="0.001"
                min="0"
                defaultValue="0"
                className={inputClasses}
              />
              <p className="mt-1 text-xs text-slate-400">
                Nombre d'heures nécessaires par unité d'œuvre
              </p>
            </Field>

            <Field label="Difficulté">
              <select name="difficulte" defaultValue="MOYEN" className={inputClasses}>
                {DIFFICULTES.map((d) => (
                  <option key={d.value} value={d.value}>{d.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              className={inputClasses}
              placeholder="Conditions, précisions techniques…"
            />
          </Field>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="actif" id="actif" defaultChecked className="h-4 w-4 rounded border-slate-300 text-brand-blue" />
            <label htmlFor="actif" className="text-sm text-brand-navy">Actif</label>
          </div>

          <div className="flex gap-3">
            <SubmitButton>Créer le temps unitaire</SubmitButton>
            <Link
              href="/temps-unitaires"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              Annuler
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
