import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

const items = [
  { categorie: "MENUISERIE_INT", sousCategorie: "Portes intérieures", designation: "Porte intérieure isoplane", unite: "unité", matiere: "Bois", finition: "Peint blanc" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Portes intérieures", designation: "Porte intérieure pleine bois massif", unite: "unité", matiere: "Bois massif", finition: "Vernis naturel" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Placard & dressing", designation: "Dressing sur mesure", unite: "ml", matiere: "Mélaminé", finition: "Blanc mat" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Placard & dressing", designation: "Armoire encastrée 2 vantaux", unite: "unité", matiere: "Contreplaqué", finition: "Laqué" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Escaliers", designation: "Escalier bois droit", unite: "unité", matiere: "Chêne massif", finition: "Huilé" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Escaliers", designation: "Escalier métal-bois limon apparent", unite: "unité", matiere: "Acier + Bois", finition: "Thermolaqué noir" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Cloisons", designation: "Cloison bois agencement bureau", unite: "ml", matiere: "Contreplaqué", finition: "Stratifié" },
  { categorie: "MOBILIER", sousCategorie: "Salle de bain", designation: "Meuble vasque suspendu design 80cm", unite: "unité", matiere: "MDF laqué", finition: "Mat blanc" },
  { categorie: "MOBILIER", sousCategorie: "Salle de bain", designation: "Meuble vasque double vasque 120cm", unite: "unité", matiere: "Bois + Céramique", finition: "Bois naturel" },
  { categorie: "MOBILIER", sousCategorie: "Salle de bain", designation: "Colonne de rangement salle de bain", unite: "unité", matiere: "MDF", finition: "Laqué" },
  { categorie: "MOBILIER", sousCategorie: "Cuisine", designation: "Meuble bas de cuisine 60cm", unite: "unité", matiere: "Mélaminé", finition: "Chêne clair" },
  { categorie: "MOBILIER", sousCategorie: "Cuisine", designation: "Meuble haut de cuisine 60cm", unite: "unité", matiere: "Mélaminé", finition: "Blanc mat" },
  { categorie: "MOBILIER", sousCategorie: "Plan de travail", designation: "Plan de travail stratifié 38mm", unite: "ml", matiere: "Stratifié", finition: "Uni blanc" },
  { categorie: "MOBILIER", sousCategorie: "Plan de travail", designation: "Plan de travail béton ciré", unite: "ml", matiere: "Béton ciré", finition: "Ciré gris" },
  { categorie: "MATERIAUX", sousCategorie: "Béton décoratif", designation: "Béton désactivé", unite: "m²", matiere: "Béton", finition: "Désactivé" },
  { categorie: "MATERIAUX", sousCategorie: "Béton décoratif", designation: "Béton ciré sol intérieur", unite: "m²", matiere: "Béton", finition: "Ciré" },
  { categorie: "MATERIAUX", sousCategorie: "Béton décoratif", designation: "Béton lissé tolérance 2mm/2m", unite: "m²", matiere: "Béton", finition: "Lissé" },
  { categorie: "MATERIAUX", sousCategorie: "Béton décoratif", designation: "Béton quartz anti-dérapant", unite: "m²", matiere: "Béton quartz", finition: "Quartz" },
  { categorie: "MATERIAUX", sousCategorie: "Béton décoratif", designation: "Béton taloché finition lisse", unite: "m²", matiere: "Béton", finition: "Taloché" },
  { categorie: "MATERIAUX", sousCategorie: "Bois", designation: "Parquet massif chêne 14mm", unite: "m²", matiere: "Chêne massif", finition: "Huilé naturel" },
  { categorie: "MATERIAUX", sousCategorie: "Bois", designation: "Parquet contrecollé chêne 15mm", unite: "m²", matiere: "Chêne", finition: "Verni mat" },
  { categorie: "MATERIAUX", sousCategorie: "Bois", designation: "Lambris bois pin naturel", unite: "m²", matiere: "Pin", finition: "Vernis naturel" },
  { categorie: "MATERIAUX", sousCategorie: "Métal & acier", designation: "Plaque acier brut", unite: "m²", matiere: "Acier", finition: "Brut" },
  { categorie: "MATERIAUX", sousCategorie: "Métal & acier", designation: "Plaque acier thermolaqué", unite: "m²", matiere: "Acier", finition: "Thermolaqué noir mat" },
  { categorie: "MATERIAUX", sousCategorie: "Métal & acier", designation: "Tôle galvanisée", unite: "m²", matiere: "Acier galvanisé", finition: "Galvanisé" },
  { categorie: "MATERIAUX", sousCategorie: "Cuivre & laiton", designation: "Feuille de cuivre 0.6mm", unite: "m²", matiere: "Cuivre", finition: "Naturel" },
  { categorie: "MATERIAUX", sousCategorie: "Cuivre & laiton", designation: "Profilé laiton brossé", unite: "ml", matiere: "Laiton", finition: "Brossé" },
  { categorie: "MATERIAUX", sousCategorie: "Cuivre & laiton", designation: "Rosace dorée laiton", unite: "unité", matiere: "Laiton", finition: "Poli brillant" },
  { categorie: "MATERIAUX", sousCategorie: "Panneaux", designation: "Contreplaqué okoumé 15mm", unite: "m²", matiere: "Contreplaqué" },
  { categorie: "MATERIAUX", sousCategorie: "Panneaux", designation: "Panneau mélaminé blanc 19mm", unite: "m²", matiere: "Mélaminé", finition: "Blanc mat" },
  { categorie: "MATERIAUX", sousCategorie: "Panneaux", designation: "Panneau stratifié HPL 6mm", unite: "m²", matiere: "Stratifié HPL" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Fenêtres", designation: "Fenêtre PVC double vitrage 2V", unite: "unité", matiere: "PVC", finition: "Blanc" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Fenêtres", designation: "Fenêtre aluminium rupture pont thermique", unite: "unité", matiere: "Aluminium", finition: "Thermolaqué RAL 7016" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Portes", designation: "Porte entrée aluminium sécurisée", unite: "unité", matiere: "Aluminium", finition: "Thermolaqué" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Portes", designation: "Porte de garage basculante", unite: "unité", matiere: "Acier", finition: "Laqué" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Baies & coulissants", designation: "Baie vitrée coulissante aluminium", unite: "unité", matiere: "Aluminium", finition: "RAL 7016" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Volets", designation: "Volet roulant aluminium motorisé", unite: "unité", matiere: "Aluminium" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Volets", designation: "Volet battant PVC", unite: "unité", matiere: "PVC", finition: "Blanc" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Vélux & coupoles", designation: "Fenêtre de toit VELUX", unite: "unité", matiere: "Bois + Alu" },
  { categorie: "CHARPENTE", sousCategorie: "Charpente traditionnelle", designation: "Chevron 63x150 sapin traité", unite: "ml", matiere: "Sapin traité" },
  { categorie: "CHARPENTE", sousCategorie: "Charpente traditionnelle", designation: "Faîtage bois sapin 75x100", unite: "ml", matiere: "Sapin" },
  { categorie: "CHARPENTE", sousCategorie: "Charpente traditionnelle", designation: "Fermette industrielle standard", unite: "unité", matiere: "Sapin" },
  { categorie: "CHARPENTE", sousCategorie: "Ossature bois", designation: "Ossature bois montant 45x120", unite: "ml", matiere: "Douglas" },
  { categorie: "CHARPENTE", sousCategorie: "Charpente métallique", designation: "Poutrelle acier HEA 140", unite: "ml", matiere: "Acier" },
  { categorie: "CHARPENTE", sousCategorie: "Charpente métallique", designation: "Poutrelle acier IPE 200", unite: "ml", matiere: "Acier" },
  { categorie: "CHARPENTE", sousCategorie: "Accessoires", designation: "Connecteur métallique charpente", unite: "unité", matiere: "Acier galvanisé" },
  { categorie: "COUVERTURE", sousCategorie: "Tuiles", designation: "Tuile terre cuite canal", unite: "m²", matiere: "Terre cuite" },
  { categorie: "COUVERTURE", sousCategorie: "Tuiles", designation: "Tuile béton double-romane", unite: "m²", matiere: "Béton" },
  { categorie: "COUVERTURE", sousCategorie: "Ardoises", designation: "Ardoise naturelle 32x22cm", unite: "m²", matiere: "Ardoise naturelle" },
  { categorie: "COUVERTURE", sousCategorie: "Bac acier", designation: "Bac acier nervuré isolé", unite: "m²", matiere: "Acier galvanisé" },
  { categorie: "COUVERTURE", sousCategorie: "Membrane étanchéité", designation: "Membrane EPDM 1.2mm", unite: "m²", matiere: "EPDM" },
  { categorie: "COUVERTURE", sousCategorie: "Zingerie", designation: "Gouttière demi-ronde zinc", unite: "ml", matiere: "Zinc" },
  { categorie: "COUVERTURE", sousCategorie: "Zingerie", designation: "Descente eau pluviale zinc D80", unite: "ml", matiere: "Zinc" },
  { categorie: "COUVERTURE", sousCategorie: "Zingerie", designation: "Noquet zinc solin", unite: "ml", matiere: "Zinc" },
  { categorie: "COUVERTURE", sousCategorie: "Zingerie", designation: "Faîtière zinc avec closoir", unite: "ml", matiere: "Zinc" },
  { categorie: "RAVALEMENT", sousCategorie: "Enduits", designation: "Enduit monocouche finition grattée", unite: "m²", finition: "Grattée" },
  { categorie: "RAVALEMENT", sousCategorie: "Enduits", designation: "Enduit monocouche finition talochée", unite: "m²", finition: "Talochée" },
  { categorie: "RAVALEMENT", sousCategorie: "Enduits", designation: "Enduit projeté finition rustique", unite: "m²", finition: "Rustique" },
  { categorie: "RAVALEMENT", sousCategorie: "ITE", designation: "Isolation thermique extérieure polystyrène 100mm", unite: "m²", matiere: "Polystyrène EPS" },
  { categorie: "RAVALEMENT", sousCategorie: "ITE", designation: "ITE laine de roche 140mm", unite: "m²", matiere: "Laine de roche" },
  { categorie: "RAVALEMENT", sousCategorie: "Peinture façade", designation: "Peinture siloxane hydrofuge", unite: "m²", finition: "Lisse satiné" },
  { categorie: "RAVALEMENT", sousCategorie: "Pierre", designation: "Ravalement pierre naturelle rejointoiement", unite: "m²", matiere: "Pierre naturelle" },
  { categorie: "RAVALEMENT", sousCategorie: "Bardage", designation: "Bardage bois Douglas vertical", unite: "m²", matiere: "Douglas", finition: "Naturel" },
  { categorie: "RAVALEMENT", sousCategorie: "Bardage", designation: "Bardage composite fibro-ciment", unite: "m²", matiere: "Fibro-ciment" },
  { categorie: "MATIERES_PREM", sousCategorie: "Granulats", designation: "Sable de construction 0/4", unite: "tonne", matiere: "Sable" },
  { categorie: "MATIERES_PREM", sousCategorie: "Granulats", designation: "Gravier 0/20 concassé", unite: "tonne", matiere: "Gravier" },
  { categorie: "MATIERES_PREM", sousCategorie: "Granulats", designation: "Gravier 6/20 roulé", unite: "tonne", matiere: "Gravier" },
  { categorie: "MATIERES_PREM", sousCategorie: "Granulats", designation: "Gravillons décoratifs 8/16", unite: "tonne", matiere: "Gravillons" },
  { categorie: "MATIERES_PREM", sousCategorie: "Géotextile", designation: "Géotextile non tissé 150g/m²", unite: "m²", matiere: "Polypropylène" },
  { categorie: "MATIERES_PREM", sousCategorie: "Géotextile", designation: "Géomembrane PEHD 1mm", unite: "m²", matiere: "PEHD" },
  { categorie: "MATIERES_PREM", sousCategorie: "Liants", designation: "Ciment CEM II 42.5 sac 25kg", unite: "sac", matiere: "Ciment" },
  { categorie: "MATIERES_PREM", sousCategorie: "Liants", designation: "Chaux hydraulique naturelle NHL5", unite: "sac", matiere: "Chaux" },
  { categorie: "PLOMBERIE", sousCategorie: "Tuyauterie", designation: "Tube PER multicouche 16mm", unite: "ml", matiere: "PER" },
  { categorie: "PLOMBERIE", sousCategorie: "Tuyauterie", designation: "Tube cuivre 16x18mm", unite: "ml", matiere: "Cuivre" },
  { categorie: "PLOMBERIE", sousCategorie: "Tuyauterie", designation: "Tube PVC évacuation D100", unite: "ml", matiere: "PVC" },
  { categorie: "PLOMBERIE", sousCategorie: "Sanitaires", designation: "WC suspendu céramique blanc", unite: "unité", matiere: "Céramique", finition: "Blanc" },
  { categorie: "PLOMBERIE", sousCategorie: "Sanitaires", designation: "Lavabo à poser céramique", unite: "unité", matiere: "Céramique" },
  { categorie: "PLOMBERIE", sousCategorie: "Sanitaires", designation: "Vasque à encastrer ronde", unite: "unité", matiere: "Céramique" },
  { categorie: "PLOMBERIE", sousCategorie: "Sanitaires", designation: "Douche italienne bac receveur", unite: "unité" },
  { categorie: "PLOMBERIE", sousCategorie: "Sanitaires", designation: "Baignoire acrylique 170x70cm", unite: "unité", matiere: "Acrylique" },
  { categorie: "PLOMBERIE", sousCategorie: "Robinetterie", designation: "Mitigeur lavabo chromé", unite: "unité", matiere: "Laiton", finition: "Chromé" },
  { categorie: "PLOMBERIE", sousCategorie: "Robinetterie", designation: "Mitigeur douche thermostatique", unite: "unité", matiere: "Laiton", finition: "Chromé" },
  { categorie: "PLOMBERIE", sousCategorie: "Robinetterie", designation: "Robinet cuisine mitigeur", unite: "unité", matiere: "Laiton" },
  { categorie: "PLOMBERIE", sousCategorie: "Eau chaude", designation: "Chauffe-eau thermodynamique 200L", unite: "unité" },
  { categorie: "PLOMBERIE", sousCategorie: "Eau chaude", designation: "Ballon eau chaude 300L", unite: "unité" },
  { categorie: "CVC", sousCategorie: "Chauffage", designation: "Chaudière à condensation gaz", unite: "unité" },
  { categorie: "CVC", sousCategorie: "Chauffage", designation: "Chaudière biomasse granulés 20kW", unite: "unité" },
  { categorie: "CVC", sousCategorie: "Chauffage", designation: "Pompe à chaleur air/eau 8kW", unite: "unité" },
  { categorie: "CVC", sousCategorie: "Chauffage", designation: "Radiateur acier eau chaude", unite: "unité", matiere: "Acier" },
  { categorie: "CVC", sousCategorie: "Chauffage", designation: "Plancher chauffant hydraulique", unite: "m²" },
  { categorie: "CVC", sousCategorie: "Climatisation", designation: "Unité intérieure split system 2.5kW", unite: "unité" },
  { categorie: "CVC", sousCategorie: "Climatisation", designation: "Unité extérieure climatiseur", unite: "unité" },
  { categorie: "CVC", sousCategorie: "VMC", designation: "VMC simple flux autoréglable", unite: "unité" },
  { categorie: "CVC", sousCategorie: "VMC", designation: "VMC double flux avec échangeur", unite: "unité" },
  { categorie: "CVC", sousCategorie: "VMC", designation: "Bouche extraction VMC cuisine", unite: "unité" },
  { categorie: "CVC", sousCategorie: "VMC", designation: "Gaine souple VMC D125mm", unite: "ml" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Prise courant 2P+T encastrée", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Double prise courant 2P+T", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Prise USB Type-C encastrée", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Interrupteur va-et-vient simple", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Interrupteur double allumage", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Variateur éclairage LED", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Tableau électrique", designation: "Tableau électrique 13 modules mono", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Tableau électrique", designation: "Tableau électrique 26 modules mono", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Tableau électrique", designation: "Disjoncteur différentiel 30mA type AC", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Tableau électrique", designation: "Disjoncteur divisionnaire 16A", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Câblage", designation: "Câble électrique HO7VU 2.5mm rouge", unite: "ml" },
  { categorie: "ELECTRICITE", sousCategorie: "Câblage", designation: "Câble électrique HO7VU 1.5mm bleu", unite: "ml" },
  { categorie: "ELECTRICITE", sousCategorie: "Câblage", designation: "Câble VDI catégorie 6 RJ45", unite: "ml" },
  { categorie: "ELECTRICITE", sousCategorie: "Éclairage", designation: "Spot encastré LED 7W", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Éclairage", designation: "Plafonnier LED 24W", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Domotique", designation: "Module domotique KNX", unite: "unité" },
];

async function main() {
  const existing = await prisma.elementCatalogue.count();
  if (existing > 0) {
    console.log("Catalogue déjà rempli:", existing, "éléments.");
    await prisma.$disconnect();
    return;
  }
  await prisma.elementCatalogue.createMany({ data: items });
  console.log("OK:", items.length, "éléments BTP insérés.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
