export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PlanningClient } from "./planning-client";

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string; chantierId?: string }>;
}) {
  const { mois, chantierId } = await searchParams;

  // Mois affiché (défaut = mois courant)
  const now     = new Date();
  const refDate = mois ? new Date(`${mois}-01`) : new Date(now.getFullYear(), now.getMonth(), 1);
  const debut   = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
  const fin     = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0, 23, 59, 59);

  const [evenements, chantiers] = await Promise.all([
    prisma.evenement.findMany({
      where: {
        dateDebut: { gte: debut, lte: fin },
        ...(chantierId ? { chantierId } : {}),
      },
      include: { chantier: { select: { nom: true } } },
      orderBy: { dateDebut: "asc" },
    }),
    prisma.chantier.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, nom: true },
    }),
  ]);

  return (
    <PlanningClient
      evenements={evenements.map(e => ({
        id:          e.id,
        titre:       e.titre,
        description: e.description,
        dateDebut:   e.dateDebut.toISOString(),
        dateFin:     e.dateFin?.toISOString() ?? null,
        type:        e.type,
        lieu:        e.lieu,
        chantierId:  e.chantierId,
        chantierNom: e.chantier?.nom ?? null,
      }))}
      chantiers={chantiers}
      moisCourant={`${refDate.getFullYear()}-${String(refDate.getMonth() + 1).padStart(2, "0")}`}
      chantierId={chantierId ?? null}
    />
  );
}
