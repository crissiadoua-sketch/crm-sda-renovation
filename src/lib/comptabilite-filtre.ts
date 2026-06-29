import { prisma } from "@/lib/prisma";

// Période [début, fin] correspondant aux filtres "année" (obligatoire) / "mois" (optionnel,
// sinon année entière) de la page Comptabilité. Partagé entre la page, l'export Excel et
// l'aperçu PDF pour garantir des totaux identiques.
export function periodeComptable(annee?: string, mois?: string) {
  const now = new Date();
  const year = parseInt(annee ?? String(now.getFullYear()), 10);
  const month = mois ? parseInt(mois, 10) : null;

  const debut = month ? new Date(year, month - 1, 1) : new Date(year, 0, 1);
  const fin = month ? new Date(year, month, 0, 23, 59, 59) : new Date(year, 11, 31, 23, 59, 59);
  return { year, month, debut, fin };
}

export async function donneesComptables(annee?: string, mois?: string) {
  const { year, month, debut, fin } = periodeComptable(annee, mois);

  const [factures, depenses, bonsCommande] = await Promise.all([
    prisma.facture.findMany({
      where: { createdAt: { gte: debut, lte: fin }, statut: { not: "BROUILLON" } },
      include: {
        client: { select: { raisonSociale: true } },
        lignes: { select: { totalHT: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.depense.findMany({
      where: { date: { gte: debut, lte: fin } },
      orderBy: { date: "asc" },
    }),
    prisma.bonCommande.findMany({
      where: { createdAt: { gte: debut, lte: fin }, statut: { not: "ANNULE" } },
      include: { fournisseur: { select: { nom: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const caHT = factures.reduce((s, f) => s + f.totalHT, 0);
  const caTTC = factures.reduce((s, f) => s + f.totalTTC, 0);
  const totalDep = depenses.reduce((s, d) => s + d.montant, 0);
  const totalAchHT = bonsCommande.reduce((s, b) => s + b.totalHT, 0);

  return {
    year, month, debut, fin,
    factures, depenses, bonsCommande,
    caHT, caTTC, totalDep, totalAchHT,
    margeBruteHT: caHT - totalDep - totalAchHT,
  };
}
