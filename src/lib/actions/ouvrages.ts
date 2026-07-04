"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getNextOuvrageCode } from "@/lib/corps-etat";

// ---------------------------------------------------------------------------
// Schéma de validation — 3 offres × 4 champs
// ---------------------------------------------------------------------------

const numFloat = z.preprocess(
  (v) => parseFloat(String(v ?? "0").replace(",", ".")),
  z.number().min(0),
);

const ouvrageSchema = z.object({
  corpsEtat:   z.string().min(1, "Le corps d'état est requis."),
  designation: z.string().min(3, "La désignation doit comporter au moins 3 caractères."),
  unite:       z.string().min(1, "L'unité est requise."),
  tauxTVA:     numFloat,
  description:     z.string().optional(),
  styleTexte:      z.string().optional(),
  clausesReserves: z.string().optional(),
  actif:           z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),

  // Offre Économique
  ecoTempsPose:      numFloat,
  ecoPrixPose:       numFloat,
  ecoPrixFourniture: numFloat,
  ecoPrixTotal:      numFloat,

  // Offre Optimisée
  optTempsPose:      numFloat,
  optPrixPose:       numFloat,
  optPrixFourniture: numFloat,
  optPrixTotal:      numFloat,

  // Offre Premium
  premTempsPose:      numFloat,
  premPrixPose:       numFloat,
  premPrixFourniture: numFloat,
  premPrixTotal:      numFloat,
});

export type OuvrageState = { errors?: Record<string, string[]>; message?: string } | undefined;

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

export async function createOuvrage(
  _prev: OuvrageState,
  formData: FormData,
): Promise<OuvrageState> {
  const raw = Object.fromEntries(formData.entries());
  const validated = ouvrageSchema.safeParse({ ...raw, actif: true });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const d = validated.data;

  const existing = await prisma.ouvrage.findMany({
    where: { corpsEtat: d.corpsEtat },
    select: { code: true },
  });
  const code = getNextOuvrageCode(d.corpsEtat, existing.map((o) => o.code));

  await prisma.ouvrage.create({
    data: {
      code,
      corpsEtat:         d.corpsEtat,
      designation:       d.designation,
      unite:             d.unite,
      tauxTVA:           d.tauxTVA,
      description:       d.description,
      styleTexte:        d.styleTexte ?? "{}",
      clausesReserves:   d.clausesReserves ?? "[]",
      actif:             true,
      // Offre Éco
      ecoTempsPose:      d.ecoTempsPose,
      ecoPrixPose:       d.ecoPrixPose,
      ecoPrixFourniture: d.ecoPrixFourniture,
      ecoPrixTotal:      d.ecoPrixTotal,
      // Offre Opt
      optTempsPose:      d.optTempsPose,
      optPrixPose:       d.optPrixPose,
      optPrixFourniture: d.optPrixFourniture,
      optPrixTotal:      d.optPrixTotal,
      // Offre Prem
      premTempsPose:     d.premTempsPose,
      premPrixPose:      d.premPrixPose,
      premPrixFourniture: d.premPrixFourniture,
      premPrixTotal:     d.premPrixTotal,
      // Rétro-compat : = offre optimisée
      prixFourniture:    d.optPrixFourniture,
      prixPose:          d.optPrixPose,
      prixUnitaire:      d.optPrixTotal,
    },
  });

  revalidatePath("/ouvrages");
  redirect("/ouvrages");
}

// ---------------------------------------------------------------------------
// Mise à jour
// ---------------------------------------------------------------------------

export async function updateOuvrage(
  id: string,
  _prev: OuvrageState,
  formData: FormData,
): Promise<OuvrageState> {
  const raw = Object.fromEntries(formData.entries());
  const validated = ouvrageSchema.safeParse({
    ...raw,
    actif: formData.get("actif") === "on",
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const d = validated.data;

  await prisma.ouvrage.update({
    where: { id },
    data: {
      corpsEtat:         d.corpsEtat,
      designation:       d.designation,
      unite:             d.unite,
      tauxTVA:           d.tauxTVA,
      description:       d.description,
      styleTexte:        d.styleTexte ?? "{}",
      clausesReserves:   d.clausesReserves ?? "[]",
      actif:             d.actif,
      // Offre Éco
      ecoTempsPose:      d.ecoTempsPose,
      ecoPrixPose:       d.ecoPrixPose,
      ecoPrixFourniture: d.ecoPrixFourniture,
      ecoPrixTotal:      d.ecoPrixTotal,
      // Offre Opt
      optTempsPose:      d.optTempsPose,
      optPrixPose:       d.optPrixPose,
      optPrixFourniture: d.optPrixFourniture,
      optPrixTotal:      d.optPrixTotal,
      // Offre Prem
      premTempsPose:     d.premTempsPose,
      premPrixPose:      d.premPrixPose,
      premPrixFourniture: d.premPrixFourniture,
      premPrixTotal:     d.premPrixTotal,
      // Rétro-compat
      prixFourniture:    d.optPrixFourniture,
      prixPose:          d.optPrixPose,
      prixUnitaire:      d.optPrixTotal,
    },
  });

  revalidatePath("/ouvrages");
  redirect("/ouvrages");
}

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------

export async function deleteOuvrage(id: string): Promise<void> {
  await prisma.ouvrage.delete({ where: { id } });
  revalidatePath("/ouvrages");
  redirect("/ouvrages");
}

// ---------------------------------------------------------------------------
// Enregistrement rapide depuis l'éditeur de devis
// ---------------------------------------------------------------------------

export async function saveOuvrageFromDevis(data: {
  corpsEtat:      string;
  designation:    string;
  unite:          string;
  prixFourniture: number;
  prixPose:       number;
  prixUnitaire:   number;
  tauxTVA:        number;
  description?:   string;
  styleTexte?:    string;
}): Promise<{ id: string; code: string }> {
  const existing = await prisma.ouvrage.findMany({
    where: { corpsEtat: data.corpsEtat },
    select: { code: true },
  });
  const code = getNextOuvrageCode(data.corpsEtat, existing.map((o) => o.code));

  const ouvrage = await prisma.ouvrage.create({
    data: {
      ...data,
      styleTexte: data.styleTexte ?? "{}",
      code,
      actif: true,
      // Mettre les valeurs dans les 3 offres de façon identique
      ecoPrixFourniture:  data.prixFourniture,
      ecoPrixPose:        data.prixPose,
      ecoPrixTotal:       data.prixUnitaire,
      optPrixFourniture:  data.prixFourniture,
      optPrixPose:        data.prixPose,
      optPrixTotal:       data.prixUnitaire,
      premPrixFourniture: data.prixFourniture,
      premPrixPose:       data.prixPose,
      premPrixTotal:      data.prixUnitaire,
    },
  });

  revalidatePath("/ouvrages");
  return { id: ouvrage.id, code: ouvrage.code };
}
