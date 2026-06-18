"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function upsertSousDetail(ouvrageId: string, formData: FormData): Promise<void> {
  const data = {
    fraisGeneraux: parseFloat(formData.get("fraisGeneraux") as string) || 15,
    benefice: parseFloat(formData.get("benefice") as string) || 8,
    notes: (formData.get("notes") as string) || null,
  };
  await prisma.sousDetailPrix.upsert({
    where: { ouvrageId },
    create: { ouvrageId, ...data },
    update: data,
  });
  revalidatePath(`/ouvrages/${ouvrageId}`);
}

export async function addLigneSDP(
  ouvrageId: string,
  sousDetailId: string,
  formData: FormData,
): Promise<void> {
  const quantite = parseFloat(formData.get("quantite") as string) || 0;
  const prixUnitaireHT = parseFloat(formData.get("prixUnitaireHT") as string) || 0;
  const totalHT = quantite * prixUnitaireHT;
  const count = await prisma.ligneSousDetailPrix.count({ where: { sousDetailId } });
  await prisma.ligneSousDetailPrix.create({
    data: {
      sousDetailId,
      ordre: count,
      nature: formData.get("nature") as string,
      designation: formData.get("designation") as string,
      unite: (formData.get("unite") as string) || "h",
      quantite,
      prixUnitaireHT,
      totalHT,
    },
  });
  revalidatePath(`/ouvrages/${ouvrageId}`);
}

export async function deleteLigneSDP(ligneId: string, ouvrageId: string): Promise<void> {
  await prisma.ligneSousDetailPrix.delete({ where: { id: ligneId } });
  revalidatePath(`/ouvrages/${ouvrageId}`);
}

export async function deleteSousDetail(id: string, ouvrageId: string): Promise<void> {
  await prisma.sousDetailPrix.delete({ where: { id } });
  revalidatePath(`/ouvrages/${ouvrageId}`);
}
