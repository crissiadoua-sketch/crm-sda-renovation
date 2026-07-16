import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { PrcPdfDocument } from "./prc-pdf-doc";
import { createElement } from "react";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) return NextResponse.redirect(new URL("/", req.url));

  const pv = await prisma.pVReunionChantier.findUnique({
    where: { id },
    include: {
      chantier: { select: { nom: true, reference: true } },
      client: { select: { nom: true, prenom: true, raisonSociale: true } },
      participants: {
        orderBy: { nom: "asc" },
        select: { nom: true, societe: true, fonction: true, present: true, signatureImage: true, dateSigne: true, shareToken: true },
      },
      points: { orderBy: { ordre: "asc" } },
      actions: { orderBy: { ordre: "asc" } },
    },
  });

  if (!pv) {
    return new NextResponse("PV introuvable.", { status: 404 });
  }

  // Vérifier que le token correspond à un participant
  const participant = pv.participants.find((p) => p.shareToken === token);
  if (!participant) {
    return new NextResponse("Lien invalide ou expiré.", { status: 404 });
  }

  // Vérifier que SDA a signé
  if (!pv.dateSigSDA) {
    return new NextResponse("Le document n'est pas encore contre-signé par SDA Rénovation.", { status: 403 });
  }

  // Vérifier que le participant a signé
  if (!participant.dateSigne) {
    return new NextResponse("Vous n'avez pas encore signé ce document.", { status: 403 });
  }

  // Générer le PDF avec toutes les signatures embarquées
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(createElement(PrcPdfDocument, { pv }) as any);

  const filename = `PRC-${pv.numero.replace(/[^a-zA-Z0-9-]/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
