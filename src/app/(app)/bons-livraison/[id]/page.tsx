import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BonLivraisonDetail } from "./bon-livraison-detail";

export default async function BonLivraisonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const bl = await prisma.bonLivraison.findUnique({
    where: { id },
    include: {
      fournisseur: { select: { id: true, nom: true } },
      chantier:    { select: { id: true, nom: true } },
      bonCommande: { select: { id: true, numero: true } },
      lignes:      { orderBy: { ordre: "asc" } },
    },
  });

  if (!bl) notFound();

  return <BonLivraisonDetail bl={bl as Parameters<typeof BonLivraisonDetail>[0]["bl"]} />;
}
