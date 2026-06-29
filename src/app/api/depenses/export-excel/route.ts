import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { decrypt } from "@/lib/session";
import { depensesFiltrees } from "@/lib/depenses-filtre";

const CAT_LABELS: Record<string, string> = {
  MATERIAUX: "Matériaux & fournitures",
  MAIN_OEUVRE: "Main-d'œuvre externe",
  SOUS_TRAITANCE: "Sous-traitance",
  TRANSPORT: "Transport / carburant",
  ADMINISTRATIF: "Administratif",
  LOYER: "Loyer & charges locatives",
  ASSURANCE: "Assurances",
  AMORTISSEMENT: "Amortissements",
  INVESTISSEMENT: "Investissements",
  IMPOT_TAXE: "Impôts & taxes",
  AUTRE: "Autre / Divers",
};

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const mois = req.nextUrl.searchParams.get("mois") ?? undefined;
  const categorie = req.nextUrl.searchParams.get("categorie") ?? undefined;
  const depenses = await depensesFiltrees(mois, categorie);

  const rows = depenses.map((d) => ({
    Date: new Date(d.date).toLocaleDateString("fr-FR"),
    Libellé: d.libelle,
    Catégorie: CAT_LABELS[d.categorie] ?? d.categorie,
    Chantier: d.chantier ? `${d.chantier.reference} — ${d.chantier.nom}` : "",
    Fournisseur: d.fournisseur?.nom ?? "",
    "Montant (€)": d.montant,
    Notes: d.notes ?? "",
  }));

  const total = depenses.reduce((s, d) => s + d.montant, 0);
  rows.push({ Date: "", Libellé: "", Catégorie: "", Chantier: "", Fournisseur: "Total", "Montant (€)": total, Notes: "" });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 12 }, { wch: 35 }, { wch: 22 }, { wch: 28 }, { wch: 20 }, { wch: 12 }, { wch: 30 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dépenses");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const periode = mois ?? "mois-courant";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="depenses-${periode}.xlsx"`,
    },
  });
}
