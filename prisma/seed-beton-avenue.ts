import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function nextFouRef() {
  const existing = await prisma.fournisseur.findMany({ select: { reference: true } });
  let max = 0;
  for (const { reference } of existing) {
    const m = reference?.match(/^FOU-(\d+)$/);
    if (m) { const n = parseInt(m[1], 10); if (n > max) max = n; }
  }
  return `FOU-${String(max + 1).padStart(4, "0")}`;
}

async function nextStockRef(corpsEtat: string, categorie: string) {
  const prefix = `${corpsEtat}-${categorie.slice(0, 3).toUpperCase()}-`;
  const existing = await prisma.articleStock.findMany({
    where: { reference: { startsWith: prefix } },
    select: { reference: true },
  });
  let max = 0;
  for (const { reference } of existing) {
    const n = parseInt(reference.slice(prefix.length), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function nextBcRef() {
  const annee = new Date().getFullYear();
  const prefix = `BC-${annee}-`;
  const existing = await prisma.bonCommande.findMany({
    where: { numero: { startsWith: prefix } },
    select: { numero: true },
  });
  let max = 0;
  for (const { numero } of existing) {
    const n = parseInt(numero.slice(prefix.length), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

async function main() {
  // ── 1. Fournisseur BETON AVENUE ──────────────────────────────────────────
  let fou = await prisma.fournisseur.findFirst({
    where: { nom: { contains: "BETON AVENUE", mode: "insensitive" } },
  });
  if (!fou) {
    const ref = await nextFouRef();
    fou = await prisma.fournisseur.create({
      data: {
        reference: ref,
        nom: "BETON AVENUE",
        corpsMetier: "DAL",
        siret: "83417427800020",
        adresse: "701 Rue Marie Thérèse Chalon",
        codePostal: "84200",
        ville: "CARPENTRAS",
        telephone: "06.78.42.72.83",
        email: "contact@betonavenue.fr",
        notes: "SASU M.E.V DISTRIBUTION BETON AVENUE — APE 4673A — TVA FR58834174278 — www.betonavenue.fr — Consommables dallage/maçonnerie",
      },
    });
    console.log(`✅ Fournisseur créé : ${ref} — BETON AVENUE (Carpentras)`);
  } else {
    console.log(`ℹ️  Fournisseur existant : ${fou.reference} — ${fou.nom}`);
  }

  // ── 2. Articles stock ────────────────────────────────────────────────────
  const articles = [
    {
      designation: "Film polyéthylène 150 microns 3m — rouleau 200m²",
      refFournisseur: "AR00374",
      corpsEtat: "DAL",
      categorie: "CONSOMMABLE",
      unite: "rouleau",
      conditionnement: "Rouleau 200m²",
      prixUnitaireHT: 62.50,
      gammeOffre: "ECO",
      notes: "Pare-vapeur sous dalle béton — BETON AVENUE",
    },
    {
      designation: "Bande périphérique 100×5mm 50m — lot 12 rouleaux",
      refFournisseur: "CS0010",
      corpsEtat: "DAL",
      categorie: "CONSOMMABLE",
      unite: "lot",
      conditionnement: "Lot 12 rouleaux × 50m",
      prixUnitaireHT: 69.89,
      gammeOffre: "ECO",
      notes: "Isolation périphérique dalle béton — BETON AVENUE",
    },
  ];

  const stockIds: string[] = [];
  for (const a of articles) {
    const exist = await prisma.articleStock.findFirst({
      where: { refFournisseur: a.refFournisseur, fournisseurId: fou.id },
    });
    if (exist) {
      console.log(`ℹ️  Article existant : ${exist.reference} — ${exist.designation}`);
      stockIds.push(exist.id);
      continue;
    }
    const ref = await nextStockRef(a.corpsEtat, a.categorie);
    const art = await prisma.articleStock.create({
      data: {
        reference: ref,
        designation: a.designation,
        corpsEtat: a.corpsEtat,
        categorie: a.categorie,
        emplacement: "DEPOT",
        unite: a.unite,
        conditionnement: a.conditionnement,
        prixUnitaireHT: a.prixUnitaireHT,
        refFournisseur: a.refFournisseur,
        fournisseurId: fou.id,
        gammeOffre: a.gammeOffre,
        notes: a.notes,
        stockActuel: 0,
        stockMinimum: 0,
      },
    });
    stockIds.push(art.id);
    console.log(`✅ Article créé : ${ref} — ${a.designation} @ ${a.prixUnitaireHT} €/u`);
  }

  // ── 3. BC lié au chantier Benzerouda ────────────────────────────────────
  const chantier = await prisma.chantier.findFirst({
    where: { reference: "AFF-2026-20262026020" },
  });
  if (!chantier) { console.error("Chantier Benzerouda introuvable"); return; }

  const bcExist = await prisma.bonCommande.findFirst({
    where: { numero: { contains: "DE00001294" } },
  });
  if (bcExist) { console.log(`ℹ️  BC déjà créé : ${bcExist.numero}`); return; }

  const bcNum = await nextBcRef();

  // Lignes : produits HT + port séparé
  const lignesProduits = [
    { ordre: 1, designation: "Film polyéthylène 150 microns 3m — rouleau 200m²", refFournisseur: "AR00374", unite: "rouleau", quantite: 1, prixUnitaireHT: 62.50, totalHT: 62.50 },
    { ordre: 2, designation: "Bande périphérique 100×5mm 50m — lot 12 rouleaux", refFournisseur: "CS0010", unite: "lot", quantite: 1, prixUnitaireHT: 69.89, totalHT: 69.89 },
    { ordre: 3, designation: "Port / frais de livraison", refFournisseur: null, unite: "forfait", quantite: 1, prixUnitaireHT: 25.61, totalHT: 25.61 },
  ];
  const totalHT = lignesProduits.reduce((s, l) => s + l.totalHT, 0); // 158.00
  const totalTVA = Math.round(totalHT * 0.2 * 100) / 100; // 31.60

  const bc = await prisma.bonCommande.create({
    data: {
      numero: bcNum,
      fournisseurId: fou.id,
      chantierId: chantier.id,
      statut: "CONFIRME",
      totalHT,
      totalTVA,
      totalTTC: totalHT + totalTVA,
      notes: "Consommables dallage — devis BETON AVENUE DE00001294 du 30/06/2026. Livraison souhaitée 07/07/2026.",
      lignes: {
        create: lignesProduits.map((l) => ({
          ordre: l.ordre,
          designation: l.designation,
          unite: l.unite,
          quantite: l.quantite,
          prixUnitaireHT: l.prixUnitaireHT,
          totalHT: l.totalHT,
        })),
      },
    },
  });

  console.log(`\n✅ ${bc.numero} créé — BETON AVENUE × chantier ${chantier.nom}`);
  console.log(`   158,00 € HT — 189,60 € TTC  (port inclus)`);
  console.log(`   Livraison prévue : 07/07/2026`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
