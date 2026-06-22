// Moteur de pré-dimensionnement structurel — Module 2 de la feuille de route
// "logiciel de calcul structurel". Estimation rapide de sections par ratios
// forfaitaires usuels (portée / charges), AVANT tout calcul détaillé Eurocode.
//
// Ce module ne remplace JAMAIS une note de calcul réglementaire ni la
// validation d'un ingénieur structure indépendant — voir l'avertissement
// affiché sur toutes les pages qui consomment ces résultats.
//
// Fonctions pures (pas d'import React/Prisma) pour rester testables et
// réutilisables côté formulaire (aperçu en direct) et côté serveur (calcul
// autoritaire avant écriture en base).

export type TypeElement = "POUTRE" | "DALLE" | "POTEAU" | "DALLAGE";
export type Materiau = "BETON" | "ACIER" | "BOIS";
export type ConditionPoutre = "ISOSTATIQUE" | "CONTINUE" | "CONSOLE";
export type ConditionDalle = "PORTEE_1_SENS" | "PORTEE_2_SENS" | "CONSOLE";
export type NiveauCharge = "LEGERE" | "NORMALE" | "LOURDE";
export type UsageDallage = "INDUSTRIEL" | "AGRICOLE" | "TERRASSE";
export type PortanceSol =
  | "ARGILE_MOLLE"
  | "LIMON_ARGILE_FERME"
  | "SABLE_GRAVE_COMPACTE"
  | "PLATEFORME_TRAITEE"
  | "ROCHEUX";

export const TYPE_ELEMENT_LABELS: Record<TypeElement, string> = {
  POUTRE: "Poutre",
  DALLE: "Dalle (portée entre appuis)",
  POTEAU: "Poteau",
  DALLAGE: "Dallage sur terre-plein (industriel / agricole / terrasse)",
};

export const USAGE_DALLAGE_LABELS: Record<UsageDallage, string> = {
  INDUSTRIEL: "Industriel (entrepôt, atelier, logistique)",
  AGRICOLE: "Agricole (bâtiment d'élevage, stockage, hangar)",
  TERRASSE: "Terrasse extérieure (piéton / véhicule léger)",
};

export const PORTANCE_SOL_LABELS: Record<PortanceSol, string> = {
  ARGILE_MOLLE: "Argile molle / remblai non contrôlé / tourbe (portance très faible)",
  LIMON_ARGILE_FERME: "Limon ou argile ferme (portance faible à moyenne)",
  SABLE_GRAVE_COMPACTE: "Sable ou grave compacté (portance moyenne à bonne)",
  PLATEFORME_TRAITEE: "Plateforme traitée / grave-ciment (bonne portance)",
  ROCHEUX: "Sol rocheux ou assimilé (très bonne portance)",
};

export const MATERIAU_LABELS: Record<Materiau, string> = {
  BETON: "Béton armé",
  ACIER: "Acier",
  BOIS: "Bois",
};

export const CONDITION_POUTRE_LABELS: Record<ConditionPoutre, string> = {
  ISOSTATIQUE: "Isostatique (simplement appuyée)",
  CONTINUE: "Continue (travées multiples)",
  CONSOLE: "Console (porte-à-faux)",
};

export const CONDITION_DALLE_LABELS: Record<ConditionDalle, string> = {
  PORTEE_1_SENS: "Portée dans un sens (sur poutres/murs)",
  PORTEE_2_SENS: "Portée dans les deux sens (appuyée 4 côtés)",
  CONSOLE: "Console (balcon)",
};

export const NIVEAU_CHARGE_LABELS: Record<NiveauCharge, string> = {
  LEGERE: "Légère",
  NORMALE: "Normale",
  LOURDE: "Lourde",
};

export type ResultatPreDimensionnement = {
  valeurCm: number;
  largeurCm?: number;
  label: string;
  formule: string;
  hypotheses: string[];
};

function arrondirSup(valeur: number, pas: number, min = 0): number {
  const arrondi = Math.ceil(valeur / pas) * pas;
  return Math.max(arrondi, min);
}

// ─── Poutre ──────────────────────────────────────────────────────────────────

const RATIO_POUTRE_BETON: Record<ConditionPoutre, Record<NiveauCharge, number>> = {
  ISOSTATIQUE: { LEGERE: 15, NORMALE: 12, LOURDE: 10 },
  CONTINUE: { LEGERE: 18, NORMALE: 16, LOURDE: 13 },
  CONSOLE: { LEGERE: 7, NORMALE: 6, LOURDE: 5 },
};

const RATIO_POUTRE_ACIER: Record<ConditionPoutre, Record<NiveauCharge, number>> = {
  ISOSTATIQUE: { LEGERE: 24, NORMALE: 20, LOURDE: 16 },
  CONTINUE: { LEGERE: 28, NORMALE: 24, LOURDE: 20 },
  CONSOLE: { LEGERE: 12, NORMALE: 10, LOURDE: 8 },
};

const RATIO_POUTRE_BOIS: Record<ConditionPoutre, Record<NiveauCharge, number>> = {
  ISOSTATIQUE: { LEGERE: 22, NORMALE: 18, LOURDE: 15 },
  CONTINUE: { LEGERE: 24, NORMALE: 20, LOURDE: 17 },
  CONSOLE: { LEGERE: 10, NORMALE: 8, LOURDE: 6 },
};

const PROFILES_IPE_CM = [8, 10, 12, 14, 16, 18, 20, 22, 24, 27, 30, 33, 36, 40, 45, 50, 55, 60];

export function calculerPoutre(params: {
  materiau: Materiau;
  portee: number;
  condition: ConditionPoutre;
  niveauCharge: NiveauCharge;
}): ResultatPreDimensionnement {
  const { materiau, portee, condition, niveauCharge } = params;
  const hypotheses = [
    `Portée L = ${portee} m`,
    `Condition d'appui : ${CONDITION_POUTRE_LABELS[condition]}`,
    `Niveau de charge : ${NIVEAU_CHARGE_LABELS[niveauCharge]}`,
    "Ratio forfaitaire de pré-dimensionnement (ordre de grandeur, hors calcul détaillé EC2/EC3/EC5).",
  ];

  if (materiau === "BETON") {
    const ratio = RATIO_POUTRE_BETON[condition][niveauCharge];
    const hCm = arrondirSup((portee * 100) / ratio, 5, 20);
    const bCm = arrondirSup(hCm / 2.5, 5, 20);
    return {
      valeurCm: hCm,
      largeurCm: bCm,
      label: `h ≈ ${hCm} cm, b ≈ ${bCm} cm`,
      formule: `h = L / ${ratio} (béton armé, ${CONDITION_POUTRE_LABELS[condition].toLowerCase()}) ; b ≈ h / 2,5`,
      hypotheses,
    };
  }

  if (materiau === "ACIER") {
    const ratio = RATIO_POUTRE_ACIER[condition][niveauCharge];
    const hCmTheorique = (portee * 100) / ratio;
    const profile = PROFILES_IPE_CM.find((p) => p >= hCmTheorique) ?? PROFILES_IPE_CM[PROFILES_IPE_CM.length - 1];
    return {
      valeurCm: profile,
      label: `IPE ${profile * 10} (h ≈ ${profile} cm)`,
      formule: `h = L / ${ratio} (acier, ${CONDITION_POUTRE_LABELS[condition].toLowerCase()}), arrondi au profilé IPE supérieur`,
      hypotheses,
    };
  }

  const ratio = RATIO_POUTRE_BOIS[condition][niveauCharge];
  const hCm = arrondirSup((portee * 100) / ratio, 2.5, 10);
  const bCm = arrondirSup(hCm * 0.4, 2.5, 7.5);
  return {
    valeurCm: hCm,
    largeurCm: bCm,
    label: `h ≈ ${hCm} cm, b ≈ ${bCm} cm`,
    formule: `h = L / ${ratio} (bois, ${CONDITION_POUTRE_LABELS[condition].toLowerCase()}) ; b ≈ 0,4 × h`,
    hypotheses,
  };
}

// ─── Dalle ───────────────────────────────────────────────────────────────────

const RATIO_DALLE: Record<ConditionDalle, Record<NiveauCharge, number>> = {
  PORTEE_1_SENS: { LEGERE: 32, NORMALE: 28, LOURDE: 24 },
  PORTEE_2_SENS: { LEGERE: 40, NORMALE: 35, LOURDE: 30 },
  CONSOLE: { LEGERE: 12, NORMALE: 10, LOURDE: 8 },
};

const EPAISSEUR_MIN_DALLE_CM: Record<ConditionDalle, number> = {
  PORTEE_1_SENS: 16,
  PORTEE_2_SENS: 14,
  CONSOLE: 15,
};

export function calculerDalle(params: {
  materiau: Materiau;
  portee: number;
  condition: ConditionDalle;
  niveauCharge: NiveauCharge;
}): ResultatPreDimensionnement {
  const { portee, condition, niveauCharge } = params;
  const ratio = RATIO_DALLE[condition][niveauCharge];
  const eCm = arrondirSup((portee * 100) / ratio, 1, EPAISSEUR_MIN_DALLE_CM[condition]);
  return {
    valeurCm: eCm,
    label: `e ≈ ${eCm} cm`,
    formule: `e = L / ${ratio} (dalle béton armé, ${CONDITION_DALLE_LABELS[condition].toLowerCase()}), épaisseur minimale ${EPAISSEUR_MIN_DALLE_CM[condition]} cm`,
    hypotheses: [
      `Plus petite portée L = ${portee} m`,
      `Condition : ${CONDITION_DALLE_LABELS[condition]}`,
      `Niveau de charge : ${NIVEAU_CHARGE_LABELS[niveauCharge]}`,
      "Ratio forfaitaire de pré-dimensionnement (ordre de grandeur, hors calcul détaillé EC2).",
    ],
  };
}

// ─── Dallage sur terre-plein (industriel / agricole / terrasse) ────────────

// Épaisseur de base (cm) selon usage et niveau de charge, avant ajustement sol.
const EPAISSEUR_BASE_DALLAGE_CM: Record<UsageDallage, Record<NiveauCharge, number>> = {
  TERRASSE: { LEGERE: 10, NORMALE: 12, LOURDE: 15 },
  AGRICOLE: { LEGERE: 13, NORMALE: 16, LOURDE: 20 },
  INDUSTRIEL: { LEGERE: 14, NORMALE: 18, LOURDE: 22 },
};

const EPAISSEUR_MIN_DALLAGE_CM: Record<UsageDallage, number> = {
  TERRASSE: 10,
  AGRICOLE: 12,
  INDUSTRIEL: 13,
};

// Ajustement d'épaisseur (cm) selon la portance du sol support.
const AJUSTEMENT_PORTANCE_CM: Record<PortanceSol, number> = {
  ARGILE_MOLLE: 6,
  LIMON_ARGILE_FERME: 3,
  SABLE_GRAVE_COMPACTE: 0,
  PLATEFORME_TRAITEE: -2,
  ROCHEUX: -4,
};

// Module de réaction de Westergaard (MN/m³), purement indicatif — affiché
// dans les hypothèses pour traçabilité, non utilisé dans le calcul forfaitaire.
const MODULE_REACTION_K: Record<PortanceSol, number> = {
  ARGILE_MOLLE: 15,
  LIMON_ARGILE_FERME: 30,
  SABLE_GRAVE_COMPACTE: 50,
  PLATEFORME_TRAITEE: 80,
  ROCHEUX: 120,
};

const SURFACE_PANNEAU_TREILLIS_M2 = 14.4; // panneau standard 2,40 × 6,00 m

function determinerTreillisSoude(eCm: number, niveauCharge: NiveauCharge): { nappeHaute: string; nappeBasse?: string } {
  if (eCm <= 12) return { nappeHaute: "ST 25" };
  if (eCm <= 16) return { nappeHaute: "ST 30" };
  if (eCm <= 20) return niveauCharge === "LOURDE" ? { nappeHaute: "ST 35", nappeBasse: "ST 25" } : { nappeHaute: "ST 35" };
  if (eCm <= 25) return niveauCharge === "LOURDE" ? { nappeHaute: "ST 40", nappeBasse: "ST 25" } : { nappeHaute: "ST 40" };
  return niveauCharge === "LOURDE" ? { nappeHaute: "ST 50", nappeBasse: "ST 30" } : { nappeHaute: "ST 50" };
}

export function calculerDallage(params: {
  usageDallage: UsageDallage;
  niveauCharge: NiveauCharge;
  portanceSol: PortanceSol;
  surface?: number; // m², optionnel — active le métré estimatif
}): ResultatPreDimensionnement {
  const { usageDallage, niveauCharge, portanceSol, surface } = params;
  const base = EPAISSEUR_BASE_DALLAGE_CM[usageDallage][niveauCharge];
  const ajustement = AJUSTEMENT_PORTANCE_CM[portanceSol];
  const eCm = arrondirSup(base + ajustement, 1, EPAISSEUR_MIN_DALLAGE_CM[usageDallage]);
  const treillis = determinerTreillisSoude(eCm, niveauCharge);
  const k = MODULE_REACTION_K[portanceSol];

  const hypotheses = [
    `Usage : ${USAGE_DALLAGE_LABELS[usageDallage]}`,
    `Niveau de charge : ${NIVEAU_CHARGE_LABELS[niveauCharge]}`,
    `Sol support : ${PORTANCE_SOL_LABELS[portanceSol]} (module de réaction k ≈ ${k} MN/m³, indicatif)`,
    `Treillis soudé anti-fissuration recommandé : nappe haute ${treillis.nappeHaute}${treillis.nappeBasse ? `, nappe basse ${treillis.nappeBasse}` : ""} (position, recouvrements et enrobage à valider en calcul détaillé).`,
    "Prévoir couche de forme/sous-couche drainante, film polyane anti-remontées capillaires et joints de retrait/dilatation selon trame (DTU 13.3).",
    "Ratio forfaitaire de pré-dimensionnement (ordre de grandeur, hors calcul détaillé selon DTU 13.3 / méthode Westergaard-Meyerhof).",
  ];

  if (surface && surface > 0) {
    const volumeBeton = Math.round(surface * (eCm / 100) * 100) / 100;
    const surfaceTreillisAvecRecouvrement = Math.round(surface * 1.1 * 100) / 100;
    const nbPanneauxNappeHaute = Math.ceil(surfaceTreillisAvecRecouvrement / SURFACE_PANNEAU_TREILLIS_M2);
    const nbPanneauxNappeBasse = treillis.nappeBasse
      ? Math.ceil(surfaceTreillisAvecRecouvrement / SURFACE_PANNEAU_TREILLIS_M2)
      : 0;
    hypotheses.push(
      `Métré estimatif pour ${surface} m² : béton ≈ ${volumeBeton} m³ ; treillis ${treillis.nappeHaute} ≈ ${nbPanneauxNappeHaute} panneau(x) de 2,40 × 6,00 m (recouvrement 10 % inclus)${
        treillis.nappeBasse ? ` ; treillis ${treillis.nappeBasse} (nappe basse) ≈ ${nbPanneauxNappeBasse} panneau(x)` : ""
      }.`,
    );
  }

  return {
    valeurCm: eCm,
    label: `e ≈ ${eCm} cm — ${treillis.nappeHaute}${treillis.nappeBasse ? ` + ${treillis.nappeBasse}` : ""}`,
    formule: `e = base usage/charge (${base} cm) ${ajustement >= 0 ? "+" : "-"} ajustement sol (${Math.abs(ajustement)} cm), arrondi au cm supérieur, mini ${EPAISSEUR_MIN_DALLAGE_CM[usageDallage]} cm`,
    hypotheses,
  };
}

// ─── Poteau ──────────────────────────────────────────────────────────────────

const SECTIONS_BETON_CM = [20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80];
const SECTIONS_BOIS_CM = [10, 12, 15, 18, 20, 22, 25, 28, 30];
const PROFILES_HEA = [
  { nom: "HEA 100", aireCm2: 21.2 },
  { nom: "HEA 120", aireCm2: 25.3 },
  { nom: "HEA 140", aireCm2: 31.4 },
  { nom: "HEA 160", aireCm2: 38.8 },
  { nom: "HEA 180", aireCm2: 45.3 },
  { nom: "HEA 200", aireCm2: 53.8 },
  { nom: "HEA 220", aireCm2: 64.3 },
  { nom: "HEA 240", aireCm2: 76.8 },
  { nom: "HEA 260", aireCm2: 86.8 },
  { nom: "HEA 280", aireCm2: 97.3 },
  { nom: "HEA 300", aireCm2: 112.5 },
];

export function calculerPoteau(params: {
  materiau: Materiau;
  effortNormal: number; // kN
  hauteurLibre?: number; // m, informatif (élancement)
  resistance?: number; // MPa : fck béton (def 25), fy acier (def 235), fc0 bois (def 21)
}): ResultatPreDimensionnement {
  const { materiau, effortNormal: Nu, hauteurLibre } = params;
  const elancementInfo = hauteurLibre
    ? [`Hauteur libre : ${hauteurLibre} m (à vérifier au flambement lors du calcul détaillé).`]
    : [];

  if (materiau === "BETON") {
    const fck = params.resistance ?? 25;
    // Aire nécessaire en ignorant la contribution de l'acier (conservatif) :
    // B(cm²) = Nu(kN) × 10 / (0,85 × fck/1,5)
    const aireCm2 = (Nu * 10) / (0.85 * (fck / 1.5));
    const coteTheorique = Math.sqrt(aireCm2);
    const minSection = hauteurLibre && hauteurLibre > 3 ? 25 : 20;
    const cote = SECTIONS_BETON_CM.find((s) => s >= coteTheorique && s >= minSection) ?? SECTIONS_BETON_CM[SECTIONS_BETON_CM.length - 1];
    return {
      valeurCm: cote,
      largeurCm: cote,
      label: `${cote} × ${cote} cm`,
      formule: `Section carrée ≈ Nu × 10 / (0,85 × fck/1,5), Nu = ${Nu} kN, fck = ${fck} MPa, sans prise en compte de l'armature (conservatif)`,
      hypotheses: [
        `Effort normal Nu = ${Nu} kN`,
        `Résistance béton fck = ${fck} MPa`,
        `Section minimale constructive : ${minSection} × ${minSection} cm`,
        ...elancementInfo,
        "Calcul de pré-dimensionnement uniquement — vérification du flambement et ferraillage à faire en calcul détaillé (EC2).",
      ],
    };
  }

  if (materiau === "ACIER") {
    const fy = params.resistance ?? 235;
    // Coefficient de réduction forfaitaire pour flambement (χ approx 0,6)
    const aireCm2 = (Nu * 10) / (0.6 * fy);
    const profile = PROFILES_HEA.find((p) => p.aireCm2 >= aireCm2) ?? PROFILES_HEA[PROFILES_HEA.length - 1];
    return {
      valeurCm: Math.sqrt(profile.aireCm2),
      label: profile.nom,
      formule: `Aire ≈ Nu × 10 / (0,6 × fy), Nu = ${Nu} kN, fy = ${fy} MPa, coefficient de flambement forfaitaire 0,6`,
      hypotheses: [
        `Effort normal Nu = ${Nu} kN`,
        `Limite d'élasticité fy = ${fy} MPa`,
        ...elancementInfo,
        "Calcul de pré-dimensionnement uniquement — vérification du flambement (EC3) à faire en calcul détaillé.",
      ],
    };
  }

  const fc0 = params.resistance ?? 21;
  const aireCm2 = (Nu * 10) / (0.35 * fc0);
  const coteTheorique = Math.sqrt(aireCm2);
  const cote = SECTIONS_BOIS_CM.find((s) => s >= coteTheorique) ?? SECTIONS_BOIS_CM[SECTIONS_BOIS_CM.length - 1];
  return {
    valeurCm: cote,
    largeurCm: cote,
    label: `${cote} × ${cote} cm`,
    formule: `Section carrée ≈ Nu × 10 / (0,35 × fc0), Nu = ${Nu} kN, fc0 = ${fc0} MPa`,
    hypotheses: [
      `Effort normal Nu = ${Nu} kN`,
      `Résistance compression axiale bois fc0 = ${fc0} MPa`,
      ...elancementInfo,
      "Calcul de pré-dimensionnement uniquement — vérification du flambement (EC5) à faire en calcul détaillé.",
    ],
  };
}

// ─── Présets d'usage (pré-remplissage) ─────────────────────────────────────

export type PresetUsage = {
  label: string;
  typeElement: TypeElement;
  materiau: Materiau;
  portee?: number;
  condition?: ConditionPoutre | ConditionDalle;
  niveauCharge?: NiveauCharge;
  usageDallage?: UsageDallage;
  portanceSol?: PortanceSol;
};

export const PRESETS_USAGE: PresetUsage[] = [
  { label: "Plancher habitation (poutre)", typeElement: "POUTRE", materiau: "BETON", portee: 5, condition: "ISOSTATIQUE", niveauCharge: "NORMALE" },
  { label: "Plancher habitation (dalle 2 sens)", typeElement: "DALLE", materiau: "BETON", portee: 4, condition: "PORTEE_2_SENS", niveauCharge: "NORMALE" },
  { label: "Plancher bureau (dalle 1 sens)", typeElement: "DALLE", materiau: "BETON", portee: 5, condition: "PORTEE_1_SENS", niveauCharge: "NORMALE" },
  { label: "Parking / charge lourde (dalle)", typeElement: "DALLE", materiau: "BETON", portee: 6, condition: "PORTEE_1_SENS", niveauCharge: "LOURDE" },
  { label: "Toiture terrasse accessible (dalle)", typeElement: "DALLE", materiau: "BETON", portee: 5, condition: "PORTEE_2_SENS", niveauCharge: "NORMALE" },
  { label: "Balcon (dalle console)", typeElement: "DALLE", materiau: "BETON", portee: 1.2, condition: "CONSOLE", niveauCharge: "NORMALE" },
  { label: "Charpente bois (poutre)", typeElement: "POUTRE", materiau: "BOIS", portee: 4, condition: "ISOSTATIQUE", niveauCharge: "NORMALE" },
  { label: "Ossature métallique (poutre)", typeElement: "POUTRE", materiau: "ACIER", portee: 6, condition: "ISOSTATIQUE", niveauCharge: "NORMALE" },
  { label: "Dallage industriel (entrepôt / logistique)", typeElement: "DALLAGE", materiau: "BETON", usageDallage: "INDUSTRIEL", niveauCharge: "LOURDE", portanceSol: "SABLE_GRAVE_COMPACTE" },
  { label: "Dallage agricole (hangar / bâtiment d'élevage)", typeElement: "DALLAGE", materiau: "BETON", usageDallage: "AGRICOLE", niveauCharge: "NORMALE", portanceSol: "LIMON_ARGILE_FERME" },
  { label: "Dalle de terrasse extérieure", typeElement: "DALLAGE", materiau: "BETON", usageDallage: "TERRASSE", niveauCharge: "LEGERE", portanceSol: "SABLE_GRAVE_COMPACTE" },
];

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  GEOTECHNIQUE_G2PRO: "Étude géotechnique G2 PRO",
  PLAN_NIVEAU: "Plan de niveau",
  PLAN_COUPE: "Plan de coupe de détail",
  AUTRE: "Autre document",
};
