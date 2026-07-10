export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { modifierPreDimensionnement } from "@/lib/actions/pre-dimensionnement";
import { PreDimensionnementForm } from "@/components/calcul-structurel/pre-dimensionnement-form";

export default async function ModifierPreDimensionnementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [pdim, chantiers] = await Promise.all([
    prisma.preDimensionnement.findUnique({ where: { id } }),
    prisma.chantier.findMany({ select: { id: true, reference: true, nom: true }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!pdim) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/etude-prix/pre-dimensionnement/${id}`} className="text-sm text-brand-blue hover:underline">
          ← Retour à la fiche
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Modifier — {pdim.numero}</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <PreDimensionnementForm
          action={modifierPreDimensionnement.bind(null, id)}
          chantiers={chantiers}
          submitLabel="Recalculer et enregistrer"
          initial={{
            titre: pdim.titre,
            typeElement: pdim.typeElement,
            materiau: pdim.materiau,
            portee: pdim.portee,
            condition: pdim.condition,
            niveauCharge: pdim.niveauCharge,
            usageDallage: pdim.usageDallage,
            portanceSol: pdim.portanceSol,
            surface: pdim.surface,
            finitionBeton: pdim.finitionBeton,
            materiauMargelle: pdim.materiauMargelle,
            largeurMargelle: pdim.largeurMargelle,
            debordMargelle: pdim.debordMargelle,
            lineaireM: pdim.lineaireM,
            effortNormal: pdim.effortNormal,
            hauteurLibre: pdim.hauteurLibre,
            resistance: pdim.resistance,
            chantierId: pdim.chantierId,
            responsable: pdim.responsable,
            notes: pdim.notes,
          }}
        />
      </div>
    </div>
  );
}
