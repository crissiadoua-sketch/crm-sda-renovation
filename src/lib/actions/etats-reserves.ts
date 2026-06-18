"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getNextNumero } from "@/lib/numbering";

const etatSchema = z.object({
  chantierId: z.string().optional(),
  clientId: z.string().optional(),
  dateDocument: z.string().min(1, "La date est requise."),
  natureReserves: z.string().optional(),
  travauxAExecuter: z.string().optional(),
  delaiExecution: z.string().optional(),
  lieuSignature: z.string().optional(),
  nombreExemplaires: z.coerce.number().int().min(1).default(2),
  statut: z.enum(["EN_COURS", "SIGNE", "LEVE"]),
  dateLevee: z.string().optional(),
  lieuLevee: z.string().optional(),
});

export type EtatReservesState = { errors?: Record<string, string[]>; message?: string } | undefined;

async function getNextNumeroEtat() {
  const etats = await prisma.etatReserves.findMany({ select: { numero: true } });
  return getNextNumero("REV", etats.map((e) => e.numero));
}

export async function createEtatReserves(
  _prevState: EtatReservesState,
  formData: FormData,
): Promise<EtatReservesState> {
  const validated = etatSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;
  const numero = await getNextNumeroEtat();

  const etat = await prisma.etatReserves.create({
    data: {
      numero,
      chantierId: data.chantierId || null,
      clientId: data.clientId || null,
      dateDocument: new Date(data.dateDocument),
      natureReserves: data.natureReserves ?? "",
      travauxAExecuter: data.travauxAExecuter ?? "",
      delaiExecution: data.delaiExecution ?? "",
      lieuSignature: data.lieuSignature ?? "",
      nombreExemplaires: data.nombreExemplaires,
      statut: data.statut,
      dateLevee: data.dateLevee ? new Date(data.dateLevee) : null,
      lieuLevee: data.lieuLevee ?? "",
    },
  });

  revalidatePath("/etats-reserves");
  redirect(`/etats-reserves/${etat.id}`);
}

export async function updateEtatReserves(
  id: string,
  _prevState: EtatReservesState,
  formData: FormData,
): Promise<EtatReservesState> {
  const validated = etatSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  await prisma.etatReserves.update({
    where: { id },
    data: {
      chantierId: data.chantierId || null,
      clientId: data.clientId || null,
      dateDocument: new Date(data.dateDocument),
      natureReserves: data.natureReserves ?? "",
      travauxAExecuter: data.travauxAExecuter ?? "",
      delaiExecution: data.delaiExecution ?? "",
      lieuSignature: data.lieuSignature ?? "",
      nombreExemplaires: data.nombreExemplaires,
      statut: data.statut,
      dateLevee: data.dateLevee ? new Date(data.dateLevee) : null,
      lieuLevee: data.lieuLevee ?? "",
    },
  });

  revalidatePath("/etats-reserves");
  revalidatePath(`/etats-reserves/${id}`);
  return { message: "Document mis à jour avec succès." };
}

export async function deleteEtatReserves(id: string) {
  await prisma.etatReserves.delete({ where: { id } });
  revalidatePath("/etats-reserves");
  redirect("/etats-reserves");
}
