import Link from "next/link";
import { notFound } from "next/navigation";
import { OuvrageForm } from "@/components/ouvrages/ouvrage-form";
import { updateOuvrage, deleteOuvrage } from "@/lib/actions/ouvrages";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";
import { CORPS_ETAT_LABELS, CORPS_ETAT_BADGE_TONES, type CorpsEtatCode } from "@/lib/corps-etat";
import {
  upsertSousDetail,
  addLigneSDP,
  deleteLigneSDP,
  deleteSousDetail,
} from "@/lib/actions/sous-detail-prix";

const NATURE_LABELS: Record<string, string> = {
  MAIN_OEUVRE: "Main d'œuvre",
  MATERIAU: "Matériaux",
  MATERIEL: "Matériel",
  SOUS_TRAITANCE: "Sous-traitance",
};

const NATURES = ["MAIN_OEUVRE", "MATERIAU", "MATERIEL", "SOUS_TRAITANCE"] as const;

export default async function OuvrageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ouvrage = await prisma.ouvrage.findUnique({
    where: { id },
    include: {
      sousDetailPrix: {
        include: {
          lignes: { orderBy: { ordre: "asc" } },
        },
      },
    },
  });
  if (!ouvrage) notFound();

  const action = updateOuvrage.bind(null, id);
  const sdp = ouvrage.sousDetailPrix;

  // Compute SDP totals
  let debourseSecHT = 0;
  let sdpPrixCalcule = 0;
  if (sdp) {
    debourseSecHT = sdp.lignes.reduce((s, l) => s + l.totalHT, 0);
    const fraisMontant = debourseSecHT * (sdp.fraisGeneraux / 100);
    const coutProd = debourseSecHT + fraisMontant;
    const beneficeMontant = coutProd * (sdp.benefice / 100);
    sdpPrixCalcule = coutProd + beneficeMontant;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/ouvrages" className="text-sm text-brand-blue hover:underline">
            ← Retour à la bibliothèque
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{ouvrage.designation}</h2>
            <Badge tone={CORPS_ETAT_BADGE_TONES[ouvrage.corpsEtat as CorpsEtatCode] ?? "gray"}>
              {ouvrage.code}
            </Badge>
            {!ouvrage.actif && <Badge tone="gray">Inactif</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {CORPS_ETAT_LABELS[ouvrage.corpsEtat as CorpsEtatCode] ?? ouvrage.corpsEtat} ·{" "}
            {ouvrage.unite} · Total HT :{" "}
            <strong className="text-brand-navy">{formatEuros(ouvrage.prixUnitaire)}</strong>
          </p>
        </div>
        <DeleteButton
          action={deleteOuvrage.bind(null, id)}
          confirmMessage={`Supprimer l'ouvrage "${ouvrage.designation}" (${ouvrage.code}) ?`}
        />
      </div>

      {/* Formulaire d'édition */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <OuvrageForm
          action={action}
          defaultValues={{
            corpsEtat:         ouvrage.corpsEtat,
            designation:       ouvrage.designation,
            unite:             ouvrage.unite,
            tauxTVA:           ouvrage.tauxTVA,
            description:       ouvrage.description ?? undefined,
            actif:             ouvrage.actif,
            // Offre Éco
            ecoTempsPose:      ouvrage.ecoTempsPose,
            ecoPrixPose:       ouvrage.ecoPrixPose,
            ecoPrixFourniture: ouvrage.ecoPrixFourniture,
            // Offre Opt
            optTempsPose:      ouvrage.optTempsPose,
            optPrixPose:       ouvrage.optPrixPose,
            optPrixFourniture: ouvrage.optPrixFourniture,
            // Offre Prem
            premTempsPose:     ouvrage.premTempsPose,
            premPrixPose:      ouvrage.premPrixPose,
            premPrixFourniture: ouvrage.premPrixFourniture,
          }}
          isEdit
        />
      </div>

      {/* Sous-Détail de Prix */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-brand-navy">Sous-Détail de Prix (SDP)</h3>
          {sdp && (
            <DeleteButton
              action={deleteSousDetail.bind(null, sdp.id, id)}
              confirmMessage="Supprimer le sous-détail de prix et toutes ses lignes ?"
            >
              Supprimer le SDP
            </DeleteButton>
          )}
        </div>

        {!sdp ? (
          /* Création initiale du SDP */
          <form action={upsertSousDetail.bind(null, ouvrage.id)} className="flex flex-col gap-4">
            <p className="text-sm text-slate-500">
              Aucun sous-détail de prix pour cet ouvrage. Initialisez-le pour décomposer le prix en
              main d'œuvre, matériaux, matériel et sous-traitance.
            </p>
            <div className="flex flex-wrap gap-4">
              <Field label="Frais généraux %">
                <input
                  name="fraisGeneraux"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={15}
                  className={`${inputClasses} w-28`}
                />
              </Field>
              <Field label="Bénéfice %">
                <input
                  name="benefice"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={8}
                  className={`${inputClasses} w-28`}
                />
              </Field>
            </div>
            <div>
              <SubmitButton>Créer le SDP</SubmitButton>
            </div>
          </form>
        ) : (
          /* SDP existant */
          <>
            {/* Mise à jour FG & Bénéfice */}
            <form
              action={upsertSousDetail.bind(null, ouvrage.id)}
              className="mb-6 flex flex-wrap items-end gap-4 rounded-lg border border-slate-100 bg-slate-50 p-3"
            >
              <Field label="Frais généraux %">
                <input
                  name="fraisGeneraux"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={sdp.fraisGeneraux}
                  className={`${inputClasses} w-28`}
                />
              </Field>
              <Field label="Bénéfice %">
                <input
                  name="benefice"
                  type="number"
                  step="0.5"
                  min="0"
                  defaultValue={sdp.benefice}
                  className={`${inputClasses} w-28`}
                />
              </Field>
              <Field label="Notes">
                <input
                  name="notes"
                  type="text"
                  defaultValue={sdp.notes ?? ""}
                  placeholder="Notes…"
                  className={`${inputClasses} w-48`}
                />
              </Field>
              <button
                type="submit"
                className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark transition"
              >
                Mettre à jour
              </button>
            </form>

            {/* Lignes groupées par nature */}
            {NATURES.map((nature) => {
              const lines = sdp.lignes.filter((l) => l.nature === nature);
              if (lines.length === 0) return null;
              const sousTotal = lines.reduce((s, l) => s + l.totalHT, 0);
              return (
                <div key={nature} className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-brand-navy">
                    {NATURE_LABELS[nature]}
                  </h4>
                  <div className="overflow-x-auto rounded-lg border border-slate-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                          <th className="px-3 py-2">Désignation</th>
                          <th className="px-3 py-2 text-center">Unité</th>
                          <th className="px-3 py-2 text-right">Quantité</th>
                          <th className="px-3 py-2 text-right">P.U. HT</th>
                          <th className="px-3 py-2 text-right">Total HT</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {lines.map((ligne) => (
                          <tr key={ligne.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2">{ligne.designation}</td>
                            <td className="px-3 py-2 text-center text-slate-500">{ligne.unite}</td>
                            <td className="px-3 py-2 text-right text-slate-500">
                              {ligne.quantite.toFixed(3)}
                            </td>
                            <td className="px-3 py-2 text-right text-slate-500">
                              {formatEuros(ligne.prixUnitaireHT)}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-brand-navy">
                              {formatEuros(ligne.totalHT)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <DeleteButton
                                action={deleteLigneSDP.bind(null, ligne.id, ouvrage.id)}
                                confirmMessage="Supprimer cette ligne du SDP ?"
                              >
                                Suppr.
                              </DeleteButton>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="border-t border-slate-200 bg-slate-50">
                        <tr>
                          <td colSpan={4} className="px-3 py-1 text-xs text-slate-500">
                            Sous-total {NATURE_LABELS[nature]}
                          </td>
                          <td className="px-3 py-1 text-right text-sm font-bold text-brand-navy">
                            {formatEuros(sousTotal)}
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Ajouter une ligne */}
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 p-4">
              <h4 className="mb-3 text-sm font-semibold text-brand-navy">+ Ajouter une ligne</h4>
              <form
                action={addLigneSDP.bind(null, ouvrage.id, sdp.id)}
                className="flex flex-wrap gap-3"
              >
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Nature</label>
                  <select name="nature" className={`${inputClasses} w-36`} defaultValue="MAIN_OEUVRE">
                    {NATURES.map((n) => (
                      <option key={n} value={n}>{NATURE_LABELS[n]}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 min-w-40">
                  <label className="mb-1 block text-xs font-medium text-slate-500">Désignation *</label>
                  <input
                    name="designation"
                    type="text"
                    required
                    placeholder="ex. Compagnon pose 3h"
                    className={inputClasses}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Unité</label>
                  <input name="unite" type="text" defaultValue="h" className={`${inputClasses} w-16`} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Quantité</label>
                  <input
                    name="quantite"
                    type="number"
                    step="0.001"
                    min="0"
                    defaultValue="0"
                    className={`${inputClasses} w-24`}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">P.U. HT (€)</label>
                  <input
                    name="prixUnitaireHT"
                    type="number"
                    step="0.01"
                    min="0"
                    defaultValue="0"
                    className={`${inputClasses} w-24`}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark transition"
                  >
                    + Ajouter
                  </button>
                </div>
              </form>
            </div>

            {/* Récapitulatif financier */}
            {sdp.lignes.length > 0 && (
              <div className="mt-6 rounded-xl border border-brand-navy/20 bg-brand-navy/5 p-4">
                <h4 className="mb-3 font-semibold text-brand-navy">Récapitulatif financier</h4>
                <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
                  <div className="flex justify-between gap-4 sm:col-span-1">
                    <span className="text-slate-500">Déboursé sec HT</span>
                    <span className="font-semibold text-brand-navy">{formatEuros(debourseSecHT)}</span>
                  </div>
                  <div className="flex justify-between gap-4 sm:col-span-1">
                    <span className="text-slate-500">
                      Frais généraux ({sdp.fraisGeneraux} %)
                    </span>
                    <span className="text-slate-600">
                      {formatEuros(debourseSecHT * (sdp.fraisGeneraux / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 sm:col-span-1">
                    <span className="text-slate-500">
                      Coût de production
                    </span>
                    <span className="text-slate-600">
                      {formatEuros(debourseSecHT * (1 + sdp.fraisGeneraux / 100))}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 sm:col-span-1">
                    <span className="text-slate-500">
                      Bénéfice ({sdp.benefice} %)
                    </span>
                    <span className="text-slate-600">
                      {formatEuros(
                        debourseSecHT * (1 + sdp.fraisGeneraux / 100) * (sdp.benefice / 100),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 border-t border-brand-navy/20 pt-2 sm:col-span-2">
                    <span className="font-semibold text-brand-navy">Prix calculé HT</span>
                    <span className="text-lg font-bold text-brand-navy">
                      {formatEuros(sdpPrixCalcule)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4 sm:col-span-3">
                    <span className="text-slate-500">
                      Prix BPU actuel / Écart
                    </span>
                    <span
                      className={`font-semibold ${
                        Math.abs(sdpPrixCalcule - ouvrage.prixUnitaire) < 0.01
                          ? "text-emerald-600"
                          : "text-brand-orange-dark"
                      }`}
                    >
                      {formatEuros(ouvrage.prixUnitaire)} /{" "}
                      {formatEuros(sdpPrixCalcule - ouvrage.prixUnitaire)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
