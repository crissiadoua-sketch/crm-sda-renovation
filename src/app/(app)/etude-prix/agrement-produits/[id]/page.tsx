import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { FapEditor } from "./fap-editor";

export default async function FicheAgrementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fiche = await prisma.ficheAgrementProduit.findUnique({
    where: { id },
    include: { chantier: true, devis: true },
  });

  if (!fiche) notFound();

  const chantiers = await prisma.chantier.findMany({
    select: { id: true, nom: true, reference: true },
    orderBy: { nom: "asc" },
  });

  const devisList = await prisma.devis.findMany({
    select: { id: true, numero: true, objet: true },
    orderBy: { dateCreation: "desc" },
  });

  // Sérialiser les dates en ISO pour le client
  const ficheSerialise = {
    ...fiche,
    emetteurDate: fiche.emetteurDate?.toISOString() ?? null,
    dateMO: fiche.dateMO?.toISOString() ?? null,
    dateMOE: fiche.dateMOE?.toISOString() ?? null,
    dateBC: fiche.dateBC?.toISOString() ?? null,
    createdAt: fiche.createdAt.toISOString(),
    updatedAt: fiche.updatedAt.toISOString(),
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link
          href="/etude-prix/agrement-produits"
          className="text-sm text-brand-blue hover:underline"
        >
          ← Retour aux fiches d'agrément
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">{fiche.numero}</h2>
      </div>
      <FapEditor
        fiche={ficheSerialise}
        chantiers={chantiers}
        devisList={devisList}
      />
    </div>
  );
}
