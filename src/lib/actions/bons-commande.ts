"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { prochainNumeroDocument } from "@/lib/codification";
import { nextNumeroBl } from "@/lib/actions/bons-livraison";

// ---------------------------------------------------------------------------
// Numérotation
// ---------------------------------------------------------------------------

async function nextNumeroBc(): Promise<string> {
  const bcs = await prisma.bonCommande.findMany({ select: { numero: true } });
  return prochainNumeroDocument("BC", bcs.map((b) => b.numero));
}

// ---------------------------------------------------------------------------
// Calcul des totaux depuis les lignes
// ---------------------------------------------------------------------------

function computeTotals(lignes: { quantite?: number | null; prixUnitaireHT?: number | null; tauxTVA?: number | null; totalHT?: number | null }[]) {
  let totalHT = 0;
  let totalTVA = 0;
  for (const l of lignes) {
    const ht = (l.quantite ?? 0) * (l.prixUnitaireHT ?? 0);
    totalHT  += ht;
    totalTVA += ht * ((l.tauxTVA ?? 20) / 100);
  }
  return { totalHT: Math.round(totalHT * 100) / 100, totalTVA: Math.round(totalTVA * 100) / 100, totalTTC: Math.round((totalHT + totalTVA) * 100) / 100 };
}

// ---------------------------------------------------------------------------
// Créer un BC
// ---------------------------------------------------------------------------

export async function creerBonCommande(formData: FormData): Promise<void> {
  const numero     = await nextNumeroBc();
  const fournisseurId = formData.get("fournisseurId") as string;
  const chantierId    = (formData.get("chantierId") as string) || null;
  const notes         = (formData.get("notes") as string) || null;

  const bc = await prisma.bonCommande.create({
    data: { numero, fournisseurId, chantierId, notes, totalHT: 0, totalTVA: 0, totalTTC: 0 },
  });

  revalidatePath("/bons-commande");
  redirect(`/bons-commande/${bc.id}`);
}

// ---------------------------------------------------------------------------
// Mettre à jour les métadonnées du BC
// ---------------------------------------------------------------------------

export async function mettreAJourBonCommande(id: string, formData: FormData): Promise<void> {
  const fournisseurId = formData.get("fournisseurId") as string;
  const chantierId    = (formData.get("chantierId") as string) || null;
  const statut        = formData.get("statut") as string;
  const notes         = (formData.get("notes") as string) || null;

  await prisma.bonCommande.update({
    where: { id },
    data: { fournisseurId, chantierId, statut, notes },
  });

  revalidatePath("/bons-commande");
  revalidatePath(`/bons-commande/${id}`);
}

// ---------------------------------------------------------------------------
// Sauvegarder les lignes du BC + recalculer totaux
// ---------------------------------------------------------------------------

export type LigneBcData = {
  id?:            string;
  ordre:          number;
  designation:    string;
  unite:          string;
  quantite:       number;
  prixUnitaireHT: number;
  tauxTVA:        number;
};

export async function sauvegarderLignesBc(bcId: string, lignes: LigneBcData[]): Promise<void> {
  const lignesAvecTotaux = lignes.map((l) => ({
    ...l,
    totalHT: Math.round(l.quantite * l.prixUnitaireHT * 100) / 100,
  }));

  const { totalHT, totalTVA, totalTTC } = computeTotals(lignesAvecTotaux);

  await prisma.$transaction([
    prisma.bonCommandeLigne.deleteMany({ where: { bonCommandeId: bcId } }),
    ...lignesAvecTotaux.map((l, i) =>
      prisma.bonCommandeLigne.create({
        data: {
          bonCommandeId:  bcId,
          ordre:          i,
          designation:    l.designation,
          unite:          l.unite,
          quantite:       l.quantite,
          prixUnitaireHT: l.prixUnitaireHT,
          tauxTVA:        l.tauxTVA,
          totalHT:        l.totalHT,
        },
      })
    ),
    prisma.bonCommande.update({
      where: { id: bcId },
      data: { totalHT, totalTVA, totalTTC },
    }),
  ]);

  revalidatePath("/bons-commande");
  revalidatePath(`/bons-commande/${bcId}`);
}

// ---------------------------------------------------------------------------
// Changer le statut du BC
// ---------------------------------------------------------------------------

export async function changerStatutBc(id: string, statut: string): Promise<void> {
  await prisma.bonCommande.update({ where: { id }, data: { statut } });
  revalidatePath("/bons-commande");
  revalidatePath(`/bons-commande/${id}`);
}

// ---------------------------------------------------------------------------
// Supprimer le BC
// ---------------------------------------------------------------------------

export async function supprimerBonCommande(id: string): Promise<void> {
  await prisma.bonCommande.delete({ where: { id } });
  revalidatePath("/bons-commande");
  redirect("/bons-commande");
}

// ---------------------------------------------------------------------------
// Créer un BL depuis un BC
// ---------------------------------------------------------------------------

export async function creerBlDepuisBc(bcId: string): Promise<void> {
  const numero = await nextNumeroBl();

  const bc = await prisma.bonCommande.findUnique({
    where: { id: bcId },
    include: { lignes: true },
  });
  if (!bc) return;

  const bl = await prisma.bonLivraison.create({
    data: {
      numero,
      fournisseurId: bc.fournisseurId,
      chantierId:    bc.chantierId,
      bonCommandeId: bcId,
      statut:        "ATTENDU",
      lignes: {
        create: bc.lignes.map((l, i) => ({
          ordre:            i,
          designation:      l.designation,
          unite:            l.unite ?? "u",
          quantiteCommandee: l.quantite,
          quantiteRecue:    0,
        })),
      },
    },
  });

  revalidatePath("/bons-livraison");
  redirect(`/bons-livraison/${bl.id}`);
}
