export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateMentionsFacture, deleteFacture, ajouterPaiement } from "@/lib/actions/factures";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerFactureParEmail } from "@/lib/actions/email-documents";
import { DeleteButton } from "@/components/ui/delete-button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";
import { PdfPreviewModal } from "@/components/ui/pdf-preview-modal";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { BridgePaiement } from "@/components/factures/bridge-paiement";
import { FactureLignesEditor } from "@/components/factures/facture-lignes-editor";

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  ENVOYEE: "blue",
  PAYEE_PARTIELLE: "orange",
  PAYEE: "green",
  EN_RETARD: "red",
  ANNULEE: "gray",
};

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYEE: "Envoyée",
  PAYEE_PARTIELLE: "Paiement partiel",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
  ANNULEE: "Annulée",
};

const typeBadgeTones: Record<string, BadgeTone> = {
  STANDARD: "navy",
  ACOMPTE: "blue",
  SITUATION: "orange",
  SOLDE: "green",
  AVOIR: "red",
};

const typeLabels: Record<string, string> = {
  STANDARD: "Facture",
  ACOMPTE: "Acompte",
  SITUATION: "Situation",
  SOLDE: "Solde",
  AVOIR: "Avoir",
};

const methodeLabels: Record<string, string> = {
  VIREMENT: "Virement",
  CHEQUE: "Chèque",
  CB: "Carte bancaire",
  ESPECES: "Espèces",
  EN_LIGNE: "En ligne",
  PRELEVEMENT: "Prélèvement",
};

export default async function FactureDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;

  const [facture, parametres] = await Promise.all([
    prisma.facture.findUnique({
      where: { id },
      include: {
        chantier: true,
        client: true,
        devis: { select: { id: true, numero: true, objet: true } },
        lignes: { orderBy: { ordre: "asc" } },
        paiements: { orderBy: { date: "desc" } },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!facture) notFound();

  const resteDu = Math.max(0, facture.totalTTC - facture.montantPaye);
  const hasCoordBancaires = parametres?.iban || parametres?.bic;

  return (
    <FullscreenToggle>
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/factures" className="text-sm text-brand-blue hover:underline">
            ← Retour aux factures
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{facture.numero}</h2>
            <Badge tone={typeBadgeTones[facture.type] ?? "gray"}>
              {typeLabels[facture.type] ?? facture.type}
            </Badge>
            <Badge tone={statutTones[facture.statut] ?? "gray"}>
              {statutLabels[facture.statut] ?? facture.statut}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <Link
              href={`/chantiers/${facture.chantier.id}`}
              className="text-brand-blue hover:underline"
            >
              {facture.chantier.nom}
            </Link>
            {" · "}
            <Link
              href={`/clients/${facture.client.id}`}
              className="text-brand-blue hover:underline"
            >
              {clientDisplayName(facture.client)}
            </Link>
          </p>
          {facture.devis && (
            <p className="mt-1 text-xs text-slate-400">
              Devis source :{" "}
              <Link
                href={`/devis/${facture.devis.id}`}
                className="text-brand-blue hover:underline"
              >
                {facture.devis.numero}
              </Link>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-right">
            <p className="text-2xl font-bold text-brand-navy">{formatEuros(facture.totalTTC)}</p>
            {resteDu > 0 && (
              <p className="text-sm font-medium text-red-600">
                Reste dû : {formatEuros(resteDu)}
              </p>
            )}
            {resteDu === 0 && facture.totalTTC > 0 && (
              <p className="text-sm font-medium text-emerald-600">Intégralement payée</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {facture.premiereOuvertureAt && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700">
                📥 Vue le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(facture.premiereOuvertureAt))}
              </span>
            )}
            <EnvoyerEmailModal
              action={envoyerFactureParEmail.bind(null, facture.id)}
              defaultTo={facture.client.email ?? ""}
              documentLabel={`facture ${facture.numero}`}
          defaultSubject={`Facture ${facture.numero} — ${facture.chantier.nom} — SDA Rénovation`}
            />
            <PdfPreviewModal
              href={`/apercu/facture/${facture.id}`}
              label={`Aperçu PDF — ${facture.numero}`}
              buttonLabel="📄 Aperçu PDF"
            />
            <DeleteButton
              action={deleteFacture.bind(null, facture.id)}
              confirmMessage={`Supprimer la facture ${facture.numero} ? Cette action est irréversible.`}
            />
          </div>
        </div>
      </div>

      {erreur === "suppression" && (
        <div className="rounded-lg bg-brand-orange-dark/10 px-4 py-3 text-sm text-brand-orange-dark">
          Impossible de supprimer cette facture.
        </div>
      )}

      {/* ── Informations générales ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Informations générales</h3>
        <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Numéro</p>
            <p className="font-mono text-slate-700">{facture.numero}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Émise le</p>
            <p className="text-slate-700">{formatDate(facture.dateEmission)}</p>
          </div>
          {facture.dateEcheance && (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Échéance</p>
              <p className="text-slate-700">{formatDate(facture.dateEcheance)}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Total HT</p>
            <p className="text-slate-700">{formatEuros(facture.totalHT)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">TVA</p>
            <p className="text-slate-700">{formatEuros(facture.totalTVA)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Total TTC</p>
            <p className="font-bold text-brand-navy">{formatEuros(facture.totalTTC)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Encaissé</p>
            <p className="font-bold text-emerald-600">{formatEuros(facture.montantPaye)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Reste dû</p>
            <p className={`font-bold ${resteDu > 0 ? "text-red-600" : "text-emerald-600"}`}>
              {resteDu > 0 ? formatEuros(resteDu) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Lignes ── */}
      <FactureLignesEditor factureId={facture.id} lignesInitiales={facture.lignes} />

      {/* ── Paiements ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Paiements</h3>

        {facture.paiements.length > 0 ? (
          <table className="mb-5 min-w-full divide-y divide-slate-100 text-sm">
            <thead className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="pb-2">Date</th>
                <th className="pb-2">Méthode</th>
                <th className="pb-2">Référence</th>
                <th className="pb-2 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {facture.paiements.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 text-slate-600">{formatDate(p.date)}</td>
                  <td className="py-2 text-slate-600">
                    {methodeLabels[p.methode] ?? p.methode}
                  </td>
                  <td className="py-2 text-slate-500 font-mono text-xs">
                    {p.reference ?? "—"}
                  </td>
                  <td className="py-2 text-right font-semibold text-emerald-600">
                    {formatEuros(p.montant)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mb-4 text-sm text-slate-400">Aucun paiement enregistré.</p>
        )}

        {/* Add paiement form — only if not fully paid */}
        {facture.statut !== "PAYEE" && facture.statut !== "ANNULEE" && (
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-brand-blue hover:underline select-none">
              + Enregistrer un paiement
            </summary>
            <div className="mt-4 rounded-lg border border-slate-100 p-4">
              <form action={ajouterPaiement.bind(null, facture.id)} className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Montant (€) *" htmlFor="pmt-montant">
                    <input
                      id="pmt-montant"
                      name="montant"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      defaultValue={resteDu > 0 ? resteDu.toFixed(2) : ""}
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Date du paiement" htmlFor="pmt-date">
                    <input
                      id="pmt-date"
                      name="date"
                      type="date"
                      defaultValue={new Date().toISOString().split("T")[0]}
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Méthode" htmlFor="pmt-methode">
                    <select
                      id="pmt-methode"
                      name="methode"
                      defaultValue="VIREMENT"
                      className={inputClasses}
                    >
                      <option value="VIREMENT">Virement</option>
                      <option value="CHEQUE">Chèque</option>
                      <option value="CB">Carte bancaire</option>
                      <option value="ESPECES">Espèces</option>
                      <option value="EN_LIGNE">En ligne</option>
                      <option value="PRELEVEMENT">Prélèvement</option>
                    </select>
                  </Field>
                  <Field label="Référence" htmlFor="pmt-reference">
                    <input
                      id="pmt-reference"
                      name="reference"
                      type="text"
                      placeholder="N° virement, chèque…"
                      className={inputClasses}
                    />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <SubmitButton pendingLabel="Enregistrement…">
                    Enregistrer le paiement
                  </SubmitButton>
                </div>
              </form>
            </div>
          </details>
        )}
      </div>

      {/* ── Coordonnées bancaires ── */}
      {hasCoordBancaires && (
        <div className="rounded-xl border border-brand-blue/20 bg-blue-50/40 p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <svg className="h-5 w-5 text-brand-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
            <h3 className="font-semibold text-brand-navy">Règlement par virement bancaire</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-sm">
            {parametres?.nomBanque && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Banque</p>
                <p className="font-medium text-slate-700">{parametres.nomBanque}</p>
              </div>
            )}
            {parametres?.domiciliation && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Domiciliation</p>
                <p className="font-medium text-slate-700">{parametres.domiciliation}</p>
              </div>
            )}
            {parametres?.iban && (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">IBAN</p>
                <p className="font-mono text-base font-bold tracking-wider text-brand-navy">
                  {parametres.iban}
                </p>
              </div>
            )}
            {parametres?.bic && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">BIC / SWIFT</p>
                <p className="font-mono font-bold text-slate-700">{parametres.bic}</p>
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bénéficiaire</p>
              <p className="font-medium text-slate-700">{parametres?.nomEntreprise ?? "SDA Rénovation"}</p>
            </div>
          </div>
          {resteDu > 0 && (
            <div className="mt-3 rounded-lg border border-brand-blue/20 bg-white px-4 py-2 text-sm">
              <span className="text-slate-500">Montant à virer :</span>{" "}
              <span className="font-bold text-brand-navy text-base">{formatEuros(resteDu)}</span>
              <span className="ml-3 text-slate-400">· Référence : </span>
              <span className="font-mono text-slate-700">{facture.numero}</span>
            </div>
          )}
        </div>
      )}

      {/* ── Paiement en ligne Bridge ── */}
      {facture.statut !== "ANNULEE" && (
        <BridgePaiement
          factureId={facture.id}
          factureNumero={facture.numero}
          resteDu={resteDu}
          lienPaiement={facture.lienPaiement ?? null}
          bridgeLinkStatut={facture.bridgeLinkStatut ?? null}
        />
      )}

      {/* ── Mentions complémentaires & Notes ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-brand-navy">
          Mentions complémentaires &amp; Notes
        </h3>
        <form action={updateMentionsFacture.bind(null, id)}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Mentions libres{" "}
                <span className="text-xs font-normal text-slate-400">
                  (visibles dans le PDF — conditions particulières, garanties, délais…)
                </span>
              </label>
              <textarea
                name="mentionsLibres"
                rows={4}
                defaultValue={facture.mentionsLibres ?? ""}
                placeholder="Ex: Pénalités de retard : 3 fois le taux d'intérêt légal. Escompte pour paiement anticipé : 0%…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Notes internes{" "}
                <span className="text-xs font-normal text-slate-400">
                  (non visibles dans le PDF)
                </span>
              </label>
              <textarea
                name="notesInternes"
                rows={3}
                defaultValue={facture.notesInternes ?? ""}
                placeholder="Notes pour l'équipe interne (non imprimées)…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark transition"
              >
                Enregistrer les mentions
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </FullscreenToggle>
  );
}
