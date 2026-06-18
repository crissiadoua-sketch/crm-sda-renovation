import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { mettreAJourOrdreMission, supprimerOrdreMission } from "@/lib/actions/ordres-mission";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";

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

  const [om, chantiers] = await Promise.all([
    prisma.ordreMission.findUnique({
      where: { id },
      include: {
        sousTraitant: { select: { nom: true, email: true, telephone: true, specialite: true } },
        chantier:     { select: { nom: true } },
      },
    }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true } }),
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
            {om.sousTraitant.nom}
            {om.sousTraitant.specialite && <> · {om.sousTraitant.specialite}</>}
            {om.chantier && <> · {om.chantier.nom}</>}
          </p>
        </div>
        <DeleteButton
          action={supprimerOrdreMission.bind(null, id)}
          confirmMessage={`Supprimer l'ordre de mission ${om.numero} ?`}
        />
      </div>

      {/* Infos sous-traitant */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Sous-traitant</p>
        <p className="font-semibold text-brand-navy">{om.sousTraitant.nom}</p>
        <div className="mt-1 flex flex-wrap gap-4 text-sm text-slate-500">
          {om.sousTraitant.email && <span>{om.sousTraitant.email}</span>}
          {om.sousTraitant.telephone && <span>{om.sousTraitant.telephone}</span>}
        </div>
      </div>

      {/* Formulaire */}
      <form action={action} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-4 text-sm font-semibold text-brand-navy">Détails de la mission</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Statut">
            <select name="statut" defaultValue={om.statut} className={inputClasses}>
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
            </select>
          </Field>
          <div className="lg:col-span-2">
            <Field label="Titre *">
              <input name="titre" type="text" defaultValue={om.titre} required className={inputClasses} />
            </Field>
          </div>
          <Field label="Chantier">
            <select name="chantierId" defaultValue={om.chantierId ?? ""} className={inputClasses}>
              <option value="">Sans chantier</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </Field>
          <Field label="Lieu">
            <input name="lieu" type="text" defaultValue={om.lieu ?? ""} className={inputClasses} placeholder="Adresse de la mission" />
          </Field>
          <div />
          <Field label="Date de début *">
            <input name="dateDebut" type="date" defaultValue={om.dateDebut.toISOString().slice(0, 10)} required className={inputClasses} />
          </Field>
          <Field label="Date de fin">
            <input name="dateFin" type="date" defaultValue={om.dateFin?.toISOString().slice(0, 10) ?? ""} className={inputClasses} />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Description de la mission">
            <textarea name="description" defaultValue={om.description ?? ""} rows={4}
              className={`${inputClasses} resize-y`}
              placeholder="Travaux à réaliser, prestations, consignes de sécurité, accès chantier…" />
          </Field>
        </div>

        <div className="mt-4">
          <Field label="Notes internes">
            <textarea name="notes" defaultValue={om.notes ?? ""} rows={2}
              className={`${inputClasses} resize-y`} />
          </Field>
        </div>

        <div className="mt-4 flex justify-end">
          <SubmitButton>Enregistrer</SubmitButton>
        </div>
      </form>
    </div>
  );
}
