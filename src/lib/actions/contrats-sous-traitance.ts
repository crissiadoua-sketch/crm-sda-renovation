"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { prochainNumeroDocument } from "@/lib/codification";

async function nextNumeroContrat(): Promise<string> {
  const contrats = await prisma.contratSousTraitance.findMany({ select: { numero: true } });
  return prochainNumeroDocument("CST", contrats.map((c) => c.numero));
}

export async function creerContrat(formData: FormData): Promise<void> {
  const sousTraitantId = formData.get("sousTraitantId") as string;
  const chantierId     = formData.get("chantierId") as string;
  const numero         = await nextNumeroContrat();
  const signatureToken = randomBytes(32).toString("hex");

  const contrat = await prisma.contratSousTraitance.create({
    data: { numero, sousTraitantId, chantierId, signatureToken },
  });

  revalidatePath("/contrats-sous-traitance");
  redirect(`/contrats-sous-traitance/${contrat.id}`);
}

export async function mettreAJourContrat(id: string, formData: FormData): Promise<void> {
  const objet             = (formData.get("objet") as string) || null;
  const lot               = (formData.get("lot") as string) || null;
  const montantHT         = formData.get("montantHT") ? parseFloat(formData.get("montantHT") as string) : null;
  const tauxTVA           = formData.get("tauxTVA") ? parseFloat(formData.get("tauxTVA") as string) : null;
  const retenueGarantie   = formData.get("retenueGarantie") ? parseFloat(formData.get("retenueGarantie") as string) : null;
  const delaiExecution    = (formData.get("delaiExecution") as string) || null;
  const modaliteReglement = (formData.get("modaliteReglement") as string) || null;
  const penalitesRetard   = (formData.get("penalitesRetard") as string) || null;
  const assuranceRC       = (formData.get("assuranceRC") as string) || null;
  const notes             = (formData.get("notes") as string) || null;
  const clausesPersonnalisees = (formData.get("clausesPersonnalisees") as string) || null;
  const statut            = formData.get("statut") as string;
  const dateDebutStr      = (formData.get("dateDebut") as string) || null;
  const dateFinStr        = (formData.get("dateFin") as string) || null;

  await prisma.contratSousTraitance.update({
    where: { id },
    data: {
      objet, lot, montantHT, tauxTVA, retenueGarantie,
      delaiExecution, modaliteReglement, penalitesRetard, assuranceRC,
      notes, clausesPersonnalisees, statut,
      dateDebut: dateDebutStr ? new Date(dateDebutStr) : null,
      dateFin:   dateFinStr   ? new Date(dateFinStr)   : null,
    },
  });

  revalidatePath("/contrats-sous-traitance");
  revalidatePath(`/contrats-sous-traitance/${id}`);
}

export async function creerContratDepuisOrdreMission(ordreMissionId: string): Promise<void> {
  const om = await prisma.ordreMission.findUnique({
    where: { id: ordreMissionId },
    include: { sousTraitant: true, chantier: true },
  });
  if (!om || !om.chantierId) return;

  // Vérifier qu'un contrat n'existe pas déjà pour ce ST sur ce chantier
  if (!om.sousTraitantId) return; // OM intérimaire — pas de contrat ST
  const existing = await prisma.contratSousTraitance.findFirst({
    where: { sousTraitantId: om.sousTraitantId, chantierId: om.chantierId ?? undefined },
  });
  if (existing) {
    redirect(`/contrats-sous-traitance/${existing.id}`);
    return;
  }

  const numero = await nextNumeroContrat();
  const signatureToken = randomBytes(32).toString("hex");

  const contrat = await prisma.contratSousTraitance.create({
    data: {
      numero,
      sousTraitantId: om.sousTraitantId,
      chantierId:     om.chantierId ?? undefined,
      signatureToken,
      objet:          om.titre,
      lot:            om.sousTraitant?.specialite ?? null,
      dateDebut:      om.dateDebut,
      dateFin:        om.dateFin ?? null,
    },
  });

  revalidatePath("/contrats-sous-traitance");
  redirect(`/contrats-sous-traitance/${contrat.id}`);
}

export async function supprimerContrat(id: string): Promise<void> {
  await prisma.contratSousTraitance.delete({ where: { id } });
  revalidatePath("/contrats-sous-traitance");
  redirect("/contrats-sous-traitance");
}

// ---------------------------------------------------------------------------
// Signature électronique publique (sous-traitant, sans compte)
// ---------------------------------------------------------------------------

export async function signerContrat(
  token: string,
  signataireNom: string,
  signatureImage: string,
  signatureIp?: string,
): Promise<{ ok: boolean; error?: string }> {
  const contrat = await prisma.contratSousTraitance.findUnique({
    where: { signatureToken: token },
    select: { id: true, dateSignature: true },
  });

  if (!contrat) return { ok: false, error: "Lien invalide ou expiré." };
  if (contrat.dateSignature) return { ok: false, error: "Ce contrat a déjà été signé." };

  await prisma.contratSousTraitance.update({
    where: { id: contrat.id },
    data: {
      statut: "SIGNE",
      signataireNom,
      signatureImage,
      dateSignature: new Date(),
      signatureIp: signatureIp ?? null,
    },
  });

  revalidatePath(`/contrats-sous-traitance/${contrat.id}`);
  return { ok: true };
}
