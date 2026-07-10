export const dynamic = "force-dynamic";

import Link from "next/link";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS } from "@/lib/corps-etat";
import { createInterimaire, nextInterimaireRef } from "@/lib/actions/interimaires";

const QUALIFICATIONS = [
  { value: "MANOEUVRE", label: "Manœuvre" },
  { value: "OUVRIER", label: "Ouvrier" },
  { value: "COMPAGNON", label: "Compagnon" },
  { value: "CHEF_EQUIPE", label: "Chef d'équipe" },
  { value: "CHEF_CHANTIER", label: "Chef de chantier" },
  { value: "MAITRISE", label: "Maîtrise" },
];

export default async function NouvelInterimaireePage() {
  const ref = await nextInterimaireRef();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/interimaires" className="text-sm text-brand-blue hover:underline">
          ← Retour aux intérimaires
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouvel intérimaire</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createInterimaire} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Référence">
              <input
                name="reference"
                type="text"
                defaultValue={ref}
                readOnly
                className={`${inputClasses} bg-slate-50 text-slate-500`}
              />
            </Field>

            <div className="sm:col-span-1" />

            <Field label="Nom *">
              <input name="nom" type="text" required className={inputClasses} placeholder="Dupont" />
            </Field>

            <Field label="Prénom *">
              <input name="prenom" type="text" required className={inputClasses} placeholder="Jean" />
            </Field>

            <Field label="Agence d'intérim">
              <input name="agence" type="text" className={inputClasses} placeholder="ex. Adecco, Manpower…" />
            </Field>

            <Field label="Téléphone">
              <input name="telephone" type="tel" className={inputClasses} placeholder="06 00 00 00 00" />
            </Field>

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

            <Field label="Qualification">
              <select name="qualification" defaultValue="COMPAGNON" className={inputClasses}>
                {QUALIFICATIONS.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Taux horaire HT (€/h)">
              <input
                name="tauxHoraireHT"
                type="number"
                step="0.01"
                min="0"
                defaultValue="0"
                className={inputClasses}
              />
            </Field>

            <Field label="Taux agence % (sur coût total)">
              <input
                name="tauxAgenceHT"
                type="number"
                step="0.1"
                min="0"
                defaultValue="0"
                className={inputClasses}
              />
              <p className="mt-1 text-xs text-slate-400">
                Marge de l'agence appliquée sur le coût total (%)
              </p>
            </Field>
          </div>

          <Field label="Couleur d'identification (planning Gantt)">
            <input
              name="couleur"
              type="color"
              defaultValue="#2563eb"
              className="h-10 w-20 cursor-pointer rounded-md border border-slate-200"
            />
          </Field>

          <Field label="Notes">
            <textarea name="notes" rows={3} className={inputClasses} placeholder="Informations complémentaires…" />
          </Field>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="actif" id="actif" defaultChecked className="h-4 w-4 rounded border-slate-300 text-brand-blue" />
            <label htmlFor="actif" className="text-sm text-brand-navy">Actif</label>
          </div>

          <div className="flex gap-3">
            <SubmitButton>Créer l'intérimaire</SubmitButton>
            <Link
              href="/interimaires"
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
