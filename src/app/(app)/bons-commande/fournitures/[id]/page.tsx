import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BcFournituresEditor } from "./bcf-editor";

export default async function BcFournituresDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [bcf, fournisseurs] = await Promise.all([
    prisma.bonCommandeFournitures.findUnique({
      where: { id },
      include: {
        fournisseur: { select: { id: true, nom: true, adresse: true, codePostal: true, ville: true, telephone: true, email: true, siret: true } },
        lignes:      { orderBy: { ordre: "asc" } },
      },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
  ]);

  if (!bcf) notFound();

  return (
    <BcFournituresEditor
      bcf={{
        ...bcf,
        dateCommande:  bcf.dateCommande.toISOString().slice(0, 10),
        dateSouhaitee: bcf.dateSouhaitee?.toISOString().slice(0, 10) ?? null,
      }}
      fournisseurs={fournisseurs}
    />
  );
}
