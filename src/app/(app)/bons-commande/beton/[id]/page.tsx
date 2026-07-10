export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BonCommandeBetonEditor } from "./bcb-editor";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerBcBetonParEmail } from "@/lib/actions/email-documents";

export default async function BonCommandeBetonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [bcb, fournisseurs, chantiers] = await Promise.all([
    prisma.bonCommandeBeton.findUnique({
      where: { id },
      include: {
        fournisseur: { select: { id: true, nom: true, telephone: true, email: true } },
        chantier:    { select: { id: true, nom: true, adresse: true } },
        livraisons:  { orderBy: { ordre: "asc" } },
      },
    }),
    prisma.fournisseur.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, nom: true, adresse: true } }),
  ]);

  if (!bcb) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 pt-2">
        <EnvoyerEmailModal
          action={envoyerBcBetonParEmail.bind(null, id)}
          defaultTo={bcb.fournisseur?.email ?? ""}
          documentLabel={`BC Béton ${bcb.numero}`}
        />
      </div>
    <BonCommandeBetonEditor
      bcb={{
        ...bcb,
        dateLivraison: bcb.dateLivraison?.toISOString().slice(0, 10) ?? null,
        livraisons: bcb.livraisons.map(l => ({
          ...l,
          dateLivraison: l.dateLivraison.toISOString().slice(0, 10),
        })),
      }}
      fournisseurs={fournisseurs}
      chantiers={chantiers}
    />
    </div>
  );
}
