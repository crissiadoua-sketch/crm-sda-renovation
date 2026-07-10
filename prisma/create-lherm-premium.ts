import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// ── Constantes ─────────────────────────────────────────────────────────────

const QTE = 94; // surface en m² (identique à toutes les variantes LHERM)

// Lignes fixes zinc (identiques V7→V10) — total = 9 264,50€
const ZINC_FIXED_LINES = [
  { ordre: 1, designation: "Installation de chantier, implantation et traçage de la toiture\nFourniture du matériel de protection et de signalisation", prixUnitaireHT: 250, quantite: 1 },
  // ordre 2 = matériau principal (variable)
  { ordre: 3, designation: "Fourniture des tasseaux bois résineux rabotés 60×40 mm traités classe 2, pour lattage de support zinc", prixUnitaireHT: 8, quantite: QTE },
  { ordre: 4, designation: "Fourniture de sous-couche asphalte 36R conforme NF EN 13969, rôle de pare-vapeur et d'indépendance thermique", prixUnitaireHT: 5.5, quantite: QTE },
  { ordre: 5, designation: "Fourniture des pattes coulissantes inox AISI 316 et visserie inox pour fixation des joints debout", prixUnitaireHT: 4, quantite: QTE },
  { ordre: 6, designation: "Livraison des matériaux sur chantier", prixUnitaireHT: 175, quantite: 1 },
  { ordre: 7, designation: "Mise en place des moyens d'accès et protections collectives\n(échafaudage, filet anti-chute, balisage périmétrique)", prixUnitaireHT: 350, quantite: 1 },
  { ordre: 8, designation: "Déchargement, manutention et répartition des matériaux sur toiture", prixUnitaireHT: 300, quantite: 1 },
  { ordre: 9, designation: "Pose de la sous-couche asphalte et fixation des tasseaux bois\nConformément au DTU 40.41", prixUnitaireHT: 18, quantite: QTE },
  { ordre: 10, designation: "Pose et sertissage des bandes de zinc à joint debout, façonnage des relevés et noues, conformément au DTU 40.41", prixUnitaireHT: 45, quantite: QTE },
  { ordre: 11, designation: "Réalisation des noues, solins, rives de pignon, faîtages et rives latérales en zinc\nFinitions haut de gamme", prixUnitaireHT: 325, quantite: 1 },
  { ordre: 12, designation: "Contrôle des fixations, autocontrôle qualité, nettoyage et repli de chantier", prixUnitaireHT: 297.5, quantite: 1 },
];

const TOTAL_FIXED_ZINC = 250 + 752 + 517 + 376 + 175 + 350 + 300 + 1692 + 4230 + 325 + 297.5; // = 9264.50

// ── Variante 10 — PREMIUM ──────────────────────────────────────────────────

const PREMIUM_PU = 210; // €/m² — Zinc TITANE-ZINC® PIGMENTO Ardoise
const PREMIUM_MAT_TOTAL = QTE * PREMIUM_PU; // 19 740€
const PREMIUM_TOTAL_HT = 45000;
const PREMIUM_TTC = PREMIUM_TOTAL_HT * 1.2; // 54 000€
const PREMIUM_TVA = PREMIUM_TOTAL_HT * 0.2; // 9 000€
const PREMIUM_GESTION = PREMIUM_TOTAL_HT - TOTAL_FIXED_ZINC - PREMIUM_MAT_TOTAL; // 15 995.50€

const CLAUSES_ZINC_PREMIUM = [
  "Prix établi sur la base des plans transmis à ce jour.",
  "Charpente, poutres et pannes porteuses non comprises.",
  "Étude structurelle non comprise.",
  "Évacuation des eaux pluviales non comprise sauf mention contraire.",
  "Toute modification de surface ou de conception fera l'objet d'un devis complémentaire.",
  "Travaux exécutés conformément aux DTU 40.41 et prescriptions techniques VMZ France.",
  "Le zinc TITANE-ZINC® PIGMENTO présente une dilatation thermique d'environ 2,2 mm/m pour 10°C d'écart — joints coulissants prévus conformément aux recommandations fabricant.",
  "Garantie fabricant VMZINC 50 ans sur le matériau. Garantie décennale SDA Rénovation sur la pose.",
];

async function main() {
  // Sanity check
  console.log("Sanity check Variante 10 :");
  console.log(`  Fixed zinc    : ${TOTAL_FIXED_ZINC.toFixed(2)} €`);
  console.log(`  Matériau 210€ : ${PREMIUM_MAT_TOTAL.toFixed(2)} €`);
  console.log(`  Gestion       : ${PREMIUM_GESTION.toFixed(2)} €`);
  console.log(`  TOTAL HT      : ${(TOTAL_FIXED_ZINC + PREMIUM_MAT_TOTAL + PREMIUM_GESTION).toFixed(2)} € (attendu: ${PREMIUM_TOTAL_HT})`);
  console.log(`  TOTAL TTC     : ${PREMIUM_TTC.toFixed(2)} €`);
  console.log(`  % Gestion     : ${(PREMIUM_GESTION / PREMIUM_TOTAL_HT * 100).toFixed(1)}% (tendance: V9=35.9% → V10~35.5% ✓)`);

  if (Math.abs(TOTAL_FIXED_ZINC + PREMIUM_MAT_TOTAL + PREMIUM_GESTION - PREMIUM_TOTAL_HT) > 0.01) {
    throw new Error("ERREUR CALCUL : somme des lignes ≠ totalHT !");
  }
  console.log("  ✅ Calcul cohérent\n");

  // ── 1. Récupérer les données du chantier LHERM ────────────────────────────
  const lhermRef = await prisma.devis.findFirst({
    where: { numero: "DEV-2026-010" },
    select: { chantierId: true, clientId: true, chantier: { select: { nom: true } } },
  });
  if (!lhermRef) throw new Error("DEV-2026-010 introuvable !");
  const { chantierId, clientId } = lhermRef;
  console.log(`Chantier : ${lhermRef.chantier?.nom} (${chantierId})\n`);

  // ── 2. Générer le numéro DEV-2026-018 ────────────────────────────────────
  const annee = 2026;
  const existing = await prisma.devis.findMany({
    where: { numero: { startsWith: `DEV-${annee}-` } },
    select: { numero: true },
  });
  const maxN = existing.reduce((max, d) => {
    const n = parseInt(d.numero.split("-")[2] ?? "0", 10);
    return n > max ? n : max;
  }, 0);
  const nextNumero = `DEV-${annee}-${String(maxN + 1).padStart(3, "0")}`;
  console.log(`Numéro généré : ${nextNumero}`);

  // ── 3. Mettre à jour les objets des 3 devis représentatifs ───────────────
  const updates: Array<{ numero: string; suffix: string }> = [
    { numero: "DEV-2026-010", suffix: " – Offre ÉCONOMIQUE" },
    { numero: "DEV-2026-013", suffix: " – Offre OPTIMISÉE" },
    { numero: "DEV-2026-014", suffix: " – Offre COMPLÈTE" },
  ];

  for (const u of updates) {
    const dv = await prisma.devis.findUnique({ where: { numero: u.numero }, select: { id: true, objet: true } });
    if (!dv) { console.log(`WARN: ${u.numero} introuvable`); continue; }
    if (!dv.objet?.includes("ÉCONOMIQUE") && !dv.objet?.includes("OPTIMISÉE") && !dv.objet?.includes("COMPLÈTE")) {
      await prisma.devis.update({ where: { id: dv.id }, data: { objet: (dv.objet ?? "") + u.suffix } });
      console.log(`✓ ${u.numero} mis à jour → objet avec "${u.suffix.trim()}"`);
    } else {
      console.log(`  ${u.numero} déjà classifié, ignoré`);
    }
  }

  // ── 4. Créer la Variante 10 PREMIUM ───────────────────────────────────────
  const existingV10 = await prisma.devis.findFirst({ where: { chantierId, objet: { contains: "PREMIUM" } } });
  if (existingV10) {
    console.log(`\nVariante PREMIUM déjà existante (${existingV10.numero}), ignoré.`);
    return;
  }

  const v10 = await prisma.devis.create({
    data: {
      numero: nextNumero,
      statut: "BROUILLON",
      type: "INITIAL",
      dateCreation: new Date(),
      objet: "Réfection couverture garage LHERM – Variante 10 : Zinc TITANE-ZINC® PIGMENTO Ardoise – Offre PREMIUM",
      totalHT: PREMIUM_TOTAL_HT,
      totalTVA: PREMIUM_TVA,
      totalTTC: PREMIUM_TTC,
      mentionsLibres: `Description des ouvrages\n\nRéalisation d'une couverture PREMIUM en zinc TITANE-ZINC® PIGMENTO Ardoise à joint debout sur une surface de ${QTE} m².\n\nLe zinc TITANE-ZINC® PIGMENTO Ardoise est la référence haut de gamme de la gamme VMZINC : aspect ardoise naturelle profond, traitement de surface spécial résistance UV de haute intensité, épaisseur 0,70 mm, garantie fabricant 50 ans.\n\nPose à joint debout selon DTU 40.41, avec sous-couche asphalte 36R, tasseaux bois traités, pattes coulissantes inox AISI 316 et visserie inox. Finitions soignées : noues, solins, rives de pignon et faîtages façonnés en zinc de même teinte.\n\nCette offre inclut la coordination de chantier, l'autocontrôle qualité renforcé et la garantie décennale SDA Rénovation sur la pose.`,
      chantierId,
      clientId,
      lignes: {
        create: [
          // Ligne 1 — Installation (fixe)
          {
            ordre: 1, type: "LIGNE" as const,
            designation: ZINC_FIXED_LINES[0].designation,
            quantite: ZINC_FIXED_LINES[0].quantite,
            unite: "Forfait",
            prixUnitaireHT: ZINC_FIXED_LINES[0].prixUnitaireHT,
            tauxTVA: 20,
            totalHT: ZINC_FIXED_LINES[0].prixUnitaireHT,
          },
          // Ligne 2 — Matériau PREMIUM (variable)
          {
            ordre: 2, type: "LIGNE" as const,
            designation: `Fourniture de zinc TITANE-ZINC® PIGMENTO Ardoise® en rouleaux L=0,50 m, épaisseur 0,70 mm, à joint debout, gamme PREMIUM, traitement de surface haute résistance UV, aspect ardoise naturelle, garantie fabricant 50 ans, origine VMZ France – certification NF`,
            quantite: QTE,
            unite: "m²",
            prixUnitaireHT: PREMIUM_PU,
            tauxTVA: 20,
            totalHT: PREMIUM_MAT_TOTAL,
          },
          // Lignes 3→12 — Fixe zinc
          ...ZINC_FIXED_LINES.slice(1).map((l) => ({
            ordre: l.ordre, type: "LIGNE" as const,
            designation: l.designation,
            quantite: l.quantite,
            unite: l.quantite === 1 ? "Forfait" : "m²",
            prixUnitaireHT: l.prixUnitaireHT,
            tauxTVA: 20,
            totalHT: Math.round(l.prixUnitaireHT * l.quantite * 100) / 100,
          })),
          // Ligne 13 — Gestion (balancing line)
          {
            ordre: 13, type: "LIGNE" as const,
            designation: "Encadrement, gestion administrative, coordination, garantie décennale et assurances\nSuivi de chantier et réception des travaux",
            quantite: 1,
            unite: "Forfait",
            prixUnitaireHT: PREMIUM_GESTION,
            tauxTVA: 20,
            totalHT: PREMIUM_GESTION,
          },
          // Ligne 14 — Clauses et réserves
          {
            ordre: 14, type: "CLAUSE_RESERVE" as const,
            designation: "Clauses et réserves",
            clausesReserves: JSON.stringify(CLAUSES_ZINC_PREMIUM),
            quantite: null,
            unite: null,
            prixUnitaireHT: null,
            tauxTVA: null,
            totalHT: 0,
          },
        ],
      },
    },
    include: { lignes: true },
  });

  console.log(`\n✅ Variante 10 PREMIUM créée : ${v10.numero}`);
  console.log(`   Total HT : ${v10.totalHT.toLocaleString("fr-FR")} €`);
  console.log(`   Total TTC: ${v10.totalTTC.toLocaleString("fr-FR")} €`);
  console.log(`   Lignes   : ${v10.lignes.length}`);

  // Vérification finale
  const sommeLignes = v10.lignes.filter(l => l.type === "LIGNE").reduce((s, l) => s + (l.totalHT ?? 0), 0);
  const ecart = Math.abs(sommeLignes - PREMIUM_TOTAL_HT);
  if (ecart > 0.01) {
    console.log(`   ⚠️  Écart détecté : somme lignes = ${sommeLignes}, totalHT = ${PREMIUM_TOTAL_HT} (écart: ${ecart})`);
  } else {
    console.log(`   ✅ Somme lignes = totalHT (${sommeLignes.toLocaleString("fr-FR")} €)`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
