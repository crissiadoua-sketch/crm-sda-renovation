import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { formatEuros, formatDate } from "@/lib/format";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const facture = await prisma.facture.findUnique({
    where: { id },
    include: {
      client:   { select: { prenom: true, nom: true, raisonSociale: true, type: true } },
      chantier: { select: { nom: true } },
    },
  });

  if (!facture || facture.downloadToken !== token) {
    return new NextResponse("Lien invalide ou expiré.", { status: 404 });
  }

  const isFirstAccess = !facture.premiereOuvertureAt;

  if (isFirstAccess) {
    const now = new Date();
    await prisma.facture.update({
      where: { id },
      data: { premiereOuvertureAt: now },
    });

    // Notification à SDA
    try {
      const dateStr = new Intl.DateTimeFormat("fr-FR", {
        dateStyle: "full",
        timeStyle: "short",
      }).format(now);

      const clientName =
        facture.client.type === "ENTREPRISE"
          ? (facture.client.raisonSociale ?? facture.client.nom)
          : `${facture.client.prenom ?? ""} ${facture.client.nom}`.trim();

      await envoyerEmail({
        from: "SDA Rénovation <contact@sda-renovation.com>",
        to: "contact@sda-renovation.com",
        subject: `📥 Facture ${facture.numero} consultée par ${clientName}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">📥 Facture consultée par le client</p>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${facture.numero}</p>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
              <p style="margin:0 0 16px;font-size:14px;color:#334155">
                Le client vient de consulter (et potentiellement télécharger) la facture <strong>${facture.numero}</strong>.
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:13px">
                <tr><td style="padding:6px 0;color:#64748b;width:40%">Client</td><td style="padding:6px 0;font-weight:600;color:#1e293b">${clientName}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Chantier</td><td style="padding:6px 0;color:#374151">${facture.chantier.nom}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Montant TTC</td><td style="padding:6px 0;font-weight:600;color:#1E2F6E">${formatEuros(facture.totalTTC)}</td></tr>
                ${facture.dateEcheance ? `<tr><td style="padding:6px 0;color:#64748b">Échéance</td><td style="padding:6px 0;color:#dc2626">${formatDate(facture.dateEcheance)}</td></tr>` : ""}
                <tr><td style="padding:6px 0;color:#64748b">Consulté le</td><td style="padding:6px 0;color:#374151">${dateStr}</td></tr>
              </table>
              <div style="margin-top:20px;text-align:center">
                <a href="${APP_URL}/factures/${id}" style="display:inline-block;background:#1E2F6E;color:#fff;text-decoration:none;padding:10px 28px;border-radius:6px;font-size:14px;font-weight:600">Voir dans le CRM</a>
              </div>
            </div>
          </div>`,
        text: `Facture ${facture.numero} consultée par ${clientName} (${facture.chantier.nom}) le ${dateStr}. Montant : ${formatEuros(facture.totalTTC)}`,
      });
    } catch { /* notification non bloquante */ }
  }

  // Rediriger vers l'aperçu PDF
  return NextResponse.redirect(new URL(`/apercu/facture/${id}`, req.url));
}
