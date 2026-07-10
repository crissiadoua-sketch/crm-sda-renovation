import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Fichier des Écritures Comptables — NF Z B2-049
// Format : TSV UTF-8, séparateur tabulation, sans BOM
// Colonnes : JournalCode|JournalLib|EcritureNum|EcritureDate|CompteNum|CompteLib|
//            CompAuxNum|CompAuxLib|PieceRef|PieceDate|EcritureLib|Debit|Credit|
//            EcritureLet|DateLet|ValidDate|Montantdevise|Idevise

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${j}`;
}

function fmtAmt(n: number): string {
  return Math.abs(n).toFixed(2).replace(".", ",");
}

function row(...cols: string[]): string {
  return cols.join("\t");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const annee = parseInt(searchParams.get("annee") ?? "") || new Date().getFullYear();

  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee, 11, 31, 23, 59, 59);

  const [factures, depenses, bonsCommande, bulletins] = await Promise.all([
    prisma.facture.findMany({
      where: { dateEmission: { gte: debut, lte: fin }, statut: { notIn: ["BROUILLON", "ANNULEE"] } },
      include: { client: { select: { nom: true, reference: true } } },
      orderBy: { dateEmission: "asc" },
    }),
    prisma.depense.findMany({
      where: { date: { gte: debut, lte: fin }, type: "REEL" },
      include: { fournisseur: { select: { nom: true, reference: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.bonCommande.findMany({
      where: { dateCreation: { gte: debut, lte: fin }, statut: { in: ["CONFIRME", "RECU_PARTIEL", "RECU"] } },
      include: { fournisseur: { select: { nom: true, reference: true } } },
      orderBy: { dateCreation: "asc" },
    }),
    prisma.bulletinDePaie.findMany({
      where: {
        periode: { startsWith: String(annee) },
        statut: { in: ["VALIDE", "PAYE"] },
      },
      include: { salarie: { select: { nom: true, prenom: true, matricule: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const lines: string[] = [];

  // En-tête
  lines.push(row(
    "JournalCode", "JournalLib", "EcritureNum", "EcritureDate",
    "CompteNum", "CompteLib", "CompAuxNum", "CompAuxLib",
    "PieceRef", "PieceDate", "EcritureLib",
    "Debit", "Credit", "EcritureLet", "DateLet", "ValidDate",
    "Montantdevise", "Idevise"
  ));

  // ── JOURNAL VENTES (VE) ──────────────────────────────────────────────
  factures.forEach((f, idx) => {
    const num = `VE${String(idx + 1).padStart(4, "0")}`;
    const date = fmtDate(new Date(f.dateEmission));
    const clientCode = f.client.reference ?? `C${f.clientId.slice(0, 6)}`;
    const clientLib = f.client.nom;

    // Débit : compte client 411
    lines.push(row(
      "VE", "Ventes", num, date,
      "411000", "Clients", clientCode, clientLib,
      f.numero, date, `Facture ${f.numero}`,
      fmtAmt(f.totalTTC), "0,00", "", "", date, "", ""
    ));
    // Crédit : compte produit 706 (travaux)
    lines.push(row(
      "VE", "Ventes", num, date,
      "706000", "Prestations de services", "", "",
      f.numero, date, `Facture ${f.numero}`,
      "0,00", fmtAmt(f.totalHT), "", "", date, "", ""
    ));
    // Crédit : TVA collectée 44571
    if (f.totalTVA > 0) {
      lines.push(row(
        "VE", "Ventes", num, date,
        "445710", "TVA collectée", "", "",
        f.numero, date, `TVA ${f.numero}`,
        "0,00", fmtAmt(f.totalTVA), "", "", date, "", ""
      ));
    }
  });

  // ── JOURNAL ACHATS (AC) ──────────────────────────────────────────────
  bonsCommande.forEach((bc, idx) => {
    const num = `AC${String(idx + 1).padStart(4, "0")}`;
    const date = fmtDate(new Date(bc.dateCreation));
    const fournCode = bc.fournisseur.reference ?? `F${bc.fournisseurId.slice(0, 6)}`;

    // Débit : compte achats matériaux 601
    lines.push(row(
      "AC", "Achats", num, date,
      "601000", "Achats matières et fournitures", "", "",
      bc.numero, date, `BC ${bc.numero}`,
      fmtAmt(bc.totalHT), "0,00", "", "", date, "", ""
    ));
    if (bc.totalTVA > 0) {
      lines.push(row(
        "AC", "Achats", num, date,
        "445660", "TVA déductible sur ABS", "", "",
        bc.numero, date, `TVA BC ${bc.numero}`,
        fmtAmt(bc.totalTVA), "0,00", "", "", date, "", ""
      ));
    }
    lines.push(row(
      "AC", "Achats", num, date,
      "401000", "Fournisseurs", fournCode, bc.fournisseur.nom,
      bc.numero, date, `BC ${bc.numero}`,
      "0,00", fmtAmt(bc.totalTTC), "", "", date, "", ""
    ));
  });

  // ── JOURNAL DÉPENSES (OD - Opérations Diverses) ──────────────────────
  depenses.forEach((d, idx) => {
    const num = `OD${String(idx + 1).padStart(4, "0")}`;
    const date = fmtDate(new Date(d.date));
    const fournLib = d.fournisseur?.nom ?? "Divers";
    const fournCode = d.fournisseur?.reference ?? "";

    lines.push(row(
      "OD", "Opérations diverses", num, date,
      "606000", "Achats non stockés", "", "",
      `DEP-${d.id.slice(0, 8)}`, date, d.libelle,
      fmtAmt(d.montant), "0,00", "", "", date, "", ""
    ));
    lines.push(row(
      "OD", "Opérations diverses", num, date,
      "401000", "Fournisseurs", fournCode, fournLib,
      `DEP-${d.id.slice(0, 8)}`, date, d.libelle,
      "0,00", fmtAmt(d.montant), "", "", date, "", ""
    ));
  });

  // ── JOURNAL SALAIRES (SA) ────────────────────────────────────────────
  bulletins.forEach((b, idx) => {
    const num = `SA${String(idx + 1).padStart(4, "0")}`;
    const date = fmtDate(b.createdAt);
    const salarieLib = `${b.salarie.prenom} ${b.salarie.nom}`;
    const salarieCode = b.salarie.matricule ?? `S${b.salarieId.slice(0, 6)}`;
    const chargesTotal = b.totalBrut + b.cotisationsPatronales;

    lines.push(row(
      "SA", "Salaires", num, date,
      "641000", "Rémunérations du personnel", salarieCode, salarieLib,
      `BP-${b.id.slice(0, 8)}`, date, `Salaire ${b.periode}`,
      fmtAmt(b.totalBrut), "0,00", "", "", date, "", ""
    ));
    lines.push(row(
      "SA", "Salaires", num, date,
      "645000", "Charges sociales patronales", "", "",
      `BP-${b.id.slice(0, 8)}`, date, `Charges ${b.periode}`,
      fmtAmt(b.cotisationsPatronales), "0,00", "", "", date, "", ""
    ));
    lines.push(row(
      "SA", "Salaires", num, date,
      "421000", "Personnel — rémunérations dues", salarieCode, salarieLib,
      `BP-${b.id.slice(0, 8)}`, date, `Net à payer ${b.periode}`,
      "0,00", fmtAmt(b.netAPayer), "", "", date, "", ""
    ));
    lines.push(row(
      "SA", "Salaires", num, date,
      "431000", "Sécurité sociale et organismes", "", "",
      `BP-${b.id.slice(0, 8)}`, date, `Cotisations ${b.periode}`,
      "0,00", fmtAmt(chargesTotal - b.netAPayer), "", "", date, "", ""
    ));
  });

  const content = lines.join("\r\n");
  const filename = `FEC_${annee}_SDA_Renovation.txt`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
