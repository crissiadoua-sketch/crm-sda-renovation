// Convention collective nationale du Bâtiment — taux 2025
// Région Occitanie (31 - Haute-Garonne) : même CCN nationale que tout le territoire

export type TypeCcn = "OUVRIERS" | "ETAM" | "CADRES";

export const CCN_LABELS: Record<TypeCcn, string> = {
  OUVRIERS: "CCN Ouvriers du Bâtiment (IDCC 1597)",
  ETAM: "CCN ETAM du Bâtiment (IDCC 2609)",
  CADRES: "CCN Cadres du Bâtiment (IDCC 2420)",
};

// ---------------------------------------------------------------------------
// Plafond mensuel de la Sécurité Sociale 2025 (PMSS)
// ---------------------------------------------------------------------------
export const PMSS_2025 = 3925; // €/mois

// ---------------------------------------------------------------------------
// SMIC horaire 2025
// ---------------------------------------------------------------------------
export const SMIC_HORAIRE_2025 = 11.88; // €/h (au 1er novembre 2024)
export const SMIC_MENSUEL_2025 = SMIC_HORAIRE_2025 * 151.67; // ≈ 1801.80 €

// ---------------------------------------------------------------------------
// Grilles indicatives des minima conventionnels (taux horaires bruts, jan 2025)
// Ouvriers — coefficient × valeur du point
// Valeur du point en bâtiment : environ 0,498 € (avenant 2024)
// ---------------------------------------------------------------------------
export const VALEUR_POINT_OUVRIERS = 0.498; // €/point

export const COEFFICIENTS_OUVRIERS: { coefficient: number; qualification: string; tauxHoraire: number }[] = [
  { coefficient: 100, qualification: "Manœuvre ordinaire (N1)", tauxHoraire: 11.90 },
  { coefficient: 105, qualification: "Manœuvre spécialisé (N1)", tauxHoraire: 12.00 },
  { coefficient: 110, qualification: "Ouvrier spécialisé OS1 (N2)", tauxHoraire: 12.15 },
  { coefficient: 115, qualification: "Ouvrier spécialisé OS2 (N2)", tauxHoraire: 12.30 },
  { coefficient: 120, qualification: "Ouvrier professionnel OP1 (N3)", tauxHoraire: 12.55 },
  { coefficient: 130, qualification: "Ouvrier professionnel OP2 (N3)", tauxHoraire: 12.90 },
  { coefficient: 135, qualification: "Compagnon professionnel CP1 (N3)", tauxHoraire: 13.20 },
  { coefficient: 150, qualification: "Compagnon professionnel CP2 (N4)", tauxHoraire: 13.80 },
  { coefficient: 160, qualification: "Ouvrier hautement qualifié OHQ (N4)", tauxHoraire: 14.50 },
  { coefficient: 170, qualification: "Chef d'équipe P1 (N4)", tauxHoraire: 15.20 },
  { coefficient: 185, qualification: "Chef d'équipe P2 / Maître ouvrier (N5)", tauxHoraire: 16.10 },
];

// ---------------------------------------------------------------------------
// ETAM — grille de salaires mensuels (base 35h, jan 2025)
// ---------------------------------------------------------------------------
export const POSITIONS_ETAM: { position: string; libelle: string; salaireMensuelMin: number }[] = [
  { position: "A", libelle: "Employé – Agent d'exploitation (Position A)", salaireMensuelMin: 1850 },
  { position: "B", libelle: "Employé qualifié (Position B)", salaireMensuelMin: 1950 },
  { position: "C", libelle: "Technicien / Agent de maîtrise (Position C)", salaireMensuelMin: 2150 },
  { position: "D", libelle: "Technicien supérieur / Chef de chantier (Position D)", salaireMensuelMin: 2450 },
  { position: "E", libelle: "Conducteur de travaux – Cadre technique (Position E)", salaireMensuelMin: 2900 },
  { position: "F", libelle: "Chef de secteur / Responsable d'exploitation (Position F)", salaireMensuelMin: 3400 },
  { position: "G", libelle: "Cadre supérieur (Position G)", salaireMensuelMin: 4200 },
];

// ---------------------------------------------------------------------------
// Cadres — grille de salaires mensuels (base 35h, jan 2025)
// ---------------------------------------------------------------------------
export const POSITIONS_CADRES: { position: string; libelle: string; salaireMensuelMin: number }[] = [
  { position: "1", libelle: "Cadre débutant (Position 1)", salaireMensuelMin: 3000 },
  { position: "2", libelle: "Cadre confirmé (Position 2)", salaireMensuelMin: 4000 },
  { position: "3", libelle: "Cadre supérieur (Position 3)", salaireMensuelMin: 5500 },
];

// ---------------------------------------------------------------------------
// Type de ligne de bulletin
// ---------------------------------------------------------------------------
export type CategorieLigne =
  | "REMUNERATION"
  | "COTISATION_SALARIALE"
  | "COTISATION_PATRONALE"
  | "INFO";

export type LigneBulletin = {
  id: string;
  categorie: CategorieLigne;
  libelle: string;
  base: number;        // assiette en €
  tauxSalarie: number; // %
  montantSalarie: number;
  tauxPatronal: number; // %
  montantPatronal: number;
  nonDeductible?: boolean; // true = CSG/CRDS non déductibles
  editable?: boolean;
};

// ---------------------------------------------------------------------------
// Templates de lignes de cotisations par CCN (taux 2025)
// La base est renseignée dynamiquement par le formulaire selon le brut.
// ---------------------------------------------------------------------------

type TauxLigne = {
  id: string;
  categorie: CategorieLigne;
  libelle: string;
  assiette: "BRUT" | "BRUT_ABATTU" | "TRANCHE_A" | "TRANCHE_B" | "FIXE";
  tauxSalarie: number;
  tauxPatronal: number;
  nonDeductible?: boolean;
  editable?: boolean;
};

const LIGNES_COMMUNES: TauxLigne[] = [
  // ── Sécurité Sociale ──────────────────────────────────────────────────
  {
    id: "ss_maladie",
    categorie: "COTISATION_SALARIALE",
    libelle: "Sécurité sociale – Maladie, maternité, invalidité, décès",
    assiette: "BRUT",
    tauxSalarie: 0,
    tauxPatronal: 7.0,
  },
  {
    id: "ss_vieillesse_p",
    categorie: "COTISATION_SALARIALE",
    libelle: "Sécurité sociale – Vieillesse plafonnée",
    assiette: "TRANCHE_A",
    tauxSalarie: 6.9,
    tauxPatronal: 8.55,
  },
  {
    id: "ss_vieillesse_d",
    categorie: "COTISATION_SALARIALE",
    libelle: "Sécurité sociale – Vieillesse déplafonnée",
    assiette: "BRUT",
    tauxSalarie: 0.4,
    tauxPatronal: 1.9,
  },
  {
    id: "alloc_fam",
    categorie: "COTISATION_SALARIALE",
    libelle: "Allocations familiales",
    assiette: "BRUT",
    tauxSalarie: 0,
    tauxPatronal: 3.45,
  },
  {
    id: "at_mp",
    categorie: "COTISATION_SALARIALE",
    libelle: "Accidents du travail – Maladies professionnelles",
    assiette: "BRUT",
    tauxSalarie: 0,
    tauxPatronal: 4.0, // taux moyen bâtiment — à ajuster selon activité
    editable: true,
  },
  // ── AGIRC-ARRCO ───────────────────────────────────────────────────────
  {
    id: "arrco_t1",
    categorie: "COTISATION_SALARIALE",
    libelle: "Retraite complémentaire AGIRC-ARRCO T1 (BTP-Retraite)",
    assiette: "TRANCHE_A",
    tauxSalarie: 3.15,
    tauxPatronal: 4.72,
  },
  {
    id: "arrco_t2",
    categorie: "COTISATION_SALARIALE",
    libelle: "Retraite complémentaire AGIRC-ARRCO T2 (BTP-Retraite)",
    assiette: "TRANCHE_B",
    tauxSalarie: 8.64,
    tauxPatronal: 12.95,
  },
  {
    id: "ceg_t1",
    categorie: "COTISATION_SALARIALE",
    libelle: "CEG – Contribution d'équilibre général T1",
    assiette: "TRANCHE_A",
    tauxSalarie: 0.86,
    tauxPatronal: 1.29,
  },
  {
    id: "ceg_t2",
    categorie: "COTISATION_SALARIALE",
    libelle: "CEG – Contribution d'équilibre général T2",
    assiette: "TRANCHE_B",
    tauxSalarie: 1.08,
    tauxPatronal: 1.62,
  },
  {
    id: "cet",
    categorie: "COTISATION_SALARIALE",
    libelle: "CET – Contribution d'équilibre technique",
    assiette: "TRANCHE_B",
    tauxSalarie: 0.14,
    tauxPatronal: 0.21,
  },
  // ── Chômage ───────────────────────────────────────────────────────────
  {
    id: "chomage",
    categorie: "COTISATION_SALARIALE",
    libelle: "Assurance chômage (UNEDIC)",
    assiette: "BRUT",
    tauxSalarie: 0,
    tauxPatronal: 4.05,
  },
  {
    id: "ags",
    categorie: "COTISATION_SALARIALE",
    libelle: "AGS – Assurance garantie des salaires",
    assiette: "TRANCHE_A",
    tauxSalarie: 0,
    tauxPatronal: 0.15,
  },
  // ── CSG / CRDS ────────────────────────────────────────────────────────
  {
    id: "csg_deductible",
    categorie: "COTISATION_SALARIALE",
    libelle: "CSG déductible",
    assiette: "BRUT_ABATTU",
    tauxSalarie: 6.8,
    tauxPatronal: 0,
  },
  {
    id: "csg_crds",
    categorie: "COTISATION_SALARIALE",
    libelle: "CSG non déductible + CRDS",
    assiette: "BRUT_ABATTU",
    tauxSalarie: 2.9,
    tauxPatronal: 0,
    nonDeductible: true,
  },
  // ── BTP-Prévoyance (Pro-BTP) ──────────────────────────────────────────
  {
    id: "prevoyance",
    categorie: "COTISATION_SALARIALE",
    libelle: "BTP-Prévoyance (décès, incapacité, invalidité)",
    assiette: "BRUT",
    tauxSalarie: 1.2,
    tauxPatronal: 2.4,
    editable: true,
  },
  // ── Mutuelle Pro-BTP ──────────────────────────────────────────────────
  {
    id: "mutuelle",
    categorie: "COTISATION_SALARIALE",
    libelle: "Mutuelle santé Pro-BTP (option 1)",
    assiette: "FIXE",
    tauxSalarie: 0,
    tauxPatronal: 0,
    editable: true,
  },
];

const LIGNES_OUVRIERS_SPECIFIQUES: TauxLigne[] = [
  {
    id: "cibtp_cp",
    categorie: "COTISATION_SALARIALE",
    libelle: "CIBTP – Congés payés bâtiment",
    assiette: "BRUT",
    tauxSalarie: 0,
    tauxPatronal: 17.5, // ~17.5% du brut (patronal uniquement)
    editable: true,
  },
  {
    id: "intempe",
    categorie: "COTISATION_SALARIALE",
    libelle: "CIBTP – Intempéries",
    assiette: "BRUT",
    tauxSalarie: 0,
    tauxPatronal: 2.1,
    editable: true,
  },
  {
    id: "formation_ouvriers",
    categorie: "COTISATION_SALARIALE",
    libelle: "Formation professionnelle (CONSTRUCTYS)",
    assiette: "BRUT",
    tauxSalarie: 0,
    tauxPatronal: 1.0,
  },
];

const LIGNES_ETAM_SPECIFIQUES: TauxLigne[] = [
  {
    id: "prevoyance_etam",
    categorie: "COTISATION_SALARIALE",
    libelle: "BTP-Prévoyance ETAM – Tranche A",
    assiette: "TRANCHE_A",
    tauxSalarie: 0.8,
    tauxPatronal: 1.6,
    editable: true,
  },
  {
    id: "formation_etam",
    categorie: "COTISATION_SALARIALE",
    libelle: "Formation professionnelle (CONSTRUCTYS)",
    assiette: "BRUT",
    tauxSalarie: 0,
    tauxPatronal: 1.0,
  },
];

const LIGNES_CADRES_SPECIFIQUES: TauxLigne[] = [
  {
    id: "apec",
    categorie: "COTISATION_SALARIALE",
    libelle: "APEC – Association pour l'emploi des cadres",
    assiette: "BRUT",
    tauxSalarie: 0.024,
    tauxPatronal: 0.036,
  },
  {
    id: "prevoyance_cadres",
    categorie: "COTISATION_SALARIALE",
    libelle: "BTP-Prévoyance Cadres – Article 4 (décès)",
    assiette: "TRANCHE_A",
    tauxSalarie: 0,
    tauxPatronal: 1.5,
    editable: true,
  },
  {
    id: "formation_cadres",
    categorie: "COTISATION_SALARIALE",
    libelle: "Formation professionnelle (CONSTRUCTYS)",
    assiette: "BRUT",
    tauxSalarie: 0,
    tauxPatronal: 1.0,
  },
];

export function getLignesTemplate(typeCcn: TypeCcn): TauxLigne[] {
  const specifiques: Record<TypeCcn, TauxLigne[]> = {
    OUVRIERS: LIGNES_OUVRIERS_SPECIFIQUES,
    ETAM: LIGNES_ETAM_SPECIFIQUES,
    CADRES: LIGNES_CADRES_SPECIFIQUES,
  };
  return [...LIGNES_COMMUNES, ...specifiques[typeCcn]];
}

// ---------------------------------------------------------------------------
// Calcul des assiettes et montants à partir du brut
// ---------------------------------------------------------------------------
export function calculerLignes(
  lignesTemplate: TauxLigne[],
  totalBrut: number,
): LigneBulletin[] {
  const brut = totalBrut;
  const brutAbattu = brut * 0.9825; // abattement CSG/CRDS 1.75%
  const trancheA = Math.min(brut, PMSS_2025);
  const trancheB = Math.min(Math.max(brut - PMSS_2025, 0), PMSS_2025 * 7);

  return lignesTemplate.map((t): LigneBulletin => {
    let base = 0;
    switch (t.assiette) {
      case "BRUT":        base = brut; break;
      case "BRUT_ABATTU": base = brutAbattu; break;
      case "TRANCHE_A":   base = trancheA; break;
      case "TRANCHE_B":   base = trancheB; break;
      case "FIXE":        base = 0; break;
    }

    const montantSalarie = round2(base * t.tauxSalarie / 100);
    const montantPatronal = round2(base * t.tauxPatronal / 100);

    return {
      id: t.id,
      categorie: t.categorie,
      libelle: t.libelle,
      base: round2(base),
      tauxSalarie: t.tauxSalarie,
      montantSalarie,
      tauxPatronal: t.tauxPatronal,
      montantPatronal,
      nonDeductible: t.nonDeductible,
      editable: t.editable,
    };
  });
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Calcul du net
// ---------------------------------------------------------------------------
export function calculerNet(totalBrut: number, lignes: LigneBulletin[]) {
  const cotSalarie = lignes
    .filter((l) => !l.nonDeductible)
    .reduce((s, l) => s + l.montantSalarie, 0);
  const csgNonDed = lignes
    .filter((l) => l.nonDeductible)
    .reduce((s, l) => s + l.montantSalarie, 0);
  const cotPatronal = lignes.reduce((s, l) => s + l.montantPatronal, 0);

  const netImposable = round2(totalBrut - cotSalarie);
  const netAPayer = round2(netImposable - csgNonDed);

  return {
    cotisationsSalarie: round2(cotSalarie),
    csgNonDeductible: round2(csgNonDed),
    cotisationsPatronales: round2(cotPatronal),
    netImposable,
    netAPayer,
  };
}

// ---------------------------------------------------------------------------
// Numéro de matricule auto
// ---------------------------------------------------------------------------
export function padMatricule(n: number) {
  return `EMP-${String(n).padStart(4, "0")}`;
}
