"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function revalidateAll() {
  revalidatePath("/finances/fournisseurs-echeancier");
  revalidatePath("/finances/tresorerie-hebdo");
  revalidatePath("/comptabilite/rapprochement");
}

export async function creerFactureFournisseur(formData: FormData) {
  const fournisseurId = formData.get("fournisseurId") as string;
  const chantierId = (formData.get("chantierId") as string) || null;
  const bonCommandeId = (formData.get("bonCommandeId") as string) || null;
  const numero = (formData.get("numero") as string).trim();
  const reference = (formData.get("reference") as string | null)?.trim() || null;
  const dateReception = formData.get("dateReception") as string;
  const dateEcheance = (formData.get("dateEcheance") as string) || null;
  const montantHT = parseFloat((formData.get("montantHT") as string) || "0");
  const montantTVA = parseFloat((formData.get("montantTVA") as string) || "0");
  const montantTTC = parseFloat((formData.get("montantTTC") as string) || "0");
  const notes = (formData.get("notes") as string | null)?.trim() || null;

  if (!fournisseurId || !numero) return;

  const today = new Date();
  const echeance = dateEcheance ? new Date(dateEcheance) : null;
  const statut = echeance && echeance < today ? "EN_RETARD" : "A_PAYER";

  await prisma.factureFournisseur.create({
    data: {
      numero,
      fournisseurId,
      chantierId: chantierId || undefined,
      bonCommandeId: bonCommandeId || undefined,
      reference,
      dateReception: dateReception ? new Date(dateReception) : new Date(),
      dateEcheance: echeance,
      montantHT,
      montantTVA,
      montantTTC,
      notes,
      statut,
    },
  });

  revalidateAll();
}

export async function enregistrerPaiementFournisseur(formData: FormData) {
  const factureId = formData.get("factureId") as string;
  const montant = parseFloat((formData.get("montant") as string) || "0");
  const dateStr = formData.get("date") as string;
  const methode = (formData.get("methode") as string) || "VIREMENT";
  const reference = (formData.get("reference") as string | null)?.trim() || null;

  if (!factureId || montant <= 0) return;

  const facture = await prisma.factureFournisseur.findUniqueOrThrow({
    where: { id: factureId },
    select: { montantPaye: true, montantTTC: true },
  });

  const newMontantPaye = facture.montantPaye + montant;
  const newStatut =
    newMontantPaye >= facture.montantTTC
      ? "PAYEE"
      : newMontantPaye > 0
      ? "PAYEE_PARTIELLE"
      : "A_PAYER";

  await prisma.$transaction([
    prisma.paiementFournisseur.create({
      data: {
        factureFournisseurId: factureId,
        montant,
        date: dateStr ? new Date(dateStr) : new Date(),
        methode,
        reference,
      },
    }),
    prisma.factureFournisseur.update({
      where: { id: factureId },
      data: { montantPaye: newMontantPaye, statut: newStatut },
    }),
  ]);

  revalidateAll();
}

export async function mettreAJourStatutsRetard() {
  const today = new Date();
  await prisma.factureFournisseur.updateMany({
    where: {
      statut: "A_PAYER",
      dateEcheance: { lt: today },
    },
    data: { statut: "EN_RETARD" },
  });
  revalidateAll();
}

export async function supprimerFactureFournisseur(id: string) {
  await prisma.factureFournisseur.delete({ where: { id } });
  revalidateAll();
  redirect("/finances/fournisseurs-echeancier");
}

// Utilisé par le rapprochement bancaire : rapprocher une ligne de débit à une facture fournisseur
export async function rapprochementerFactureFournisseur(ligneId: string, formData: FormData) {
  const factureId = formData.get("factureId") as string;
  if (!factureId) return;

  const ligne = await prisma.ligneReleveBancaire.findUniqueOrThrow({ where: { id: ligneId } });
  const montant = Math.abs(ligne.montant);

  const facture = await prisma.factureFournisseur.findUniqueOrThrow({
    where: { id: factureId },
    select: { montantPaye: true, montantTTC: true },
  });

  const newMontantPaye = facture.montantPaye + montant;
  const newStatut =
    newMontantPaye >= facture.montantTTC
      ? "PAYEE"
      : newMontantPaye > 0
      ? "PAYEE_PARTIELLE"
      : "A_PAYER";

  await prisma.$transaction([
    prisma.paiementFournisseur.create({
      data: {
        factureFournisseurId: factureId,
        montant,
        date: ligne.date,
        methode: "VIREMENT",
        reference: ligne.reference ?? null,
      },
    }),
    prisma.factureFournisseur.update({
      where: { id: factureId },
      data: { montantPaye: newMontantPaye, statut: newStatut },
    }),
    prisma.ligneReleveBancaire.update({
      where: { id: ligneId },
      data: { statut: "RAPPROCHE", factureFournisseurId: factureId },
    }),
  ]);

  revalidateAll();
  revalidatePath("/comptabilite/rapprochement");
}
