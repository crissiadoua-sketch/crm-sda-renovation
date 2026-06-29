"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

// Tous les champs manuels du bilan : optionnels, vides = non renseigné (null), pas 0 par défaut,
// pour ne jamais écraser une valeur existante par une saisie laissée vide par erreur.
const optionalFloat = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? Number(v) : null))
  .refine((v) => v === null || Number.isFinite(v), "Montant invalide.");

const optionalDate = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? new Date(v) : null));

const CHAMPS_MANUELS = [
  "capitalSouscritNonAppele",
  "immobIncorporellesBrut", "immobIncorporellesAmort",
  "immobCorporellesBrut", "immobCorporellesAmort",
  "immobFinancieresBrut", "immobFinancieresAmort",
  "stocksEnCours", "avancesAcomptesVerses", "creancesClientsManuel", "autresCreances",
  "valeursMobilieresPlacement", "disponibilites", "chargesConstateesAvance",
  "capitalSocial", "primesEmissionFusionApport", "reserves", "reportANouveau",
  "subventionsInvestissement", "provisionsReglementees",
  "provisionsRisquesCharges",
  "empruntsDettesEtablissementsCredit", "empruntsDettesFinancieresDiverses",
  "avancesAcomptesRecus", "dettesFournisseursManuel", "dettesFiscalesSociales",
  "autresDettes", "produitsConstatesAvance",
  "venteMarchandises", "productionStockee", "productionImmobilisee",
  "subventionsExploitation", "reprisesProvisions", "autresProduitsExploitation",
  "variationStock", "impotsTaxesVersementsAssimiles", "salairesTraitements",
  "chargesSociales", "dotationsAmortissementsProvisions", "autresChargesExploitation",
  "produitsFinanciers", "chargesFinancieres", "produitsExceptionnels",
  "chargesExceptionnelles", "participationSalaries", "impotsBenefices",
] as const;

const bilanSchema = z.object({
  annee: z.coerce.number().int(),
  dateDebutExercice: optionalDate,
  dateFinExercice: optionalDate,
  notes: z.string().optional().transform((v) => v?.trim() || null),
  ...Object.fromEntries(CHAMPS_MANUELS.map((c) => [c, optionalFloat])),
});

export type SaveBilanState = { error?: string; success?: boolean } | undefined;

export async function saveBilanExercice(
  _prevState: SaveBilanState,
  formData: FormData,
): Promise<SaveBilanState> {
  const raw: Record<string, string> = {};
  for (const [key, value] of formData.entries()) raw[key] = String(value);

  const parsed = bilanSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides." };
  }

  const { annee, ...data } = parsed.data;

  await prisma.bilanExercice.upsert({
    where: { annee },
    create: { annee, ...data },
    update: data,
  });

  revalidatePath("/comptabilite/bilan");
  return { success: true };
}
