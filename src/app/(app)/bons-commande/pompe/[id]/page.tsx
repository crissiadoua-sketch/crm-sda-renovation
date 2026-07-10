export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BonReservationPompeEditor } from "./brp-editor";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerBrpParEmail } from "@/lib/actions/email-documents";

export default async function BonReservationPompePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [brp, fournisseurs, chantiers, clients] = await Promise.all([
    prisma.bonReservationPompe.findUnique({
      where: { id },
      include: {
        fournisseur: { select: { id: true, nom: true, telephone: true, email: true, adresse: true, codePostal: true, ville: true } },
        chantier:    { select: { id: true, nom: true, adresse: true } },
        client:      { select: { id: true, nom: true, raisonSociale: true, telephone: true } },
      },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true, adresse: true } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, raisonSociale: true } }),
  ]);

  if (!brp) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 pt-2">
        <EnvoyerEmailModal
          action={envoyerBrpParEmail.bind(null, brp.id)}
          defaultTo={brp.fournisseur?.email ?? ""}
          documentLabel={`Réservation pompe ${brp.numero}`}
        />
      </div>
      <BonReservationPompeEditor
        brp={{
          ...brp,
          dateReservation: brp.dateReservation?.toISOString().slice(0, 10) ?? null,
        }}
        fournisseurs={fournisseurs}
        chantiers={chantiers}
        clients={clients}
      />
    </div>
  );
}
