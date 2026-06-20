"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stockerFichier, supprimerFichierStocke } from "@/lib/blob-storage";

const noteSchema = z.object({
  date: z.string().min(1, "La date est requise."),
  montant: z.coerce.number().min(0, "Le montant doit être un nombre positif."),
  tva: z.preprocess(
    (v) => (v === "" || v === undefined || v === null ? null : v),
    z.coerce.number().min(0).max(100).nullable(),
  ),
  categorie: z.string().default("AUTRE"),
  fournisseur: z.string().optional(),
  description: z.string().optional(),
  statut: z.string().default("EN_ATTENTE"),
  chantierId: z.string().optional(),
});

export type NoteState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function createNote(_prevState: NoteState, formData: FormData): Promise<NoteState> {
  const validated = noteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  let justificatif: string | null = null;
  const file = formData.get("justificatif");
  if (file instanceof File && file.size > 0) {
    justificatif = (await stockerFichier(file, "notes-de-frais")).url;
  }

  const note = await prisma.noteDeFrais.create({
    data: {
      date: new Date(data.date),
      montant: data.montant,
      tva: data.tva,
      categorie: data.categorie,
      fournisseur: data.fournisseur ?? "",
      description: data.description ?? "",
      statut: data.statut,
      chantierId: data.chantierId || null,
      justificatif,
    },
  });

  revalidatePath("/notes-de-frais");
  redirect(`/notes-de-frais/${note.id}`);
}

export async function updateNote(id: string, _prevState: NoteState, formData: FormData): Promise<NoteState> {
  const validated = noteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const data = validated.data;

  const existing = await prisma.noteDeFrais.findUnique({ where: { id } });
  let justificatif = existing?.justificatif ?? null;

  const file = formData.get("justificatif");
  if (file instanceof File && file.size > 0) {
    await supprimerFichierStocke(existing?.justificatif);
    justificatif = (await stockerFichier(file, "notes-de-frais")).url;
  }

  await prisma.noteDeFrais.update({
    where: { id },
    data: {
      date: new Date(data.date),
      montant: data.montant,
      tva: data.tva,
      categorie: data.categorie,
      fournisseur: data.fournisseur ?? "",
      description: data.description ?? "",
      statut: data.statut,
      chantierId: data.chantierId || null,
      justificatif,
    },
  });

  revalidatePath("/notes-de-frais");
  revalidatePath(`/notes-de-frais/${id}`);
  return { message: "Note de frais mise à jour." };
}

export async function deleteNote(id: string) {
  const note = await prisma.noteDeFrais.findUnique({ where: { id } });
  await supprimerFichierStocke(note?.justificatif);
  await prisma.noteDeFrais.delete({ where: { id } });
  revalidatePath("/notes-de-frais");
  redirect("/notes-de-frais");
}
