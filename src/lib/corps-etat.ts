// Corps d'état — codification pour le Bordereau des Prix Unitaires (BPU)

export const CORPS_ETAT_CODES = [
  "TER", // Terrassement
  "MAC", // Maçonnerie générale
  "DAL", // Dallage
  "COV", // Couverture
  "ZIN", // Zinguerie
  "RAV", // Ravalement de façade
  "ITE", // Isolation Thermique par l'Extérieur
  "PLO", // Plomberie Sanitaire CVC
  "ELE", // Électricité générale
  "PLA", // Plâtrerie (doublage et cloison)
  "MEN", // Menuiserie extérieure et intérieure
  "AGE", // Agencement
  "RSD", // Revêtement de sol dur
  "RSS", // Revêtement de sol souple
  "RMU", // Revêtement muraux
  "PEI", // Peinture intérieure et extérieure
  "SER", // Serrurerie
] as const;

export type CorpsEtatCode = (typeof CORPS_ETAT_CODES)[number];

export const CORPS_ETAT_LABELS: Record<CorpsEtatCode, string> = {
  TER: "Terrassement",
  MAC: "Maçonnerie générale",
  DAL: "Dallage",
  COV: "Couverture",
  ZIN: "Zinguerie",
  RAV: "Ravalement de façade",
  ITE: "Isolation Thermique par l'Extérieur (ITE)",
  PLO: "Plomberie Sanitaire CVC",
  ELE: "Électricité générale",
  PLA: "Plâtrerie — doublage et cloison",
  MEN: "Menuiserie extérieure et intérieure",
  AGE: "Agencement",
  RSD: "Revêtement de sol dur",
  RSS: "Revêtement de sol souple",
  RMU: "Revêtement muraux",
  PEI: "Peinture intérieure et extérieure",
  SER: "Serrurerie",
};

export const CORPS_ETAT_BADGE_TONES: Record<
  CorpsEtatCode,
  "blue" | "navy" | "orange" | "green" | "gray" | "red"
> = {
  TER: "orange",
  MAC: "gray",
  DAL: "gray",
  COV: "blue",
  ZIN: "blue",
  RAV: "green",
  ITE: "green",
  PLO: "blue",
  ELE: "orange",
  PLA: "gray",
  MEN: "navy",
  AGE: "navy",
  RSD: "orange",
  RSS: "orange",
  RMU: "gray",
  PEI: "green",
  SER: "red",
};

// Ordre logique indicatif d'enchaînement des corps d'état sur un chantier de rénovation/construction
// (gros œuvre → clos-couvert → second œuvre → finitions), conforme à l'enchaînement usuel décrit par
// les DTU. Sert uniquement à des alertes de cohérence non bloquantes dans le planning Gantt — un
// chantier réel comporte des recouvrements/exceptions légitimes, ceci n'est pas une règle absolue.
export const CORPS_ETAT_ORDRE_LOGIQUE: Record<CorpsEtatCode, number> = {
  TER: 1,
  MAC: 2,
  DAL: 3,
  COV: 4,
  ZIN: 5,
  MEN: 6, // menuiseries extérieures (mise hors d'eau/hors d'air) — les menuiseries intérieures se posent en réalité plus tard
  ITE: 7,
  RAV: 8,
  PLO: 9,  // gros + réseaux avant fermeture des cloisons
  ELE: 10,
  PLA: 11,
  AGE: 12,
  RMU: 13,
  RSD: 14,
  RSS: 15,
  PEI: 16,
  SER: 17,
};

export const UNITES_COURANTES = [
  "m²",
  "ml",
  "m³",
  "u",
  "forfait",
  "h",
  "kg",
  "t",
] as const;

// Génère le prochain code d'ouvrage pour un corps d'état donné
// en lisant les codes existants depuis la base
export function getNextOuvrageCode(corpsEtat: string, existingCodes: string[]): string {
  const prefix = corpsEtat.toUpperCase();
  const nums = existingCodes
    .filter((c) => c.startsWith(`${prefix}-`))
    .map((c) => parseInt(c.split("-")[1] ?? "0", 10))
    .filter(Number.isFinite);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}-${String(next).padStart(3, "0")}`;
}
