// Seuil au-delà duquel un délai de livraison fournisseur est considéré comme élevé et doit être
// signalé visuellement (stock + planning Gantt), pour inciter à commander suffisamment en avance.
export const DELAI_LIVRAISON_ELEVE_SEUIL_JOURS = 15;

export function estDelaiLivraisonEleve(delaiJours: number | null | undefined): boolean {
  return delaiJours != null && delaiJours >= DELAI_LIVRAISON_ELEVE_SEUIL_JOURS;
}
