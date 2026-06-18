"use client";

import { useActionState, useState, useEffect, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatEuros, toDateInputValue } from "@/lib/format";
import {
  getLignesTemplate,
  calculerLignes,
  calculerNet,
  type TypeCcn,
  type LigneBulletin,
} from "@/lib/ccn-batiment";
import type { BulletinState } from "@/lib/actions/rh";
import type { BulletinDePaie, Salarie } from "@/generated/prisma/client";

type Action = (prev: BulletinState, formData: FormData) => Promise<BulletinState>;

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function BulletinEditor({
  salarie,
  bulletin,
  action,
}: {
  salarie: Salarie;
  bulletin?: BulletinDePaie;
  action: Action;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};
  const typeCcn = salarie.typeCcn as TypeCcn;

  const [heures, setHeures] = useState(bulletin?.heuresTravaillees ?? salarie.heuresMois);
  const [heuresS25, setHeuresS25] = useState(bulletin?.heuresSupp25 ?? 0);
  const [heuresS50, setHeuresS50] = useState(bulletin?.heuresSupp50 ?? 0);
  const [salaireBase, setSalaireBase] = useState(bulletin?.salaireBase ?? salarie.salaireBase);
  const [autresElements, setAutresElements] = useState(bulletin?.autresElements ?? 0);

  const tauxHoraire = heures > 0 ? salaireBase / heures : 0;
  const majSupp25 = round2(heuresS25 * tauxHoraire * 0.25);
  const majSupp50 = round2(heuresS50 * tauxHoraire * 0.50);
  const totalBrut = round2(salaireBase + majSupp25 + majSupp50 + autresElements);

  const defaultLignes = useCallback(
    () =>
      bulletin?.lignes && bulletin.lignes !== "[]"
        ? (JSON.parse(bulletin.lignes) as LigneBulletin[])
        : calculerLignes(getLignesTemplate(typeCcn), totalBrut),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [lignes, setLignes] = useState<LigneBulletin[]>(defaultLignes);

  useEffect(() => {
    setLignes(calculerLignes(getLignesTemplate(typeCcn), totalBrut));
  }, [totalBrut, typeCcn]);

  function updateLigne(id: string, field: keyof LigneBulletin, value: number) {
    setLignes((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === "tauxSalarie") updated.montantSalarie = round2((updated.base * value) / 100);
        if (field === "tauxPatronal") updated.montantPatronal = round2((updated.base * value) / 100);
        if (field === "montantSalarie") updated.tauxSalarie = updated.base > 0 ? round2((value / updated.base) * 100) : 0;
        if (field === "montantPatronal") updated.tauxPatronal = updated.base > 0 ? round2((value / updated.base) * 100) : 0;
        return updated;
      }),
    );
  }

  function removeLigne(id: string) {
    setLignes((prev) => prev.filter((l) => l.id !== id));
  }

  function addLigne() {
    const newId = `custom_${Date.now()}`;
    setLignes((prev) => [
      ...prev,
      {
        id: newId,
        categorie: "COTISATION_SALARIALE",
        libelle: "Ligne personnalisée",
        base: totalBrut,
        tauxSalarie: 0,
        montantSalarie: 0,
        tauxPatronal: 0,
        montantPatronal: 0,
        editable: true,
      },
    ]);
  }

  const totals = calculerNet(totalBrut, lignes);
  const cotisationsTotal = totals.cotisationsSalarie + totals.csgNonDeductible;

  const today = toDateInputValue(new Date());
  const periodeDefault = bulletin?.periode ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.message && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">✅ {state.message}</div>
      )}

      <input type="hidden" name="lignes" value={JSON.stringify(lignes)} />
      <input type="hidden" name="totalBrut" value={totalBrut} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Période (AAAA-MM)" htmlFor="periode" error={errors.periode}>
          <input
            id="periode"
            name="periode"
            type="month"
            defaultValue={periodeDefault}
            required
            className={inputClasses}
          />
        </Field>
        <Field label="Date de paiement" htmlFor="datePaiement" error={errors.datePaiement}>
          <input
            id="datePaiement"
            name="datePaiement"
            type="date"
            defaultValue={toDateInputValue(bulletin?.datePaiement) || today}
            className={inputClasses}
          />
        </Field>
        <Field label="Statut" htmlFor="statut" error={errors.statut}>
          <select id="statut" name="statut" defaultValue={bulletin?.statut ?? "BROUILLON"} className={inputClasses}>
            <option value="BROUILLON">Brouillon</option>
            <option value="VALIDE">Validé</option>
            <option value="PAYE">Payé</option>
          </select>
        </Field>
      </div>

      {/* Rémunération */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Rémunération</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Heures travaillées" htmlFor="heuresTravaillees" error={errors.heuresTravaillees}>
            <input
              id="heuresTravaillees"
              name="heuresTravaillees"
              type="number"
              step="0.01"
              min="0"
              value={heures}
              onChange={(e) => setHeures(parseFloat(e.target.value) || 0)}
              className={inputClasses}
            />
          </Field>
          <Field label="H. supp. (25%)" htmlFor="heuresSupp25" error={errors.heuresSupp25}>
            <input
              id="heuresSupp25"
              name="heuresSupp25"
              type="number"
              step="0.5"
              min="0"
              value={heuresS25}
              onChange={(e) => setHeuresS25(parseFloat(e.target.value) || 0)}
              className={inputClasses}
            />
          </Field>
          <Field label="H. supp. (50%)" htmlFor="heuresSupp50" error={errors.heuresSupp50}>
            <input
              id="heuresSupp50"
              name="heuresSupp50"
              type="number"
              step="0.5"
              min="0"
              value={heuresS50}
              onChange={(e) => setHeuresS50(parseFloat(e.target.value) || 0)}
              className={inputClasses}
            />
          </Field>
          <Field label="Autres éléments (€)" htmlFor="autresElements" error={errors.autresElements}>
            <input
              id="autresElements"
              name="autresElements"
              type="number"
              step="0.01"
              min="0"
              value={autresElements}
              onChange={(e) => setAutresElements(parseFloat(e.target.value) || 0)}
              className={inputClasses}
            />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Salaire de base (€)" htmlFor="salaireBase" error={errors.salaireBase}>
            <input
              id="salaireBase"
              name="salaireBase"
              type="number"
              step="0.01"
              min="0"
              value={salaireBase}
              onChange={(e) => setSalaireBase(parseFloat(e.target.value) || 0)}
              className={`${inputClasses} sm:max-w-xs`}
            />
          </Field>
        </div>

        <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Salaire de base</span>
            <span className="font-medium">{formatEuros(salaireBase)}</span>
          </div>
          {majSupp25 > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Heures supp. 25% ({heuresS25}h × {formatEuros(tauxHoraire)} × 1,25)</span>
              <span className="font-medium">{formatEuros(majSupp25)}</span>
            </div>
          )}
          {majSupp50 > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Heures supp. 50% ({heuresS50}h × {formatEuros(tauxHoraire)} × 1,50)</span>
              <span className="font-medium">{formatEuros(majSupp50)}</span>
            </div>
          )}
          {autresElements > 0 && (
            <div className="flex justify-between">
              <span className="text-slate-600">Primes / indemnités / avantages</span>
              <span className="font-medium">{formatEuros(autresElements)}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-bold text-brand-navy">
            <span>Total brut</span>
            <span>{formatEuros(totalBrut)}</span>
          </div>
        </div>
      </div>

      {/* Cotisations */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-brand-navy">Cotisations sociales</h3>
          <button type="button" onClick={addLigne} className="flex items-center gap-1 text-xs text-brand-blue hover:underline">
            <Plus className="h-3 w-3" /> Ajouter une ligne
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left text-slate-500">
                <th className="pb-2 pr-3">Libellé</th>
                <th className="pb-2 pr-3 text-right w-24">Assiette</th>
                <th className="pb-2 pr-3 text-right w-16">Taux sal.</th>
                <th className="pb-2 pr-3 text-right w-24">Montant sal.</th>
                <th className="pb-2 pr-3 text-right w-16">Taux pat.</th>
                <th className="pb-2 pr-3 text-right w-24">Montant pat.</th>
                <th className="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lignes.map((l) => (
                <tr key={l.id} className={l.nonDeductible ? "bg-orange-50/40" : ""}>
                  <td className="py-1 pr-3">
                    {l.editable ? (
                      <input
                        value={l.libelle}
                        onChange={(e) =>
                          setLignes((prev) =>
                            prev.map((x) => (x.id === l.id ? { ...x, libelle: e.target.value } : x)),
                          )
                        }
                        className="w-full rounded border border-slate-200 px-1 py-0.5 text-xs"
                      />
                    ) : (
                      <span className="text-slate-700">{l.libelle}</span>
                    )}
                    {l.nonDeductible && (
                      <span className="ml-1 text-[10px] text-orange-500">(non déductible)</span>
                    )}
                  </td>
                  <td className="py-1 pr-3 text-right text-slate-500">{formatEuros(l.base)}</td>
                  <td className="py-1 pr-3 text-right">
                    <input
                      type="number"
                      step="0.001"
                      value={l.tauxSalarie}
                      onChange={(e) => updateLigne(l.id, "tauxSalarie", parseFloat(e.target.value) || 0)}
                      className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right text-xs"
                    />
                    <span className="text-slate-400">%</span>
                  </td>
                  <td className="py-1 pr-3 text-right font-medium text-red-600">
                    {l.montantSalarie > 0 ? `-${formatEuros(l.montantSalarie)}` : "—"}
                  </td>
                  <td className="py-1 pr-3 text-right">
                    <input
                      type="number"
                      step="0.001"
                      value={l.tauxPatronal}
                      onChange={(e) => updateLigne(l.id, "tauxPatronal", parseFloat(e.target.value) || 0)}
                      className="w-14 rounded border border-slate-200 px-1 py-0.5 text-right text-xs"
                    />
                    <span className="text-slate-400">%</span>
                  </td>
                  <td className="py-1 pr-3 text-right text-slate-500">
                    {l.montantPatronal > 0 ? formatEuros(l.montantPatronal) : "—"}
                  </td>
                  <td className="py-1">
                    {l.editable && (
                      <button type="button" onClick={() => removeLigne(l.id)} className="text-slate-300 hover:text-red-500">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-semibold text-brand-navy">
                <td className="pt-2 text-sm" colSpan={3}>Total cotisations salariales</td>
                <td className="pt-2 text-right text-sm text-red-600">-{formatEuros(cotisationsTotal)}</td>
                <td></td>
                <td className="pt-2 text-right text-sm text-slate-500">{formatEuros(totals.cotisationsPatronales)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Net */}
      <div className="rounded-xl border-2 border-brand-navy bg-brand-navy/5 p-5">
        <h3 className="mb-3 font-bold text-brand-navy">Récapitulatif</h3>
        <div className="grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          <div className="flex justify-between">
            <span className="text-slate-600">Salaire brut</span>
            <span className="font-medium">{formatEuros(totalBrut)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">Cotisations déductibles</span>
            <span className="font-medium text-red-600">-{formatEuros(totals.cotisationsSalarie)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600 font-medium">Net imposable</span>
            <span className="font-semibold text-brand-navy">{formatEuros(totals.netImposable)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-600">CSG non déductible + CRDS</span>
            <span className="font-medium text-red-600">-{formatEuros(totals.csgNonDeductible)}</span>
          </div>
          <div className="col-span-2 mt-1 flex justify-between border-t-2 border-brand-navy pt-2">
            <span className="text-lg font-bold text-brand-navy">NET À PAYER</span>
            <span className="text-xl font-bold text-brand-navy">{formatEuros(totals.netAPayer)}</span>
          </div>
          <div className="col-span-2 flex justify-between text-xs text-slate-500">
            <span>Coût total employeur (brut + cotisations patronales)</span>
            <span>{formatEuros(totalBrut + totals.cotisationsPatronales)}</span>
          </div>
        </div>
      </div>

      <Field label="Commentaires / mentions particulières" htmlFor="commentaires" error={errors.commentaires}>
        <textarea
          id="commentaires"
          name="commentaires"
          defaultValue={bulletin?.commentaires ?? ""}
          rows={3}
          placeholder="Ex. Congés payés pris du 01/06 au 15/06…"
          className={inputClasses}
        />
      </Field>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">
          {bulletin ? "Mettre à jour le bulletin" : "Créer le bulletin de paie"}
        </SubmitButton>
      </div>
    </form>
  );
}
