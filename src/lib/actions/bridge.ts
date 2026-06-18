"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import {
  creerLienPaiementBridge,
  getLienPaiementBridge,
  annulerLienPaiementBridge,
} from "@/lib/bridge";

// ---------------------------------------------------------------------------
// Générer un lien de paiement Bridge pour une facture
// ---------------------------------------------------------------------------

export async function genererLienPaiement(factureId: string): Promise<{
  ok: boolean;
  lienUrl?: string;
  error?: string;
}> {
  const facture = await prisma.facture.findUnique({
    where: { id: factureId },
    include: { chantier: { select: { nom: true } } },
  });

  if (!facture) return { ok: false, error: "Facture introuvable" };

  const resteDu = Math.max(0, facture.totalTTC - facture.montantPaye);
  if (resteDu <= 0) return { ok: false, error: "Facture déjà intégralement payée" };

  // Récupérer l'IBAN depuis les paramètres
  const parametres = await prisma.parametres.findUnique({ where: { id: "default" } });

  try {
    // Si un lien existant non expiré, le retourner directement
    if (facture.bridgeLinkId && facture.bridgeLinkStatut === "PENDING") {
      const existing = await getLienPaiementBridge(facture.bridgeLinkId).catch(() => null);
      if (existing?.status === "PENDING") {
        return { ok: true, lienUrl: existing.url };
      }
    }

    const link = await creerLienPaiementBridge({
      montantEuros:   Math.round(resteDu * 100) / 100,
      label:          `${facture.numero} — SDA Rénovation`,
      endToEndId:     facture.numero,
      iban:           parametres?.iban ?? undefined,
      beneficiaryName: COMPANY.nom,
      redirectUrl:    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/factures/${factureId}?paiement=confirme`,
    });

    await prisma.facture.update({
      where: { id: factureId },
      data: {
        lienPaiement:     link.url,
        bridgeLinkId:     link.id,
        bridgeLinkStatut: link.status,
      },
    });

    revalidatePath(`/factures/${factureId}`);
    return { ok: true, lienUrl: link.url };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Vérifier le statut d'un lien de paiement et mettre à jour la facture
// ---------------------------------------------------------------------------

export async function verifierStatutPaiement(factureId: string): Promise<{
  ok: boolean;
  statut?: string;
  error?: string;
}> {
  const facture = await prisma.facture.findUnique({ where: { id: factureId } });
  if (!facture) return { ok: false, error: "Facture introuvable" };
  if (!facture.bridgeLinkId) return { ok: false, error: "Aucun lien de paiement Bridge associé" };

  try {
    const link = await getLienPaiementBridge(facture.bridgeLinkId);

    const updates: Record<string, unknown> = {
      bridgeLinkStatut: link.status,
    };

    if (link.status === "COMPLETED") {
      const montantPaye = facture.montantPaye + (link.amount ?? 0);
      const statut = montantPaye >= facture.totalTTC ? "PAYEE" : "PAYEE_PARTIELLE";
      updates.montantPaye = montantPaye;
      updates.statut = statut;

      // Enregistrer comme paiement
      await prisma.paiement.create({
        data: {
          factureId: factureId,
          montant:   link.amount ?? facture.totalTTC - facture.montantPaye,
          methode:   "EN_LIGNE",
          reference: `Bridge ${link.id}`,
          notes:     "Paiement en ligne via Bridge by Bankin",
        },
      });
    }

    await prisma.facture.update({
      where: { id: factureId },
      data:  updates,
    });

    revalidatePath(`/factures/${factureId}`);
    revalidatePath("/factures");
    return { ok: true, statut: link.status };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return { ok: false, error: msg };
  }
}

// ---------------------------------------------------------------------------
// Annuler le lien de paiement
// ---------------------------------------------------------------------------

export async function annulerLienPaiement(factureId: string): Promise<{ ok: boolean; error?: string }> {
  const facture = await prisma.facture.findUnique({ where: { id: factureId } });
  if (!facture?.bridgeLinkId) return { ok: false, error: "Aucun lien à annuler" };

  try {
    await annulerLienPaiementBridge(facture.bridgeLinkId);
    await prisma.facture.update({
      where: { id: factureId },
      data: { bridgeLinkStatut: "CANCELLED", lienPaiement: null, bridgeLinkId: null },
    });
    revalidatePath(`/factures/${factureId}`);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return { ok: false, error: msg };
  }
}
