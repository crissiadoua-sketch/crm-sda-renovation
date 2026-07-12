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

  // Auto-matching : rapprocher automatiquement les transactions exactes (montant + date ≤ 3 jours)
  let autoRapproches = 0;
  const lignesCreees = releve.lignes;

  if (lignesCreees.length > 0) {
    const timestamps = lignesCreees.map((l) => l.date.getTime());
    const debut = new Date(Math.min(...timestamps) - 30 * 86400000);
    const fin = new Date(Math.max(...timestamps) + 30 * 86400000);

    const [paiements, depenses] = await Promise.all([
      prisma.paiement.findMany({ where: { date: { gte: debut, lte: fin }, ligneReleve: null } }),
      prisma.depense.findMany({ where: { date: { gte: debut, lte: fin }, ligneReleve: null } }),
    ]);

    const ciblesPaiements: CibleRapprochement[] = paiements.map((p) => ({
      id: p.id, montant: p.montant, date: p.date, label: "",
    }));
    const ciblesDepenses: CibleRapprochement[] = depenses.map((d) => ({
      id: d.id, montant: d.montant, date: d.date, label: "",
    }));

    const usedPaiements = new Set<string>();
    const usedDepenses = new Set<string>();

    for (const ligne of lignesCreees) {
      if (ligne.montant > 0) {
        const disponibles = ciblesPaiements.filter((c) => !usedPaiements.has(c.id));
        const match = proposerCorrespondance({ montant: ligne.montant, date: ligne.date }, disponibles);
        if (match?.confiance === "EXACTE") {
          await prisma.ligneReleveBancaire.update({
            where: { id: ligne.id },
            data: { statut: "RAPPROCHE", paiementId: match.cible.id },
          });
          usedPaiements.add(match.cible.id);
          autoRapproches++;
        }
      } else if (ligne.montant < 0) {
        const disponibles = ciblesDepenses.filter((c) => !usedDepenses.has(c.id));
        const match = proposerCorrespondance({ montant: ligne.montant, date: ligne.date }, disponibles);
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

export async function annulerCorrespondance(ligneId: string) {
  await prisma.ligneReleveBancaire.update({
    where: { id: ligneId },
    data: { statut: "NON_RAPPROCHE", paiementId: null, depenseId: null },
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
