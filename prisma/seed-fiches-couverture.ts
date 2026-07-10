import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const fiches = [
  {
    categorie: "PRODUIT",
    corpsEtat: "COV",
    designation: "Guide de Pose — Tuiles Terre Cuite Grands Moules du Nord et Petits Moules",
    marque: "Terreal",
    reference: "Grands Moules du Nord / Petits Moules",
    description:
      "Méthodologie complète de pose des tuiles terre cuite Grands Moules du Nord et Petits Moules — Terreal. " +
      "\n\nPRINCIPES DE POSE :\n" +
      "Pose débutant par le rang d'égout à partir de la droite, conduite droite ou en échiquette. " +
      "Égout droit sans/avec bande métallique, avec écran de sous-toiture. " +
      "\n\nFAÎTAGE :\n" +
      "• À sec avec closoir Lahe-Roll (obligatoire — DTU 40.21 et 40.211). " +
      "Closoir déroulé et centré sur lisse de faîtage, fixé tous les 30 cm, recouvrement 5 cm entre rouleaux. " +
      "Faîtières dans le sens opposé aux vents dominants, fixation par vis ou clips. " +
      "• À sec avec sous-faîtières (Mercurey, Tuile Z) — évite la découpe des tuiles d'approche, ventilation naturelle. " +
      "• Au mortier de chaux ou bâtard — éléments terre cuite mouillés jusqu'à refus. " +
      "\n\nARÊTIERS :\n" +
      "• Avec closoir souple ventilé Lahe-Roll ou Lahe-First (tuiles à relief). " +
      "• Avec closoir (tuiles d'aspect plat) : latte plâtrière 5 mm, pose en dévirure, joint mastic SNIF 1ère catégorie. " +
      "• Au mortier de chaux ou bâtard, tuiles tronçonnées parallèles à l'axe de la rehausse. " +
      "\n\nCLOSOIRS :\n" +
      "Souples Lahe-Roll (ALU) : largeurs 210/280/320/370 mm, longueurs 5 et 10 m. " +
      "Rigides Lahe-Pro : largeurs 90/120/140 mm — matières acier galvanisé, zinc, plomb, alu — longueur 2 m. " +
      "Nuanciers : Plomb naturel, Vieillis (Terre, Ocre, Sable, Rose), Unis (Beige, Rose, Rouge, Brun, Noir, Ardoisé). " +
      "Garantie 10 ans. " +
      "\n\nNOUES :\n" +
      "100% métallique (zinc, alu zinc, acier galva laqué). " +
      "Noue à fixation ou noue auto-porteuse. " +
      "Recouvrement tuile/métal ≥ 8 cm. Distance rives tranchées ≥ 8 cm. " +
      "Coloris : prélaqué rouge/beige/ardoisé, alu zinc, zinc naturel, zinc prépatiné. " +
      "\n\nRIVES :\n" +
      "Rives individuelles à rabat, universelles ou traditionnelles (tuiles à relief ou d'aspect plat). " +
      "Rives shed 100% terre cuite pour rives de tête sans dépassement de mur (Renaissance, Résidence, La Gauloise). " +
      "\n\nBARDAGE TUILES TERRE CUITE (Volnay PV) :\n" +
      "Fixation : 2 vis inox/galva + crochet Terreal réf. 99 XT. " +
      "Résistance choc Q3 (RDC). Résistance vent : 1000 Pa. Zones sismiques 1 et 2 (cat I et II). " +
      "\n\nENTRETIEN :\n" +
      "Enlèvement mousses/végétations. Entretien évacuations EP, solins, souches de cheminée. " +
      "Ventilation sous-face des tuiles maintenue.",
    normes:
      "DTU 40.21 (tuiles terre cuite à emboîtement ou à glissement à pureau plat) | " +
      "DTU 40.211 (mise à jour — closoir en arêtier et faîtage obligatoire à sec) | " +
      "DTU 40.22 (tuiles terre cuite à emboîtement à pureau plat — annexe 3 panachage) | " +
      "NV65 + EUROCODE 1 EN1991 (vent) | P08301 + P08302 (chocs) | " +
      "Cahier CSTB n° 3163 (revêtir) | Cahier CSTB n° 2929 | Cahier CSTB n° 3725 jan. 2013 + EUROCODE 8 EN1998 (séisme) | " +
      "Guide CSTB n° 3316 (ossature bois bardage)",
    lienUrl: "https://www.terreal.com",
    actif: true,
  },
];

async function main() {
  console.log("Insertion des fiches techniques Couverture…");
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
