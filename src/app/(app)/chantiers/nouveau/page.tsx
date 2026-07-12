export const dynamic = "force-dynamic";

import { ChantierForm } from "@/components/chantiers/chantier-form";
import { createChantier, getNextChantierReference } from "@/lib/actions/chantiers";
import { prisma } from "@/lib/prisma";

export default async function NouveauChantierPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;

  const [clients, reference] = await Promise.all([
    prisma.client.findMany({ orderBy: { createdAt: "desc" } }),
    getNextChantierReference(),
  ]);

  // Données d'adresse pour l'auto-fill côté client
  const clientsAdresses = clients.map((c) => ({
    id: c.id,
    adresse: c.adresse ?? null,
    codePostal: c.codePostal ?? null,
    ville: c.ville ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-brand-navy">Nouveau chantier</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ChantierForm
          clients={clients}
          clientsAdresses={clientsAdresses}
          defaultReference={reference}
          defaultClientId={clientId}
          action={createChantier}
        />
      </div>
    </div>
  );
}
