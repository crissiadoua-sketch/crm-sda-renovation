"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { prochainNumeroDocument } from "@/lib/codification";

async function nextNumeroOm(): Promise<string> {
  const oms = await prisma.ordreMission.findMany({ select: { numero: true } });
  return prochainNumeroDocument("OM", oms.map((o) => o.numero));
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
