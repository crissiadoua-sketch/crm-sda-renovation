export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS, CORPS_ETAT_BADGE_TONES, type CorpsEtatCode } from "@/lib/corps-etat";
import { updateTempsUnitaire, deleteTempsUnitaire } from "@/lib/actions/temps-unitaires";

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
const DIFFICULTE_TONES: Record<string, "green" | "blue" | "orange" | "red"> = {
  FACILE: "green",
  MOYEN: "blue",
  DIFFICILE: "orange",
  TRES_DIFFICILE: "red",
};
const DIFFICULTE_LABELS: Record<string, string> = {
  FACILE: "Facile",
  MOYEN: "Moyen",
  DIFFICILE: "Difficile",
  TRES_DIFFICILE: "Très difficile",
};

export default async function TempsUnitaireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tu = await prisma.tempsUnitaire.findUnique({
    where: { id },
    include: { ouvrage: { select: { id: true, code: true, designation: true } } },
  });
  if (!tu) notFound();

  const updateAction = updateTempsUnitaire.bind(null, id);
  const deleteAction = deleteTempsUnitaire.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/temps-unitaires" className="text-sm text-brand-blue hover:underline">
            ← Retour aux temps unitaires
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{tu.designation}</h2>
            <Badge tone={CORPS_ETAT_BADGE_TONES[tu.corpsEtat as CorpsEtatCode] ?? "gray"}>
              {tu.corpsEtat}
            </Badge>
            <Badge tone={DIFFICULTE_TONES[tu.difficulte] ?? "gray"}>
              {DIFFICULTE_LABELS[tu.difficulte] ?? tu.difficulte}
            </Badge>
            {!tu.actif && <Badge tone="gray">Inactif</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {CORPS_ETAT_LABELS[tu.corpsEtat as CorpsEtatCode] ?? tu.corpsEtat} ·{" "}
            <strong className="text-brand-navy">{tu.tempsUnitaire.toFixed(3)} h/{tu.unite}</strong>
            {tu.ouvrage && (
              <> · Lié à{" "}
                <Link href={`/ouvrages/${tu.ouvrage.id}`} className="text-brand-blue hover:underline">
                  {tu.ouvrage.code}
                </Link>
              </>
            )}
          </p>
        </div>
        <DeleteButton
          action={deleteAction}
          confirmMessage={`Supprimer le temps unitaire "${tu.designation}" ?`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={updateAction} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Corps d'état *">
              <select name="corpsEtat" defaultValue={tu.corpsEtat} required className={inputClasses}>
                <option value="">Sélectionner…</option>
                {CORPS_ETAT_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code} — {CORPS_ETAT_LABELS[code]}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Nature de la tâche">
              <select name="nature" defaultValue={tu.nature} className={inputClasses}>
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
                defaultValue={tu.designation}
                className={inputClasses}
              />
            </Field>

            <Field label="Unité">
              <select name="unite" defaultValue={tu.unite} className={inputClasses}>
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
                defaultValue={tu.tempsUnitaire}
                className={inputClasses}
              />
            </Field>

            <Field label="Difficulté">
              <select name="difficulte" defaultValue={tu.difficulte} className={inputClasses}>
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
              defaultValue={tu.notes ?? ""}
              className={inputClasses}
            />
          </Field>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="actif"
              id="actif"
              defaultChecked={tu.actif}
              className="h-4 w-4 rounded border-slate-300 text-brand-blue"
            />
            <label htmlFor="actif" className="text-sm text-brand-navy">Actif</label>
          </div>

          <div className="flex gap-3">
            <SubmitButton>Enregistrer</SubmitButton>
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
