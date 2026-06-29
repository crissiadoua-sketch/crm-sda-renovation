import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { decrypt } from "@/lib/session";
import { donneesComptables } from "@/lib/comptabilite-filtre";

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const annee = req.nextUrl.searchParams.get("annee") ?? undefined;
  const mois = req.nextUrl.searchParams.get("mois") ?? undefined;
  const { year, month, factures, depenses, bonsCommande, caHT, caTTC, totalDep, totalAchHT, margeBruteHT } =
    await donneesComptables(annee, mois);

  const periodeLabel = month ? `${String(month).padStart(2, "0")}/${year}` : String(year);

  const syntheseRows = [
    { Indicateur: "Période", Valeur: periodeLabel },
    { Indicateur: "CA HT facturé", Valeur: caHT },
    { Indicateur: "CA TTC facturé", Valeur: caTTC },
    { Indicateur: "Achats HT (bons de commande)", Valeur: totalAchHT },
    { Indicateur: "Charges / dépenses", Valeur: totalDep },
    { Indicateur: "Marge brute HT", Valeur: margeBruteHT },
  ];

  const ventesRows = factures.map((f) => ({
    Date: f.createdAt.toLocaleDateString("fr-FR"),
    Numéro: f.numero,
    Client: f.client.raisonSociale,
    Statut: f.statut,
    "HT (€)": f.totalHT,
    "TVA (€)": f.totalTVA,
    "TTC (€)": f.totalTTC,
  }));

  const achatsRows = depenses.map((d) => ({
    Date: d.date.toLocaleDateString("fr-FR"),
    Libellé: d.libelle,
    Catégorie: d.categorie,
    "Montant HT (€)": d.montant,
  }));

  const bonsCommandeRows = bonsCommande.map((b) => ({
    Date: b.createdAt.toLocaleDateString("fr-FR"),
    Numéro: b.numero,
    Fournisseur: b.fournisseur.nom,
    Statut: b.statut,
    "HT (€)": b.totalHT,
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(syntheseRows), "Synthèse");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ventesRows), "Journal des ventes");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(achatsRows), "Journal des achats");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(bonsCommandeRows), "Bons de commande");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const periodeFichier = month ? `${year}-${String(month).padStart(2, "0")}` : String(year);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="synthese-comptable-${periodeFichier}.xlsx"`,
    },
  });
}
