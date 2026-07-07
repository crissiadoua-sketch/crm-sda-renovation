import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // ── 1. BCB-2026-0001 : données réelles du devis VICAT 00730064 ───────────
  const bcb = await prisma.bonCommandeBeton.findFirst({ where: { numero: "BCB-2026-0001" } });
  if (!bcb) { console.error("BCB-2026-0001 introuvable"); return; }

  await prisma.bonCommandeBeton.update({
    where: { id: bcb.id },
    data: {
      statut: "CONFIRME",
      qteTotale: 3.5,
      prixM3: 112.00,
      classeResistance: "C25/30",
      classeExposition: "XF1",
      consistance: "S3",
      dmax: 20,
      betonPompe: false,
      modeMiseEnOeuvre: "DIRECTE",         // livraison par tour 8×4 + 3 goulottes
      dateLivraison: new Date("2026-07-09T07:30:00"),
      heureDebut: "07:30",
      heureFin: "11:30",
      nomChantier: "54 BIS CHEMIN DES COTEAUX — CASTELGINEST",
      adresseChantier: "54 Bis Chemin des Coteaux, 31780 Castelginest",
      observations:
        "Devis VICAT réf. 00730064 — signé 25/06/2026 — Melanie RAUZI\n" +
        "Produit : BV.COURANT DECA4 C25 XF1 D2 S3 — 3,5 m³ × 112,00 €/m³ = 392,00 €\n" +
        "Transport tour 8×4 + 3 goulottes : 172,50 €\n" +
        "Contribution environnementale (3,5 × 3,00 €) : 10,50 €\n" +
        "Contribution transition carbone (3,5 × 4,60 €) : 16,10 €\n" +
        "Contribution énergétique (3,5 × 6,35 €) : 22,23 €\n" +
        "Frais facturation : 6,00 €\n" +
        "REP Eco Participation PMCB (3,5 × 1,68 €) : 5,88 €\n" +
        "TOTAL HT : 625,21 € — TVA 20 % : 125,04 € — TTC : 750,25 €\n" +
        "Charge camion max : 7,5 m³. Commande à confirmer avant 16h la veille.\n" +
        "Déchargement max 45 min — sinon facturation attente 115 €/h.",
    },
  });
  console.log("✅ BCB-2026-0001 mis à jour : 3,5 m³ × 112 €/m³ — Total 625,21 € HT — 750,25 € TTC");
  console.log("   Livraison : 09/07/2026 — BV.COURANT DECA4 C25 XF1 D2 S3 — goulottes");

  // ── 2. Fournisseur BETON VICAT : données réelles ─────────────────────────
  const fou = await prisma.fournisseur.findFirst({
    where: { nom: { contains: "BETON VICAT", mode: "insensitive" } },
  });
  if (fou) {
    await prisma.fournisseur.update({
      where: { id: fou.id },
      data: {
        siret: "309918464",
        adresse: "4 rue Aristide Bergès — Les trois Vallons",
        codePostal: "38080",
        ville: "L'ISLE D'ABEAU",
        telephone: "+33561702202",
        email: "adv.beton.toulouse-limousin@vicat.fr",
        notes:
          "SAS au capital de 11 562 512 € — R.C.S. VIENNE 309918464 — TVA FR25309918464\n" +
          "Site : www.beton-vicat.fr — Unité Fenouillet\n" +
          "Contact planning : fr-planning.fenouillet@vicat.fr\n" +
          "Commercial : Melanie RAUZI +33665194368 — melanie.rauzi@vicat.fr\n" +
          "Livraisons 7h30-11h30 et 13h30-16h lun-ven — commande avant 16h la veille.",
      },
    });
    console.log(`✅ Fournisseur BETON VICAT (${fou.reference}) mis à jour avec coordonnées réelles`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
