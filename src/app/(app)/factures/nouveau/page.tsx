import { prisma } from "@/lib/prisma";
import { creerFactureLibre } from "@/lib/actions/factures";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";

const TYPE_LABELS: Record<string, string> = {
  STANDARD: "Facture",
  ACOMPTE: "Facture d'acompte",
  SITUATION: "Facture de situation",
  SOLDE: "Facture de solde",
  AVOIR: "Avoir",
};

export default async function NouvelleFacturePage({
  searchParams,
}: {
  searchParams: Promise<{ chantierId?: string }>;
}) {
  const { chantierId } = await searchParams;

  const chantiers = await prisma.chantier.findMany({
    include: { client: { select: { nom: true, prenom: true, raisonSociale: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-brand-navy">Nouvelle facture</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <form action={creerFactureLibre} className="flex flex-col gap-4">
          <Field label="Chantier *" htmlFor="chantierId">
            <select id="chantierId" name="chantierId" required defaultValue={chantierId ?? ""} className={inputClasses}>
              <option value="">— Sélectionner un chantier —</option>
              {chantiers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} — {c.client.raisonSociale || `${c.client.prenom ?? ""} ${c.client.nom}`.trim()}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Type" htmlFor="type">
            <select id="type" name="type" defaultValue="STANDARD" className={inputClasses}>
              {Object.entries(TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </Field>

          <Field label="Date d'échéance" htmlFor="dateEcheance">
            <input id="dateEcheance" name="dateEcheance" type="date" className={inputClasses} />
          </Field>

          <p className="text-xs text-slate-400">
            La facture sera créée en brouillon. Vous pourrez ajouter les lignes de facturation sur la page suivante.
          </p>

          <div className="flex justify-end">
            <SubmitButton pendingLabel="Création…">Créer la facture</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
