import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FACEditor } from "./fac-editor";

export default async function FicheAutocontroleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [fac, chantiers, clients, paqs] = await Promise.all([
    prisma.ficheAutocontrole.findUnique({
      where: { id },
      include: {
        chantier: true,
        client: true,
        paq: { select: { id: true, numero: true } },
        points: { orderBy: { ordre: "asc" } },
      },
    }),
    prisma.chantier.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, ville: true } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, prenom: true } }),
    prisma.planAssuranceQualite.findMany({
      orderBy: { numero: "asc" },
      select: { id: true, numero: true, objetMarche: true },
    }),
  ]);

  if (!fac) notFound();

  const facSerialized = {
    ...fac,
    dateControle: fac.dateControle ? fac.dateControle.toISOString().slice(0, 10) : null,
  };

  return <FACEditor fac={facSerialized} chantiers={chantiers} clients={clients} paqs={paqs} />;
}
