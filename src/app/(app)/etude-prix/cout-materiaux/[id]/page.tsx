export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CmrEditor } from "./cmr-editor";

export default async function CoutMateriauxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const doc = await prisma.coutMateriauxRenduChantier.findUnique({
    where: { id },
    include: {
      chantier: { select: { id: true, nom: true, reference: true } },
      devis: { select: { id: true, numero: true } },
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!doc) notFound();

  const chantiers = await prisma.chantier.findMany({
    select: { id: true, nom: true, reference: true },
    orderBy: { nom: "asc" },
  });

  const devisList = await prisma.devis.findMany({
    select: { id: true, numero: true, objet: true },
    orderBy: { dateCreation: "desc" },
  });

  const docSerialise = {
    ...doc,
    date: doc.date.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/etude-prix/cout-materiaux" className="text-sm text-brand-blue hover:underline">
          ← Retour aux coûts matériaux
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">{doc.numero}</h2>
      </div>
      <CmrEditor doc={docSerialise} chantiers={chantiers} devisList={devisList} />
    </div>
  );
}
