export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, FileDown } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { mettreAJourOrdreMission, supprimerOrdreMission } from "@/lib/actions/ordres-mission";
import { DeleteButton } from "@/components/ui/delete-button";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerOrdreMissionParEmail } from "@/lib/actions/email-documents";
import { OmEditor } from "./om-editor";

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
    prisma.chantier.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, nom: true, adresse: true, dateDebut: true, dateFin: true },
    }),
    prisma.interimaire.findMany({
      where: { actif: true },
      orderBy: [{ nom: "asc" }, { prenom: "asc" }],
      select: { id: true, nom: true, prenom: true, corpsEtat: true, agence: true },
    }),
  ]);

  if (!om) notFound();

  const action = mettreAJourOrdreMission.bind(null, id);

  // Sérialiser les dates pour le composant client
  const chantiersSerialises = (chantiers as Array<{
    id: string;
    nom: string;
    adresse: string | null;
    dateDebut: Date | null;
    dateFin: Date | null;
  }>).map((c) => ({
    id: c.id,
    nom: c.nom,
    adresse: c.adresse,
    dateDebut: c.dateDebut ? c.dateDebut.toISOString().slice(0, 10) : null,
    dateFin:   c.dateFin   ? c.dateFin.toISOString().slice(0, 10)   : null,
  }));

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
          </div>
        </div>
      )}

      {/* Formulaire (composant client pour auto-remplissage) */}
      <OmEditor
        om={{
          interimaireId: om.interimaireId,
          chantierId:    om.chantierId,
          lieu:          om.lieu,
          dateDebut:     om.dateDebut.toISOString().slice(0, 10),
          dateFin:       om.dateFin?.toISOString().slice(0, 10) ?? null,
          titre:         om.titre,
          statut:        om.statut,
          description:   om.description,
          notes:         om.notes,
        }}
        chantiers={chantiersSerialises}
        interimaires={interimaires}
        action={action}
      />
    </div>
  );
}
