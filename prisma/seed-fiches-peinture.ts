import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const fiches = [
  {
    categorie: "PRODUIT",
    corpsEtat: "PEI",
    designation: "HYDROVELOURS",
    marque: "Peintures Gauthier / PPG",
    reference: "HYDROVELOURS",
    description:
      "Peinture d'aspect velours à base d'une dispersion de résines synthétiques. " +
      "Intérieur, pièces sèches — murs et plafonds. Travaux neufs et d'entretien. État de finition B. " +
      "Aspect velours, grain fin serré arrondi. Blancheur élevée. Bonne opacité. Applicable sur toile de verre. " +
      "Séchage rapide (hors poussière 1h, recouvrable 6h). " +
      "Rendement : 9–12 m²/L (support lisse), 7–9 m²/L (toile de verre). " +
      "Extrait sec pondéral 55 % ± 2. Conditionnement : 1 L, 5 L, 15 L. " +
      "Processus : 1 couche HYDROPRIM ou ALKYNÉO PRIM + 2 couches HYDROVELOURS. " +
      "Dilution : prêt à l'emploi. T° min application : 8 °C.",
    normes:
      "NF EN 13300 — Classe 2 (RAH) | Brillant spéculaire : 10 % sous 60° | " +
      "COV max 30 g/l (cat A/a) — limite UE 30 g/l (2010) | Émissions air intérieur : Classe A+ | " +
      "NF T 36-005 Famille I Classe 7a2 | Certification NF Peintures",
    lienUrl: "https://www.peintures-gauthier.com",
    actif: true,
  },
  {
    categorie: "PRODUIT",
    corpsEtat: "PEI",
    designation: "PANTEX BAS CARBONE MAT",
    marque: "Seigneurie / PPG",
    reference: "PANTEX BC MAT",
    description:
      "Peinture aux copolymères acryliques en phase aqueuse d'aspect mat. " +
      "Intérieur neuf/rénovation — murs et plafonds, pièces sèches. État de finition A ou B. " +
      "Fort pouvoir garnissant et couvrant. Grande facilité d'application. Absence de reprise. " +
      "Séchage : sec au toucher 2h, recouvrement 4h. Rendement : 9–12 m²/L. " +
      "Extrait sec 59 ± 2 %. Masse volumique blanc : 1,49 kg/dm³. Conditionnement : 1 L, 5 L, 15 L. " +
      "Processus : 1 couche PRINTOPRIM BAS CARBONE ou ELYOPUR IMPRESSION + 2 couches PANTEX BC MAT. " +
      "T° min application : 8 °C, HR < 65 %. Dilution : prêt à l'emploi.",
    normes:
      "NF EN 13300 — Classe 2 (RAH) | Brillant spéculaire : 3 % sous 85° | " +
      "COV max 20 g/l (cat A/a) — limite UE 30 g/l | Émissions air intérieur : Classe A+ | " +
      "NF T 36-005 Famille I Classe 7b2 | ISO 14001 | Certification NF Environnement",
    lienUrl: "https://www.seigneurie.com",
    actif: true,
  },
  {
    categorie: "PRODUIT",
    corpsEtat: "PEI",
    designation: "PANTEX BAS CARBONE VELOURS",
    marque: "Seigneurie / PPG",
    reference: "PANTEX BC VELOURS",
    description:
      "Peinture intérieure aux résines mixtes d'aspect velouté-mat. " +
      "Intérieur neuf/rénovation — murs et plafonds, pièces sèches. État de finition A ou B. " +
      "Bonne résistance RAH Classe 1 — lessivable. Fort pouvoir garnissant et couvrant. " +
      "Séchage : 1h. Temps de recouvrement : 4h. Rendement : 8–11 m²/L. " +
      "Extrait sec 58 ± 2 %. Masse volumique blanc : 1,35 kg/dm³. Conditionnement : 1 L, 5 L, 15 L. " +
      "Processus : 1 couche PRINTOPRIM BAS CARBONE ou ELYOPUR IMPRESSION + 2 couches PANTEX BC VELOURS. " +
      "T° min application : 8 °C, HR < 65 %. Dilution : prêt à l'emploi.",
    normes:
      "NF EN 13300 — Classe 1 (RAH) | Brillant spéculaire : 9 % / 60° — 4 % / 85° | " +
      "COV max 1 g/l (cat A/a) — limite UE 30 g/l | Émissions air intérieur : Classe A+ | " +
      "NF T 36-005 Famille I Classe 7b2/4a | ISO 14001 | Ecolabel EU | Certification NF Environnement",
    lienUrl: "https://www.seigneurie.com",
    actif: true,
  },
  {
    categorie: "PRODUIT",
    corpsEtat: "PEI",
    designation: "EVOLUTEX MAT",
    marque: "Seigneurie / PPG",
    reference: "EVOLUTEX MAT",
    description:
      "Peinture mate à base de résines alkydes en émulsion et acryliques. " +
      "Intérieur neuf/entretien — surfaces verticales et plafonds, pièces sèches. État de finition B. " +
      "Excellent rendement. Temps ouvert long pour application facile. Protection contre les moisissures. " +
      "Séchage : hors poussière 2h, redoublable 6h. Rendement : 10–12 m²/L. " +
      "Extrait sec 60 ± 2 %. Masse volumique blanc : 1,53 kg/dm³. Conditionnement : 5 L, 15 L. " +
      "Processus : 1 couche PRACTI PRIM / PRINTOPRIM / MUROPRIM / IMPRIMA + 2 couches EVOLUTEX MAT. " +
      "T° min application : 8 °C, HR < 65 %. Dilution : prêt à l'emploi. " +
      "Éligible certifications LEED, HQE, BREEAM.",
    normes:
      "NF EN 13300 — Classe 3 (RAH) | Brillant spéculaire : < 3 % sous 85° | " +
      "COV max 28 g/l (cat A/a) — limite UE 30 g/l | Émissions air intérieur : Classe A+ | " +
      "NF T 36005 Famille I Classe 4a 7b2 | ISO 14001 | NF Environnement (NF 130)",
    lienUrl: "https://www.seigneurie.com",
    actif: true,
  },
  {
    categorie: "PRODUIT",
    corpsEtat: "PEI",
    designation: "EVOLUTEX VELOURS",
    marque: "Seigneurie / PPG",
    reference: "EVOLUTEX VELOURS",
    description:
      "Peinture veloutée à base de résines alkydes en émulsion et acryliques. Nouvelle formule — opacité améliorée. " +
      "Intérieur neuf/entretien — murs et plafonds, pièces sèches et humides. Applicable sur toile de verre. État de finition A ou B. " +
      "Finition sans reprise. Fort pouvoir opacifiant. Très bon garnissant. Haut rendement. " +
      "Applicable mouillé sur mouillé (déconseillé sur toile de verre). Protection contre les moisissures. " +
      "Séchage : hors poussière 2h, redoublable 4h ou mouillé/mouillé. " +
      "Rendement : 10–12 m²/L (lisse), 7–9 m²/L (toile de verre). " +
      "Extrait sec 58 ± 2 %. Masse volumique blanc : 1,40 kg/dm³. Conditionnement : 1 L, 5 L, 15 L. " +
      "Processus : 1 couche PRINTOPRIM / PRACTI PRIM / MUROPRIM / IMPRIMA RAPID + 2 couches EVOLUTEX VELOURS. " +
      "T° min application : 8 °C, HR < 70 %. Dilution : prêt à l'emploi. " +
      "Éligible certifications HQE, BREEAM.",
    normes:
      "NF EN 13300 — Classe 2 (RAH) | Brillant spéculaire : 6 % / 60° — 16 % / 85° | " +
      "COV max 2 g/l (cat A/a) — limite UE 30 g/l | Émissions air intérieur : Classe A+ | " +
      "NF T 36005 Famille I Classe 7b2 4a | ISO 14001 | NF Environnement (NF 130)",
    lienUrl: "https://www.seigneurie.com",
    actif: true,
  },
];

async function main() {
  console.log("Insertion des fiches techniques Peinture…");

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
