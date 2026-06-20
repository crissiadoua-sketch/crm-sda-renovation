"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { nextClientRef, calcInitiales } from "@/lib/reference";

const sousTraitantSchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  specialite: z.string().optional(),
  contact: z.string().optional(),
  email: z.union([z.string().email("E-mail invalide."), z.literal("")]).optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  tauxHoraire: z.string().optional(),
  couleur: z.string().optional(),
  notes: z.string().optional(),
});

export type SousTraitantState = {
  errors?: Record<string, string[]>;
} | undefined;

function emptyToNull(value?: string) {
  return value && value.trim() !== "" ? value : null;
}

function emptyToNullNumber(value?: string) {
  return value && value.trim() !== "" ? Number(value) : null;
}

export async function createSousTraitant(
  _prevState: SousTraitantState,
  formData: FormData,
): Promise<SousTraitantState> {
  const validated = sousTraitantSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  const existing = await prisma.sousTraitant.findMany({
    where: { reference: { startsWith: "ST-" } },
    select: { reference: true },
  });
  const initiales = calcInitiales({ raisonSociale: data.nom });
  const reference = nextClientRef("ST", existing.map((r) => r.reference ?? ""), initiales);

  const sousTraitant = await prisma.sousTraitant.create({
    data: {
      reference,
      nom: data.nom,
      specialite: emptyToNull(data.specialite),
      contact: emptyToNull(data.contact),
      email: emptyToNull(data.email),
      telephone: emptyToNull(data.telephone),
      adresse: emptyToNull(data.adresse),
      tauxHoraire: emptyToNullNumber(data.tauxHoraire),
      couleur: emptyToNull(data.couleur),
      notes: emptyToNull(data.notes),
    },
  });

  revalidatePath("/sous-traitants");
  redirect(`/sous-traitants/${sousTraitant.id}`);
}

export async function updateSousTraitant(
  id: string,
  _prevState: SousTraitantState,
  formData: FormData,
): Promise<SousTraitantState> {
  const validated = sousTraitantSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  await prisma.sousTraitant.update({
    where: { id },
    data: {
      nom: data.nom,
      specialite: emptyToNull(data.specialite),
      contact: emptyToNull(data.contact),
      email: emptyToNull(data.email),
      telephone: emptyToNull(data.telephone),
      adresse: emptyToNull(data.adresse),
      tauxHoraire: emptyToNullNumber(data.tauxHoraire),
      couleur: emptyToNull(data.couleur),
      notes: emptyToNull(data.notes),
    },
  });

  revalidatePath("/sous-traitants");
  revalidatePath(`/sous-traitants/${id}`);
  redirect(`/sous-traitants/${id}`);
}

export async function deleteSousTraitant(id: string) {
  try {
    await prisma.sousTraitant.delete({ where: { id } });
  } catch {
    redirect(`/sous-traitants/${id}?erreur=suppression`);
  }

  revalidatePath("/sous-traitants");
  redirect("/sous-traitants");
}
