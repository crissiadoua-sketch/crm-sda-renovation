"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function saveLivretAccueil(
  chantierId: string,
  data: {
    chefChantierNom?: string;
    chefChantierContact?: string;
    natureOuvrage?: string;
    descriptionChantier?: string;
    lotsJson?: string;
    horairesChantier?: string;
    stationnementAcces?: string;
    remarqueVoisinage?: string;
  }
): Promise<void> {
  await prisma.livretAccueilConfig.upsert({
    where: { chantierId },
    create: { chantierId, ...data },
    update: data,
  });
  revalidatePath(`/apercu/livret-accueil/${chantierId}`);
}
