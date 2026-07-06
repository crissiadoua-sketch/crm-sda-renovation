"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { supprimerFichierStocke } from "@/lib/blob-storage";

const depenseSchema = z.object({
  libelle: z.string().min(1, "Le libellé est requis."),
  montant: z.coerce.number().min(0, "Le montant doit être positif."),
  date: z.string().min(1, "La date est requise."),
  categorie: z.string().default("AUTRE"),
  chantierId: z.string().optional(),
  fournisseurId: z.string().optional(),
  notes: z.string().optional(),
  factureUrl: z.string().optional(),
  factureNom: z.string().optional(),
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
      factureUrl: data.factureUrl || null,
      factureNom: data.factureNom || null,
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
  const existing = await prisma.depense.findUnique({ where: { id }, select: { factureUrl: true } });
  if (existing?.factureUrl && existing.factureUrl !== (data.factureUrl || null)) {
    await supprimerFichierStocke(existing.factureUrl);
  }

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
      factureUrl: data.factureUrl || null,
      factureNom: data.factureNom || null,
    },
  });

  revalidatePath("/depenses");
  revalidatePath(`/depenses/${id}`);
  revalidatePath("/tresorerie");
  revalidatePath("/finances");
  return { message: "Dépense mise à jour." };
}

export async function deleteDepense(id: string) {
  const existing = await prisma.depense.findUnique({ where: { id }, select: { factureUrl: true } });
  if (existing?.factureUrl) await supprimerFichierStocke(existing.factureUrl);
  await prisma.depense.delete({ where: { id } });
  revalidatePath("/depenses");
  revalidatePath("/tresorerie");
  revalidatePath("/finances");
  redirect("/depenses");
}

const depensePrevSchema = z.object({
  libelle:      z.string().min(1, "Le libellé est requis."),
  montant:      z.coerce.number().min(0.01, "Montant requis."),
  date:         z.string().min(1, "La date est requise."),
  categorie:    z.string().default("AUTRE"),
  chantierId:   z.string().optional(),
  fournisseurId: z.string().optional(),
  notes:        z.string().optional(),
});

export async function creerDepensePrevisionnelle(
  _prevState: DepenseState,
  formData: FormData,
): Promise<DepenseState> {
  const validated = depensePrevSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }
  const d = validated.data;
  await prisma.depense.create({
    data: {
      libelle:      d.libelle,
      montant:      d.montant,
      date:         new Date(d.date),
      categorie:    d.categorie,
      type:         "PREVISIONNEL",
      chantierId:   d.chantierId  || null,
      fournisseurId: d.fournisseurId || null,
      notes:        d.notes ?? null,
    },
  });
  revalidatePath("/previsionnel");
  redirect("/previsionnel");
}

export async function supprimerDepensePrevisionnelle(id: string) {
  await prisma.depense.delete({ where: { id } });
  revalidatePath("/previsionnel");
  redirect("/previsionnel");
}

export async function modifierDepensePrevisionnelle(id: string, formData: FormData): Promise<void> {
  const validated = depensePrevSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) { redirect("/previsionnel"); }
  const d = validated.data;
  await prisma.depense.update({
    where: { id },
    data: {
      libelle:       d.libelle,
      montant:       d.montant,
      date:          new Date(d.date),
      categorie:     d.categorie,
      chantierId:    d.chantierId    || null,
      fournisseurId: d.fournisseurId || null,
      notes:         d.notes ?? null,
    },
  });
  revalidatePath("/previsionnel");
  redirect("/previsionnel");
}

export async function convertirDepensePrevisionnelle(id: string): Promise<void> {
  await prisma.depense.update({ where: { id }, data: { type: "REEL" } });
  revalidatePath("/previsionnel");
  revalidatePath("/depenses");
  redirect("/previsionnel");
}

// Variante sans retour pour <form action> direct (Server Component)
export async function ajouterDepensePrevisionnelle(formData: FormData): Promise<void> {
  const validated = depensePrevSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) redirect("/previsionnel");
  const d = validated.data;
  await prisma.depense.create({
    data: {
      libelle:       d.libelle,
      montant:       d.montant,
      date:          new Date(d.date),
      categorie:     d.categorie,
      type:          "PREVISIONNEL",
      chantierId:    d.chantierId   || null,
      fournisseurId: d.fournisseurId || null,
      notes:         d.notes ?? null,
    },
  });
  revalidatePath("/previsionnel");
  redirect("/previsionnel");
}
