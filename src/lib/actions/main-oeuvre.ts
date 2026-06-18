"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function createTauxMO(formData: FormData): Promise<void> {
  const taux = parseFloat(formData.get("tauxHoraireHT") as string) || 0;
  const chargesRaw = formData.get("chargesPatronales") as string;
  const charges = chargesRaw && chargesRaw !== "" ? parseFloat(chargesRaw) : null;
  const categorie = formData.get("categorie") as string;
  const coutComplet =
    categorie === "SALARIE" && charges != null
      ? taux * (1 + charges / 100)
      : taux;

  await prisma.tauxMainOeuvre.create({
    data: {
      corpsEtat: formData.get("corpsEtat") as string,
      categorie,
      qualification: (formData.get("qualification") as string) || "COMPAGNON",
      designation: formData.get("designation") as string,
      tauxHoraireHT: taux,
      chargesPatronales: charges,
      coutCompletHT: coutComplet,
      notes: (formData.get("notes") as string) || null,
      actif: formData.get("actif") === "on",
    },
  });
  redirect("/main-oeuvre");
}

export async function updateTauxMO(id: string, formData: FormData): Promise<void> {
  const taux = parseFloat(formData.get("tauxHoraireHT") as string) || 0;
  const chargesRaw = formData.get("chargesPatronales") as string;
  const charges = chargesRaw && chargesRaw !== "" ? parseFloat(chargesRaw) : null;
  const categorie = formData.get("categorie") as string;
  const coutComplet =
    categorie === "SALARIE" && charges != null
      ? taux * (1 + charges / 100)
      : taux;

  await prisma.tauxMainOeuvre.update({
    where: { id },
    data: {
      corpsEtat: formData.get("corpsEtat") as string,
      categorie,
      qualification: (formData.get("qualification") as string) || "COMPAGNON",
      designation: formData.get("designation") as string,
      tauxHoraireHT: taux,
      chargesPatronales: charges,
      coutCompletHT: coutComplet,
      notes: (formData.get("notes") as string) || null,
      actif: formData.get("actif") === "on",
    },
  });
  revalidatePath("/main-oeuvre");
  revalidatePath(`/main-oeuvre/${id}`);
}

export async function deleteTauxMO(id: string): Promise<void> {
  await prisma.tauxMainOeuvre.delete({ where: { id } });
  redirect("/main-oeuvre");
}
