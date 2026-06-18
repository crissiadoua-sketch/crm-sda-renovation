import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateTache, deleteTache } from "@/lib/actions/taches";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

const STATUT_TONES: Record<string, BadgeTone> = {
  A_FAIRE: "gray", EN_COURS: "blue", EN_ATTENTE: "orange", TERMINEE: "green", ANNULEE: "gray",
};
const STATUT_LABELS: Record<string, string> = {
  A_FAIRE: "À faire", EN_COURS: "En cours", EN_ATTENTE: "En attente", TERMINEE: "Terminée", ANNULEE: "Annulée",
};

const SERVICES = [
  { value: "", label: "— Sélectionner un service —" },
  { value: "SERVICE_DIRECTION", label: "Direction" },
  { value: "SERVICE_COMMERCIAL", label: "Commercial" },
  { value: "SERVICE_TRAVAUX", label: "Travaux" },
  { value: "SERVICE_COMPTABILITE", label: "Comptabilité" },
  { value: "SERVICE_RH", label: "Ressources humaines" },
  { value: "SERVICE_ACHAT", label: "Achats" },
  { value: "SERVICE_ADMIN", label: "Administratif" },
  { value: "TOUS", label: "Tous services" },
];

export default async function TacheDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [tache, users, chantiers] = await Promise.all([
    prisma.tache.findUnique({
      where: { id },
      include: {
        assigneA: { select: { name: true, role: true } },
        creePar: { select: { name: true } },
        chantier: { select: { nom: true, reference: true } },
      },
    }),
    prisma.user.findMany({ select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
    prisma.chantier.findMany({
      where: { statut: { in: ["PROSPECT", "DEVIS_ENVOYE", "EN_COURS"] } },
      select: { id: true, nom: true, reference: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  if (!tache) notFound();

  const updateAction = updateTache.bind(null, id);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/taches" className="text-sm text-brand-blue hover:underline">
            ← Retour aux tâches
          </Link>
          <div className="mt-1 flex items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{tache.titre}</h2>
            <Badge tone={STATUT_TONES[tache.statut] ?? "gray"}>
              {STATUT_LABELS[tache.statut] ?? tache.statut}
            </Badge>
          </div>
          {tache.creePar && (
            <p className="mt-0.5 text-xs text-slate-400">
              Créée par {tache.creePar.name} · {formatDate(tache.createdAt)}
            </p>
          )}
        </div>
        <DeleteButton
          action={deleteTache.bind(null, id)}
          confirmMessage={`Supprimer la tâche « ${tache.titre} » ?`}
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={updateAction} className="flex flex-col gap-5">
          <Field label="Titre *" htmlFor="titre">
            <input id="titre" name="titre" defaultValue={tache.titre} required className={inputClasses} />
          </Field>

          <Field label="Description" htmlFor="description">
            <textarea id="description" name="description" rows={3} defaultValue={tache.description ?? ""} className={inputClasses} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Priorité" htmlFor="priorite">
              <select id="priorite" name="priorite" defaultValue={tache.priorite} className={inputClasses}>
                <option value="FAIBLE">Faible</option>
                <option value="NORMALE">Normale</option>
                <option value="HAUTE">Haute</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </Field>

            <Field label="Statut" htmlFor="statut">
              <select id="statut" name="statut" defaultValue={tache.statut} className={inputClasses}>
                <option value="A_FAIRE">À faire</option>
                <option value="EN_COURS">En cours</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="TERMINEE">Terminée</option>
                <option value="ANNULEE">Annulée</option>
              </select>
            </Field>

            <Field label="Périodicité" htmlFor="periodicite">
              <select id="periodicite" name="periodicite" defaultValue={tache.periodicite} className={inputClasses}>
                <option value="PONCTUELLE">Ponctuelle</option>
                <option value="QUOTIDIENNE">Quotidienne</option>
                <option value="HEBDOMADAIRE">Hebdomadaire</option>
                <option value="MENSUELLE">Mensuelle</option>
                <option value="TRIMESTRIELLE">Trimestrielle</option>
                <option value="ANNUELLE">Annuelle</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Service concerné" htmlFor="service">
              <select id="service" name="service" defaultValue={tache.service ?? ""} className={inputClasses}>
                {SERVICES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </Field>

            <Field label="Date d'échéance" htmlFor="dateEcheance">
              <input
                id="dateEcheance"
                name="dateEcheance"
                type="date"
                defaultValue={tache.dateEcheance ? new Date(tache.dateEcheance).toISOString().slice(0, 10) : ""}
                className={inputClasses}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Assigné à" htmlFor="assigneAId">
              <select id="assigneAId" name="assigneAId" defaultValue={tache.assigneAId ?? ""} className={inputClasses}>
                <option value="">— Non assigné —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Chantier lié (optionnel)" htmlFor="chantierId">
              <select id="chantierId" name="chantierId" defaultValue={tache.chantierId ?? ""} className={inputClasses}>
                <option value="">— Aucun chantier —</option>
                {chantiers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.reference} — {c.nom}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Commentaires" htmlFor="commentaires">
            <textarea
              id="commentaires"
              name="commentaires"
              rows={2}
              defaultValue={tache.commentaires ?? ""}
              className={inputClasses}
            />
          </Field>

          <div className="flex justify-end">
            <SubmitButton pendingLabel="Enregistrement…">Enregistrer les modifications</SubmitButton>
          </div>
        </form>
      </div>

      {tache.dateRealisation && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm text-emerald-700">
          ✓ Tâche réalisée le {formatDate(tache.dateRealisation)}
          {tache.assigneA && ` par ${tache.assigneA.name}`}.
        </div>
      )}
    </div>
  );
}
