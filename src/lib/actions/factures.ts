"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function updateMentionsFacture(id: string, formData: FormData): Promise<void> {
  await prisma.facture.update({
    where: { id },
    data: {
      mentionsLibres: (formData.get("mentionsLibres") as string) || null,
      notesInternes: (formData.get("notesInternes") as string) || null,
    },
  });
  revalidatePath(`/factures/${id}`);
}

export async function deleteFacture(id: string): Promise<void> {
  try {
    await prisma.facture.delete({ where: { id } });
  } catch {
    redirect(`/factures/${id}?erreur=suppression`);
  }
  revalidatePath("/factures");
  redirect("/factures");
}

export async function updateFactureStatut(id: string, formData: FormData): Promise<void> {
  const statut = formData.get("statut") as string;
  await prisma.facture.update({
    where: { id },
    data: { statut },
  });
  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
}

export async function ajouterPaiement(factureId: string, formData: FormData): Promise<void> {
  const montant = parseFloat((formData.get("montant") as string) ?? "0");
  const methode = (formData.get("methode") as string) || "VIREMENT";
  const reference = (formData.get("reference") as string) || null;
  const notes = (formData.get("notes") as string) || null;
  const dateStr = formData.get("date") as string;
  const date = dateStr ? new Date(dateStr) : new Date();

  if (isNaN(montant) || montant <= 0) return;

  // Insert paiement and update montantPaye on facture
  await prisma.$transaction(async (tx) => {
    await tx.paiement.create({
      data: {
        factureId,
        montant,
        methode,
        reference: reference || null,
        notes: notes || null,
        date,
      },
    });

    const facture = await tx.facture.findUnique({
      where: { id: factureId },
      select: { montantPaye: true, totalTTC: true },
    });

    if (!facture) return;

    const newMontantPaye = facture.montantPaye + montant;
    const newStatut =
      newMontantPaye >= facture.totalTTC
        ? "PAYEE"
        : newMontantPaye > 0
          ? "PAYEE_PARTIELLE"
          : undefined;

    await tx.facture.update({
      where: { id: factureId },
      data: {
        montantPaye: newMontantPaye,
        ...(newStatut ? { statut: newStatut } : {}),
      },
    });
  });

  revalidatePath(`/factures/${factureId}`);
  revalidatePath("/factures");
}
