export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { mettreAJourOrdreMission, supprimerOrdreMission } from "@/lib/actions/ordres-mission";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerOrdreMissionParEmail } from "@/lib/actions/email-documents";

const STATUTS = ["BROUILLON", "ENVOYE", "EN_COURS", "TERMINE", "ANNULE"];
const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", ENVOYE: "Envoyé", EN_COURS: "En cours",
  TERMINE: "Terminé", ANNULE: "Annulé",
};
const STATUT_TONES: Record<string, "green" | "blue" | "orange" | "gray" | "red" | "navy"> = {
  BROUILLON: "gray", ENVOYE: "blue", EN_COURS: "orange",
  TERMINE: "green", ANNULE: "red",
};

export default async function OrdreMissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [om, chantiers, interimaires] = await Promise.all([
    prisma.ordreMission.findUnique({
      where: { id },
      include: {
        interimaire: { select: { nom: true, prenom: true, telephone: true, corpsEtat: true, agence: true, qualification: true } },
        chantier:    { select: { nom: true } },
      },
    }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true } }),
    prisma.interimaire.findMany({
      where: { actif: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: { id: true, nom: true, prenom: true, corpsEtat: true, agence: true },
    }),
  ]);

  if (!om) notFound();

  const action = mettreAJourOrdreMission.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/ordres-mission" className="text-sm text-brand-blue hover:underline">← Ordres de mission</Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{om.numero}</h2>
            <Badge tone={STATUT_TONES[om.statut] ?? "gray"}>{STATUT_LABELS[om.statut]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {om.interimaire
              ? `${om.interimaire.prenom} ${om.interimaire.nom}${om.interimaire.agence ? ` · ${om.interimaire.agence}` : ""}`
              : "—"}
            {om.chantier && <> · {om.chantier.nom}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EnvoyerEmailModal
            action={envoyerOrdreMissionParEmail.bind(null, id)}
            defaultTo=""
            documentLabel={`Ordre de mission ${om.numero}`}
          defaultSubject={`Ordre de mission ${om.numero} — ${om.titre} — SDA Rénovation`}
          />
          <a href={`/apercu/ordre-mission/${id}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <FileText className="h-4 w-4 text-red-500" />
            PDF
          </a>
          <a href={`/api/ordres-mission/${id}/word`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <FileDown className="h-4 w-4 text-blue-600" />
            Word
          </a>
          <DeleteButton action={supprimerOrdreMission.bind(null, id)} confirmMessage={`Supprimer l'ordre de mission ${om.numero} ?`} />
        </div>
      </div>

      {/* Infos intérimaire */}
      {om.interimaire && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Intérimaire</p>
          <p className="font-semibold text-brand-navy">{om.interimaire.prenom} {om.interimaire.nom}</p>
          <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-500">
            {om.interimaire.corpsEtat && <span>{om.interimaire.corpsEtat}</span>}
            {om.interimaire.qualification && <span>{om.interimaire.qualification}</span>}
            {om.interimaire.agence && <span className="font-medium text-brand-navy">Agence : {om.interimaire.agence}</span>}
            {om.interimaire.telephone && <span>{om.interimaire.telephone}</span>}
            {om.interimaire.telephone && <span>{om.interimaire.telephone}</span>}
          </div>
        </div>
      )}

      {/* Formulaire */}
      <form action={action} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-brand-navy">Détails de la mission</p>
        <input type="hidden" name="type" value="INTERIMAIRE" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Intérimaire">
            <select name="interimaireId" defaultValue={om.interimaireId ?? ""} className={inputClasses}>
              <option value="">— Sélectionner —</option>
              {interimaires.map(i => (
                <option key={i.id} value={i.id}>
                  {i.prenom} {i.nom}{i.agence ? ` (${i.agence})` : ""} — {i.corpsEtat}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Statut">
            <select name="statut" defaultValue={om.statut} className={inputClasses}>
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
            </select>
          </Field>
          <div className="lg:col-span-1">
            <Field label="Objet de la mission *">
              <input name="titre" type="text" defaultValue={om.titre} required className={inputClasses} />
            </Field>
          </div>
          <Field label="Chantier">
            <select name="chantierId" defaultValue={om.chantierId ?? ""} className={inputClasses}>
              <option value="">Sans chantier</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </Field>
          <Field label="Lieu d'intervention">
            <input name="lieu" type="text" defaultValue={om.lieu ?? ""} className={inputClasses} placeholder="Adresse du chantier" />
          </Field>
          <div />
          <Field label="Date de début *">
            <input name="dateDebut" type="date" defaultValue={om.dateDebut.toISOString().slice(0, 10)} required className={inputClasses} />
          </Field>
          <Field label="Date de fin prévue">
            <input name="dateFin" type="date" defaultValue={om.dateFin?.toISOString().slice(0, 10) ?? ""} className={inputClasses} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Description des tâches / consignes">
            <textarea name="description" defaultValue={om.description ?? ""} rows={4}
              className={`${inputClasses} resize-y`}
              placeholder="Tâches à effectuer, horaires, EPI requis, consignes de sécurité, accès chantier…" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Notes internes">
            <textarea name="notes" defaultValue={om.notes ?? ""} rows={2} className={`${inputClasses} resize-y`} />
          </Field>
        </div>

        <div className="mt-4 flex justify-end">
          <SubmitButton>Enregistrer</SubmitButton>
        </div>
      </form>
    </div>
  );
}
