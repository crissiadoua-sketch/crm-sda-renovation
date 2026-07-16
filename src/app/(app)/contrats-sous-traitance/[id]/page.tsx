export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatEuros, formatDate } from "@/lib/format";
import { mettreAJourContrat, supprimerContrat } from "@/lib/actions/contrats-sous-traitance";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS } from "@/lib/corps-etat";
import { LienSignatureContrat } from "@/components/contrats-sous-traitance/lien-signature";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { PdfPreviewModal } from "@/components/ui/pdf-preview-modal";
import { envoyerContratSTParEmail } from "@/lib/actions/email-documents";

const STATUTS = ["BROUILLON", "ENVOYE", "SIGNE", "TERMINE", "RESILIE", "ANNULE"];
const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", ENVOYE: "Envoyé", SIGNE: "Signé",
  TERMINE: "Terminé", RESILIE: "Résilié", ANNULE: "Annulé",
};
const STATUT_TONES: Record<string, "green" | "blue" | "orange" | "gray" | "red" | "navy"> = {
  BROUILLON: "gray", ENVOYE: "blue", SIGNE: "green",
  TERMINE: "navy", RESILIE: "orange", ANNULE: "red",
};

export default async function ContratDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const contrat = await prisma.contratSousTraitance.findUnique({
    where: { id },
    include: {
      sousTraitant: { select: { nom: true, email: true, telephone: true } },
      chantier:     { select: { nom: true, adresse: true } },
    },
  });

  if (!contrat) notFound();

  const action = mettreAJourContrat.bind(null, id);
  const montantTTC = contrat.montantHT && contrat.tauxTVA
    ? contrat.montantHT * (1 + contrat.tauxTVA / 100)
    : null;

  return (
    <FullscreenToggle>
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/contrats-sous-traitance" className="text-sm text-brand-blue hover:underline">
            ← Contrats de sous-traitance
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{contrat.numero}</h2>
            <Badge tone={STATUT_TONES[contrat.statut] ?? "gray"}>{STATUT_LABELS[contrat.statut]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {contrat.sousTraitant.nom} · {contrat.chantier.nom}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EnvoyerEmailModal
            action={envoyerContratSTParEmail.bind(null, id)}
            defaultTo={contrat.sousTraitant.email ?? ""}
            documentLabel={`Contrat ${contrat.numero}`}
          defaultSubject={`Contrat de sous-traitance ${contrat.numero}${contrat.objet ? ` — ${contrat.objet}` : ""} — SDA Rénovation`}
          />
          <PdfPreviewModal
            href={`/apercu/contrat-sous-traitance/${id}`}
            label={`Aperçu PDF — ${contrat.numero}`}
            buttonLabel="📄 Aperçu PDF"
          />
          {contrat.statut === "BROUILLON" && (
            <DeleteButton
              action={supprimerContrat.bind(null, id)}
              confirmMessage={`Supprimer le contrat ${contrat.numero} ?`}
            />
          )}
        </div>
      </div>

      {/* Récapitulatif financier */}
      {contrat.montantHT != null && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Montant HT", value: formatEuros(contrat.montantHT), color: "text-brand-navy" },
            { label: `TVA (${contrat.tauxTVA ?? 20}%)`, value: montantTTC ? formatEuros(montantTTC - contrat.montantHT) : "—", color: "text-slate-500" },
            { label: "Montant TTC", value: montantTTC ? formatEuros(montantTTC) : "—", color: "text-brand-navy font-bold" },
            { label: "Retenue de garantie", value: contrat.retenueGarantie ? `${contrat.retenueGarantie} %` : "—", color: "text-slate-500" },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs text-slate-400 mb-1">{item.label}</p>
              <p className={`text-lg font-bold ${item.color}`}>{item.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Formulaire édition */}
      <form action={action} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-brand-navy">Données du contrat</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Statut">
            <select name="statut" defaultValue={contrat.statut} className={inputClasses}>
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
            </select>
          </Field>
          <Field label="Lot / Corps d'état">
            <select name="lot" defaultValue={contrat.lot ?? ""} className={inputClasses}>
              <option value="">— Sans lot —</option>
              {CORPS_ETAT_CODES.map(c => (
                <option key={c} value={c}>{c} — {CORPS_ETAT_LABELS[c]}</option>
              ))}
            </select>
          </Field>
          <Field label="Montant HT (€)">
            <input name="montantHT" type="number" step="0.01" defaultValue={contrat.montantHT ?? ""} className={inputClasses} />
          </Field>
          <Field label="Taux TVA (%)">
            <select name="tauxTVA" defaultValue={contrat.tauxTVA ?? 10} className={inputClasses}>
              <option value="5.5">5,5 %</option>
              <option value="10">10 %</option>
              <option value="20">20 %</option>
            </select>
          </Field>
          <Field label="Retenue de garantie (%)">
            <input name="retenueGarantie" type="number" step="0.5" min="0" max="100" defaultValue={contrat.retenueGarantie ?? ""} className={inputClasses} placeholder="5" />
          </Field>
          <Field label="Délai d'exécution">
            <input name="delaiExecution" type="text" defaultValue={contrat.delaiExecution ?? ""} className={inputClasses} placeholder="ex. 3 semaines" />
          </Field>
          <Field label="Date de début">
            <input name="dateDebut" type="date" defaultValue={contrat.dateDebut?.toISOString().slice(0, 10) ?? ""} className={inputClasses} />
          </Field>
          <Field label="Date de fin prévisionnelle">
            <input name="dateFin" type="date" defaultValue={contrat.dateFin?.toISOString().slice(0, 10) ?? ""} className={inputClasses} />
          </Field>
          <Field label="Modalités de règlement">
            <input name="modaliteReglement" type="text" defaultValue={contrat.modaliteReglement ?? ""} className={inputClasses} placeholder="ex. 30 jours fin de mois" />
          </Field>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Pénalités de retard">
            <input name="penalitesRetard" type="text" defaultValue={contrat.penalitesRetard ?? ""} className={inputClasses} placeholder="ex. 1/1000 par jour de retard" />
          </Field>
          <Field label="Assurance RC / décennale">
            <input name="assuranceRC" type="text" defaultValue={contrat.assuranceRC ?? ""} className={inputClasses} placeholder="ex. MAAF n° 1234567890" />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Objet du contrat">
            <textarea name="objet" defaultValue={contrat.objet ?? ""} rows={3}
              className={`${inputClasses} resize-y`}
              placeholder="Description des travaux, prestations confiées au sous-traitant…" />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Notes internes">
            <textarea name="notes" defaultValue={contrat.notes ?? ""} rows={2}
              className={`${inputClasses} resize-y`} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Clauses juridiques personnalisées (optionnel)">
            <textarea name="clausesPersonnalisees" defaultValue={contrat.clausesPersonnalisees ?? ""} rows={8}
              className={`${inputClasses} resize-y font-mono text-xs`}
              placeholder="Laissez vide pour générer automatiquement les articles standards (Objet, Délai, Prix, Pénalités, Assurances, Résiliation, Litiges…). Collez ici votre propre texte juridique (vos articles, rédigés par vous ou votre avocat) pour qu'il soit utilisé à la place, mot pour mot, dans le PDF du contrat." />
          </Field>
          <p className="mt-1 text-xs text-slate-400">
            {contrat.clausesPersonnalisees
              ? "✓ Le PDF utilisera ce texte personnalisé à la place des articles standards."
              : "Le PDF utilisera les articles standards générés automatiquement."}
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <SubmitButton>Enregistrer</SubmitButton>
        </div>
      </form>

      {/* Signature électronique */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-3 font-semibold text-brand-navy">Signature électronique</p>
        {contrat.statut === "SIGNE" && contrat.dateSignature ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex flex-col gap-1">
            <p className="text-sm font-semibold text-emerald-700">✅ Signé électroniquement</p>
            <p className="text-sm text-emerald-700">Signataire : <strong>{contrat.signataireNom}</strong></p>
            <p className="text-xs text-emerald-600">Le {formatDate(contrat.dateSignature)}</p>
            <p className="text-xs text-emerald-500 mt-1">Notification envoyée à contact@sda-renovation.com</p>
          </div>
        ) : contrat.signatureToken ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              En attente de signature — envoyez le lien ci-dessous au sous-traitant.
              Une fois signé, vous recevrez une notification par email.
            </p>
            <LienSignatureContrat token={contrat.signatureToken} />
          </div>
        ) : null}
      </div>
    </div>
    </FullscreenToggle>
  );
}
