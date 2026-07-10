export const dynamic = "force-dynamic";

import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS } from "@/lib/corps-etat";
import { createTauxMO } from "@/lib/actions/main-oeuvre";
import Link from "next/link";

const QUALIFICATIONS = [
  { value: "MANOEUVRE", label: "Manœuvre" },
  { value: "OUVRIER", label: "Ouvrier" },
  { value: "COMPAGNON", label: "Compagnon" },
  { value: "CHEF_EQUIPE", label: "Chef d'équipe" },
  { value: "CHEF_CHANTIER", label: "Chef de chantier" },
  { value: "MAITRISE", label: "Maîtrise" },
];

export default function NouveauTauxMOPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/main-oeuvre" className="text-sm text-brand-blue hover:underline">
          ← Retour aux taux
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouveau taux de main d'œuvre</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createTauxMO} className="flex flex-col gap-5">
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

            <Field label="Catégorie *">
              <select name="categorie" defaultValue="SALARIE" required className={inputClasses}>
                <option value="SALARIE">Salarié</option>
                <option value="SOUS_TRAITANT">Sous-traitant</option>
                <option value="INTERIMAIRE">Intérimaire</option>
              </select>
            </Field>

            <Field label="Qualification">
              <select name="qualification" defaultValue="COMPAGNON" className={inputClasses}>
                {QUALIFICATIONS.map((q) => (
                  <option key={q.value} value={q.value}>{q.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Désignation *">
              <input
                name="designation"
                type="text"
                required
                placeholder="ex. Compagnon maçon N3"
                className={inputClasses}
              />
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

            <Field label="Charges patronales % (salariés uniquement)">
              <input
                name="chargesPatronales"
                type="number"
                step="0.1"
                min="0"
                placeholder="ex. 45"
                className={inputClasses}
              />
              <p className="mt-1 text-xs text-slate-400">
                Laissez vide pour sous-traitants / intérimaires. Le coût complet sera calculé automatiquement.
              </p>
            </Field>
          </div>

          <Field label="Notes">
            <textarea name="notes" rows={3} className={inputClasses} placeholder="Informations complémentaires…" />
          </Field>

          <div className="flex items-center gap-2">
            <input type="checkbox" name="actif" id="actif" defaultChecked className="h-4 w-4 rounded border-slate-300 text-brand-blue" />
            <label htmlFor="actif" className="text-sm text-brand-navy">Actif</label>
          </div>

          <div className="flex gap-3">
            <SubmitButton>Créer le taux</SubmitButton>
            <Link
              href="/main-oeuvre"
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
