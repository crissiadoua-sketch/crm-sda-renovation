import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { decrypt } from "@/lib/session";
import { calculerBilan } from "@/lib/bilan-template";
import { BILAN_CODES } from "@/lib/plan-comptable";

type Row = { Poste: string; "Code PCG": string; "Montant (€)": number };

function row(label: string, valeur: number, code?: string): Row {
  return { Poste: label, "Code PCG": code ?? "", "Montant (€)": valeur };
}

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const annee = parseInt(req.nextUrl.searchParams.get("annee") ?? String(new Date().getFullYear()), 10);
  const data = await calculerBilan(annee);

  const actifRows: Row[] = [
    row("Capital souscrit non appelé", data.actif.capitalSouscritNonAppele, BILAN_CODES["capitalSouscritNonAppele"]),
    row("Immobilisations incorporelles (net)", data.actif.immobilise.incorporelles.net, "20x − 280x"),
    row("Immobilisations corporelles (net)", data.actif.immobilise.corporelles.net, "21x − 281x"),
    row("Immobilisations financières (net)", data.actif.immobilise.financieres.net, "26x, 27x − 296x, 297x"),
    row("Total Actif immobilisé", data.actif.immobilise.total),
    ...data.actif.circulant.lignes.map((l) => row(l.label, l.valeur, BILAN_CODES[l.key])),
    row("Total Actif circulant", data.actif.circulant.total),
    row("TOTAL ACTIF", data.actif.totalActif),
  ];

  const passifRows: Row[] = [
    ...data.passif.capitauxPropres.lignes.map((l) => row(l.label, l.valeur, BILAN_CODES[l.key])),
    row("Total Capitaux propres", data.passif.capitauxPropres.total),
    row("Provisions pour risques et charges", data.passif.provisionsRisquesCharges, "15x"),
    ...data.passif.dettes.lignes.map((l) => row(l.label, l.valeur, BILAN_CODES[l.key])),
    row("Total Emprunts et dettes", data.passif.dettes.total),
    row("TOTAL PASSIF", data.passif.totalPassif),
  ];

  const cr = data.compteResultat;
  const resultatRows: Row[] = [
    ...cr.produitsExploitation.lignes.map((l) => row(l.label, l.valeur, BILAN_CODES[l.key])),
    row("Total produits d'exploitation", cr.produitsExploitation.total),
    ...cr.chargesExploitation.lignes.map((l) => row(l.label, l.valeur, BILAN_CODES[l.key])),
    row("Total charges d'exploitation", cr.chargesExploitation.total),
    row("Résultat d'exploitation", cr.resultatExploitation),
    row("Produits financiers", cr.produitsFinanciers, "76x"),
    row("Charges financières", cr.chargesFinancieres, "66x"),
    row("Résultat financier", cr.resultatFinancier),
    row("Résultat courant avant impôts", cr.resultatCourantAvantImpots),
    row("Produits exceptionnels", cr.produitsExceptionnels, "77x"),
    row("Charges exceptionnelles", cr.chargesExceptionnelles, "67x"),
    row("Résultat exceptionnel", cr.resultatExceptionnel),
    row("Participation des salariés", cr.participationSalaries, "691"),
    row("Impôts sur les bénéfices", cr.impotsBenefices, "695"),
    row("RÉSULTAT DE L'EXERCICE", cr.resultatNet),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(actifRows), "Actif");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(passifRows), "Passif");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(resultatRows), "Compte de résultat");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="bilan-${annee}.xlsx"`,
    },
  });
}
