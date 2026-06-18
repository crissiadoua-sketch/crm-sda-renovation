"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getNextNumero } from "@/lib/numbering";

const chantierSchema = z.object({
  reference: z.string().min(1, "La référence est requise."),
  nom: z.string().min(1, "Le nom du chantier est requis."),
  clientId: z.string().min(1, "Le client est requis."),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  statut: z.enum(["PROSPECT", "DEVIS_ENVOYE", "EN_COURS", "TERMINE", "ANNULE"]),
  dateDebut: z.string().optional(),
  dateFin: z.string().optional(),
  budgetEstime: z.string().optional(),
  description: z.string().optional(),
});

export type ChantierState = {
  errors?: Record<string, string[]>;
} | undefined;

function emptyToNull(value?: string) {
  return value && value.trim() !== "" ? value : null;
}

function emptyToNullNumber(value?: string) {
  return value && value.trim() !== "" ? Number(value) : null;
}

function emptyToNullDate(value?: string) {
  return value && value.trim() !== "" ? new Date(value) : null;
}

export async function getNextChantierReference() {
  const chantiers = await prisma.chantier.findMany({ select: { reference: true } });
  return getNextNumero("CH", chantiers.map((c) => c.reference));
}

export async function createChantier(
  _prevState: ChantierState,
  formData: FormData,
): Promise<ChantierState> {
  const validated = chantierSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  let chantier;
  try {
    chantier = await prisma.chantier.create({
      data: {
        reference: data.reference,
        nom: data.nom,
        clientId: data.clientId,
        adresse: emptyToNull(data.adresse),
        codePostal: emptyToNull(data.codePostal),
        ville: emptyToNull(data.ville),
        statut: data.statut,
        dateDebut: emptyToNullDate(data.dateDebut),
        dateFin: emptyToNullDate(data.dateFin),
        budgetEstime: emptyToNullNumber(data.budgetEstime),
        description: emptyToNull(data.description),
      },
    });
  } catch {
    return { errors: { reference: ["Cette référence de chantier existe déjà."] } };
  }

  revalidatePath("/chantiers");
  redirect(`/chantiers/${chantier.id}`);
}

export async function updateChantier(
  id: string,
  _prevState: ChantierState,
  formData: FormData,
): Promise<ChantierState> {
  const validated = chantierSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  try {
    await prisma.chantier.update({
      where: { id },
      data: {
        reference: data.reference,
        nom: data.nom,
        clientId: data.clientId,
        adresse: emptyToNull(data.adresse),
        codePostal: emptyToNull(data.codePostal),
        ville: emptyToNull(data.ville),
        statut: data.statut,
        dateDebut: emptyToNullDate(data.dateDebut),
        dateFin: emptyToNullDate(data.dateFin),
        budgetEstime: emptyToNullNumber(data.budgetEstime),
        description: emptyToNull(data.description),
      },
    });
  } catch {
    return { errors: { reference: ["Cette référence de chantier existe déjà."] } };
  }

  revalidatePath("/chantiers");
  revalidatePath(`/chantiers/${id}`);
  redirect(`/chantiers/${id}`);
}

export async function deleteChantier(id: string) {
  try {
    await prisma.chantier.delete({ where: { id } });
  } catch {
    redirect(`/chantiers/${id}?erreur=suppression`);
  }

  revalidatePath("/chantiers");
  redirect("/chantiers");
}
