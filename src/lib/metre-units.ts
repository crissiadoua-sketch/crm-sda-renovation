export type UniteAffichage = "mm" | "cm" | "m";

const FACTEUR_MM: Record<UniteAffichage, number> = { mm: 1, cm: 10, m: 1000 };

export function mmVersUnite(valeurMm: number, unite: UniteAffichage): number {
  return valeurMm / FACTEUR_MM[unite];
}

export function uniteVersMm(valeur: number, unite: UniteAffichage): number {
  return valeur * FACTEUR_MM[unite];
}

export function formatLongueur(valeurMm: number, unite: UniteAffichage): string {
  const v = mmVersUnite(valeurMm, unite);
  return `${v.toLocaleString("fr-FR", { maximumFractionDigits: unite === "mm" ? 0 : 2 })} ${unite}`;
}

// Affichage d'une ligne de métré selon son type — partagé entre le canvas,
// l'export Excel et l'aperçu PDF pour garantir un rendu identique partout.
export function formatValeurLigne(
  type: string,
  valeurMm: number,
  uniteAffichage: UniteAffichage,
): string {
  if (type === "QUANTITE") return `${valeurMm.toLocaleString("fr-FR")} u`;
  if (type === "SURFACE") return `${(valeurMm / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} m²`;
  return formatLongueur(valeurMm, uniteAffichage);
}

// $INSUNITS du header DXF — codes les plus courants rencontrés dans les exports
// AutoCAD/ArchiCAD/Cedreo. 0 (unitless) traité comme mm par défaut (hypothèse la
// plus sûre pour des plans de bâtiment, à recalibrer manuellement si besoin).
export const DXF_INSUNITS_VERS_MM: Record<number, number> = {
  0: 1, // sans unité → on suppose mm
  1: 25.4, // pouces
  2: 304.8, // pieds
  4: 1, // millimètres
  5: 10, // centimètres
  6: 1000, // mètres
  8: 0.0254, // micropouces (rare)
};
