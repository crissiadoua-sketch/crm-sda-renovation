import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
      chantier: { select: { nom: true } },
      participants: { where: { shareToken: token } },
    },
  });

  if (!pv || pv.participants.length === 0) {
    return new NextResponse("Lien invalide ou expiré.", { status: 404 });
  }

  // Vérifier que SDA a signé (condition pour le téléchargement)
  if (!pv.dateSigSDA) {
    return new NextResponse("Le document n'est pas encore contre-signé par SDA Rénovation.", { status: 403 });
  }

  // Vérifier que le participant a également signé
  const participant = pv.participants[0];
  if (!participant.dateSigne) {
    return new NextResponse("Vous n'avez pas encore signé ce document.", { status: 403 });
  }

  // Rediriger vers l'aperçu PDF (version print)
  const apercuUrl = `/apercu/pv-reunion-chantier/${id}`;
  return NextResponse.redirect(new URL(apercuUrl, req.url));
}
