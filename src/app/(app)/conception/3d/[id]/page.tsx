import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import dynamic from "next/dynamic";

const Editeur3D = dynamic(
  () => import("./editeur-3d").then((m) => ({ default: m.Editeur3D })),
  { ssr: false },
);

export default async function Projet3DPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const projet = await prisma.projet3D.findUnique({
    where: { id },
    include: { chantier: { select: { nom: true } } },
  });

  if (!projet) notFound();

  // Récupérer les plans 2D du chantier associé pour la conversion 2D→3D
  const plans2D = projet.chantierId
    ? await prisma.planConception.findMany({
        where: { chantierId: projet.chantierId },
        select: { id: true, titre: true, fichier: true, type: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <Editeur3D
      projet={{
        id: projet.id,
        titre: projet.titre,
        scene: projet.scene,
        settings: projet.settings,
        chantierId: projet.chantierId,
        chantierNom: projet.chantier?.nom,
      }}
      plans2D={plans2D}
    />
  );
}
