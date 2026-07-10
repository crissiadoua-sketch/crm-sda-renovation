export const dynamic = "force-dynamic";

import { DevisForm } from "@/components/devis/devis-form";
import { createDevis } from "@/lib/actions/devis";
import { prisma } from "@/lib/prisma";

export default async function NouveauDevisPage({
  searchParams,
}: {
  searchParams: Promise<{ chantierId?: string }>;
}) {
  const { chantierId } = await searchParams;

  const chantiers = await prisma.chantier.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-brand-navy">Nouveau devis</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <DevisForm chantiers={chantiers} defaultChantierId={chantierId} action={createDevis} />
      </div>
    </div>
  );
}
