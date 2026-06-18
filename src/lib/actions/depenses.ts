"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const depenseSchema = z.object({
  libelle: z.string().min(1, "Le libellé est requis."),
  montant: z.coerce.number().min(0, "Le montant doit être positif."),
  date: z.string().min(1, "La date est requise."),
  categorie: z.string().default("AUTRE"),
  chantierId: z.string().optional(),
  fournisseurId: z.string().optional(),
  notes: z.string().optional(),
});

export type DepenseState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function createDepense(
  _prevState: DepenseState,
  formData: FormData,
): Promise<DepenseState> {
  const validated = depenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  const depense = await prisma.depense.create({
    data: {
      libelle: data.libelle,
      montant: data.montant,
      date: new Date(data.date),
      categorie: data.categorie,
      chantierId: data.chantierId || null,
      fournisseurId: data.fournisseurId || null,
      notes: data.notes ?? null,
    },
  });

  revalidatePath("/depenses");
  revalidatePath("/tresorerie");
  revalidatePath("/finances");
  redirect(`/depenses/${depense.id}`);
}

export async function updateDepense(
  id: string,
  _prevState: DepenseState,
  formData: FormData,
): Promise<DepenseState> {
  const validated = depenseSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;
  await prisma.depense.update({
    where: { id },
    data: {
      libelle: data.libelle,
      montant: data.montant,
      date: new Date(data.date),
      categorie: data.categorie,
      chantierId: data.chantierId || null,
      fournisseurId: data.fournisseurId || null,
      notes: data.notes ?? null,
    },
  });

  revalidatePath("/depenses");
  revalidatePath(`/depenses/${id}`);
  revalidatePath("/tresorerie");
  revalidatePath("/finances");
  return { message: "Dépense mise à jour." };
}

export async function deleteDepense(id: string) {
  await prisma.depense.delete({ where: { id } });
  revalidatePath("/depenses");
  revalidatePath("/tresorerie");
  revalidatePath("/finances");
  redirect("/depenses");
}
