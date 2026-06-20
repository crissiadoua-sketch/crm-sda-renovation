"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

async function nextNumeroContrat(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CST-${year}-`;
  const last = await prisma.contratSousTraitance.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const seq = last ? parseInt(last.numero.split("-")[2] ?? "0", 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
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

export async function supprimerContrat(id: string): Promise<void> {
  await prisma.contratSousTraitance.delete({ where: { id } });
  revalidatePath("/contrats-sous-traitance");
  redirect("/contrats-sous-traitance");
}
