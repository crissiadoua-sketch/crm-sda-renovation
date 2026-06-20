import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS, CORPS_ETAT_BADGE_TONES, type CorpsEtatCode } from "@/lib/corps-etat";
import { formatEuros, formatDate } from "@/lib/format";
import { couleurParDefaut } from "@/lib/intervenant-couleur";
import {
  updateInterimaire,
  deleteInterimaire,
  createSuiviHeure,
  deleteSuiviHeure,
} from "@/lib/actions/interimaires";

const QUALIFICATIONS = [
  { value: "MANOEUVRE", label: "Manœuvre" },
  { value: "OUVRIER", label: "Ouvrier" },
  { value: "COMPAGNON", label: "Compagnon" },
  { value: "CHEF_EQUIPE", label: "Chef d'équipe" },
  { value: "CHEF_CHANTIER", label: "Chef de chantier" },
  { value: "MAITRISE", label: "Maîtrise" },
];
const QUALIFICATION_LABELS: Record<string, string> = Object.fromEntries(
  QUALIFICATIONS.map((q) => [q.value, q.label]),
);

export default async function InterimaireDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const interimaire = await prisma.interimaire.findUnique({
    where: { id },
    include: {
      heures: {
        include: { chantier: { select: { id: true, nom: true } } },
        orderBy: { semaine: "desc" },
      },
    },
  });
  if (!interimaire) notFound();

  const chantiers = await prisma.chantier.findMany({
    where: { statut: { not: "TERMINE" } },
    select: { id: true, nom: true },
    orderBy: { nom: "asc" },
  });

  const updateAction = updateInterimaire.bind(null, id);
  const deleteAction = deleteInterimaire.bind(null, id);
  const addHeureAction = createSuiviHeure.bind(null, id);

  // Totaux
  const totalH = interimaire.heures.reduce(
    (s, h) => s + h.heuresTravaillees + h.heuresSupp25 + h.heuresSupp50,
    0,
  );
  const totalCout = interimaire.heures.reduce((s, h) => s + h.coutTotalHT, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/interimaires" className="text-sm text-brand-blue hover:underline">
            ← Retour aux intérimaires
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">
              {interimaire.nom} {interimaire.prenom}
            </h2>
            <Badge tone="gray" className="font-mono">{interimaire.reference}</Badge>
            <Badge tone={CORPS_ETAT_BADGE_TONES[interimaire.corpsEtat as CorpsEtatCode] ?? "gray"}>
              {interimaire.corpsEtat}
            </Badge>
            {!interimaire.actif && <Badge tone="gray">Inactif</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {interimaire.agence ? `${interimaire.agence} · ` : ""}
            {QUALIFICATION_LABELS[interimaire.qualification] ?? interimaire.qualification} ·{" "}
            {formatEuros(interimaire.tauxHoraireHT)}/h HT · Agence : {interimaire.tauxAgenceHT} %
          </p>
        </div>
        <DeleteButton
          action={deleteAction}
          confirmMessage={`Supprimer l'intérimaire "${interimaire.nom} ${interimaire.prenom}" et toutes ses heures ?`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Fiche de modification */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-brand-navy">Informations</h3>
          <form action={updateAction} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom *">
                <input name="nom" type="text" required defaultValue={interimaire.nom} className={inputClasses} />
              </Field>
              <Field label="Prénom *">
                <input name="prenom" type="text" required defaultValue={interimaire.prenom} className={inputClasses} />
              </Field>
              <Field label="Agence">
                <input name="agence" type="text" defaultValue={interimaire.agence ?? ""} className={inputClasses} />
              </Field>
              <Field label="Téléphone">
                <input name="telephone" type="tel" defaultValue={interimaire.telephone ?? ""} className={inputClasses} />
              </Field>
              <Field label="Corps d'état *">
                <select name="corpsEtat" defaultValue={interimaire.corpsEtat} required className={inputClasses}>
                  {CORPS_ETAT_CODES.map((code) => (
                    <option key={code} value={code}>{code} — {CORPS_ETAT_LABELS[code]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Qualification">
                <select name="qualification" defaultValue={interimaire.qualification} className={inputClasses}>
                  {QUALIFICATIONS.map((q) => (
                    <option key={q.value} value={q.value}>{q.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Taux HT €/h">
                <input
                  name="tauxHoraireHT"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={interimaire.tauxHoraireHT}
                  className={inputClasses}
                />
              </Field>
              <Field label="Taux agence %">
                <input
                  name="tauxAgenceHT"
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={interimaire.tauxAgenceHT}
                  className={inputClasses}
                />
              </Field>
            </div>
            <Field label="Couleur d'identification (planning Gantt)">
              <input
                name="couleur"
                type="color"
                defaultValue={interimaire.couleur ?? couleurParDefaut(interimaire.id)}
                className="h-10 w-20 cursor-pointer rounded-md border border-slate-200"
              />
            </Field>
            <Field label="Notes">
              <textarea name="notes" rows={2} defaultValue={interimaire.notes ?? ""} className={inputClasses} />
            </Field>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="actif"
                id="actif-edit"
                defaultChecked={interimaire.actif}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="actif-edit" className="text-sm text-brand-navy">Actif</label>
            </div>
            <SubmitButton>Enregistrer</SubmitButton>
          </form>
        </div>

        {/* Saisie des heures */}
        <div className="rounded-xl border border-brand-orange/20 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-brand-navy">Saisie des heures</h3>
          <form action={addHeureAction} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Semaine *" className="col-span-2">
                <input name="semaine" type="week" required className={inputClasses} />
              </Field>
              <Field label="Chantier" className="col-span-2">
                <select name="chantierId" className={inputClasses}>
                  <option value="">Aucun chantier</option>
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom}</option>
                  ))}
                </select>
              </Field>
              <Field label="H normales">
                <input name="heuresTravaillees" type="number" step="0.5" min="0" defaultValue="0" className={inputClasses} />
              </Field>
              <Field label="H supp +25 %">
                <input name="heuresSupp25" type="number" step="0.5" min="0" defaultValue="0" className={inputClasses} />
              </Field>
              <Field label="H supp +50 %">
                <input name="heuresSupp50" type="number" step="0.5" min="0" defaultValue="0" className={inputClasses} />
              </Field>
              <Field label="Taux HT €/h">
                <input
                  name="tauxHoraireHT"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={interimaire.tauxHoraireHT}
                  className={inputClasses}
                />
              </Field>
              <Field label="Taux agence %">
                <input
                  name="tauxAgenceHT"
                  type="number"
                  step="0.1"
                  min="0"
                  defaultValue={interimaire.tauxAgenceHT}
                  className={inputClasses}
                />
              </Field>
            </div>
            <Field label="Observations">
              <input name="observations" type="text" className={inputClasses} placeholder="Remarques…" />
            </Field>
            <SubmitButton>Enregistrer les heures</SubmitButton>
          </form>
        </div>
      </div>

      {/* Historique des heures */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h3 className="font-semibold text-brand-navy">Historique des heures</h3>
          <span className="text-xs text-slate-400">{interimaire.heures.length} saisie(s)</span>
        </div>

        {interimaire.heures.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Aucune heure saisie.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2">Semaine</th>
                    <th className="px-4 py-2">Chantier</th>
                    <th className="px-4 py-2 text-right">H norm.</th>
                    <th className="px-4 py-2 text-right">H +25%</th>
                    <th className="px-4 py-2 text-right">H +50%</th>
                    <th className="px-4 py-2 text-right">Total H</th>
                    <th className="px-4 py-2 text-right">Taux HT</th>
                    <th className="px-4 py-2 text-right">Coût HT</th>
                    <th className="px-4 py-2 text-center">Payée</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {interimaire.heures.map((h) => {
                    const totalH = h.heuresTravaillees + h.heuresSupp25 + h.heuresSupp50;
                    return (
                      <tr key={h.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs text-slate-600">{h.semaine}</td>
                        <td className="px-4 py-2 text-slate-500">
                          {h.chantier ? (
                            <Link href={`/chantiers/${h.chantier.id}`} className="hover:underline text-brand-blue">
                              {h.chantier.nom}
                            </Link>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">{h.heuresTravaillees}h</td>
                        <td className="px-4 py-2 text-right text-slate-500">{h.heuresSupp25}h</td>
                        <td className="px-4 py-2 text-right text-slate-500">{h.heuresSupp50}h</td>
                        <td className="px-4 py-2 text-right font-semibold text-brand-navy">{totalH}h</td>
                        <td className="px-4 py-2 text-right text-slate-500">{formatEuros(h.tauxHoraireHT)}</td>
                        <td className="px-4 py-2 text-right font-semibold text-brand-orange">
                          {formatEuros(h.coutTotalHT)}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {h.facturePaye ? (
                            <Badge tone="green">Payée</Badge>
                          ) : (
                            <Badge tone="orange">En attente</Badge>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <DeleteButton
                            action={deleteSuiviHeure.bind(null, h.id, id)}
                            confirmMessage="Supprimer cette saisie d'heures ?"
                          >
                            Suppr.
                          </DeleteButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-slate-200 bg-slate-50">
                  <tr>
                    <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase">
                      Total
                    </td>
                    <td className="px-4 py-2 text-right font-bold text-brand-navy">{totalH.toFixed(1)}h</td>
                    <td className="px-4 py-2" />
                    <td className="px-4 py-2 text-right font-bold text-brand-orange">
                      {formatEuros(totalCout)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
