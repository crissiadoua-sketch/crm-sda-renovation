/**
 * Corrige les 8 devis LHERM (DEV-2026-010 à DEV-2026-017) :
 *  - TVA 20 % (et non 10 %)
 *  - Structure ligne par ligne identique au PDF de référence (Variante 5)
 *  - Ligne "Encadrement / gestion / décennale" équilibrante
 *  - Clause et réserves BTP
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const TVA = 20;
const SURFACE = 94; // m²
const ML_JOINTS = 53; // ml périphérie

// ── Clauses et réserves ──────────────────────────────────────────────────────

const CLAUSES_BAC_ACIER = [
  "Prix établi sur la base des plans transmis à ce jour.",
  "Charpente métallique, poutres et pannes porteuses non comprises.",
  "Étude structurelle non comprise.",
  "Évacuation des eaux pluviales non comprise sauf mention contraire.",
  "Toute modification de surface ou de conception fera l'objet d'un devis complémentaire.",
  "Travaux exécutés conformément aux DTU et prescriptions techniques des fabricants.",
];

const CLAUSES_ZINC = [
  "Prix établi sur la base des plans transmis à ce jour.",
  "Charpente et structure porteuse non comprises (fournie par le lot charpente).",
  "Étude structurelle non comprise.",
  "Évacuation des eaux pluviales (chéneaux, descentes EP) non comprise sauf mention contraire.",
  "Toute modification de surface ou de conception fera l'objet d'un devis complémentaire.",
  "Travaux exécutés conformément au DTU 40.41 et aux prescriptions techniques du fabricant de zinc.",
  "La dilatation thermique du zinc est prise en compte dans la mise en œuvre par l'utilisation de pattes coulissantes inox.",
];

// ── Lignes communes bac acier (hors panneau et gestion) ──────────────────────
// Somme = 4 412,00 €

function bacAcierLignes(
  devisId: string,
  panelDesignation: string,
  panelPU: number,
  panelTotal: number,
  management: number,
) {
  return [
    {
      devisId, type: "LIGNE", ordre: 1,
      designation: "Installation de chantier, implantation et traçage de la toiture",
      unite: "FF", quantite: 1, prixUnitaireHT: 250, tauxTVA: TVA, totalHT: 250,
    },
    {
      devisId, type: "LIGNE", ordre: 2,
      designation: panelDesignation,
      unite: "m²", quantite: SURFACE, prixUnitaireHT: panelPU, tauxTVA: TVA, totalHT: panelTotal,
    },
    {
      devisId, type: "LIGNE", ordre: 3,
      designation:
        "Fourniture des accessoires de fixation et d'étanchéité : vis autoperceuses, " +
        "cavaliers, rondelles d'étanchéité, joints butyle et mousses de calfeutrement",
      unite: "m²", quantite: SURFACE, prixUnitaireHT: 7.84, tauxTVA: TVA, totalHT: 737,
    },
    {
      devisId, type: "LIGNE", ordre: 4,
      designation: "Livraison des matériaux sur chantier",
      unite: "FF", quantite: 1, prixUnitaireHT: 175, tauxTVA: TVA, totalHT: 175,
    },
    {
      devisId, type: "LIGNE", ordre: 5,
      designation:
        "Mise en place des moyens d'accès et protections collectives " +
        "conformément à la réglementation en vigueur",
      unite: "FF", quantite: 1, prixUnitaireHT: 350, tauxTVA: TVA, totalHT: 350,
    },
    {
      devisId, type: "LIGNE", ordre: 6,
      designation: "Déchargement, manutention et répartition des matériaux sur toiture",
      unite: "FF", quantite: 1, prixUnitaireHT: 300, tauxTVA: TVA, totalHT: 300,
    },
    {
      devisId, type: "LIGNE", ordre: 7,
      designation: "Levage et pose des panneaux sandwich isolés",
      unite: "m²", quantite: SURFACE, prixUnitaireHT: 13, tauxTVA: TVA, totalHT: 1222,
    },
    {
      devisId, type: "LIGNE", ordre: 8,
      designation: "Fixation mécanique des panneaux (visserie, cavaliers, rondelles)",
      unite: "m²", quantite: SURFACE, prixUnitaireHT: 3.75, tauxTVA: TVA, totalHT: 352.50,
    },
    {
      devisId, type: "LIGNE", ordre: 9,
      designation: "Réalisation des recouvrements longitudinaux et transversaux",
      unite: "m²", quantite: SURFACE, prixUnitaireHT: 1.75, tauxTVA: TVA, totalHT: 164.50,
    },
    {
      devisId, type: "LIGNE", ordre: 10,
      designation: "Mise en œuvre des joints d'étanchéité et calfeutrements périphériques",
      unite: "ml", quantite: ML_JOINTS, prixUnitaireHT: 4.50, tauxTVA: TVA, totalHT: 238.50,
    },
    {
      devisId, type: "LIGNE", ordre: 11,
      designation: "Pose des bandes de rive et accessoires de finition",
      unite: "FF", quantite: 1, prixUnitaireHT: 325, tauxTVA: TVA, totalHT: 325,
    },
    {
      devisId, type: "LIGNE", ordre: 12,
      designation:
        "Contrôle des fixations, autocontrôle qualité, nettoyage et réception de chantier",
      unite: "FF", quantite: 1, prixUnitaireHT: 297.50, tauxTVA: TVA, totalHT: 297.50,
    },
    {
      devisId, type: "LIGNE", ordre: 13,
      designation:
        "Encadrement, gestion administrative, coordination, " +
        "garantie et responsabilité décennale",
      unite: "FF", quantite: 1, prixUnitaireHT: management, tauxTVA: TVA, totalHT: management,
    },
    {
      devisId, type: "CLAUSE_RESERVE", ordre: 14,
      designation: "Clauses et réserves",
      clausesReserves: JSON.stringify(CLAUSES_BAC_ACIER),
      unite: null, quantite: null, prixUnitaireHT: null, tauxTVA: null, totalHT: null,
    },
  ];
}

// ── Lignes communes zinc (hors feuille zinc et gestion) ──────────────────────
// Somme fixe = 9 264,50 €

function zincLignes(
  devisId: string,
  zincDesignation: string,
  zincPU: number,
  zincTotal: number,
  management: number,
) {
  return [
    {
      devisId, type: "LIGNE", ordre: 1,
      designation: "Installation de chantier, implantation et traçage de la toiture",
      unite: "FF", quantite: 1, prixUnitaireHT: 250, tauxTVA: TVA, totalHT: 250,
    },
    {
      devisId, type: "LIGNE", ordre: 2,
      designation: zincDesignation,
      unite: "m²", quantite: SURFACE, prixUnitaireHT: zincPU, tauxTVA: TVA, totalHT: zincTotal,
    },
    {
      devisId, type: "LIGNE", ordre: 3,
      designation:
        "Fourniture des tasseaux bois résineux rabotés 60×40 mm traités autoclave classe 2 " +
        "pour support de couverture zinc",
      unite: "m²", quantite: SURFACE, prixUnitaireHT: 8, tauxTVA: TVA, totalHT: 752,
    },
    {
      devisId, type: "LIGNE", ordre: 4,
      designation:
        "Fourniture de sous-couche asphalte 36R conforme NF EN 13969, " +
        "séparation entre zinc et support bois",
      unite: "m²", quantite: SURFACE, prixUnitaireHT: 5.50, tauxTVA: TVA, totalHT: 517,
    },
    {
      devisId, type: "LIGNE", ordre: 5,
      designation:
        "Fourniture des pattes coulissantes inox AISI 316 et visserie inox pour fixation " +
        "libre à dilatation thermique",
      unite: "m²", quantite: SURFACE, prixUnitaireHT: 4, tauxTVA: TVA, totalHT: 376,
    },
    {
      devisId, type: "LIGNE", ordre: 6,
      designation: "Livraison des matériaux sur chantier",
      unite: "FF", quantite: 1, prixUnitaireHT: 175, tauxTVA: TVA, totalHT: 175,
    },
    {
      devisId, type: "LIGNE", ordre: 7,
      designation:
        "Mise en place des moyens d'accès et protections collectives " +
        "conformément à la réglementation en vigueur",
      unite: "FF", quantite: 1, prixUnitaireHT: 350, tauxTVA: TVA, totalHT: 350,
    },
    {
      devisId, type: "LIGNE", ordre: 8,
      designation: "Déchargement, manutention et répartition des matériaux sur toiture",
      unite: "FF", quantite: 1, prixUnitaireHT: 300, tauxTVA: TVA, totalHT: 300,
    },
    {
      devisId, type: "LIGNE", ordre: 9,
      designation:
        "Pose de la sous-couche asphalte et fixation des tasseaux bois " +
        "avec clouage ou vissage dans la structure porteuse",
      unite: "m²", quantite: SURFACE, prixUnitaireHT: 18, tauxTVA: TVA, totalHT: 1692,
    },
    {
      devisId, type: "LIGNE", ordre: 10,
      designation:
        "Pose et sertissage des bandes de zinc à joint debout, " +
        "façonnage et assemblage des joints debout à la machine à border, " +
        "fixation par pattes coulissantes permettant la libre dilatation",
      unite: "m²", quantite: SURFACE, prixUnitaireHT: 45, tauxTVA: TVA, totalHT: 4230,
    },
    {
      devisId, type: "LIGNE", ordre: 11,
      designation:
        "Réalisation des noues, solins, rives de pignon, faîtages et jonctions " +
        "en zinc façonné sur mesure",
      unite: "FF", quantite: 1, prixUnitaireHT: 325, tauxTVA: TVA, totalHT: 325,
    },
    {
      devisId, type: "LIGNE", ordre: 12,
      designation:
        "Contrôle des fixations, autocontrôle qualité, nettoyage et réception de chantier",
      unite: "FF", quantite: 1, prixUnitaireHT: 297.50, tauxTVA: TVA, totalHT: 297.50,
    },
    {
      devisId, type: "LIGNE", ordre: 13,
      designation:
        "Encadrement, gestion administrative, coordination, " +
        "garantie et responsabilité décennale",
      unite: "FF", quantite: 1, prixUnitaireHT: management, tauxTVA: TVA, totalHT: management,
    },
    {
      devisId, type: "CLAUSE_RESERVE", ordre: 14,
      designation: "Clauses et réserves",
      clausesReserves: JSON.stringify(CLAUSES_ZINC),
      unite: null, quantite: null, prixUnitaireHT: null, tauxTVA: null, totalHT: null,
    },
  ];
}

// ── Données par variante ──────────────────────────────────────────────────────
//
// Calcul des équilibres (toutes sommes vérifiées) :
//   Bac acier : fixe non-panneau = 250+737+175+350+300+1222+352.50+164.50+238.50+325+297.50 = 4 412
//               management = totalHT - 4 412 - panelTotal
//   Zinc      : fixe non-zinc  = 250+752+517+376+175+350+300+1692+4230+325+297.50 = 9 264.50
//               management = totalHT - 9 264.50 - zincTotal

const VARIANTS = [
  // ── Bac acier ──
  {
    numero: "DEV-2026-010", totalHT: 14000,
    type: "bac",
    panelDesignation:
      "Fourniture de panneaux bac acier nervuré isolés, gamme CONFORT, épaisseur totale 80 mm, " +
      "laine de roche 80 kg/m³ (λ=0,036 W/m·K, R=2,15 m²·K/W), " +
      "parement extérieur acier galvanisé (AZ185) prélaqué polyester mat 25 µm, " +
      "parement intérieur acier galvanisé prélaqué blanc, épaisseur acier 0,75 mm, " +
      "coloris au choix suivant disponibilité fabricant",
    panelPU: 34.00,
    panelTotal: 34 * SURFACE,          // 3 196
    management: 14000 - 4412 - 34 * SURFACE, // 6 392
  },
  {
    numero: "DEV-2026-011", totalHT: 15840,
    type: "bac",
    panelDesignation:
      "Fourniture de panneaux bac acier nervuré isolés, gamme PERFORMANCE, épaisseur totale 80 mm, " +
      "laine de roche haute densité 100 kg/m³ (λ=0,034 W/m·K, R=2,30 m²·K/W), " +
      "parement extérieur acier galvanisé (AZ185) prélaqué Pvdf 35 µm résistance UV renforcée " +
      "garantie fabricant 25 ans, épaisseur acier 0,75 mm, " +
      "coloris au choix suivant disponibilité fabricant",
    panelPU: 47.00,
    panelTotal: 47 * SURFACE,          // 4 418
    management: 15840 - 4412 - 47 * SURFACE, // 7 010
  },
  {
    numero: "DEV-2026-012", totalHT: 15300,
    type: "bac",
    panelDesignation:
      "Fourniture de panneaux sandwich isolés toiture, gamme ESSENTIELLE, épaisseur totale 100 mm, " +
      "âme polyuréthane PIR 40 kg/m³ sans fréon (λ=0,022 W/m·K, R=4,50 m²·K/W), " +
      "parement extérieur acier galvanisé (Z275) prélaqué polyester 25 µm, " +
      "parement intérieur acier galvanisé blanc lisse, épaisseur acier 0,50 mm, " +
      "coloris au choix suivant disponibilité fabricant",
    panelPU: 44.00,
    panelTotal: 44 * SURFACE,          // 4 136
    management: 15300 - 4412 - 44 * SURFACE, // 6 752
  },
  {
    // Variante 5 — correspond exactement au PDF de référence
    numero: "DEV-2026-013", totalHT: 17150,
    type: "bac",
    panelDesignation:
      "Fourniture de panneaux sandwich isolés QuadCore épaisseur 100 mm, " +
      "parements acier prélaqué, coloris au choix suivant disponibilité fabricant",
    panelPU: 55.80,
    panelTotal: 5245.20,   // 55.80 × 94
    management: 7492.80,   // 17 150 − 4 412 − 5 245,20  (correspond au PDF)
  },
  {
    numero: "DEV-2026-014", totalHT: 18900,
    type: "bac",
    panelDesignation:
      "Fourniture de panneaux sandwich isolés toiture, gamme PERFORMANCE, épaisseur totale 100 mm, " +
      "âme polyuréthane PIR haute densité 44 kg/m³ (λ=0,021 W/m·K, R=4,75 m²·K/W, " +
      "réaction au feu B-s1,d0), parement extérieur acier galvanisé (AZ185) " +
      "prélaqué Pvdf 35 µm garantie 30 ans, épaisseur acier 0,75 mm",
    panelPU: 67.00,
    panelTotal: 67 * SURFACE,          // 6 298
    management: 18900 - 4412 - 67 * SURFACE, // 8 190
  },
  // ── Zinc joint debout ──
  {
    numero: "DEV-2026-015", totalHT: 34560,
    type: "zinc",
    zincDesignation:
      "Fourniture de zinc naturel QUARTZ-ZINC® en rouleaux L=0,50 m, épaisseur 0,80 mm " +
      "(densité 7,2 kg/m²), pureté 99,995 %, teinte gris ardoise naturelle à patine évolutive",
    zincPU: 130,
    zincTotal: 130 * SURFACE,              // 12 220
    management: 34560 - 9264.50 - 130 * SURFACE, // 13 075,50
  },
  {
    numero: "DEV-2026-016", totalHT: 37000,
    type: "zinc",
    zincDesignation:
      "Fourniture de zinc prélaqué ANTHRA-ZINC® en rouleaux L=0,50 m, épaisseur 0,80 mm, " +
      "finition gris anthracite mat satiné (RAL 7016 approx.), " +
      "revêtement polyuréthane intérieur et extérieur, garantie fabricant 10 ans sur le revêtement",
    zincPU: 150,
    zincTotal: 150 * SURFACE,              // 14 100
    management: 37000 - 9264.50 - 150 * SURFACE, // 13 635,50
  },
  {
    numero: "DEV-2026-017", totalHT: 40850,
    type: "zinc",
    zincDesignation:
      "Fourniture de zinc prélaqué NOIR PRESTIGE® en rouleaux L=0,50 m, épaisseur 0,80 mm, " +
      "finition noir profond mat haut de gamme, revêtement organique thermostable " +
      "résistance supérieure aux UV et aux dilatations thermiques extrêmes",
    zincPU: 180,
    zincTotal: 180 * SURFACE,              // 16 920
    management: 40850 - 9264.50 - 180 * SURFACE, // 14 665,50
  },
] as const;

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  // Sanity-check totals before touching the DB
  for (const v of VARIANTS) {
    const fixe = v.type === "bac" ? 4412 : 9264.50;
    const mat  = v.type === "bac" ? (v as { panelTotal: number }).panelTotal
                                  : (v as { zincTotal: number }).zincTotal;
    const expected = fixe + mat + v.management;
    if (Math.abs(expected - v.totalHT) > 0.01) {
      throw new Error(
        `Équilibre KO pour ${v.numero}: fixe=${fixe} + mat=${mat} + mgmt=${v.management} = ${expected} ≠ ${v.totalHT}`,
      );
    }
  }
  console.log("✓ Contrôle des équilibres OK\n");

  for (const v of VARIANTS) {
    // Find devis
    const devis = await prisma.devis.findUnique({ where: { numero: v.numero } });
    if (!devis) { console.error(`✗ ${v.numero} introuvable — ignoré`); continue; }

    // Delete existing lignes
    await prisma.devisLigne.deleteMany({ where: { devisId: devis.id } });

    // Build new lignes
    const lignes =
      v.type === "bac"
        ? bacAcierLignes(
            devis.id,
            (v as { panelDesignation: string }).panelDesignation,
            (v as { panelPU: number }).panelPU,
            (v as { panelTotal: number }).panelTotal,
            v.management,
          )
        : zincLignes(
            devis.id,
            (v as { zincDesignation: string }).zincDesignation,
            (v as { zincPU: number }).zincPU,
            (v as { zincTotal: number }).zincTotal,
            v.management,
          );

    await prisma.devisLigne.createMany({ data: lignes });

    // Update devis totals (TVA 20 %)
    const totalTVA  = Math.round(v.totalHT * TVA) / 100;
    const totalTTC  = v.totalHT + totalTVA;

    await prisma.devis.update({
      where: { id: devis.id },
      data: { totalHT: v.totalHT, totalTVA, totalTTC },
    });

    console.log(
      `✓ ${v.numero}  HT=${v.totalHT.toLocaleString("fr-FR")} €  ` +
      `TVA=${totalTVA.toLocaleString("fr-FR")} €  TTC=${totalTTC.toLocaleString("fr-FR")} €  ` +
      `(${lignes.length - 1} lignes + clauses)`,
    );
  }

  console.log("\n✅ 8 devis LHERM mis à jour (TVA 20 %, lignes détaillées)");
}

main().catch(console.error).finally(() => prisma.$disconnect());
