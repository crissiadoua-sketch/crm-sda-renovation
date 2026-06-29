import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { formatValeurLigne, type UniteAffichage } from "@/lib/metre-units";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const chantierId = req.nextUrl.searchParams.get("chantierId");
  if (!chantierId) return NextResponse.json({ error: "chantierId manquant" }, { status: 400 });

  const [chantier, metre] = await Promise.all([
    prisma.chantier.findUnique({ where: { id: chantierId }, select: { nom: true, reference: true } }),
    prisma.metre.findFirst({
      where: { chantierId },
      orderBy: { createdAt: "desc" },
      include: { lignes: { orderBy: { ordre: "asc" } } },
    }),
  ]);
  if (!chantier) return NextResponse.json({ error: "Chantier introuvable" }, { status: 404 });

  const uniteAffichage = (metre?.uniteAffichage ?? "m") as UniteAffichage;
  const lignes = metre?.lignes ?? [];

  const rows = lignes.map((l) => ({
    Désignation: l.designation,
    Type: l.type,
    Valeur: formatValeurLigne(l.type, l.valeurMm, uniteAffichage),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Métré");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="metre-${chantier.reference.replace(/[^a-zA-Z0-9_-]/g, "-")}.xlsx"`,
    },
  });
}
