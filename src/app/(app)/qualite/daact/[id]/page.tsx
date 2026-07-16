export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DAACTEditor } from "./daact-editor";

export default async function DAACTDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [daact, chantiers, clients] = await Promise.all([
    prisma.dAACT.findUnique({
      where: { id },
      include: {
        chantier: true,
        client: true,
      },
    }),
    prisma.chantier.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, ville: true, clientId: true, adresse: true, dateFin: true } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, prenom: true } }),
  ]);

  if (!daact) notFound();

  const daactSerialized = {
    ...daact,
    dateAchevement: daact.dateAchevement ? daact.dateAchevement.toISOString().slice(0, 10) : null,
    dateDepot: daact.dateDepot ? daact.dateDepot.toISOString().slice(0, 10) : null,
    dateReponse: daact.dateReponse ? daact.dateReponse.toISOString().slice(0, 10) : null,
  };

  const chantiersSerialises = (chantiers as Array<{ id: string; nom: string; ville: string | null; clientId: string | null; adresse: string | null; dateFin: Date | null }>).map((c) => ({
    ...c,
    dateFin: c.dateFin ? c.dateFin.toISOString().slice(0, 10) : null,
  }));

  return <DAACTEditor daact={daactSerialized} chantiers={chantiersSerialises} clients={clients} />;
}
