import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

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

async function main() {
  // ── 1. Fournisseur CCL — coordonnées réelles ─────────────────────────────
  const fou = await prisma.fournisseur.findFirst({
    where: { nom: { contains: "CCL", mode: "insensitive" } },
  });
  if (!fou) { console.error("Fournisseur CCL introuvable"); return; }

  await prisma.fournisseur.update({
    where: { id: fou.id },
    data: {
      nom: "CCL",
      siret: "71632061900019",
      adresse: "Chemin de Montréveil — CS40224",
      codePostal: "81104",
      ville: "CASTRES CEDEX",
      telephone: "0561168300",
      email: "lea-roudil@ccl.fr",
      contact: "ROUDIL LEA (0561168614)",
      notes:
        "COMPTOIR COMMERCIAL DU LANGUEDOC\n" +
        "SAS au capital de 2 873 010 € — SIRET 716320619 00019 — RCS CASTRES — APE 4672Z\n" +
        "TVA FR07716320619 — IBAN FR48 2004 1010 1602 2874 9G03 769 / BIC PSSTFRPPTOU\n" +
        "Magasin Colomiers : 0561168300 — Site : www.CCL.fr\n" +
        "Contact devis : Lea ROUDIL — lea-roudil@ccl.fr — 0561168614",
    },
  });
  console.log(`✅ Fournisseur ${fou.reference} CCL mis à jour`);

  // ── 2. Article stock : Treillis PNX ST15C — mise à jour prix réel ─────────
  const treillis = await prisma.articleStock.findFirst({
    where: { refFournisseur: "691171" },
  });
  if (treillis) {
    await prisma.articleStock.update({
      where: { id: treillis.id },
      data: {
        designation: "Treillis soudé PNX ST15C B500B 4,00m — panneau",
        unite: "PI",
        prixUnitaireHT: 21.253,
        refFournisseur: "691171",
        fournisseurId: fou.id,
        notes: "21,31 kg/panneau — B500B — CCL Colomiers",
      },
    });
    console.log(`✅ Article ${treillis.reference} treillis ST15C mis à jour : 21,253 €/PI`);
  }

  // ── 3. Article stock : Sangle treillis soudés (nouveau) ──────────────────
  let sangle = await prisma.articleStock.findFirst({
    where: { refFournisseur: "478998" },
  });
  if (!sangle) {
    const ref = await nextStockRef("DAL", "CONSOMMABLE");
    sangle = await prisma.articleStock.create({
      data: {
        reference: ref,
        designation: "Sangle treillis soudés 1T 1,50ml",
        corpsEtat: "DAL",
        categorie: "CONSOMMABLE",
        emplacement: "DEPOT",
        unite: "PI",
        prixUnitaireHT: 2.80,
        refFournisseur: "478998",
        fournisseurId: fou.id,
        gammeOffre: "ECO",
        notes: "Attache/lien pour treillis soudés — CCL Colomiers",
        stockActuel: 0,
        stockMinimum: 0,
      },
    });
    console.log(`✅ Article créé : ${ref} — Sangle treillis soudés @ 2,80 €/PI`);
  }

  // ── 4. BC-2026-0002 : données réelles devis CCL N°885725 ─────────────────
  const bc = await prisma.bonCommande.findFirst({
    where: { numero: "BC-2026-0002" },
    include: { lignes: true },
  });
  if (!bc) { console.error("BC-2026-0002 introuvable"); return; }

  await prisma.bonCommandeLigne.deleteMany({ where: { bonCommandeId: bc.id } });

  const lignes = [
    { ordre: 1, designation: "TREILLIS PNX ST15C B500B 4,00M (réf. 691171 — 21,31 kg/PN)", unite: "PI", quantite: 3, prixUnitaireHT: 21.253, totalHT: 63.76 },
    { ordre: 2, designation: "SANGLE TREILLIS SOUDÉS 1T 1,50ML (réf. 478998)",              unite: "PI", quantite: 4, prixUnitaireHT: 2.80,   totalHT: 11.20 },
    { ordre: 3, designation: "PARTICIPATION AUX TRANSPORTS (réf. 1044965)",                 unite: "PI", quantite: 1, prixUnitaireHT: 85.00,  totalHT: 85.00 },
  ];

  await prisma.bonCommandeLigne.createMany({
    data: lignes.map((l) => ({ ...l, bonCommandeId: bc.id })),
  });

  await prisma.bonCommande.update({
    where: { id: bc.id },
    data: {
      fournisseurId: fou.id,
      statut: "CONFIRME",
      totalHT:  159.96,
      totalTVA:  31.99,
      totalTTC: 191.95,
      notes:
        "Devis CCL N°885725 du 24/06/2026 — valable 24/07/2026\n" +
        "Magasin Colomiers — Mode : ENLÈVEMENT — Réf. client CCL : 00000020\n" +
        "Devis suivi par Lea ROUDIL (lea-roudil@ccl.fr — 0561168614)\n" +
        "Règlement en compte fournisseur.",
    },
  });

  console.log("✅ BC-2026-0002 CCL corrigé avec données réelles :");
  console.log("   Treillis PNX ST15C 3 PI × 21,25 € = 63,76 €");
  console.log("   Sangle treillis 4 PI × 2,80 € = 11,20 €");
  console.log("   Participation transports : 85,00 €");
  console.log("   Total : 159,96 € HT — 191,95 € TTC");
}

main().catch(console.error).finally(() => prisma.$disconnect());
