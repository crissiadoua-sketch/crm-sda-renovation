import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { decrypt } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const CAT_LABELS: Record<string, string> = {
  MATERIAUX: "Matériaux", MAIN_OEUVRE: "Main d'œuvre",
  SOUS_TRAITANCE: "Sous-traitance", TRANSPORT: "Transport",
  ADMINISTRATIF: "Administratif", AUTRE: "Autre",
};

const STATUT_LABELS: Record<string, string> = {
  facture: "Facture client", bc: "BC Matériaux",
  bcb: "BC Béton", bcf: "BC Fournitures", depense_prev: "Dépense prévisionnelle",
  devis_accepte: "CA à facturer", cst: "Sous-traitance", ndf: "Note de frais",
};

export async function GET(req: NextRequest) {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);
  if (!session?.userId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const chantierId = req.nextUrl.searchParams.get("chantierId") ?? undefined;

  const [factures, bcs, bcbs, bcfs, depensesPrev, devisAcceptes, csts, notesFrais, chantiersMarges] = await Promise.all([
    prisma.facture.findMany({
      where: { statut: { in: ["ENVOYEE", "PAYEE_PARTIELLE", "EN_RETARD"] }, ...(chantierId ? { chantierId } : {}) },
      include: { chantier: { select: { nom: true } }, client: { select: { nom: true, prenom: true, raisonSociale: true } } },
    }),
    prisma.bonCommande.findMany({
      where: { statut: { in: ["BROUILLON", "ENVOYE", "CONFIRME", "RECU_PARTIEL"] }, ...(chantierId ? { chantierId } : {}) },
      include: { fournisseur: { select: { nom: true } }, chantier: { select: { nom: true } } },
    }),
    prisma.bonCommandeBeton.findMany({
      where: { statut: { in: ["BROUILLON", "ENVOYE", "CONFIRME"] }, ...(chantierId ? { chantierId } : {}) },
      include: { fournisseur: { select: { nom: true } }, chantier: { select: { nom: true } } },
    }),
    prisma.bonCommandeFournitures.findMany({
      where: { statut: { in: ["BROUILLON", "EN_ATTENTE", "VALIDE", "ENVOYE", "RECU_PARTIEL"] }, ...(chantierId ? { chantierId } : {}) },
      include: { fournisseur: { select: { nom: true } }, chantier: { select: { nom: true } } },
    }),
    prisma.depense.findMany({
      where: { type: "PREVISIONNEL", ...(chantierId ? { chantierId } : {}) },
      include: { chantier: { select: { nom: true } }, fournisseur: { select: { nom: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.devis.findMany({
      where: { statut: "ACCEPTE", ...(chantierId ? { chantierId } : {}) },
      include: {
        chantier: { select: { nom: true } },
        client: { select: { nom: true, prenom: true, raisonSociale: true } },
        factures: { where: { statut: { not: "ANNULEE" } }, select: { totalTTC: true } },
      },
    }),
    prisma.contratSousTraitance.findMany({
      where: { statut: "SIGNE", montantHT: { gt: 0 }, ...(chantierId ? { chantierId } : {}) },
      include: { sousTraitant: { select: { nom: true } }, chantier: { select: { nom: true } } },
    }),
    prisma.noteDeFrais.findMany({
      where: { statut: { in: ["EN_ATTENTE", "VALIDEE"] }, ...(chantierId ? { chantierId } : {}) },
      include: { chantier: { select: { nom: true } } },
      orderBy: { date: "asc" },
    }),
    prisma.chantier.findMany({
      where: {
        statut: { not: "ANNULE" },
        ...(chantierId ? { id: chantierId } : {}),
        OR: [
          { factures: { some: {} } },
          { bonsCommande: { some: {} } },
          { bonsCommandeBeton: { some: {} } },
          { depenses: { some: {} } },
        ],
      },
      select: {
        id: true, nom: true, reference: true, budgetEstime: true,
        factures: { where: { statut: { not: "ANNULEE" } }, select: { totalHT: true, statut: true } },
        bonsCommande: { where: { statut: { not: "ANNULE" } }, select: { totalHT: true, statut: true } },
        bonsCommandeBeton: { where: { statut: { not: "ANNULE" } }, select: { totalHT: true, statut: true } },
        bonsCommandeFournitures: { where: { statut: { not: "ANNULE" } }, select: { totalHT: true, statut: true } },
        depenses: { select: { montant: true, type: true } },
      },
    }),
  ]);

  // ── Feuille 1 : Flux prévisionnels ─────────────────────────────────────────

  const fluxRows: object[] = [];

  for (const f of factures) {
    const reste = f.totalTTC - f.montantPaye;
    if (reste <= 0) continue;
    const client = f.client.raisonSociale ?? `${f.client.prenom ?? ""} ${f.client.nom}`.trim();
    fluxRows.push({
      Type: STATUT_LABELS["facture"],
      Sens: "Encaissement",
      Référence: f.numero,
      Libellé: client,
      Chantier: f.chantier?.nom ?? "",
      "Date échéance": f.dateEcheance ? new Date(f.dateEcheance).toLocaleDateString("fr-FR") : "",
      Statut: f.statut,
      "Montant (€)": Number(reste.toFixed(2)),
    });
  }
  for (const bc of bcs) {
    fluxRows.push({
      Type: STATUT_LABELS["bc"],
      Sens: "Décaissement",
      Référence: bc.numero,
      Libellé: bc.fournisseur.nom,
      Chantier: bc.chantier?.nom ?? "",
      "Date échéance": bc.dateCreation ? new Date(bc.dateCreation).toLocaleDateString("fr-FR") : "",
      Statut: bc.statut,
      "Montant (€)": bc.totalHT,
    });
  }
  for (const bcb of bcbs) {
    fluxRows.push({
      Type: STATUT_LABELS["bcb"],
      Sens: "Décaissement",
      Référence: bcb.numero,
      Libellé: bcb.fournisseur.nom,
      Chantier: bcb.chantier?.nom ?? "",
      "Date échéance": bcb.dateLivraison ? new Date(bcb.dateLivraison).toLocaleDateString("fr-FR") : "",
      Statut: bcb.statut,
      "Montant (€)": bcb.totalHT,
    });
  }
  for (const bcf of bcfs) {
    fluxRows.push({
      Type: STATUT_LABELS["bcf"],
      Sens: "Décaissement",
      Référence: bcf.numero,
      Libellé: bcf.fournisseur.nom,
      Chantier: bcf.chantier?.nom ?? "",
      "Date échéance": bcf.dateSouhaitee ? new Date(bcf.dateSouhaitee).toLocaleDateString("fr-FR") : "",
      Statut: bcf.statut,
      "Montant (€)": bcf.totalHT,
    });
  }
  for (const dep of depensesPrev) {
    fluxRows.push({
      Type: STATUT_LABELS["depense_prev"],
      Sens: "Décaissement",
      Référence: "",
      Libellé: dep.libelle,
      Chantier: dep.chantier?.nom ?? "",
      "Date échéance": new Date(dep.date).toLocaleDateString("fr-FR"),
      Statut: CAT_LABELS[dep.categorie] ?? dep.categorie,
      "Montant (€)": dep.montant,
    });
  }
  for (const dv of devisAcceptes) {
    const dejaFactureTTC = dv.factures.reduce((s: number, f: { totalTTC: number }) => s + f.totalTTC, 0);
    const resteAFacturer = dv.totalTTC - dejaFactureTTC;
    if (resteAFacturer <= 0) continue;
    const client = dv.client.raisonSociale ?? `${dv.client.prenom ?? ""} ${dv.client.nom}`.trim();
    fluxRows.push({
      Type: STATUT_LABELS["devis_accepte"],
      Sens: "Encaissement",
      Référence: dv.numero,
      Libellé: client,
      Chantier: dv.chantier?.nom ?? "",
      "Date échéance": "",
      Statut: "ACCEPTE",
      "Montant (€)": Number(resteAFacturer.toFixed(2)),
    });
  }
  for (const cst of csts) {
    fluxRows.push({
      Type: STATUT_LABELS["cst"],
      Sens: "Décaissement",
      Référence: cst.numero,
      Libellé: cst.sousTraitant.nom,
      Chantier: cst.chantier?.nom ?? "",
      "Date échéance": cst.dateFin ? new Date(cst.dateFin).toLocaleDateString("fr-FR") : "",
      Statut: cst.statut,
      "Montant (€)": cst.montantHT ?? 0,
    });
  }
  for (const ndf of notesFrais) {
    fluxRows.push({
      Type: STATUT_LABELS["ndf"],
      Sens: "Décaissement",
      Référence: "",
      Libellé: ndf.description || ndf.fournisseur || "Note de frais",
      Chantier: ndf.chantier?.nom ?? "",
      "Date échéance": new Date(ndf.date).toLocaleDateString("fr-FR"),
      Statut: ndf.statut,
      "Montant (€)": ndf.montant,
    });
  }

  const totalEnc = fluxRows.filter((r: any) => r["Sens"] === "Encaissement").reduce((s: number, r: any) => s + r["Montant (€)"], 0);
  const totalDec = fluxRows.filter((r: any) => r["Sens"] === "Décaissement").reduce((s: number, r: any) => s + r["Montant (€)"], 0);
  fluxRows.push({ Type: "", Sens: "Encaissements", Référence: "", Libellé: "", Chantier: "", "Date échéance": "", Statut: "TOTAL", "Montant (€)": totalEnc });
  fluxRows.push({ Type: "", Sens: "Décaissements", Référence: "", Libellé: "", Chantier: "", "Date échéance": "", Statut: "TOTAL", "Montant (€)": totalDec });
  fluxRows.push({ Type: "", Sens: "Solde net", Référence: "", Libellé: "", Chantier: "", "Date échéance": "", Statut: "TOTAL", "Montant (€)": Number((totalEnc - totalDec).toFixed(2)) });

  const ws1 = XLSX.utils.json_to_sheet(fluxRows);
  ws1["!cols"] = [{ wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 25 }, { wch: 14 }, { wch: 18 }, { wch: 14 }];

  // ── Feuille 2 : Marge par chantier ─────────────────────────────────────────

  const margeRows = chantiersMarges.map((c) => {
    const budget = c.budgetEstime ?? 0;
    const caFact = c.factures.reduce((s, f) => s + f.totalHT, 0);
    const bcRecu   = c.bonsCommande.filter(b => ["RECU", "RECU_PARTIEL"].includes(b.statut)).reduce((s, b) => s + b.totalHT, 0);
    const bcbLivre = c.bonsCommandeBeton.filter(b => b.statut === "LIVRE").reduce((s, b) => s + b.totalHT, 0);
    const bcfRecu  = c.bonsCommandeFournitures.filter(b => b.statut === "RECU").reduce((s, b) => s + b.totalHT, 0);
    const depReel  = c.depenses.filter(d => d.type === "REEL").reduce((s, d) => s + d.montant, 0);
    const coutReels = bcRecu + bcbLivre + bcfRecu + depReel;
    const coutEngages = c.bonsCommande.reduce((s, b) => s + b.totalHT, 0)
      + c.bonsCommandeBeton.reduce((s, b) => s + b.totalHT, 0)
      + c.bonsCommandeFournitures.reduce((s, b) => s + b.totalHT, 0)
      + depReel
      + c.depenses.filter(d => d.type === "PREVISIONNEL").reduce((s, d) => s + d.montant, 0);
    const base = budget > 0 ? budget : caFact;
    const margeEngagee = base - coutEngages;
    const rentabilite = base > 0 ? Number(((margeEngagee / base) * 100).toFixed(1)) : null;
    return {
      Référence: c.reference,
      Chantier: c.nom,
      "Budget (€)": budget > 0 ? budget : "",
      "CA Facturé (€)": caFact,
      "Coûts réels (€)": coutReels,
      "Coûts engagés (€)": coutEngages,
      "Marge engagée (€)": margeEngagee,
      "Rentabilité (%)": rentabilite ?? "",
    };
  });

  const ws2 = XLSX.utils.json_to_sheet(margeRows);
  ws2["!cols"] = [{ wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];

  // ── Construction workbook ──────────────────────────────────────────────────

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws1, "Flux prévisionnels");
  XLSX.utils.book_append_sheet(workbook, ws2, "Marge chantiers");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="previsionnel-${date}.xlsx"`,
    },
  });
}
