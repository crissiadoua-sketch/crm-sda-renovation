import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createTache } from "@/lib/actions/taches";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";

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

export default async function NouvelleTachePage() {
  const [users, chantiers] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
    prisma.chantier.findMany({
      where: { statut: { in: ["PROSPECT", "DEVIS_ENVOYE", "EN_COURS"] } },
      select: { id: true, nom: true, reference: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/taches" className="text-sm text-brand-blue hover:underline">
          ← Retour aux tâches
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouvelle tâche</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createTache} className="flex flex-col gap-5">
          <Field label="Titre de la tâche *" htmlFor="titre">
            <input
              id="titre"
              name="titre"
              required
              placeholder="Ex : Mise à jour des prix fournisseurs"
              className={inputClasses}
            />
          </Field>

          <Field label="Description" htmlFor="description">
            <textarea
              id="description"
              name="description"
              rows={3}
              className={inputClasses}
              placeholder="Détails, instructions…"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Priorité" htmlFor="priorite">
              <select id="priorite" name="priorite" defaultValue="NORMALE" className={inputClasses}>
                <option value="FAIBLE">Faible</option>
                <option value="NORMALE">Normale</option>
                <option value="HAUTE">Haute</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </Field>

            <Field label="Statut" htmlFor="statut">
              <select id="statut" name="statut" defaultValue="A_FAIRE" className={inputClasses}>
                <option value="A_FAIRE">À faire</option>
                <option value="EN_COURS">En cours</option>
                <option value="EN_ATTENTE">En attente</option>
              </select>
            </Field>

            <Field label="Périodicité" htmlFor="periodicite">
              <select id="periodicite" name="periodicite" defaultValue="PONCTUELLE" className={inputClasses}>
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
              <select id="service" name="service" className={inputClasses}>
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
                className={inputClasses}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Assigné à" htmlFor="assigneAId">
              <select id="assigneAId" name="assigneAId" className={inputClasses}>
                <option value="">— Non assigné —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Chantier lié (optionnel)" htmlFor="chantierId">
              <select id="chantierId" name="chantierId" className={inputClasses}>
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
              className={inputClasses}
              placeholder="Informations complémentaires…"
            />
          </Field>

          <div className="flex justify-end gap-3">
            <Link
              href="/taches"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </Link>
            <SubmitButton pendingLabel="Création…">Créer la tâche</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
