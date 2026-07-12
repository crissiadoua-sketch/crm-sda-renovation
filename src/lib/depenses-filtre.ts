import { prisma } from "@/lib/prisma";

// Calcule la période [début, fin] correspondant au filtre "mois" (yyyy-MM) de la
// page Dépenses, ou le mois en cours si absent/invalide. Partagé entre la page
// liste, l'export Excel et l'aperçu PDF pour garantir des totaux identiques.
export function periodeDepenses(moisFilter?: string): { debut: Date; fin: Date } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  if (moisFilter && /^\d{4}-\d{2}$/.test(moisFilter)) {
    const [my, mm] = moisFilter.split("-").map(Number);
    return { debut: new Date(my, mm - 1, 1), fin: new Date(my, mm, 0, 23, 59, 59) };
  }
  return { debut: new Date(y, m, 1), fin: new Date(y, m + 1, 0, 23, 59, 59) };
}

export async function depensesFiltrees(moisFilter?: string, categorie?: string, chantierId?: string) {
  const { debut, fin } = periodeDepenses(moisFilter);
  return prisma.depense.findMany({
    where: {
      date: { gte: debut, lte: fin },
      type: "REEL",
      ...(categorie ? { categorie } : {}),
      ...(chantierId ? { chantierId } : {}),
    },
    include: {
      chantier: { select: { id: true, nom: true, reference: true } },
      fournisseur: { select: { id: true, nom: true } },
    },
    orderBy: { date: "desc" },
  });
}
