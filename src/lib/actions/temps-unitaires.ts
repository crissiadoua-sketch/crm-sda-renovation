"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createTempsUnitaire(formData: FormData): Promise<void> {
  await prisma.tempsUnitaire.create({
    data: {
      corpsEtat: formData.get("corpsEtat") as string,
      designation: formData.get("designation") as string,
      nature: (formData.get("nature") as string) || "POSE",
      unite: (formData.get("unite") as string) || "m²",
      tempsUnitaire: parseFloat(formData.get("tempsUnitaire") as string) || 0,
      difficulte: (formData.get("difficulte") as string) || "MOYEN",
      notes: (formData.get("notes") as string) || null,
      actif: formData.get("actif") === "on",
    },
  });
  redirect("/temps-unitaires");
}

export async function updateTempsUnitaire(id: string, formData: FormData): Promise<void> {
  await prisma.tempsUnitaire.update({
    where: { id },
    data: {
      corpsEtat: formData.get("corpsEtat") as string,
      designation: formData.get("designation") as string,
      nature: (formData.get("nature") as string) || "POSE",
      unite: (formData.get("unite") as string) || "m²",
      tempsUnitaire: parseFloat(formData.get("tempsUnitaire") as string) || 0,
      difficulte: (formData.get("difficulte") as string) || "MOYEN",
      notes: (formData.get("notes") as string) || null,
      actif: formData.get("actif") === "on",
    },
  });
  revalidatePath("/temps-unitaires");
  revalidatePath(`/temps-unitaires/${id}`);
}

export async function deleteTempsUnitaire(id: string): Promise<void> {
  await prisma.tempsUnitaire.delete({ where: { id } });
  redirect("/temps-unitaires");
}
