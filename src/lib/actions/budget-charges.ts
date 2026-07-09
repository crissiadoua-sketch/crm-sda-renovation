"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type BudgetLigne = {
  id?: string;
  label: string;
  categorie: string;
  type: "FIXE" | "VARIABLE";
  montantAnnuel: number;
};

const ligneSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  categorie: z.string().min(1),
  type: z.enum(["FIXE", "VARIABLE"]),
  montantAnnuel: z.number().min(0),
});

export async function saveBudgetCharges(annee: number, lignes: BudgetLigne[]) {
  const parsed = z.array(ligneSchema).parse(lignes);

  // Supprimer toutes les lignes de l'année puis recréer (upsert simplifié)
  await prisma.$transaction(async (tx) => {
    await tx.budgetChargesSociete.deleteMany({ where: { annee } });
    if (parsed.length > 0) {
      await tx.budgetChargesSociete.createMany({
        data: parsed.map((l) => ({
          annee,
          label: l.label,
          categorie: l.categorie,
          type: l.type,
          montantAnnuel: l.montantAnnuel,
        })),
      });
    }
  });

  revalidatePath("/finances/charges");
  revalidatePath("/finances/rentabilite");
}
