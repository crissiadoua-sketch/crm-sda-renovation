"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { stockerFichier, supprimerFichierStocke } from "@/lib/blob-storage";

// Un seul Métré actif par chantier (créé à la première visite) — pas de
// notion de "liste de métrés", c'est un outil de travail, pas un document
// versionné comme un devis.
export async function getOrCreateMetre(chantierId: string) {
  const existant = await prisma.metre.findFirst({
    where: { chantierId },
    orderBy: { createdAt: "desc" },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
  if (existant) return existant;
  return prisma.metre.create({
    data: { chantierId, nom: "Métré" },
    include: { lignes: { orderBy: { ordre: "asc" } } },
  });
}

const ligneInputSchema = z.object({
  designation: z.string().min(1),
  type: z.enum(["LONGUEUR", "SURFACE", "QUANTITE"]),
  valeurMm: z.number(),
  uniteCible: z.enum(["ml", "m2", "u"]),
});

export type SaveMetreState =
  | { error?: string; success?: boolean; lignes?: { id: string; designation: string; type: string; valeurMm: number; uniteCible: string }[] }
  | undefined;

export async function saveMetre(
  metreId: string,
  chantierId: string,
  _prevState: SaveMetreState,
  formData: FormData,
): Promise<SaveMetreState> {
  const donneesCanvas = formData.get("donneesCanvas");
  const uniteAffichage = formData.get("uniteAffichage");
  const lignesRaw = formData.get("lignes");
  const fichier = formData.get("fichier") as File | null;

  if (typeof lignesRaw !== "string") return { error: "Données de métré invalides." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(lignesRaw);
  } catch {
    return { error: "Données de métré invalides." };
  }

  const result = z.array(ligneInputSchema).safeParse(parsed);
  if (!result.success) return { error: "Données de métré invalides." };

  let fichierData: { fichierUrl: string; fichierNom: string } | null = null;
  if (fichier && fichier.size > 0) {
    const metreActuel = await prisma.metre.findUnique({ where: { id: metreId } });
    if (metreActuel?.fichierUrl) await supprimerFichierStocke(metreActuel.fichierUrl);
    const { url, nomFichier } = await stockerFichier(fichier, "metres-plans");
    fichierData = { fichierUrl: url, fichierNom: fichier.name || nomFichier };
  }

  const [, metreMisAJour] = await prisma.$transaction([
    prisma.metreLigne.deleteMany({ where: { metreId } }),
    prisma.metre.update({
      where: { id: metreId },
      data: {
        donneesCanvas: typeof donneesCanvas === "string" ? donneesCanvas : null,
        uniteAffichage: typeof uniteAffichage === "string" ? uniteAffichage : "m",
        ...(fichierData ?? {}),
        lignes: {
          create: result.data.map((l, index) => ({
            designation: l.designation,
            type: l.type,
            valeurMm: l.valeurMm,
            uniteCible: l.uniteCible,
            ordre: index + 1,
          })),
        },
      },
      include: { lignes: { orderBy: { ordre: "asc" } } },
    }),
  ]);

  revalidatePath(`/chantiers/${chantierId}/metre`);
  return {
    success: true,
    lignes: metreMisAJour.lignes.map((l) => ({
      id: l.id,
      designation: l.designation,
      type: l.type,
      valeurMm: l.valeurMm,
      uniteCible: l.uniteCible,
    })),
  };
}

export type EnvoyerDevisState = { error?: string; success?: boolean } | undefined;

// Convertit une ligne de métré (toujours stockée en mm / mm² en interne) vers
// la quantité attendue par une DevisLigne, selon l'unité d'ouvrage choisie.
function quantiteDevis(valeurMm: number, uniteCible: string): number {
  if (uniteCible === "u") return Math.round(valeurMm * 1000) / 1000;
  if (uniteCible === "m2") return Math.round((valeurMm / 1_000_000) * 1000) / 1000;
  return Math.round((valeurMm / 1000) * 1000) / 1000; // ml
}

export async function envoyerLignesVersDevis(
  _prevState: EnvoyerDevisState,
  formData: FormData,
): Promise<EnvoyerDevisState> {
  const devisId = formData.get("devisId");
  const idsRaw = formData.get("metreLigneIds");
  if (typeof devisId !== "string" || !devisId) return { error: "Sélectionnez un devis." };
  if (typeof idsRaw !== "string") return { error: "Aucune ligne sélectionnée." };

  let metreLigneIds: string[];
  try {
    metreLigneIds = JSON.parse(idsRaw);
  } catch {
    return { error: "Données invalides." };
  }
  if (!Array.isArray(metreLigneIds) || metreLigneIds.length === 0) {
    return { error: "Sélectionnez au moins une ligne." };
  }

  const [devis, derniereLigne, lignesMetre] = await Promise.all([
    prisma.devis.findUnique({ where: { id: devisId } }),
    prisma.devisLigne.findFirst({ where: { devisId }, orderBy: { ordre: "desc" } }),
    prisma.metreLigne.findMany({ where: { id: { in: metreLigneIds } } }),
  ]);
  if (!devis) return { error: "Devis introuvable." };
  if (lignesMetre.length === 0) return { error: "Lignes de métré introuvables." };

  let ordre = (derniereLigne?.ordre ?? 0) + 1;
  const uniteLabels: Record<string, string> = { ml: "ml", m2: "m²", u: "u" };

  await prisma.devisLigne.createMany({
    data: lignesMetre.map((l) => ({
      devisId,
      ordre: ordre++,
      type: "LIGNE",
      designation: l.designation,
      unite: uniteLabels[l.uniteCible] ?? l.uniteCible,
      quantite: quantiteDevis(l.valeurMm, l.uniteCible),
    })),
  });

  revalidatePath(`/devis/${devisId}`);
  return { success: true };
}
