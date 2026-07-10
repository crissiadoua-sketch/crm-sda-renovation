export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS, CORPS_ETAT_BADGE_TONES, type CorpsEtatCode } from "@/lib/corps-etat";
import { formatEuros } from "@/lib/format";
import { updateTauxMO, deleteTauxMO } from "@/lib/actions/main-oeuvre";

const QUALIFICATIONS = [
  { value: "MANOEUVRE", label: "Manœuvre" },
  { value: "OUVRIER", label: "Ouvrier" },
  { value: "COMPAGNON", label: "Compagnon" },
  { value: "CHEF_EQUIPE", label: "Chef d'équipe" },
  { value: "CHEF_CHANTIER", label: "Chef de chantier" },
  { value: "MAITRISE", label: "Maîtrise" },
];

const CATEGORIE_LABELS: Record<string, string> = {
  SALARIE: "Salarié",
  SOUS_TRAITANT: "Sous-traitant",
  INTERIMAIRE: "Intérimaire",
};
const CATEGORIE_TONES: Record<string, "blue" | "navy" | "orange"> = {
  SALARIE: "navy",
  SOUS_TRAITANT: "orange",
  INTERIMAIRE: "blue",
};

export default async function TauxMODetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const taux = await prisma.tauxMainOeuvre.findUnique({ where: { id } });
  if (!taux) notFound();

  const updateAction = updateTauxMO.bind(null, id);
  const deleteAction = deleteTauxMO.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/main-oeuvre" className="text-sm text-brand-blue hover:underline">
            ← Retour aux taux
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{taux.designation}</h2>
            <Badge tone={CORPS_ETAT_BADGE_TONES[taux.corpsEtat as CorpsEtatCode] ?? "gray"}>
              {taux.corpsEtat}
            </Badge>
            <Badge tone={CATEGORIE_TONES[taux.categorie] ?? "gray"}>
              {CATEGORIE_LABELS[taux.categorie] ?? taux.categorie}
            </Badge>
            {!taux.actif && <Badge tone="gray">Inactif</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {CORPS_ETAT_LABELS[taux.corpsEtat as CorpsEtatCode] ?? taux.corpsEtat} ·{" "}
            Taux HT : <strong className="text-brand-navy">{formatEuros(taux.tauxHoraireHT)}/h</strong>
            {taux.coutCompletHT != null && taux.coutCompletHT !== taux.tauxHoraireHT && (
              <> · Coût complet : <strong className="text-brand-navy">{formatEuros(taux.coutCompletHT)}/h</strong></>
            )}
          </p>
        </div>
        <DeleteButton
          action={deleteAction}
          confirmMessage={`Supprimer le taux "${taux.designation}" ?`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={updateAction} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Corps d'état *">
              <select name="corpsEtat" defaultValue={taux.corpsEtat} required className={inputClasses}>
                <option value="">Sélectionner…</option>
                {CORPS_ETAT_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code} — {CORPS_ETAT_LABELS[code]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Catégorie *">
              <select name="categorie" defaultValue={taux.categorie} required className={inputClasses}>
                <option value="SALARIE">Salarié</option>
                <option value="SOUS_TRAITANT">Sous-traitant</option>
                <option value="INTERIMAIRE">Intérimaire</option>
              </select>
            </Field>

            <Field label="Qualification">
              <select name="qualification" defaultValue={taux.qualification} className={inputClasses}>
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
                defaultValue={taux.designation}
                className={inputClasses}
              />
            </Field>

            <Field label="Taux horaire HT (€/h)">
              <input
                name="tauxHoraireHT"
                type="number"
                step="0.01"
                min="0"
                defaultValue={taux.tauxHoraireHT}
                className={inputClasses}
              />
            </Field>

            <Field label="Charges patronales % (salariés uniquement)">
              <input
                name="chargesPatronales"
                type="number"
                step="0.1"
                min="0"
                defaultValue={taux.chargesPatronales ?? ""}
                placeholder="ex. 45"
                className={inputClasses}
              />
              <p className="mt-1 text-xs text-slate-400">
                Laissez vide pour sous-traitants / intérimaires.
              </p>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              name="notes"
              rows={3}
              defaultValue={taux.notes ?? ""}
              className={inputClasses}
            />
          </Field>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="actif"
              id="actif"
              defaultChecked={taux.actif}
              className="h-4 w-4 rounded border-slate-300 text-brand-blue"
            />
            <label htmlFor="actif" className="text-sm text-brand-navy">Actif</label>
          </div>

          <div className="flex gap-3">
            <SubmitButton>Enregistrer</SubmitButton>
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
