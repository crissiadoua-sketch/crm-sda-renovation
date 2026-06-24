type LigneType = "CHAPITRE" | "SOUS_CHAPITRE" | "LIGNE" | "CLAUSE_RESERVE";

// Sous-total de chaque chapitre/sous-chapitre = somme des LIGNE qui lui sont
// rattachées (directement ou via un sous-chapitre enfant).
export function computeSousTotaux<T extends { type: string }>(
  rows: T[],
  getTotal: (row: T) => number,
): number[] {
  const subtotals = new Array(rows.length).fill(0);
  const stack: number[] = [];
  rows.forEach((row, i) => {
    if (row.type === "CHAPITRE") {
      stack.length = 0;
      stack.push(i);
    } else if (row.type === "SOUS_CHAPITRE") {
      while (stack.length > 0 && rows[stack[stack.length - 1]].type === "SOUS_CHAPITRE") stack.pop();
      stack.push(i);
    } else {
      const total = getTotal(row);
      for (const idx of stack) subtotals[idx] += total;
    }
  });
  return subtotals.map((v) => Math.round(v * 100) / 100);
}

// Pour chaque ligne, quels titres (chapitre/sous-chapitre, du plus imbriqué
// au moins imbriqué) se terminent juste avant elle — utile pour afficher la
// ligne "Sous-total" au bon endroit lors de l'impression. `closingAtEnd`
// couvre les titres encore ouverts une fois le tableau terminé.
export function computeSectionClosures(rows: { type: string }[]): {
  closingBefore: number[][];
  closingAtEnd: number[];
} {
  const stack: number[] = [];
  const closingBefore: number[][] = rows.map(() => []);
  rows.forEach((row, i) => {
    if (row.type === "CHAPITRE") {
      while (stack.length > 0) closingBefore[i].push(stack.pop()!);
      stack.push(i);
    } else if (row.type === "SOUS_CHAPITRE") {
      while (stack.length > 0 && rows[stack[stack.length - 1]].type === "SOUS_CHAPITRE") {
        closingBefore[i].push(stack.pop()!);
      }
      stack.push(i);
    }
  });
  const closingAtEnd = [...stack].reverse();
  return { closingBefore, closingAtEnd };
}

export type { LigneType };
