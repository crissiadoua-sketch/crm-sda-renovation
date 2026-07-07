import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const CLIENT_ID = "cmr59k4io000004ih7mosv8mr";
const TVA = 10;

function nextDocNum(prefix: string, existingNums: string[], pad = 3): string {
  const year = new Date().getFullYear();
  const base = `${prefix}-${year}-`;
  const nums = existingNums
    .filter((n) => n.startsWith(base))
    .map((n) => parseInt(n.slice(base.length), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${base}${String(next).padStart(pad, "0")}`;
}

type Variant = {
  varianteNum: number;
  materiau: string;
  descriptionMateriau: string;
  materialCost: number;
};

const VARIANTS: Variant[] = [
  {
    varianteNum: 2,
    materiau: "Bac Acier Confort 80mm",
    descriptionMateriau:
      "Fourniture et pose de panneau bac acier nervuré avec isolation intégrée, gamme CONFORT, épaisseur totale 80 mm. " +
      "Composition : parement extérieur en acier galvanisé (AZ185) prélaqué polyester mat (25 µm), nervures Ht 50 mm pas 333 mm ; " +
      "âme isolante laine de roche 80 kg/m³, λ = 0,036 W/(m·K), R = 2,15 m²·K/W ; " +
      "parement intérieur acier galvanisé prélaqué blanc. " +
      "Épaisseur acier 0,75 mm. Coloris extérieur au choix dans la gamme standard. " +
      "Incl. rivets inox, vis auto-perceusesinox, bandes d'étanchéité, bavettes alu de rive et de faîtage. " +
      "Surface à couvrir : 94 m².",
    materialCost: 10500,
  },
  {
    varianteNum: 3,
    materiau: "Bac Acier Performance 80mm",
    descriptionMateriau:
      "Fourniture et pose de panneau bac acier nervuré avec isolation haute performance, gamme PERFORMANCE, épaisseur totale 80 mm. " +
      "Composition : parement extérieur en acier galvanisé (AZ185) prélaqué Pvdf (35 µm) résistance renforcée aux UV et aux intempéries ; " +
      "nervures Ht 50 mm pas 333 mm ; âme isolante laine de roche haute densité 100 kg/m³, λ = 0,034 W/(m·K), R = 2,30 m²·K/W ; " +
      "parement intérieur acier galvanisé prélaqué blanc. " +
      "Épaisseur acier 0,75 mm. Garantie fabricant 25 ans sur le revêtement extérieur. " +
      "Incl. rivets inox, vis auto-perceuses inox, bandes d'étanchéité butyl, bavettes alu de rive et de faîtage. " +
      "Surface à couvrir : 94 m².",
    materialCost: 12340,
  },
  {
    varianteNum: 4,
    materiau: "Bac Acier Essentielle 100mm",
    descriptionMateriau:
      "Fourniture et pose de panneau sandwich isolé toiture, gamme ESSENTIELLE, épaisseur totale 100 mm. " +
      "Composition : parement extérieur acier galvanisé (Z275) prélaqué polyester standard (25 µm) ; " +
      "âme polyuréthane PIR 40 kg/m³ sans fréon, λ = 0,022 W/(m·K), R = 4,50 m²·K/W (Rt ≥ 4,5 selon RT2012) ; " +
      "parement intérieur acier galvanisé prélaqué blanc finition lisse. " +
      "Épaisseur acier 0,50 mm. Profilé mini-nervure extérieur. " +
      "Incl. vis autoperceuses tête hexagonale inox + rondelle EPDM, bandes butyl, faîtières et rives aluminium laqué. " +
      "Surface à couvrir : 94 m².",
    materialCost: 11800,
  },
  {
    varianteNum: 5,
    materiau: "Bac Acier Confort 100mm",
    descriptionMateriau:
      "Fourniture et pose de panneau sandwich isolé toiture, gamme CONFORT, épaisseur totale 100 mm. " +
      "Composition : parement extérieur acier galvanisé (AZ185) prélaqué polyester mat (25 µm) ; " +
      "âme polyuréthane PIR 42 kg/m³ sans halogènes, λ = 0,021 W/(m·K), R = 4,75 m²·K/W ; " +
      "parement intérieur acier galvanisé prélaqué blanc micro-nervuré. " +
      "Épaisseur acier 0,75 mm. Profil grande nervure Ht 40 mm pas 200 mm. " +
      "Résistance au vent catégorie 3. Incl. visserie inox, bavettes d'étanchéité, faîtières et rives alu. " +
      "Surface à couvrir : 94 m².",
    materialCost: 13650,
  },
  {
    varianteNum: 6,
    materiau: "Bac Acier Performance 100mm",
    descriptionMateriau:
      "Fourniture et pose de panneau sandwich isolé toiture, gamme PERFORMANCE, épaisseur totale 100 mm. " +
      "Composition : parement extérieur acier galvanisé (AZ185) prélaqué Pvdf haut de gamme (35 µm), résistance UV classe 1 ; " +
      "âme polyuréthane PIR haute densité 44 kg/m³, λ = 0,021 W/(m·K), R = 4,75 m²·K/W, réaction au feu B-s1, d0 ; " +
      "parement intérieur acier galvanisé prélaqué blanc lisse. " +
      "Épaisseur acier 0,75 mm. Profil trapezoïdal 45/250. Garantie 30 ans revêtement extérieur. " +
      "Incl. visserie inox A2, bandes butyl hautes performances, faîtières et rives aluminium anodisé. " +
      "Surface à couvrir : 94 m².",
    materialCost: 15400,
  },
  {
    varianteNum: 7,
    materiau: "Zinc Joint Debout - Quartz-Zinc",
    descriptionMateriau:
      "Fourniture et pose d'une couverture en zinc à joint debout, zinc naturel QUARTZ-ZINC®, teinte gris ardoise naturelle. " +
      "Matériau : zinc laminé 99,995% de pureté, épaisseur 0,80 mm (densité 7,2 kg/m²), rouleaux format L=0,50 m. " +
      "Mise en œuvre : tasseaux bois résineux raboté 60×40 mm traité autoclave classe 2, entraxe ≤ 600 mm ; " +
      "sous-couche asphalte 36R selon NF EN 13969 ; " +
      "joints debout sertis mécaniquement à la machine à border, hauteur joint 25 mm ; " +
      "fixation par pattes coulissantes en inox AISI 316, espacement 500 mm (permettant dilatation thermique libre). " +
      "Finitions : solins, rive gauche/droite et égout en zinc, noue soudée étain/plomb. " +
      "Surface à couvrir : 94 m².",
    materialCost: 31060,
  },
  {
    varianteNum: 8,
    materiau: "Zinc Joint Debout - Anthra-Zinc",
    descriptionMateriau:
      "Fourniture et pose d'une couverture en zinc à joint debout, zinc prélaqué ANTHRA-ZINC®, finition gris anthracite mat satiné (RAL 7016 approx.). " +
      "Matériau : zinc laminé 99,995% de pureté, épaisseur 0,80 mm, couche organique polyuréthane intérieure et extérieure ; " +
      "rouleaux format L=0,50 m, garantie fabricant 10 ans sur le revêtement. " +
      "Mise en œuvre : tasseaux bois résineux raboté 60×40 mm traité autoclave classe 2, entraxe ≤ 600 mm ; " +
      "sous-couche asphalte 36R selon NF EN 13969 ; " +
      "joints debout sertis mécaniquement, hauteur joint 25 mm ; " +
      "fixation par pattes coulissantes inox AISI 316, espacement 500 mm. " +
      "Finitions : solins, rives et égout en zinc Anthra, noue soudée. " +
      "Surface à couvrir : 94 m².",
    materialCost: 33500,
  },
  {
    varianteNum: 9,
    materiau: "Zinc Joint Debout - Noir Prestige",
    descriptionMateriau:
      "Fourniture et pose d'une couverture en zinc à joint debout, zinc prélaqué NOIR PRESTIGE®, finition noir profond mat haut de gamme. " +
      "Matériau : zinc laminé 99,995% de pureté, épaisseur 0,80 mm, revêtement organique spécial noir profond thermostable, " +
      "résistance supérieure aux UV et aux dilatations thermiques extrêmes ; rouleaux format L=0,50 m. " +
      "Mise en œuvre : tasseaux bois résineux raboté 60×40 mm traité autoclave classe 2, entraxe ≤ 600 mm ; " +
      "sous-couche asphalte 36R selon NF EN 13969 ; " +
      "joints debout sertis mécaniquement haute précision, hauteur joint 30 mm (esthétique premium) ; " +
      "fixation par pattes coulissantes inox AISI 316 L, espacement 450 mm. " +
      "Finitions premium : solins sur mesure, rives et faîtage gainés zinc Noir Prestige, coutures soudées TIG. " +
      "Surface à couvrir : 94 m².",
    materialCost: 37350,
  },
];

function buildLignes(
  devisId: string,
  variant: Variant,
): {
  devisId: string;
  type: string;
  ordre: number;
  designation: string;
  unite: string | null;
  quantite: number | null;
  prixUnitaireHT: number | null;
  tauxTVA: number | null;
  totalHT: number | null;
}[] {
  return [
    // ── Chapitre 1 ──────────────────────────────────────────────────────────
    {
      devisId,
      type: "CHAPITRE",
      ordre: 1,
      designation: "PRÉPARATION ET INSTALLATION DU CHANTIER",
      unite: null,
      quantite: null,
      prixUnitaireHT: null,
      tauxTVA: null,
      totalHT: null,
    },
    {
      devisId,
      type: "LIGNE",
      ordre: 2,
      designation:
        "Installation et sécurisation du chantier\n" +
        "Mise en place de la signalisation de sécurité et de la clôture de chantier, " +
        "installation des équipements de levage (échafaudages, nacelle si nécessaire), " +
        "vérification des accès et des zones de stockage des matériaux.",
      unite: "FF",
      quantite: 1,
      prixUnitaireHT: 200,
      tauxTVA: TVA,
      totalHT: 200,
    },
    {
      devisId,
      type: "LIGNE",
      ordre: 3,
      designation:
        "Mise en place des protections et bâches de sécurité\n" +
        "Pose de bâches de protection sur les éléments de façade et les ouvertures, " +
        "protection des équipements au sol contre les chutes de matériaux, " +
        "installation des filets de protection anti-chute conformes à la réglementation chantier.",
      unite: "FF",
      quantite: 1,
      prixUnitaireHT: 200,
      tauxTVA: TVA,
      totalHT: 200,
    },
    {
      devisId,
      type: "LIGNE",
      ordre: 4,
      designation:
        "Manutention et évacuation des matériaux anciens\n" +
        "Dépose soigneuse des éléments de couverture existants, tri sélectif des matériaux, " +
        "chargement et évacuation en déchetterie agréée, nettoyage de la surface avant pose de la nouvelle couverture.",
      unite: "FF",
      quantite: 1,
      prixUnitaireHT: 200,
      tauxTVA: TVA,
      totalHT: 200,
    },

    // ── Chapitre 2 ──────────────────────────────────────────────────────────
    {
      devisId,
      type: "CHAPITRE",
      ordre: 5,
      designation: `FOURNITURE DU MATÉRIAU DE COUVERTURE – ${variant.materiau.toUpperCase()}`,
      unite: null,
      quantite: null,
      prixUnitaireHT: null,
      tauxTVA: null,
      totalHT: null,
    },
    {
      devisId,
      type: "LIGNE",
      ordre: 6,
      designation: variant.descriptionMateriau,
      unite: "FF",
      quantite: 1,
      prixUnitaireHT: variant.materialCost,
      tauxTVA: TVA,
      totalHT: variant.materialCost,
    },

    // ── Chapitre 3 ──────────────────────────────────────────────────────────
    {
      devisId,
      type: "CHAPITRE",
      ordre: 7,
      designation: "POSE ET FIXATION DE LA COUVERTURE",
      unite: null,
      quantite: null,
      prixUnitaireHT: null,
      tauxTVA: null,
      totalHT: null,
    },
    {
      devisId,
      type: "LIGNE",
      ordre: 8,
      designation:
        "Pose et fixation de la couverture\n" +
        "Mise en œuvre complète du matériau de couverture selon les DTU applicables " +
        "(DTU 40.35 pour bac acier, DTU 40.41 pour zinc joint debout), " +
        "respect des pentes minimales, des recouvrements et des prescriptions du fabricant. " +
        "Contrôle de l'alignement et du niveau en cours de pose.",
      unite: "FF",
      quantite: 1,
      prixUnitaireHT: 1500,
      tauxTVA: TVA,
      totalHT: 1500,
    },
    {
      devisId,
      type: "LIGNE",
      ordre: 9,
      designation:
        "Installation des fixations, chevilles et pattes de maintien\n" +
        "Pose des fixations mécaniques adaptées à la structure support (bois, acier ou béton) : " +
        "vis auto-perceuses inox A2 ou A4 avec rondelles EPDM pour bac acier, " +
        "pattes coulissantes inox pour zinc, en nombre et espacement conformes aux calculs de résistance au vent. " +
        "Fournitures de fixation incluses dans le prix matériau (chapitre 2).",
      unite: "FF",
      quantite: 1,
      prixUnitaireHT: 400,
      tauxTVA: TVA,
      totalHT: 400,
    },
    {
      devisId,
      type: "LIGNE",
      ordre: 10,
      designation:
        "Réalisation des recouvrements latéraux et de rive\n" +
        "Exécution des recouvrements longitudinaux et transversaux selon prescriptions fabricant, " +
        "pose des rives gauche et droite, faîtages, égouts et chéneaux en matériau assorti, " +
        "découpe et ajustement sur mesure en rive de pignon et en about de toit.",
      unite: "FF",
      quantite: 1,
      prixUnitaireHT: 300,
      tauxTVA: TVA,
      totalHT: 300,
    },
    {
      devisId,
      type: "LIGNE",
      ordre: 11,
      designation:
        "Application des joints d'étanchéité et sellage des jonctions\n" +
        "Pose des bandes butyl auto-adhésives en zone de recouvrement, " +
        "application de mastic bi-composant sur les jonctions verticales (noues, acrotères), " +
        "traitement des points singuliers (lucarne, sortie de toit, conduit de fumée si présent).",
      unite: "FF",
      quantite: 1,
      prixUnitaireHT: 200,
      tauxTVA: TVA,
      totalHT: 200,
    },

    // ── Chapitre 4 ──────────────────────────────────────────────────────────
    {
      devisId,
      type: "CHAPITRE",
      ordre: 12,
      designation: "FINITIONS ET RÉCEPTION",
      unite: null,
      quantite: null,
      prixUnitaireHT: null,
      tauxTVA: null,
      totalHT: null,
    },
    {
      devisId,
      type: "LIGNE",
      ordre: 13,
      designation:
        "Finitions, ragréage et nettoyage\n" +
        "Retouches de peinture sur éventuels impacts de montage, " +
        "vérification et resserrage de toutes les fixations visibles, " +
        "nettoyage complet de la toiture (déblaiement des chutes de matériaux, soufflage), " +
        "nettoyage de l'emprise chantier et évacuation des emballages.",
      unite: "FF",
      quantite: 1,
      prixUnitaireHT: 300,
      tauxTVA: TVA,
      totalHT: 300,
    },
    {
      devisId,
      type: "LIGNE",
      ordre: 14,
      designation:
        "Contrôle qualité, test d'étanchéité et réception de chantier\n" +
        "Inspection visuelle complète de l'ensemble de la toiture, " +
        "vérification des points singuliers et de l'étanchéité aux débords, " +
        "test d'arrosage sur les zones sensibles, " +
        "rédaction du procès-verbal de réception contradictoire, " +
        "remise des fiches techniques et garanties fabricant.",
      unite: "FF",
      quantite: 1,
      prixUnitaireHT: 200,
      tauxTVA: TVA,
      totalHT: 200,
    },
  ];
}

async function main() {
  // ── Collect existing numbers ───────────────────────────────────────────
  const [existingChantiers, existingDevis] = await Promise.all([
    prisma.chantier.findMany({ select: { reference: true } }),
    prisma.devis.findMany({ select: { numero: true } }),
  ]);

  const chantierRefs = existingChantiers.map((c) => c.reference);
  const devisNums = existingDevis.map((d) => d.numero);

  // Detect CH padding from existing references
  const chSample = chantierRefs.find((r) => r.startsWith("CH-"));
  const chPad = chSample ? chSample.split("-")[2]?.length ?? 3 : 3;
  const chantierRef = nextDocNum("CH", chantierRefs, chPad);

  // ── Create chantier ───────────────────────────────────────────────────
  const chantier = await prisma.chantier.create({
    data: {
      reference: chantierRef,
      nom: "Couverture Garage - LHERM",
      clientId: CLIENT_ID,
      adresse: "LHERM",
      ville: "Lherm",
      codePostal: "31600",
      statut: "DEVIS_ENVOYE",
      description:
        "Réfection complète de la couverture du garage – surface 94 m². " +
        "9 variantes proposées (bac acier isolé et zinc joint debout). " +
        "TVA 10% applicable (travaux de rénovation sur bâtiment existant).",
    },
  });
  console.log(`✓ Chantier créé : ${chantierRef}  id=${chantier.id}`);

  // ── Create 8 devis (variants 2-9) ─────────────────────────────────────
  const createdNums: string[] = [...devisNums];

  for (const variant of VARIANTS) {
    const numero = nextDocNum("DEV", createdNums);
    createdNums.push(numero);

    const totalHT = 3500 + variant.materialCost;
    const totalTVA = Math.round(totalHT * TVA) / 100;
    const totalTTC = totalHT + totalTVA;

    const dateValidite = new Date();
    dateValidite.setMonth(dateValidite.getMonth() + 3);

    const devis = await prisma.devis.create({
      data: {
        numero,
        chantierId: chantier.id,
        clientId: CLIENT_ID,
        statut: "ENVOYE",
        type: "VARIANTE",
        objet: `Réfection couverture garage LHERM – Variante ${variant.varianteNum} : ${variant.materiau}`,
        dateValidite,
        delaiExecution: "4 à 6 semaines à compter de la commande",
        modaliteReglement:
          "30 % à la commande – 40 % à mi-avancement – 30 % à la réception",
        totalHT,
        totalTVA,
        totalTTC,
      },
    });

    const lignes = buildLignes(devis.id, variant);
    await prisma.devisLigne.createMany({ data: lignes });

    console.log(
      `✓ Devis ${numero} – Variante ${variant.varianteNum} : ${variant.materiau}  (${totalHT.toLocaleString("fr-FR")} € HT)`,
    );
  }

  console.log("\n✅ 8 devis créés avec succès pour Fabrice Candeau – LHERM");
}

main().catch(console.error).finally(() => prisma.$disconnect());
