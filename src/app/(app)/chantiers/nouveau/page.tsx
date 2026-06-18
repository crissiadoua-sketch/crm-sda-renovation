import { ChantierForm } from "@/components/chantiers/chantier-form";
import { createChantier, getNextChantierReference } from "@/lib/actions/chantiers";
import { prisma } from "@/lib/prisma";

export default async function NouveauChantierPage() {
  const [clients, reference] = await Promise.all([
    prisma.client.findMany({ orderBy: { createdAt: "desc" } }),
    getNextChantierReference(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-brand-navy">Nouveau chantier</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ChantierForm clients={clients} defaultReference={reference} action={createChantier} />
      </div>
    </div>
  );
}
