"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { parseCsvReleve, parseOfxReleve, parsePdfReleve, proposerCorrespondance, type CibleRapprochement } from "@/lib/rapprochement";

export type ImportReleveState = { error?: string } | undefined;

export async function importReleve(
  _prevState: ImportReleveState,
  formData: FormData,
): Promise<ImportReleveState> {
  const fichier = formData.get("fichier") as File | null;
  const nom = (formData.get("nom") as string | null)?.trim();
  const banque = (formData.get("banque") as string | null)?.trim() || null;
  const soldeDebutRaw = formData.get("soldeDebut") as string | null;
  const soldeFinRaw = formData.get("soldeFin") as string | null;
  const soldeDebut = soldeDebutRaw ? parseFloat(soldeDebutRaw) : null;
  const soldeFin = soldeFinRaw ? parseFloat(soldeFinRaw) : null;

  if (!fichier || fichier.size === 0) return { error: "Sélectionnez un fichier de relevé (CSV, OFX ou PDF)." };
  if (!nom) return { error: "Le nom du relevé est requis." };

  const estPdf = fichier.name.toLowerCase().endsWith(".pdf") || fichier.type === "application/pdf";

  let lignes;
  try {
    if (estPdf) {
      const buffer = Buffer.from(await fichier.arrayBuffer());
      lignes = await parsePdfReleve(buffer);
    } else {
      const contenu = await fichier.text();
      const estOfx = fichier.name.toLowerCase().endsWith(".ofx") || contenu.includes("<STMTTRN>");
      lignes = estOfx ? parseOfxReleve(contenu) : parseCsvReleve(contenu);
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Fichier illisible." };
  }

  if (lignes.length === 0) {
    return {
      error: estPdf
        ? "Aucune ligne de transaction détectée dans ce PDF — c'est peut-être un scan/image (texte non sélectionnable), ou la mise en page de votre banque n'est pas reconnue. Essayez l'export CSV ou OFX depuis votre espace bancaire en ligne."
        : "Aucune ligne de transaction détectée dans ce fichier.",
    };
  }

  const releve = await prisma.releveBancaire.create({
    data: {
      nom,
      banque,
      soldeDebut: soldeDebut !== null && !isNaN(soldeDebut) ? soldeDebut : null,
      soldeFin: soldeFin !== null && !isNaN(soldeFin) ? soldeFin : null,
      lignes: {
        create: lignes.map((l) => ({
          date: l.date,
          libelle: l.libelle,
          montant: l.montant,
          reference: l.reference,
        })),
      },
    },
    include: { lignes: { orderBy: { date: "asc" } } },
  });

  // Auto-matching : paiements, dépenses et factures non réglées
  let autoRapproches = 0;
  const lignesCreees = releve.lignes;

  if (lignesCreees.length > 0) {
    const timestamps = lignesCreees.map((l) => l.date.getTime());
    const debut = new Date(Math.min(...timestamps) - 30 * 86400000);
    const fin = new Date(Math.max(...timestamps) + 30 * 86400000);

    const [paiements, depenses, factures] = await Promise.all([
      prisma.paiement.findMany({ where: { date: { gte: debut, lte: fin }, ligneReleve: null } }),
      prisma.depense.findMany({ where: { date: { gte: debut, lte: fin }, ligneReleve: null } }),
      prisma.facture.findMany({
        where: {
          dateEmission: { gte: debut, lte: fin },
          statut: { notIn: ["BROUILLON", "ANNULEE", "PAYEE"] },
        },
        select: { id: true, numero: true, totalTTC: true, montantPaye: true, dateEmission: true, clientId: true },
      }),
    ]);

    const ciblesPaiements: CibleRapprochement[] = paiements.map((p) => ({
      id: p.id, montant: p.montant, date: p.date, label: "",
    }));
    const ciblesDepenses: CibleRapprochement[] = depenses.map((d) => ({
      id: d.id, montant: d.montant, date: d.date, label: "",
    }));
    // Factures : montant restant dû, date d'émission comme référence temporelle
    const ciblesFactures: CibleRapprochement[] = factures.map((f) => ({
      id: f.id, montant: f.totalTTC - f.montantPaye, date: f.dateEmission, label: "",
    }));

    const usedPaiements = new Set<string>();
    const usedDepenses = new Set<string>();
    const usedFactures = new Set<string>();

    for (const ligne of lignesCreees) {
      if (ligne.montant > 0) {
        // 1. Chercher un paiement existant
        const dispoPaiements = ciblesPaiements.filter((c) => !usedPaiements.has(c.id));
        const matchPaiement = proposerCorrespondance({ montant: ligne.montant, date: ligne.date }, dispoPaiements);
        if (matchPaiement?.confiance === "EXACTE") {
          await prisma.ligneReleveBancaire.update({
            where: { id: ligne.id },
            data: { statut: "RAPPROCHE", paiementId: matchPaiement.cible.id },
          });
          usedPaiements.add(matchPaiement.cible.id);
          autoRapproches++;
          continue;
        }

        // 2. Sinon, chercher une facture non réglée dont le restant dû correspond
        const dispoFactures = ciblesFactures.filter((c) => !usedFactures.has(c.id));
        const matchFacture = proposerCorrespondance({ montant: ligne.montant, date: ligne.date }, dispoFactures);
        if (matchFacture?.confiance === "EXACTE") {
          const facture = factures.find((f) => f.id === matchFacture.cible.id)!;
          await prisma.$transaction(async (tx) => {
            const paiement = await tx.paiement.create({
              data: {
                factureId: facture.id,
                montant: ligne.montant,
                date: ligne.date,
                methode: "VIREMENT",
                reference: ligne.reference ?? null,
              },
            });
            const newMontantPaye = facture.montantPaye + ligne.montant;
            const newStatut = newMontantPaye >= facture.totalTTC ? "PAYEE" : "PAYEE_PARTIELLE";
            await tx.facture.update({
              where: { id: facture.id },
              data: { montantPaye: newMontantPaye, statut: newStatut },
            });
            await tx.ligneReleveBancaire.update({
              where: { id: ligne.id },
              data: { statut: "RAPPROCHE", paiementId: paiement.id },
            });
          });
          usedFactures.add(matchFacture.cible.id);
          autoRapproches++;
        }
      } else if (ligne.montant < 0) {
        const dispoDepenses = ciblesDepenses.filter((c) => !usedDepenses.has(c.id));
        const match = proposerCorrespondance({ montant: ligne.montant, date: ligne.date }, dispoDepenses);
        if (match?.confiance === "EXACTE") {
          await prisma.ligneReleveBancaire.update({
            where: { id: ligne.id },
            data: { statut: "RAPPROCHE", depenseId: match.cible.id },
          });
          usedDepenses.add(match.cible.id);
          autoRapproches++;
        }
      }
    }
  }

  revalidatePath("/comptabilite/rapprochement");
  revalidatePath("/factures");
  redirect(`/comptabilite/rapprochement/${releve.id}?auto=${autoRapproches}&total=${lignesCreees.length}`);
}

export async function validerCorrespondance(
  ligneId: string,
  type: "PAIEMENT" | "DEPENSE",
  formData: FormData,
) {
  const cibleId = formData.get("cibleId") as string;
  if (!cibleId) return;
  await prisma.ligneReleveBancaire.update({
    where: { id: ligneId },
    data: {
      statut: "RAPPROCHE",
      paiementId: type === "PAIEMENT" ? cibleId : null,
      depenseId: type === "DEPENSE" ? cibleId : null,
    },
  });
  revalidatePath("/comptabilite/rapprochement");
}

// Rapprocher une ligne de crédit bancaire en créant un paiement sur une facture
export async function rapprochementerFacture(ligneId: string, formData: FormData) {
  const factureId = formData.get("factureId") as string;
  if (!factureId) return;

  const ligne = await prisma.ligneReleveBancaire.findUniqueOrThrow({ where: { id: ligneId } });

  await prisma.$transaction(async (tx) => {
    const paiement = await tx.paiement.create({
      data: {
        factureId,
        montant: ligne.montant,
        date: ligne.date,
        methode: "VIREMENT",
        reference: ligne.reference ?? null,
      },
    });

    const facture = await tx.facture.findUniqueOrThrow({
      where: { id: factureId },
      select: { montantPaye: true, totalTTC: true },
    });

    const newMontantPaye = facture.montantPaye + ligne.montant;
    const newStatut = newMontantPaye >= facture.totalTTC
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

    await tx.ligneReleveBancaire.update({
      where: { id: ligneId },
      data: { statut: "RAPPROCHE", paiementId: paiement.id },
    });
  });

  revalidatePath("/comptabilite/rapprochement");
  revalidatePath("/factures");
}

export async function annulerCorrespondance(ligneId: string) {
  await prisma.ligneReleveBancaire.update({
    where: { id: ligneId },
    data: { statut: "NON_RAPPROCHE", paiementId: null, depenseId: null, factureFournisseurId: null },
  });
  revalidatePath("/comptabilite/rapprochement");
}

export async function ignorerLigne(ligneId: string) {
  await prisma.ligneReleveBancaire.update({
    where: { id: ligneId },
    data: { statut: "IGNORE", paiementId: null, depenseId: null },
  });
  revalidatePath("/comptabilite/rapprochement");
}

export async function supprimerReleve(releveId: string) {
  await prisma.releveBancaire.delete({ where: { id: releveId } });
  revalidatePath("/comptabilite/rapprochement");
  redirect("/comptabilite/rapprochement");
}
