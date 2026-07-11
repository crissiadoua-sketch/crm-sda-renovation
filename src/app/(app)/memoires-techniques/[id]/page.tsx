export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { EditeurMemoire } from "./editeur-memoire";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerMemoireTechniqueParEmail } from "@/lib/actions/email-documents";

export default async function MemoireTechniquePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const mt = await prisma.memoireTechnique.findUnique({
    where: { id },
    include: {
      chantier: {
        select: {
          id: true,
          nom: true,
          adresse: true,
          description: true,
          dateDebut: true,
          dateFin: true,
          client: { select: { nom: true, prenom: true, raisonSociale: true, email: true, telephone: true } },
        },
      },
      devis: { select: { id: true, numero: true, objet: true, totalHT: true } },
    },
  });

  if (!mt) notFound();

  const devisDisponibles = await prisma.devis.findMany({
    where: { chantierId: mt.chantierId },
    select: { id: true, numero: true, objet: true },
    orderBy: { numero: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2 pt-2">
        <EnvoyerEmailModal
          action={envoyerMemoireTechniqueParEmail.bind(null, mt.id)}
          defaultTo={mt.chantier.client?.email ?? ""}
          documentLabel={`Mémoire technique ${mt.reference}`}
          defaultSubject={`Mémoire technique ${mt.reference} — SDA Rénovation`}
        />
      </div>
      <EditeurMemoire
        mt={{
        id: mt.id,
        reference: mt.reference,
        titre: mt.titre,
        type: mt.type,
        modele: mt.modele,
        statut: mt.statut,
        maitreOuvrage: mt.maitreOuvrage,
        objetMarche: mt.objetMarche,
        lotNumero: mt.lotNumero,
        lotDesignation: mt.lotDesignation,
        montantEstime: mt.montantEstime,
        dateRemise: mt.dateRemise ? mt.dateRemise.toISOString() : null,
        sections: JSON.parse(mt.sections as string),
        annexes: JSON.parse(mt.annexes as string),
        chantier: {
          id: mt.chantier.id,
          nom: mt.chantier.nom,
          adresse: mt.chantier.adresse,
          description: mt.chantier.description,
          dateDebut: mt.chantier.dateDebut?.toISOString() ?? null,
          dateFin:   mt.chantier.dateFin?.toISOString() ?? null,
          client: mt.chantier.client ? {
            nom: mt.chantier.client.nom,
            prenom: mt.chantier.client.prenom,
            raisonSociale: mt.chantier.client.raisonSociale,
            email: mt.chantier.client.email,
            telephone: mt.chantier.client.telephone,
          } : null,
        },
        devis: mt.devis ? { id: mt.devis.id, numero: mt.devis.numero, objet: mt.devis.objet, totalHT: mt.devis.totalHT } : null,
      }}
      devisDisponibles={devisDisponibles}
    />
    </div>
  );
}
