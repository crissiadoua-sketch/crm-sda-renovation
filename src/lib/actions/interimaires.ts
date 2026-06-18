"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function nextInterimaireRef(): Promise<string> {
  const all = await prisma.interimaire.findMany({ select: { reference: true } });
  const nums = all
    .map((i) => parseInt(i.reference.replace("INT-", ""), 10))
    .filter(Number.isFinite);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `INT-${String(next).padStart(3, "0")}`;
}

export async function createInterimaire(formData: FormData): Promise<void> {
  await prisma.interimaire.create({
    data: {
      reference: formData.get("reference") as string,
      nom: formData.get("nom") as string,
      prenom: formData.get("prenom") as string,
      agence: (formData.get("agence") as string) || null,
      corpsEtat: formData.get("corpsEtat") as string,
      qualification: (formData.get("qualification") as string) || "COMPAGNON",
      tauxHoraireHT: parseFloat(formData.get("tauxHoraireHT") as string) || 0,
      tauxAgenceHT: parseFloat(formData.get("tauxAgenceHT") as string) || 0,
      telephone: (formData.get("telephone") as string) || null,
      notes: (formData.get("notes") as string) || null,
      actif: formData.get("actif") === "on",
    },
  });
  redirect("/interimaires");
}

export async function updateInterimaire(id: string, formData: FormData): Promise<void> {
  await prisma.interimaire.update({
    where: { id },
    data: {
      nom: formData.get("nom") as string,
      prenom: formData.get("prenom") as string,
      agence: (formData.get("agence") as string) || null,
      corpsEtat: formData.get("corpsEtat") as string,
      qualification: (formData.get("qualification") as string) || "COMPAGNON",
      tauxHoraireHT: parseFloat(formData.get("tauxHoraireHT") as string) || 0,
      tauxAgenceHT: parseFloat(formData.get("tauxAgenceHT") as string) || 0,
      telephone: (formData.get("telephone") as string) || null,
      notes: (formData.get("notes") as string) || null,
      actif: formData.get("actif") === "on",
    },
  });
  revalidatePath("/interimaires");
  revalidatePath(`/interimaires/${id}`);
}

export async function deleteInterimaire(id: string): Promise<void> {
  await prisma.interimaire.delete({ where: { id } });
  redirect("/interimaires");
}

export async function createSuiviHeure(
  interimaireId: string,
  formData: FormData,
): Promise<void> {
  const h = parseFloat(formData.get("heuresTravaillees") as string) || 0;
  const sup25 = parseFloat(formData.get("heuresSupp25") as string) || 0;
  const sup50 = parseFloat(formData.get("heuresSupp50") as string) || 0;
  const taux = parseFloat(formData.get("tauxHoraireHT") as string) || 0;
  const agence = parseFloat(formData.get("tauxAgenceHT") as string) || 0;

  const coutTotalHT =
    (h * taux + sup25 * taux * 1.25 + sup50 * taux * 1.5) * (1 + agence / 100);

  const chantierId = (formData.get("chantierId") as string) || null;

  await prisma.suiviHeureInterimaire.create({
    data: {
      interimaireId,
      chantierId: chantierId && chantierId !== "" ? chantierId : null,
      semaine: formData.get("semaine") as string,
      heuresTravaillees: h,
      heuresSupp25: sup25,
      heuresSupp50: sup50,
      tauxHoraireHT: taux,
      tauxAgenceHT: agence,
      coutTotalHT,
      facturePaye: formData.get("facturePaye") === "on",
      observations: (formData.get("observations") as string) || null,
    },
  });
  revalidatePath(`/interimaires/${interimaireId}`);
}

export async function deleteSuiviHeure(
  suiviId: string,
  interimaireId: string,
): Promise<void> {
  await prisma.suiviHeureInterimaire.delete({ where: { id: suiviId } });
  revalidatePath(`/interimaires/${interimaireId}`);
}

export async function toggleFacturePaye(
  suiviId: string,
  interimaireId: string,
  paye: boolean,
): Promise<void> {
  await prisma.suiviHeureInterimaire.update({
    where: { id: suiviId },
    data: { facturePaye: paye },
  });
  revalidatePath(`/interimaires/${interimaireId}`);
}
