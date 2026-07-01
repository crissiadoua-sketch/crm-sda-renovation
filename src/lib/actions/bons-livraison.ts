"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { prochainNumeroDocument } from "@/lib/codification";

// ---------------------------------------------------------------------------
// Numérotation
// ---------------------------------------------------------------------------

export async function nextNumeroBl(): Promise<string> {
  const bls = await prisma.bonLivraison.findMany({ select: { numero: true } });
  return prochainNumeroDocument("BL", bls.map((b) => b.numero));
}

// ---------------------------------------------------------------------------
// Créer un BL standalone
// ---------------------------------------------------------------------------

export async function creerBonLivraison(formData: FormData): Promise<void> {
  const numero      = await nextNumeroBl();
  const fournisseurId = formData.get("fournisseurId") as string;
  const chantierId    = (formData.get("chantierId") as string) || null;
  const bonCommandeId = (formData.get("bonCommandeId") as string) || null;
  const notes         = (formData.get("notes") as string) || null;
  const dateLivraison = (formData.get("dateLivraison") as string) || null;

  const bl = await prisma.bonLivraison.create({
    data: {
      numero, fournisseurId, chantierId,
      bonCommandeId: bonCommandeId || null,
      notes,
      dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
    },
  });

  revalidatePath("/bons-livraison");
  redirect(`/bons-livraison/${bl.id}`);
}

// ---------------------------------------------------------------------------
// Mettre à jour le BL
// ---------------------------------------------------------------------------

export async function mettreAJourBonLivraison(id: string, formData: FormData): Promise<void> {
  const statut        = formData.get("statut") as string;
  const notes         = (formData.get("notes") as string) || null;
  const dateLivraison = (formData.get("dateLivraison") as string) || null;

  await prisma.bonLivraison.update({
    where: { id },
    data: {
      statut,
      notes,
      dateLivraison: dateLivraison ? new Date(dateLivraison) : null,
    },
  });

  revalidatePath("/bons-livraison");
  revalidatePath(`/bons-livraison/${id}`);
}

// ---------------------------------------------------------------------------
// Sauvegarder les lignes du BL
// ---------------------------------------------------------------------------

export type LigneBlData = {
  id?:               string;
  ordre:             number;
  designation:       string;
  unite:             string;
  quantiteCommandee: number;
  quantiteRecue:     number;
  notes?:            string;
};

export async function sauvegarderLignesBl(blId: string, lignes: LigneBlData[]): Promise<void> {
  // Calculer le statut automatiquement
  const total  = lignes.reduce((s, l) => s + l.quantiteCommandee, 0);
  const recue  = lignes.reduce((s, l) => s + l.quantiteRecue, 0);
  let statut = "ATTENDU";
  if (recue >= total && total > 0) statut = "COMPLET";
  else if (recue > 0) statut = "PARTIEL";

  await prisma.$transaction([
    prisma.bonLivraisonLigne.deleteMany({ where: { bonLivraisonId: blId } }),
    ...lignes.map((l, i) =>
      prisma.bonLivraisonLigne.create({
        data: {
          bonLivraisonId:    blId,
          ordre:             i,
          designation:       l.designation,
          unite:             l.unite,
          quantiteCommandee: l.quantiteCommandee,
          quantiteRecue:     l.quantiteRecue,
          notes:             l.notes ?? null,
        },
      })
    ),
    prisma.bonLivraison.update({
      where: { id: blId },
      data: { statut },
    }),
  ]);

  revalidatePath("/bons-livraison");
  revalidatePath(`/bons-livraison/${blId}`);
}

// ---------------------------------------------------------------------------
// Supprimer le BL
// ---------------------------------------------------------------------------

export async function supprimerBonLivraison(id: string): Promise<void> {
  await prisma.bonLivraison.delete({ where: { id } });
  revalidatePath("/bons-livraison");
  redirect("/bons-livraison");
}
