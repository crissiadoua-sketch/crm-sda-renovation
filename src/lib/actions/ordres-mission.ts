"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

async function nextNumeroOm(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `OM-${year}-`;
  const last = await prisma.ordreMission.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const seq = last ? parseInt(last.numero.split("-")[2] ?? "0", 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function creerOrdreMission(formData: FormData): Promise<void> {
  const sousTraitantId = formData.get("sousTraitantId") as string;
  const titre          = formData.get("titre") as string;
  const dateDebut      = formData.get("dateDebut") as string;
  const numero         = await nextNumeroOm();

  const om = await prisma.ordreMission.create({
    data: { numero, sousTraitantId, titre, dateDebut: new Date(dateDebut) },
  });

  revalidatePath("/ordres-mission");
  redirect(`/ordres-mission/${om.id}`);
}

export async function mettreAJourOrdreMission(id: string, formData: FormData): Promise<void> {
  const titre       = formData.get("titre") as string;
  const description = (formData.get("description") as string) || null;
  const lieu        = (formData.get("lieu") as string) || null;
  const dateDebut   = formData.get("dateDebut") as string;
  const dateFinStr  = (formData.get("dateFin") as string) || null;
  const chantierId  = (formData.get("chantierId") as string) || null;
  const statut      = formData.get("statut") as string;
  const notes       = (formData.get("notes") as string) || null;

  await prisma.ordreMission.update({
    where: { id },
    data: {
      titre, description, lieu, statut, notes,
      chantierId: chantierId || null,
      dateDebut:  new Date(dateDebut),
      dateFin:    dateFinStr ? new Date(dateFinStr) : null,
    },
  });

  revalidatePath("/ordres-mission");
  revalidatePath(`/ordres-mission/${id}`);
}

export async function supprimerOrdreMission(id: string): Promise<void> {
  await prisma.ordreMission.delete({ where: { id } });
  revalidatePath("/ordres-mission");
  redirect("/ordres-mission");
}
