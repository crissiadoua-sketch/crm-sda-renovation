"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Contrat Mutuelle
// ---------------------------------------------------------------------------

const contratSchema = z.object({
  organisme: z.string().min(1, "L'organisme est requis."),
  numeroContrat: z.string().optional(),
  dateEffet: z.string().optional(),
  dateFin: z.string().optional(),
  description: z.string().optional(),
  actif: z.string().optional(),
});

export type ContratState = { errors?: Record<string, string[]> } | undefined;

function nullIfEmpty(v?: string) {
  return v && v.trim() !== "" ? v : null;
}
function dateOrNull(v?: string) {
  return v && v.trim() !== "" ? new Date(v) : null;
}

export async function createContratMutuelle(
  _prev: ContratState,
  formData: FormData,
): Promise<ContratState> {
  const validated = contratSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };
  const d = validated.data;

  const contrat = await prisma.contratMutuelle.create({
    data: {
      organisme: d.organisme,
      numeroContrat: nullIfEmpty(d.numeroContrat),
      dateEffet: dateOrNull(d.dateEffet),
      dateFin: dateOrNull(d.dateFin),
      description: nullIfEmpty(d.description),
      actif: true,
    },
  });

  revalidatePath("/mutuelle");
  redirect(`/mutuelle/contrat/${contrat.id}`);
}

export async function updateContratMutuelle(
  id: string,
  _prev: ContratState,
  formData: FormData,
): Promise<ContratState> {
  const validated = contratSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };
  const d = validated.data;

  await prisma.contratMutuelle.update({
    where: { id },
    data: {
      organisme: d.organisme,
      numeroContrat: nullIfEmpty(d.numeroContrat),
      dateEffet: dateOrNull(d.dateEffet),
      dateFin: dateOrNull(d.dateFin),
      description: nullIfEmpty(d.description),
      actif: d.actif === "true",
    },
  });

  revalidatePath("/mutuelle");
  revalidatePath(`/mutuelle/contrat/${id}`);
  redirect(`/mutuelle/contrat/${id}`);
}

export async function deleteContratMutuelle(id: string) {
  await prisma.contratMutuelle.delete({ where: { id } });
  revalidatePath("/mutuelle");
  redirect("/mutuelle");
}

// ---------------------------------------------------------------------------
// Formules Mutuelle
// ---------------------------------------------------------------------------

const formuleSchema = z.object({
  niveau: z.string().default("BASE"),
  label: z.string().min(1, "Le libellé est requis."),
  cotisationSalarie: z.coerce.number().min(0),
  cotisationPatronale: z.coerce.number().min(0),
  garanties: z.string().optional(),
});

export type FormuleState = { errors?: Record<string, string[]> } | undefined;

export async function addFormuleMutuelle(
  contratId: string,
  _prev: FormuleState,
  formData: FormData,
): Promise<FormuleState> {
  const validated = formuleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };
  const d = validated.data;

  await prisma.formuleMutuelle.create({
    data: {
      contratMutuelleId: contratId,
      niveau: d.niveau,
      label: d.label,
      cotisationSalarie: d.cotisationSalarie,
      cotisationPatronale: d.cotisationPatronale,
      garanties: nullIfEmpty(d.garanties),
    },
  });

  revalidatePath(`/mutuelle/contrat/${contratId}`);
  revalidatePath("/mutuelle");
}

export async function updateFormuleMutuelle(
  id: string,
  contratId: string,
  _prev: FormuleState,
  formData: FormData,
): Promise<FormuleState> {
  const validated = formuleSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };
  const d = validated.data;

  await prisma.formuleMutuelle.update({
    where: { id },
    data: {
      niveau: d.niveau,
      label: d.label,
      cotisationSalarie: d.cotisationSalarie,
      cotisationPatronale: d.cotisationPatronale,
      garanties: nullIfEmpty(d.garanties),
    },
  });

  revalidatePath(`/mutuelle/contrat/${contratId}`);
  revalidatePath("/mutuelle");
}

export async function deleteFormuleMutuelle(id: string, contratId: string) {
  await prisma.formuleMutuelle.delete({ where: { id } });
  revalidatePath(`/mutuelle/contrat/${contratId}`);
  revalidatePath("/mutuelle");
  redirect(`/mutuelle/contrat/${contratId}`);
}

// ---------------------------------------------------------------------------
// Adhésions salarié
// ---------------------------------------------------------------------------

const adhesionSchema = z.object({
  contratMutuelleId: z.string().min(1, "Le contrat est requis."),
  formuleMutuelleId: z.string().min(1, "La formule est requise."),
  dateAdhesion: z.string().min(1, "La date d'adhésion est requise."),
  dateSortie: z.string().optional(),
  notes: z.string().optional(),
  actif: z.string().optional(),
});

export type AdhesionState = { errors?: Record<string, string[]> } | undefined;

export async function createAdhesionMutuelle(
  salarieId: string,
  _prev: AdhesionState,
  formData: FormData,
): Promise<AdhesionState> {
  const validated = adhesionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };
  const d = validated.data;

  await prisma.adhesionMutuelle.create({
    data: {
      salarieId,
      contratMutuelleId: d.contratMutuelleId,
      formuleMutuelleId: d.formuleMutuelleId,
      dateAdhesion: new Date(d.dateAdhesion),
      dateSortie: dateOrNull(d.dateSortie),
      notes: nullIfEmpty(d.notes),
      actif: true,
    },
  });

  revalidatePath(`/rh/${salarieId}`);
  revalidatePath("/mutuelle");
  redirect(`/rh/${salarieId}`);
}

export async function updateAdhesionMutuelle(
  id: string,
  salarieId: string,
  _prev: AdhesionState,
  formData: FormData,
): Promise<AdhesionState> {
  const validated = adhesionSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };
  const d = validated.data;

  await prisma.adhesionMutuelle.update({
    where: { id },
    data: {
      contratMutuelleId: d.contratMutuelleId,
      formuleMutuelleId: d.formuleMutuelleId,
      dateAdhesion: new Date(d.dateAdhesion),
      dateSortie: dateOrNull(d.dateSortie),
      notes: nullIfEmpty(d.notes),
      actif: d.actif === "true",
    },
  });

  revalidatePath(`/rh/${salarieId}`);
  revalidatePath("/mutuelle");
  redirect(`/rh/${salarieId}`);
}

export async function deleteAdhesionMutuelle(id: string, salarieId: string) {
  await prisma.adhesionMutuelle.delete({ where: { id } });
  revalidatePath(`/rh/${salarieId}`);
  revalidatePath("/mutuelle");
  redirect(`/rh/${salarieId}`);
}
