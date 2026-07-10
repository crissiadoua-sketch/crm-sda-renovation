"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  factureId: z.string().min(1),
  type: z.enum(["EMAIL", "COURRIER", "TELEPHONE", "LR"]),
  date: z.string().min(1),
  notes: z.string().optional(),
});

export async function ajouterRelance(data: {
  factureId: string;
  type: string;
  date: string;
  notes?: string;
}) {
  const parsed = schema.parse(data);
  await prisma.relanceFacture.create({
    data: {
      factureId: parsed.factureId,
      type: parsed.type,
      date: new Date(parsed.date),
      notes: parsed.notes ?? null,
    },
  });
  revalidatePath("/finances/impayes");
}

export async function libererRG(cstId: string) {
  await prisma.contratSousTraitance.update({
    where: { id: cstId },
    data: { rgLiberee: true },
  });
  revalidatePath("/finances/retenues-garantie");
}

export async function setDateReceptionCST(cstId: string, dateReception: string) {
  await prisma.contratSousTraitance.update({
    where: { id: cstId },
    data: { dateReception: new Date(dateReception) },
  });
  revalidatePath("/finances/retenues-garantie");
}
