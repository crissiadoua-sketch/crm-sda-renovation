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
