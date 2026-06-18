"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export type EvenementData = {
  id?:          string;
  titre:        string;
  description?: string;
  dateDebut:    string;
  dateFin?:     string;
  type:         string;
  lieu?:        string;
  chantierId?:  string;
};

export async function creerEvenement(data: EvenementData): Promise<{ id: string }> {
  const ev = await prisma.evenement.create({
    data: {
      titre:       data.titre,
      description: data.description ?? null,
      dateDebut:   new Date(data.dateDebut),
      dateFin:     data.dateFin ? new Date(data.dateFin) : null,
      type:        data.type,
      lieu:        data.lieu ?? null,
      chantierId:  data.chantierId || null,
    },
  });
  revalidatePath("/planning");
  return { id: ev.id };
}

export async function modifierEvenement(id: string, data: EvenementData): Promise<void> {
  await prisma.evenement.update({
    where: { id },
    data: {
      titre:       data.titre,
      description: data.description ?? null,
      dateDebut:   new Date(data.dateDebut),
      dateFin:     data.dateFin ? new Date(data.dateFin) : null,
      type:        data.type,
      lieu:        data.lieu ?? null,
      chantierId:  data.chantierId || null,
    },
  });
  revalidatePath("/planning");
}

export async function supprimerEvenement(id: string): Promise<void> {
  await prisma.evenement.delete({ where: { id } });
  revalidatePath("/planning");
}
