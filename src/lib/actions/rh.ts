"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getLignesTemplate,
  calculerLignes,
  calculerNet,
  padMatricule,
  type TypeCcn,
} from "@/lib/ccn-batiment";

// ---------------------------------------------------------------------------
// Salarié
// ---------------------------------------------------------------------------

const salarieSchema = z.object({
  nom: z.string().min(1, "Le nom est requis."),
  prenom: z.string().min(1, "Le prénom est requis."),
  numeroSS: z.string().optional(),
  dateNaissance: z.string().optional(),
  dateEmbauche: z.string().min(1, "La date d'embauche est requise."),
  dateSortie: z.string().optional(),
  typeContrat: z.string().default("CDI"),
  typeCcn: z.enum(["OUVRIERS", "ETAM", "CADRES"]).default("OUVRIERS"),
  coefficient: z.preprocess((v) => (v === "" || v === undefined || v === null ? null : v), z.coerce.number().int().nullable()),
  position: z.string().optional(),
  qualification: z.string().optional(),
  salaireBase: z.coerce.number().min(0),
  heuresMois: z.coerce.number().min(0).default(151.67),
  adresse: z.string().optional(),
  codePostal: z.string().optional(),
  ville: z.string().optional(),
  email: z.string().optional(),
  telephone: z.string().optional(),
  numeroCIBTP: z.string().optional(),
  statutRH: z.string().default("ACTIF"),
  couleur: z.string().optional(),
});

export type SalarieState = { errors?: Record<string, string[]> } | undefined;

async function getNextMatricule() {
  const count = await prisma.salarie.count();
  return padMatricule(count + 1);
}

export async function createSalarie(_prev: SalarieState, formData: FormData): Promise<SalarieState> {
  const validated = salarieSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const data = validated.data;
  const matricule = await getNextMatricule();

  const salarie = await prisma.salarie.create({
    data: {
      matricule,
      nom: data.nom,
      prenom: data.prenom,
      numeroSS: data.numeroSS ?? null,
      dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : null,
      dateEmbauche: new Date(data.dateEmbauche),
      dateSortie: data.dateSortie ? new Date(data.dateSortie) : null,
      typeContrat: data.typeContrat,
      typeCcn: data.typeCcn,
      coefficient: data.coefficient ?? null,
      position: data.position ?? null,
      qualification: data.qualification ?? null,
      salaireBase: data.salaireBase,
      heuresMois: data.heuresMois,
      adresse: data.adresse ?? null,
      codePostal: data.codePostal ?? null,
      ville: data.ville ?? null,
      email: data.email ?? null,
      telephone: data.telephone ?? null,
      numeroCIBTP: data.numeroCIBTP ?? null,
      statutRH: data.statutRH,
      couleur: data.couleur ?? null,
    },
  });

  revalidatePath("/rh");
  redirect(`/rh/${salarie.id}`);
}

export async function updateSalarie(id: string, _prev: SalarieState, formData: FormData): Promise<SalarieState> {
  const validated = salarieSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const data = validated.data;
  await prisma.salarie.update({
    where: { id },
    data: {
      nom: data.nom,
      prenom: data.prenom,
      numeroSS: data.numeroSS ?? null,
      dateNaissance: data.dateNaissance ? new Date(data.dateNaissance) : null,
      dateEmbauche: new Date(data.dateEmbauche),
      dateSortie: data.dateSortie ? new Date(data.dateSortie) : null,
      typeContrat: data.typeContrat,
      typeCcn: data.typeCcn,
      coefficient: data.coefficient ?? null,
      position: data.position ?? null,
      qualification: data.qualification ?? null,
      salaireBase: data.salaireBase,
      heuresMois: data.heuresMois,
      adresse: data.adresse ?? null,
      codePostal: data.codePostal ?? null,
      ville: data.ville ?? null,
      email: data.email ?? null,
      telephone: data.telephone ?? null,
      numeroCIBTP: data.numeroCIBTP ?? null,
      statutRH: data.statutRH,
      couleur: data.couleur ?? null,
    },
  });

  revalidatePath("/rh");
  revalidatePath(`/rh/${id}`);
  redirect(`/rh/${id}`);
}

export async function deleteSalarie(id: string) {
  await prisma.salarie.delete({ where: { id } });
  revalidatePath("/rh");
  redirect("/rh");
}

// ---------------------------------------------------------------------------
// Bulletin de paie
// ---------------------------------------------------------------------------

const bulletinSchema = z.object({
  periode: z.string().min(1, "La période est requise."),
  datePaiement: z.string().optional(),
  heuresTravaillees: z.coerce.number().min(0),
  heuresSupp25: z.coerce.number().min(0),
  heuresSupp50: z.coerce.number().min(0),
  salaireBase: z.coerce.number().min(0),
  autresElements: z.coerce.number().min(0),
  commentaires: z.string().optional(),
  statut: z.string().default("BROUILLON"),
  lignes: z.string().default("[]"), // JSON serialized
});

export type BulletinState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function createBulletin(
  salarieId: string,
  typeCcn: TypeCcn,
  _prev: BulletinState,
  formData: FormData,
): Promise<BulletinState> {
  const validated = bulletinSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const data = validated.data;
  const lignes = JSON.parse(data.lignes);
  const brut = data.salaireBase + data.autresElements
    + data.heuresSupp25 * (data.salaireBase / (validated.data.heuresTravaillees || 151.67)) * 0.25
    + data.heuresSupp50 * (data.salaireBase / (validated.data.heuresTravaillees || 151.67)) * 0.5;
  const totals = calculerNet(brut, lignes.length > 0 ? lignes : calculerLignes(getLignesTemplate(typeCcn), brut));

  const bulletin = await prisma.bulletinDePaie.create({
    data: {
      salarieId,
      periode: data.periode,
      datePaiement: data.datePaiement ? new Date(data.datePaiement) : null,
      heuresTravaillees: data.heuresTravaillees,
      heuresSupp25: data.heuresSupp25,
      heuresSupp50: data.heuresSupp50,
      salaireBase: data.salaireBase,
      autresElements: data.autresElements,
      totalBrut: brut,
      lignes: data.lignes,
      commentaires: data.commentaires ?? null,
      statut: data.statut,
      ...totals,
    },
  });

  revalidatePath(`/rh/${salarieId}`);
  redirect(`/rh/${salarieId}/bulletins/${bulletin.id}`);
}

export async function updateBulletin(
  salarieId: string,
  bulletinId: string,
  _prev: BulletinState,
  formData: FormData,
): Promise<BulletinState> {
  const validated = bulletinSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const data = validated.data;
  const lignes = JSON.parse(data.lignes);
  const salarie = await prisma.salarie.findUnique({ where: { id: salarieId } });
  const typeCcn = (salarie?.typeCcn ?? "OUVRIERS") as TypeCcn;
  const brut = parseFloat((formData.get("totalBrut") as string) ?? "0") || 0;
  const totals = calculerNet(brut, lignes.length > 0 ? lignes : calculerLignes(getLignesTemplate(typeCcn), brut));

  await prisma.bulletinDePaie.update({
    where: { id: bulletinId },
    data: {
      periode: data.periode,
      datePaiement: data.datePaiement ? new Date(data.datePaiement) : null,
      heuresTravaillees: data.heuresTravaillees,
      heuresSupp25: data.heuresSupp25,
      heuresSupp50: data.heuresSupp50,
      salaireBase: data.salaireBase,
      autresElements: data.autresElements,
      totalBrut: brut,
      lignes: data.lignes,
      commentaires: data.commentaires ?? null,
      statut: data.statut,
      ...totals,
    },
  });

  revalidatePath(`/rh/${salarieId}`);
  revalidatePath(`/rh/${salarieId}/bulletins/${bulletinId}`);
  return { message: "Bulletin mis à jour." };
}

export async function deleteBulletin(salarieId: string, bulletinId: string) {
  await prisma.bulletinDePaie.delete({ where: { id: bulletinId } });
  revalidatePath(`/rh/${salarieId}`);
  redirect(`/rh/${salarieId}`);
}
