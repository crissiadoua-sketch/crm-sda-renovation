import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PAQEditor } from "./paq-editor";

export default async function PAQDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [paq, chantiers, clients] = await Promise.all([
    prisma.planAssuranceQualite.findUnique({
      where: { id },
      include: {
        chantier: true,
        client: true,
        fiches: {
          select: {
            id: true,
            numero: true,
            statut: true,
            ouvrage: true,
            lot: true,
          },
          orderBy: { numero: "asc" },
        },
      },
    }),
    prisma.chantier.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, ville: true } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, prenom: true } }),
  ]);

  if (!paq) notFound();

  const paqSerialized = {
    ...paq,
    dateEmission: paq.dateEmission ? paq.dateEmission.toISOString().slice(0, 10) : null,
    dateRevision: paq.dateRevision ? paq.dateRevision.toISOString().slice(0, 10) : null,
  };

  return <PAQEditor paq={paqSerialized} chantiers={chantiers} clients={clients} />;
}
