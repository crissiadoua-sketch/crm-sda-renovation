// Couleurs d'identification des intervenants (sous-traitants, salariés, intérimaires)
// dans le planning Gantt. Personnalisable sur chaque fiche ; valeur de repli déterministe
// si l'utilisateur n'a pas encore choisi de couleur.

export const PALETTE_INTERVENANTS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#7c3aed", "#0891b2",
  "#db2777", "#65a30d", "#ea580c", "#0d9488", "#9333ea", "#475569",
];

export function couleurParDefaut(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE_INTERVENANTS[hash % PALETTE_INTERVENANTS.length];
}
