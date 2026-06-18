import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Webhook Bridge — reçoit les notifications de statut de paiement
 * URL à configurer dans le dashboard Bridge :
 * https://votre-domaine.com/api/bridge/webhook
 */

interface BridgeWebhookPayload {
  type:    string;         // "payment_link.completed" | "payment_link.expired" | "payment_link.cancelled"
  data: {
    id:     string;        // ID du payment link
    status: string;
    amount?: number;
    transactions?: Array<{ id: string; amount: number; status: string }>;
  };
}

export async function POST(req: NextRequest) {
  // Vérification basique — Bridge n'envoie pas de signature HMAC en v3 sandbox
  // En production, valider l'IP source ou un header de sécurité selon la doc Bridge
  let payload: BridgeWebhookPayload;

  try {
    payload = await req.json() as BridgeWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = payload;
  if (!data?.id) {
    return NextResponse.json({ error: "Missing data.id" }, { status: 400 });
  }

  // Retrouver la facture associée à ce payment link
  const facture = await prisma.facture.findFirst({
    where: { bridgeLinkId: data.id },
  });

  if (!facture) {
    // Payment link inconnu — pas une erreur, juste ignorer
    return NextResponse.json({ ok: true, ignored: true });
  }

  if (type === "payment_link.completed" || data.status === "COMPLETED") {
    const montantPaye = (data.amount ?? facture.totalTTC - facture.montantPaye);
    const totalPaye   = facture.montantPaye + montantPaye;
    const statut      = totalPaye >= facture.totalTTC ? "PAYEE" : "PAYEE_PARTIELLE";

    await prisma.$transaction([
      prisma.facture.update({
        where: { id: facture.id },
        data: {
          statut,
          montantPaye:      totalPaye,
          bridgeLinkStatut: "COMPLETED",
        },
      }),
      prisma.paiement.create({
        data: {
          factureId: facture.id,
          montant:   montantPaye,
          methode:   "EN_LIGNE",
          reference: `Bridge ${data.id}`,
          notes:     "Paiement en ligne reçu via Bridge by Bankin (webhook)",
        },
      }),
    ]);
  } else if (type === "payment_link.expired" || data.status === "EXPIRED") {
    await prisma.facture.update({
      where: { id: facture.id },
      data: { bridgeLinkStatut: "EXPIRED" },
    });
  } else if (type === "payment_link.cancelled" || data.status === "CANCELLED") {
    await prisma.facture.update({
      where: { id: facture.id },
      data: { bridgeLinkStatut: "CANCELLED", lienPaiement: null },
    });
  }

  return NextResponse.json({ ok: true });
}
