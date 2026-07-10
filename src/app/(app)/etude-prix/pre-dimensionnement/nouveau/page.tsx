export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { creerPreDimensionnement } from "@/lib/actions/pre-dimensionnement";
import { PreDimensionnementForm } from "@/components/calcul-structurel/pre-dimensionnement-form";

export default async function NouveauPreDimensionnementPage() {
  const chantiers = await prisma.chantier.findMany({
    select: { id: true, reference: true, nom: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/etude-prix/pre-dimensionnement" className="text-sm text-brand-blue hover:underline">
          ← Retour à la liste
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouveau pré-dimensionnement</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <PreDimensionnementForm action={creerPreDimensionnement} chantiers={chantiers} submitLabel="Calculer et enregistrer" />
      </div>
    </div>
  );
}
