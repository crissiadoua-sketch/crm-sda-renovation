/**
 * Ajoute le bloc "Description des ouvrages" dans mentionsLibres
 * pour les 8 devis LHERM (DEV-2026-010 à DEV-2026-017).
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DESC_BAC_ACIER = (materiau: string) =>
  `Réalisation d'une couverture isolée en ${materiau} sur structure porteuse fournie par le lot charpente.\n\n` +
  `Les travaux comprennent :\n` +
  `• L'installation et la sécurisation du chantier.\n` +
  `• La fourniture et la livraison des panneaux sandwich isolés.\n` +
  `• La fourniture de l'ensemble des accessoires de fixation et d'étanchéité.\n` +
  `• Le levage, la manutention et la pose complète des panneaux.\n` +
  `• La réalisation des recouvrements et de l'étanchéité des jonctions.\n` +
  `• La pose des rives et accessoires de finition.\n` +
  `• Les contrôles de conformité en fin de chantier.\n` +
  `• Le nettoyage complet de la zone de travaux.`;

const DESC_ZINC = (materiau: string) =>
  `Réalisation d'une couverture en ${materiau} à joint debout sur structure porteuse fournie par le lot charpente.\n\n` +
  `Les travaux comprennent :\n` +
  `• L'installation et la sécurisation du chantier.\n` +
  `• La fourniture et la livraison du zinc en rouleaux et de tous les accessoires.\n` +
  `• La pose de la sous-couche asphalte et des tasseaux bois traités.\n` +
  `• La mise en œuvre des pattes coulissantes inox permettant la libre dilatation thermique.\n` +
  `• La pose et le sertissage des bandes de zinc à joint debout.\n` +
  `• La réalisation des noues, solins, rives de pignon et faîtages en zinc façonné sur mesure.\n` +
  `• Les contrôles de conformité en fin de chantier.\n` +
  `• Le nettoyage complet de la zone de travaux.`;

const VARIANTS = [
  {
    numero: "DEV-2026-010",
    mentionsLibres: DESC_BAC_ACIER("panneaux bac acier nervuré isolés gamme Confort 80 mm, laine de roche"),
  },
  {
    numero: "DEV-2026-011",
    mentionsLibres: DESC_BAC_ACIER("panneaux bac acier nervuré isolés gamme Performance 80 mm, laine de roche haute densité"),
  },
  {
    numero: "DEV-2026-012",
    mentionsLibres: DESC_BAC_ACIER("panneaux sandwich isolés gamme Essentielle 100 mm, âme polyuréthane PIR"),
  },
  {
    // Texte repris mot pour mot depuis le PDF de référence (Variante 5)
    numero: "DEV-2026-013",
    mentionsLibres:
      "Réalisation d'une couverture isolée en panneaux sandwich QuadCore d'épaisseur 100 mm sur structure porteuse fournie par le lot charpente.\n\n" +
      "Les travaux comprennent :\n" +
      "• L'installation et la sécurisation du chantier.\n" +
      "• La fourniture et la livraison des panneaux sandwich isolés.\n" +
      "• La fourniture de l'ensemble des accessoires de fixation et d'étanchéité.\n" +
      "• Le levage, la manutention et la pose complète des panneaux.\n" +
      "• La réalisation des recouvrements et de l'étanchéité des jonctions.\n" +
      "• La pose des rives et accessoires de finition.\n" +
      "• Les contrôles de conformité en fin de chantier.\n" +
      "• Le nettoyage complet de la zone de travaux.",
  },
  {
    numero: "DEV-2026-014",
    mentionsLibres: DESC_BAC_ACIER("panneaux sandwich isolés gamme Performance 100 mm, âme polyuréthane PIR haute densité"),
  },
  {
    numero: "DEV-2026-015",
    mentionsLibres: DESC_ZINC("zinc naturel Quartz-Zinc®"),
  },
  {
    numero: "DEV-2026-016",
    mentionsLibres: DESC_ZINC("zinc prélaqué Anthra-Zinc®, finition gris anthracite mat"),
  },
  {
    numero: "DEV-2026-017",
    mentionsLibres: DESC_ZINC("zinc prélaqué Noir Prestige®, finition noir profond mat"),
  },
];

async function main() {
  for (const v of VARIANTS) {
    const updated = await prisma.devis.updateMany({
      where: { numero: v.numero },
      data: { mentionsLibres: v.mentionsLibres },
    });
    if (updated.count === 0) {
      console.error(`✗ ${v.numero} introuvable`);
    } else {
      console.log(`✓ ${v.numero}  — description des ouvrages ajoutée`);
    }
  }
  console.log("\n✅ mentionsLibres mis à jour sur les 8 devis");
}

main().catch(console.error).finally(() => prisma.$disconnect());
