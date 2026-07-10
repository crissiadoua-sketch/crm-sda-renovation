export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BonCommandeDetail } from "./bon-commande-detail";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerBcParEmail } from "@/lib/actions/email-documents";

export default async function BonCommandePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [bc, fournisseurs, chantiers] = await Promise.all([
    prisma.bonCommande.findUnique({
      where: { id },
      include: {
        fournisseur:   { select: { id: true, nom: true, email: true } },
        chantier:      { select: { id: true, nom: true } },
        lignes:        { orderBy: { ordre: "asc" } },
        bonsLivraison: { select: { id: true, numero: true, statut: true } },
      },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true } }),
  ]);

  if (!bc) notFound();

  const fournisseurEmail = (bc.fournisseur as { email?: string | null }).email ?? "";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 pt-2">
        <EnvoyerEmailModal
          action={envoyerBcParEmail.bind(null, id)}
          defaultTo={fournisseurEmail}
          documentLabel={`BC ${bc.numero}`}
        />
      </div>
      <BonCommandeDetail
        bc={bc as Parameters<typeof BonCommandeDetail>[0]["bc"]}
        fournisseurs={fournisseurs}
        chantiers={chantiers}
      />
    </div>
  );
}
