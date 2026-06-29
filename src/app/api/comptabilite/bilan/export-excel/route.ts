import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { decrypt } from "@/lib/session";
import { calculerBilan } from "@/lib/bilan-template";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const annee = parseInt(req.nextUrl.searchParams.get("annee") ?? String(new Date().getFullYear()), 10);
  const data = await calculerBilan(annee);

  const actifRows = [
    { Poste: "Capital souscrit non appelé", "Montant (€)": data.actif.capitalSouscritNonAppele },
    { Poste: "Immobilisations incorporelles (net)", "Montant (€)": data.actif.immobilise.incorporelles.net },
    { Poste: "Immobilisations corporelles (net)", "Montant (€)": data.actif.immobilise.corporelles.net },
    { Poste: "Immobilisations financières (net)", "Montant (€)": data.actif.immobilise.financieres.net },
    { Poste: "Total Actif immobilisé", "Montant (€)": data.actif.immobilise.total },
    ...data.actif.circulant.lignes.map((l) => ({ Poste: l.label, "Montant (€)": l.valeur })),
    { Poste: "Total Actif circulant", "Montant (€)": data.actif.circulant.total },
    { Poste: "TOTAL ACTIF", "Montant (€)": data.actif.totalActif },
  ];

  const passifRows = [
    ...data.passif.capitauxPropres.lignes.map((l) => ({ Poste: l.label, "Montant (€)": l.valeur })),
    { Poste: "Total Capitaux propres", "Montant (€)": data.passif.capitauxPropres.total },
    { Poste: "Provisions pour risques et charges", "Montant (€)": data.passif.provisionsRisquesCharges },
    ...data.passif.dettes.lignes.map((l) => ({ Poste: l.label, "Montant (€)": l.valeur })),
    { Poste: "Total Emprunts et dettes", "Montant (€)": data.passif.dettes.total },
    { Poste: "TOTAL PASSIF", "Montant (€)": data.passif.totalPassif },
  ];

  const cr = data.compteResultat;
  const resultatRows = [
    ...cr.produitsExploitation.lignes.map((l) => ({ Poste: l.label, "Montant (€)": l.valeur })),
    { Poste: "Total produits d'exploitation", "Montant (€)": cr.produitsExploitation.total },
    ...cr.chargesExploitation.lignes.map((l) => ({ Poste: l.label, "Montant (€)": l.valeur })),
    { Poste: "Total charges d'exploitation", "Montant (€)": cr.chargesExploitation.total },
    { Poste: "Résultat d'exploitation", "Montant (€)": cr.resultatExploitation },
    { Poste: "Produits financiers", "Montant (€)": cr.produitsFinanciers },
    { Poste: "Charges financières", "Montant (€)": cr.chargesFinancieres },
    { Poste: "Résultat financier", "Montant (€)": cr.resultatFinancier },
    { Poste: "Résultat courant avant impôts", "Montant (€)": cr.resultatCourantAvantImpots },
    { Poste: "Produits exceptionnels", "Montant (€)": cr.produitsExceptionnels },
    { Poste: "Charges exceptionnelles", "Montant (€)": cr.chargesExceptionnelles },
    { Poste: "Résultat exceptionnel", "Montant (€)": cr.resultatExceptionnel },
    { Poste: "Participation des salariés", "Montant (€)": cr.participationSalaries },
    { Poste: "Impôts sur les bénéfices", "Montant (€)": cr.impotsBenefices },
    { Poste: "RÉSULTAT DE L'EXERCICE", "Montant (€)": cr.resultatNet },
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
