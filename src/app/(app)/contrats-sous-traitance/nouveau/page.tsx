export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { creerContrat } from "@/lib/actions/contrats-sous-traitance";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";

export default async function NouveauContratSousTraitancePage({
  searchParams,
}: {
  searchParams: Promise<{ chantierId?: string }>;
}) {
  const { chantierId } = await searchParams;

  const [sousTraitants, chantiers] = await Promise.all([
    prisma.sousTraitant.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true, reference: true } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/contrats-sous-traitance" className="text-sm text-brand-blue hover:underline">
          ← Retour aux contrats
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouveau contrat de sous-traitance</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={creerContrat} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Sous-traitant *" htmlFor="sousTraitantId">
              <select id="sousTraitantId" name="sousTraitantId" required className={inputClasses}>
                <option value="">— Sélectionner un sous-traitant —</option>
                {sousTraitants.map((s) => (
                  <option key={s.id} value={s.id}>{s.nom}</option>
                ))}
              </select>
            </Field>

            <Field label="Chantier *" htmlFor="chantierId">
              <select id="chantierId" name="chantierId" required defaultValue={chantierId ?? ""} className={inputClasses}>
                <option value="">— Sélectionner un chantier —</option>
                {chantiers.map((c) => (
                  <option key={c.id} value={c.id}>{c.reference} — {c.nom}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/contrats-sous-traitance"
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </Link>
            <SubmitButton pendingLabel="Création…">Créer le contrat</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
