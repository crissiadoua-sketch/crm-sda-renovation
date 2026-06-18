"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { nextTiersRef } from "@/lib/reference";

const fournisseurSchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  contact: z.string().optional(),
  email: z.union([z.string().email("E-mail invalide."), z.literal("")]).optional(),
  telephone: z.string().optional(),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  siret: z.string().optional(),
  notes: z.string().optional(),
});

export type FournisseurState = {
  errors?: Record<string, string[]>;
} | undefined;

function emptyToNull(value?: string) {
  return value && value.trim() !== "" ? value : null;
}

export async function createFournisseur(
  _prevState: FournisseurState,
  formData: FormData,
): Promise<FournisseurState> {
  const validated = fournisseurSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  const existing = await prisma.fournisseur.findMany({
    where: { reference: { startsWith: "FOU-" } },
    select: { reference: true },
  });
  const reference = nextTiersRef("FOU", existing.map((r) => r.reference ?? ""));

  const fournisseur = await prisma.fournisseur.create({
    data: {
      reference,
      nom: data.nom,
      contact: emptyToNull(data.contact),
      email: emptyToNull(data.email),
      telephone: emptyToNull(data.telephone),
      adresse: emptyToNull(data.adresse),
      codePostal: emptyToNull(data.codePostal),
      ville: emptyToNull(data.ville),
      siret: emptyToNull(data.siret),
      notes: emptyToNull(data.notes),
    },
  });

  revalidatePath("/fournisseurs");
  redirect(`/fournisseurs/${fournisseur.id}`);
}

export async function updateFournisseur(
  id: string,
  _prevState: FournisseurState,
  formData: FormData,
): Promise<FournisseurState> {
  const validated = fournisseurSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  await prisma.fournisseur.update({
    where: { id },
    data: {
      nom: data.nom,
      contact: emptyToNull(data.contact),
      email: emptyToNull(data.email),
      telephone: emptyToNull(data.telephone),
      adresse: emptyToNull(data.adresse),
      codePostal: emptyToNull(data.codePostal),
      ville: emptyToNull(data.ville),
      siret: emptyToNull(data.siret),
      notes: emptyToNull(data.notes),
    },
  });

  revalidatePath("/fournisseurs");
  revalidatePath(`/fournisseurs/${id}`);
  redirect(`/fournisseurs/${id}`);
}

export async function deleteFournisseur(id: string) {
  try {
    await prisma.fournisseur.delete({ where: { id } });
  } catch {
    redirect(`/fournisseurs/${id}?erreur=suppression`);
  }

  revalidatePath("/fournisseurs");
  redirect("/fournisseurs");
}
