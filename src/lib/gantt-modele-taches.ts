import { type CorpsEtatCode } from "./corps-etat";

// Modèle de planning type SDA Rénovation : une tâche par corps de métier, dans l'ordre logique
// chantier/DTU (cf. CORPS_ETAT_ORDRE_LOGIQUE), avec une durée théorique de départ à ajuster par
// chantier. Sert uniquement de point de départ — pas une donnée figée.
export type TacheModele = { corpsEtat: CorpsEtatCode; nom: string; dureeJours: number };

export const MODELE_TACHES_PAR_CORPS_ETAT: TacheModele[] = [
  { corpsEtat: "TER", nom: "Terrassement", dureeJours: 3 },
  { corpsEtat: "MAC", nom: "Maçonnerie générale", dureeJours: 8 },
  { corpsEtat: "DAL", nom: "Dallage", dureeJours: 3 },
  { corpsEtat: "COV", nom: "Couverture", dureeJours: 5 },
  { corpsEtat: "ZIN", nom: "Zinguerie", dureeJours: 2 },
  { corpsEtat: "MEN", nom: "Menuiseries extérieures (hors d'eau/hors d'air)", dureeJours: 4 },
  { corpsEtat: "ITE", nom: "Isolation thermique par l'extérieur", dureeJours: 6 },
  { corpsEtat: "RAV", nom: "Ravalement de façade", dureeJours: 5 },
  { corpsEtat: "PLO", nom: "Plomberie sanitaire / réseaux", dureeJours: 5 },
  { corpsEtat: "ELE", nom: "Électricité générale", dureeJours: 5 },
  { corpsEtat: "PLA", nom: "Plâtrerie — doublage et cloisons", dureeJours: 6 },
  { corpsEtat: "AGE", nom: "Agencement", dureeJours: 4 },
  { corpsEtat: "RMU", nom: "Revêtements muraux", dureeJours: 3 },
  { corpsEtat: "RSD", nom: "Revêtement de sol dur", dureeJours: 4 },
  { corpsEtat: "RSS", nom: "Revêtement de sol souple", dureeJours: 3 },
  { corpsEtat: "PEI", nom: "Peinture intérieure et extérieure", dureeJours: 5 },
  { corpsEtat: "SER", nom: "Serrurerie", dureeJours: 2 },
];
