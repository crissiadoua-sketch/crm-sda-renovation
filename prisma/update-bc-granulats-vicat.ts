import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // ── Trouver le fournisseur GRANULATS VICAT ────────────────────────────────
  const fou = await prisma.fournisseur.findFirst({
    where: { nom: { contains: "GRANULATS VICAT", mode: "insensitive" } },
  });
  if (!fou) { console.error("Fournisseur GRANULATS VICAT introuvable"); return; }

  // Mettre à jour les coordonnées réelles
  await prisma.fournisseur.update({
    where: { id: fou.id },
    data: {
      siret: "76820025500091",
      adresse: "TSA 49623",
      codePostal: "38306",
      ville: "BOURGOIN CÉDEX",
      telephone: "05 61 70 57 82",
      email: "fr-carriere.fenouillet@vicat.fr",
      notes:
        "SAS au capital de 5 847 728 € — SIRET 768200255 00091 — NAF 0812Z\n" +
        "R.C.S. VIENNE 768200255 — TVA FR87768200255\n" +
        "Siège : 4 rue Aristide Bergès, 38080 L'ISLE D'ABEAU\n" +
        "Site : www.granulats-vicat.fr\n" +
        "Entité distincte de BETON VICAT (même groupe Vicat)\n" +
        "Règlement : virement bancaire avant livraison (sauf compte ouvert).",
    },
  });
  console.log(`✅ Fournisseur ${fou.reference} GRANULATS VICAT mis à jour`);

  // ── Mettre à jour BC-2026-0001 ────────────────────────────────────────────
  const bc = await prisma.bonCommande.findFirst({
    where: { numero: "BC-2026-0001" },
    include: { lignes: true },
  });
  if (!bc) { console.error("BC-2026-0001 introuvable"); return; }

  // Supprimer les anciennes lignes et recréer avec les données réelles
  await prisma.bonCommandeLigne.deleteMany({ where: { bonCommandeId: bc.id } });

  const lignes = [
    { ordre: 1, designation: "GRAVILLON 11,2/22,4 SCL (réf. 217187 — code 33331110)", unite: "t",      quantite: 7.0,  prixUnitaireHT: 17.53,  totalHT: 122.71 },
    { ordre: 2, designation: "Transport par tour/voyage (T500)",                        unite: "TOU",    quantite: 1.0,  prixUnitaireHT: 111.00, totalHT: 111.00 },
    { ordre: 3, designation: "TICPE",                                                   unite: "t",      quantite: 7.0,  prixUnitaireHT: 0.21,   totalHT: 1.47   },
    { ordre: 4, designation: "TGAP",                                                    unite: "t",      quantite: 7.0,  prixUnitaireHT: 0.23,   totalHT: 1.61   },
    { ordre: 5, designation: "Éco-participation",                                       unite: "t",      quantite: 7.0,  prixUnitaireHT: 0.22,   totalHT: 1.54   },
  ];

  await prisma.bonCommandeLigne.createMany({
    data: lignes.map((l) => ({ ...l, bonCommandeId: bc.id })),
  });

  const totalHT  = 238.33;
  const totalTVA = 47.66;
  const totalTTC = 285.99;

  await prisma.bonCommande.update({
    where: { id: bc.id },
    data: {
      statut: "CONFIRME",
      totalHT,
      totalTVA,
      totalTTC,
      notes:
        "Devis GRANULATS VICAT N°42 du 24/06/2026 — Chantier réf. 0600001599\n" +
        "Client réf. 0006010412-CPT FENOUILLET ART\n" +
        "Produit : GRAVILLON 11,2/22,4 SCL (granulats concassés calcaires) — 7t\n" +
        "Transport : 1 tour/voyage 111,00 € + TICPE/TGAP/éco-part. 4,62 €\n" +
        "Règlement : en compte fournisseur (dérogation virement avant livraison).",
    },
  });

  console.log("✅ BC-2026-0001 GRANULATS VICAT corrigé :");
  console.log("   GRAVILLON 11,2/22,4 SCL — 7t × 17,53 €/t = 122,71 €");
  console.log("   Transport : 111,00 € | TICPE/TGAP/Éco : 4,62 €");
  console.log(`   Total HT : ${totalHT} € — TTC : ${totalTTC} €`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
