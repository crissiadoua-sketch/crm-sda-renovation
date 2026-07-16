import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) return NextResponse.redirect(new URL("/", req.url));

  const pvr = await prisma.pvReception.findUnique({
    where: { id },
    include: {
      chantier:     { select: { nom: true } },
      client:       { select: { nom: true, prenom: true, raisonSociale: true, email: true } },
      sousTraitant: { select: { nom: true } },
      fournisseur:  { select: { nom: true } },
    },
  });

  if (!pvr || pvr.shareToken !== token) {
    return new NextResponse("Lien invalide ou expiré.", { status: 404 });
  }

  // Vérifier que les deux parties ont signé
  const isTravauxClient = pvr.categorie === "TRAVAUX_CLIENT";
  const externalSigned  = isTravauxClient ? !!pvr.dateSignatureMO : !!pvr.dateSignaturePrestataire;
  const sdaSigned       = isTravauxClient ? !!pvr.dateSignaturePrestataire : !!pvr.dateSignatureMO;

  if (!externalSigned || !sdaSigned) {
    return new NextResponse("Le document n'est pas encore signé par les deux parties.", { status: 403 });
  }

  // Accusé de réception : enregistrer la première ouverture et notifier SDA
  const isFirstAccess = !pvr.premiereOuvertureSigneAt;
  if (isFirstAccess) {
    const now = new Date();
    await prisma.pvReception.update({ where: { id }, data: { premiereOuvertureSigneAt: now } });

    const nomExterne = isTravauxClient
      ? (pvr.client?.raisonSociale || `${pvr.client?.prenom ?? ""} ${pvr.client?.nom ?? ""}`.trim() || "Client")
      : (pvr.sousTraitant?.nom || pvr.fournisseur?.nom || "Prestataire");
    const dateStr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(now);
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";

    try {
      await envoyerEmail({
        from: "SDA Rénovation <contact@sda-renovation.com>",
        to: "contact@sda-renovation.com",
        subject: `📥 PV ${pvr.numero} — PDF signé téléchargé par ${nomExterne}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">📥 Accusé de téléchargement</p>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${pvr.numero}</p>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
              <p style="margin:0 0 16px;font-size:14px;color:#374151">
                <strong>${nomExterne}</strong> a téléchargé le PV de réception signé.
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
                <tr><td style="padding:6px 0;color:#64748b;width:40%">Document</td><td style="padding:6px 0;font-weight:600;color:#1e293b">${pvr.numero}</td></tr>
                ${pvr.chantier ? `<tr><td style="padding:6px 0;color:#64748b">Chantier</td><td style="padding:6px 0;color:#374151">${pvr.chantier.nom}</td></tr>` : ""}
                <tr><td style="padding:6px 0;color:#64748b">Téléchargé le</td><td style="padding:6px 0;color:#374151">${dateStr}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Par</td><td style="padding:6px 0;color:#374151">${nomExterne}</td></tr>
              </table>
              <div style="text-align:center">
                <a href="${APP_URL}/pv-reception/${pvr.id}" style="display:inline-block;background:#1E2F6E;color:#fff;text-decoration:none;padding:10px 28px;border-radius:6px;font-size:14px;font-weight:600">Voir dans le CRM</a>
              </div>
            </div>
          </div>`,
        text: `${nomExterne} a téléchargé le PV ${pvr.numero} le ${dateStr}.`,
      });
    } catch { /* non bloquant */ }
  }

  // Rediriger vers la page d'aperçu PDF
  return NextResponse.redirect(new URL(`/apercu/pv-reception/${id}`, req.url));
}
