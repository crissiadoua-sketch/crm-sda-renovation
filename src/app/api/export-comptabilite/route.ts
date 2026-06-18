import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { factureIds, depenseIds } = (await req.json()) as { factureIds: string[]; depenseIds: string[] };
  const periode = req.nextUrl.searchParams.get("periode") ?? "export";

  const [factures, depenses] = await Promise.all([
    prisma.facture.findMany({
      where: { id: { in: factureIds } },
      include: { client: { select: { raisonSociale: true, siret: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.depense.findMany({
      where: { id: { in: depenseIds } },
      orderBy: { date: "asc" },
    }),
  ]);

  const rows: string[] = [
    "Type;Date;Numero;Tiers;Categorie;HT;TVA;TTC;Statut",
  ];

  for (const f of factures) {
    rows.push([
      "VENTE",
      f.createdAt.toLocaleDateString("fr-FR"),
      f.numero,
      f.client.raisonSociale,
      "CA",
      f.totalHT.toFixed(2).replace(".", ","),
      f.totalTVA.toFixed(2).replace(".", ","),
      f.totalTTC.toFixed(2).replace(".", ","),
      f.statut,
    ].join(";"));
  }

  for (const d of depenses) {
    rows.push([
      "ACHAT",
      d.date.toLocaleDateString("fr-FR"),
      "",
      "",
      d.categorie,
      d.montant.toFixed(2).replace(".", ","),
      "",
      "",
      "",
    ].join(";"));
  }

  const csv = "﻿" + rows.join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type":        "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="export-compta-${periode}.csv"`,
    },
  });
}
