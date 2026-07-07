import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // ── 1. BC-2026-0003 BETON AVENUE → dépense directe (achat comptant) ─────
  const bc3 = await prisma.bonCommande.findFirst({
    where: { numero: "BC-2026-0003" },
    include: { fournisseur: true, chantier: true },
  });
  if (!bc3) { console.error("BC-2026-0003 introuvable"); return; }

  // Passer en RECU (payé, livré)
  await prisma.bonCommande.update({
    where: { id: bc3.id },
    data: {
      statut: "RECU",
      notes: (bc3.notes ?? "") + "\nAchat direct — payé comptant le 30/06/2026. Facture à recevoir.",
    },
  });

  // Créer la dépense liée au chantier (montant HT 158 € — TVA récupérable sur facture)
  const depExist = await prisma.depense.findFirst({
    where: { libelle: { contains: "BETON AVENUE" }, chantierId: bc3.chantierId },
  });
  if (!depExist) {
    await prisma.depense.create({
      data: {
        libelle: "BETON AVENUE — Film PE 150µ + Bande périphérique (BC-2026-0003)",
        montant: bc3.totalHT, // 158 € HT (TVA 31,60 € à récupérer sur facture)
        date: new Date("2026-06-30"),
        categorie: "MATERIAUX",
        chantierId: bc3.chantierId ?? undefined,
        fournisseurId: bc3.fournisseurId,
        notes: "Achat direct comptant — 189,60 € TTC payés — Facture à recevoir (DE00001294 du 30/06/2026). Pas encore en compte chez ce fournisseur.",
      },
    });
    console.log("✅ Dépense créée : 158,00 € HT — BETON AVENUE (BC-2026-0003)");
  } else {
    console.log("ℹ️  Dépense BETON AVENUE déjà existante");
  }

  // ── 2. Autres BCs : noter mode "en compte" fournisseur ──────────────────
  const autreBCs = [
    { numero: "BC-2026-0001", note: "Fournisseur GRANULATS VICAT — règlement en compte (échéance à définir)." },
    { numero: "BC-2026-0002", note: "Fournisseur CCL — règlement en compte (échéance à définir)." },
  ];

  for (const { numero, note } of autreBCs) {
    const bc = await prisma.bonCommande.findFirst({ where: { numero } });
    if (!bc) { console.log(`⚠️  ${numero} introuvable`); continue; }
    await prisma.bonCommande.update({
      where: { id: bc.id },
      data: { notes: ((bc.notes ?? "") + "\n" + note).trim() },
    });
    console.log(`✅ ${numero} — mode règlement ajouté : en compte fournisseur`);
  }

  // BCB-2026-0001 BETON VICAT
  const bcb = await prisma.bonCommandeBeton.findFirst({ where: { numero: "BCB-2026-0001" } });
  if (bcb) {
    await prisma.bonCommandeBeton.update({
      where: { id: bcb.id },
      data: {
        modeReglement: "VIREMENT",
        observations: ((bcb.observations ?? "") + "\nFournisseur BETON VICAT — règlement en compte. Conditions d'encours à définir avant livraison.").trim(),
      },
    });
    console.log("✅ BCB-2026-0001 — mode règlement : en compte BETON VICAT");
  }

  console.log("\n📊 Récap affaire Benzerouda — Castelginest");
  console.log("   BC-2026-0003 BETON AVENUE  → DÉPENSE DIRECTE 158,00 € HT (payé comptant)");
  console.log("   BC-2026-0001 VICAT Granulats → en compte fournisseur");
  console.log("   BC-2026-0002 CCL             → en compte fournisseur");
  console.log("   BCB-2026-0001 BETON VICAT    → en compte fournisseur (625,21 € HT)");
}

main().catch(console.error).finally(() => prisma.$disconnect());
