"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { prochainNumeroDocument } from "@/lib/codification";

export async function creerFactureTotaleDepuisDevis(devisId: string): Promise<void> {
  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (!devis) redirect("/factures");

  const factures = await prisma.facture.findMany({ select: { numero: true } });
  const numero = await prochainNumeroDocument("FAC", factures.map((f) => f.numero));

  const totalHT  = devis.lignes.reduce((s, l) => s + (l.totalHT ?? 0), 0);
  const totalTVA = devis.lignes.reduce((s, l) => s + (l.totalHT ?? 0) * ((l.tauxTVA ?? 0) / 100), 0);

  const facture = await prisma.facture.create({
    data: {
      numero,
      devisId,
      chantierId: devis.chantierId,
      clientId:   devis.clientId,
      statut: "BROUILLON",
      type:   "STANDARD",
      totalHT,
      totalTVA,
      totalTTC: totalHT + totalTVA,
      lignes: {
        create: devis.lignes.map((l) => ({
          ordre:          l.ordre,
          type:           l.type,
          codeArticle:    l.codeArticle,
          designation:    l.designation,
          unite:          l.unite,
          quantite:       l.quantite,
          prixUnitaireHT: l.prixUnitaireHT,
          remise:         l.remise,
          tauxTVA:        l.tauxTVA,
          totalHT:        l.totalHT,
        })),
      },
    },
  });

  revalidatePath("/factures");
  redirect(`/factures/${facture.id}`);
}

export async function creerFactureLibre(formData: FormData): Promise<void> {
  const chantierId = formData.get("chantierId") as string;
  const type = (formData.get("type") as string) || "STANDARD";
  const dateEcheanceStr = (formData.get("dateEcheance") as string) || null;

  const chantier = await prisma.chantier.findUnique({
    where: { id: chantierId },
    select: { clientId: true },
  });
  if (!chantier) redirect("/factures");

  const factures = await prisma.facture.findMany({ select: { numero: true } });
  const numero = await prochainNumeroDocument("FAC", factures.map((f) => f.numero));

  const facture = await prisma.facture.create({
    data: {
      numero,
      chantierId,
      clientId: chantier.clientId,
      statut: "BROUILLON",
      type,
      dateEcheance: dateEcheanceStr ? new Date(dateEcheanceStr) : null,
    },
  });

  revalidatePath("/factures");
  redirect(`/factures/${facture.id}`);
}

type LigneInput = {
  ordre: number;
  type: string;
  codeArticle?: string | null;
  designation: string;
  unite?: string | null;
  quantite?: number | null;
  prixUnitaireHT?: number | null;
  remise?: number | null;
  tauxTVA?: number | null;
};

export async function sauvegarderLignesFacture(factureId: string, lignes: LigneInput[]): Promise<void> {
  const lignesAvecTotal = lignes.map((l) => {
    const qte = l.quantite ?? 0;
    const pu = l.prixUnitaireHT ?? 0;
    const remise = l.remise ?? 0;
    const totalHT = l.type === "LIGNE" ? qte * pu * (1 - remise / 100) : null;
    return { ...l, totalHT };
  });

  const totalHT = lignesAvecTotal.reduce((sum, l) => sum + (l.totalHT ?? 0), 0);
  const totalTVA = lignesAvecTotal.reduce(
    (sum, l) => sum + (l.totalHT ?? 0) * ((l.tauxTVA ?? 0) / 100),
    0
  );

  await prisma.$transaction(async (tx) => {
    await tx.factureLigne.deleteMany({ where: { factureId } });
    await tx.facture.update({
      where: { id: factureId },
      data: {
        totalHT,
        totalTVA,
        totalTTC: totalHT + totalTVA,
        lignes: {
          create: lignesAvecTotal.map((l) => ({
            ordre: l.ordre,
            type: l.type,
            codeArticle: l.codeArticle || null,
            designation: l.designation,
            unite: l.unite || null,
            quantite: l.quantite ?? null,
            prixUnitaireHT: l.prixUnitaireHT ?? null,
            remise: l.remise ?? null,
            tauxTVA: l.tauxTVA ?? null,
            totalHT: l.totalHT,
          })),
        },
      },
    });
  });

  revalidatePath(`/factures/${factureId}`);
  revalidatePath("/factures");
}

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
