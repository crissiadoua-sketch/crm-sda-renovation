"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stockerFichier, supprimerFichierStocke } from "@/lib/blob-storage";
import {
  calculerPoutre,
  calculerDalle,
  calculerPoteau,
  type TypeElement,
  type Materiau,
  type ConditionPoutre,
  type ConditionDalle,
  type NiveauCharge,
} from "@/lib/calcul-structurel/pre-dimensionnement";

async function genNumeroPDIM(): Promise<string> {
  const count = await prisma.preDimensionnement.count();
  return `PDIM-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function calculerResultat(formData: FormData) {
  const typeElement = formData.get("typeElement") as TypeElement;
  const materiau = formData.get("materiau") as Materiau;

  if (typeElement === "POUTRE") {
    const portee = parseFloat(formData.get("portee") as string);
    const condition = formData.get("condition") as ConditionPoutre;
    const niveauCharge = formData.get("niveauCharge") as NiveauCharge;
    return calculerPoutre({ materiau, portee, condition, niveauCharge });
  }
  if (typeElement === "DALLE") {
    const portee = parseFloat(formData.get("portee") as string);
    const condition = formData.get("condition") as ConditionDalle;
    const niveauCharge = formData.get("niveauCharge") as NiveauCharge;
    return calculerDalle({ materiau, portee, condition, niveauCharge });
  }
  const effortNormal = parseFloat(formData.get("effortNormal") as string);
  const hauteurLibreRaw = formData.get("hauteurLibre") as string;
  const resistanceRaw = formData.get("resistance") as string;
  return calculerPoteau({
    materiau,
    effortNormal,
    hauteurLibre: hauteurLibreRaw ? parseFloat(hauteurLibreRaw) : undefined,
    resistance: resistanceRaw ? parseFloat(resistanceRaw) : undefined,
  });
}

export async function creerPreDimensionnement(formData: FormData): Promise<void> {
  const typeElement = formData.get("typeElement") as TypeElement;
  const materiau = formData.get("materiau") as Materiau;
  const resultat = calculerResultat(formData);

  const pdim = await prisma.preDimensionnement.create({
    data: {
      numero: await genNumeroPDIM(),
      titre: emptyToNull(formData.get("titre")),
      typeElement,
      materiau,
      portee: formData.get("portee") ? parseFloat(formData.get("portee") as string) : null,
      condition: emptyToNull(formData.get("condition")),
      niveauCharge: emptyToNull(formData.get("niveauCharge")),
      usagePreset: emptyToNull(formData.get("usagePreset")),
      effortNormal: formData.get("effortNormal") ? parseFloat(formData.get("effortNormal") as string) : null,
      hauteurLibre: formData.get("hauteurLibre") ? parseFloat(formData.get("hauteurLibre") as string) : null,
      resistance: formData.get("resistance") ? parseFloat(formData.get("resistance") as string) : null,
      resultatValeurCm: resultat.valeurCm,
      resultatLargeurCm: resultat.largeurCm ?? null,
      resultatLabel: resultat.label,
      formule: resultat.formule,
      hypotheses: resultat.hypotheses.join("\n"),
      chantierId: emptyToNull(formData.get("chantierId")),
      responsable: emptyToNull(formData.get("responsable")),
      notes: emptyToNull(formData.get("notes")),
    },
  });

  revalidatePath("/etude-prix/pre-dimensionnement");
  redirect(`/etude-prix/pre-dimensionnement/${pdim.id}`);
}

export async function modifierPreDimensionnement(id: string, formData: FormData): Promise<void> {
  const typeElement = formData.get("typeElement") as TypeElement;
  const materiau = formData.get("materiau") as Materiau;
  const resultat = calculerResultat(formData);

  await prisma.preDimensionnement.update({
    where: { id },
    data: {
      titre: emptyToNull(formData.get("titre")),
      typeElement,
      materiau,
      portee: formData.get("portee") ? parseFloat(formData.get("portee") as string) : null,
      condition: emptyToNull(formData.get("condition")),
      niveauCharge: emptyToNull(formData.get("niveauCharge")),
      usagePreset: emptyToNull(formData.get("usagePreset")),
      effortNormal: formData.get("effortNormal") ? parseFloat(formData.get("effortNormal") as string) : null,
      hauteurLibre: formData.get("hauteurLibre") ? parseFloat(formData.get("hauteurLibre") as string) : null,
      resistance: formData.get("resistance") ? parseFloat(formData.get("resistance") as string) : null,
      resultatValeurCm: resultat.valeurCm,
      resultatLargeurCm: resultat.largeurCm ?? null,
      resultatLabel: resultat.label,
      formule: resultat.formule,
      hypotheses: resultat.hypotheses.join("\n"),
      chantierId: emptyToNull(formData.get("chantierId")),
      responsable: emptyToNull(formData.get("responsable")),
      notes: emptyToNull(formData.get("notes")),
    },
  });

  revalidatePath("/etude-prix/pre-dimensionnement");
  revalidatePath(`/etude-prix/pre-dimensionnement/${id}`);
  redirect(`/etude-prix/pre-dimensionnement/${id}`);
}

export async function supprimerPreDimensionnement(id: string): Promise<void> {
  const docs = await prisma.preDimensionnementDocument.findMany({ where: { preDimensionnementId: id }, select: { url: true } });
  for (const doc of docs) {
    await supprimerFichierStocke(doc.url);
  }
  await prisma.preDimensionnement.delete({ where: { id } });
  revalidatePath("/etude-prix/pre-dimensionnement");
  redirect("/etude-prix/pre-dimensionnement");
}

export async function ajouterDocumentPreDimensionnement(id: string, formData: FormData): Promise<void> {
  const fichier = formData.get("fichier") as File | null;
  if (!fichier || fichier.size === 0) return;
  const type = (formData.get("type") as string) || "AUTRE";

  const { url, taille } = await stockerFichier(fichier, "pre-dimensionnement");

  await prisma.preDimensionnementDocument.create({
    data: {
      preDimensionnementId: id,
      type,
      nom: fichier.name,
      url,
      taille,
    },
  });

  revalidatePath(`/etude-prix/pre-dimensionnement/${id}`);
}

export async function supprimerDocumentPreDimensionnement(docId: string): Promise<void> {
  const doc = await prisma.preDimensionnementDocument.findUnique({ where: { id: docId } });
  if (!doc) return;
  await supprimerFichierStocke(doc.url);
  await prisma.preDimensionnementDocument.delete({ where: { id: docId } });
  revalidatePath(`/etude-prix/pre-dimensionnement/${doc.preDimensionnementId}`);
}
