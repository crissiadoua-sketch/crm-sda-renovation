export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BcFournituresEditor } from "./bcf-editor";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerBcfParEmail } from "@/lib/actions/email-documents";

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
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, email: true, telephone: true } }),
  ]);

  if (!bcf) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 pt-2">
        <EnvoyerEmailModal
          action={envoyerBcfParEmail.bind(null, bcf.id)}
          defaultTo={bcf.fournisseur?.email ?? ""}
          documentLabel={`BCF ${bcf.numero}`}
          defaultSubject={`BC Fournitures ${bcf.numero} — SDA Rénovation`}
        />
      </div>
      <BcFournituresEditor
        bcf={{
          ...bcf,
          dateCommande:  bcf.dateCommande.toISOString().slice(0, 10),
          dateSouhaitee: bcf.dateSouhaitee?.toISOString().slice(0, 10) ?? null,
        }}
        fournisseurs={fournisseurs}
      />
    </div>
  );
}
