import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const fiches = [
  {
    categorie: "PRODUIT",
    corpsEtat: "RSS",
    designation: "Sol Stratifié Chêne Clair d'Amiens — EGGER PRO LAMINATE 8/32 Classic",
    marque: "EGGER",
    reference: "8/32 Classic WV4 CP",
    description:
      "Sol stratifié EGGER PRO LAMINATE FLOORING 8/32 Classic WV4 CP. " +
      "Support HDF Quell-Stopp Plus (antihumidité). Chanfreins WV4 (4 bords). " +
      "Dimensions : 1292 × 193 mm — épaisseur 8 mm. " +
      "Classe d'utilisation 32 (usage collectif modéré). " +
      "Système de clipsage CLIC it! — pose simple et rapide, sans colle. " +
      "Propriétés antistatiques (< 2 kV, EN 1815). " +
      "Résistance à l'abrasion : AC4 (IP ≥ 4000). " +
      "Résistance aux chocs : billes grand diamètre ≥ 500 mm, petite bille ≥ 8 N. " +
      "Résistance aux taches : groupe 1+2 niveau 5, groupe 3 niveau 4 (EN 438). " +
      "Gonflement en épaisseur ≤ 18 % (ISO 24336). " +
      "Résistance au passage de la chaleur : 0,07 m²K/W (EN 12667). " +
      "Poinçonnement rémanent < 0,05 (EN ISO 24343-1). " +
      "Arrachement de surface ≥ 1,25 N/mm² (EN 13329 ann. D). " +
      "Conditionnement : 8 pièces / boîte = 1,99 m² / 14,54 kg — 480 boîtes/palette = 119,69 m². " +
      "Garantie domestique et commerciale selon termes Egger.",
    normes:
      "EN 13329 — norme européenne revêtements de sol stratifiés | " +
      "Classe d'utilisation 32 | AC4 (résistance abrasion EN 13329 ann. E) | " +
      "EN 1815 antistatique < 2 kV | EN 438 (résistance taches) | EN 424 (pied meuble) | " +
      "EN 425 Type W (chaise à roulettes) | ISO 24336 (gonflement) | EN 12667 (chaleur) | " +
      "EN ISO 24343-1 (poinçonnement) | Formaldéhyde E1 (EN 16000 + EN 14041) | " +
      "Émissions air intérieur : Classe A+ | M1 matériaux | PEFC/06-38-171 | Ange Bleu",
    lienUrl: "https://www.egger.com",
    actif: true,
  },
];

async function main() {
  console.log("Insertion des fiches techniques Revêtement Sol…");
  for (const fiche of fiches) {
    const existing = await prisma.ficheTechnique.findFirst({
      where: { designation: fiche.designation, marque: fiche.marque },
    });
    if (existing) {
      console.log(`  ⏭  Déjà existante : ${fiche.designation}`);
      continue;
    }
    await prisma.ficheTechnique.create({ data: fiche });
    console.log(`  ✓  Créée : ${fiche.designation}`);
  }
  console.log("Terminé.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
