"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prochainNumeroDocument } from "@/lib/codification";

async function genNumeroFAP() {
  const items = await prisma.ficheAgrementProduit.findMany({ select: { numero: true } });
  return prochainNumeroDocument("FAP", items.map((i) => i.numero));
}

export async function creerFicheAgrement(formData: FormData) {
  const f = await prisma.ficheAgrementProduit.create({
    data: {
      numero: await genNumeroFAP(),
      modele: (formData.get("modele") as string) || "SDA",
      chantierId: (formData.get("chantierId") as string) || null,
      devisId: (formData.get("devisId") as string) || null,
      operation: (formData.get("operation") as string) || null,
    },
  });
  revalidatePath("/etude-prix/agrement-produits");
  redirect(`/etude-prix/agrement-produits/${f.id}`);
}

export async function sauvegarderFicheAgrement(
  id: string,
  data: {
    statut: string;
    modele: string;
    chantierId?: string | null;
    devisId?: string | null;
    operation?: string | null;
    lot?: string | null;
    zone?: string | null;
    niveau?: string | null;
    emetteurNom?: string | null;
    emetteurDate?: string | null;
    marque?: string | null;
    typeModele?: string | null;
    descriptionColoris?: string | null;
    localisation?: string | null;
    documentationJointe?: boolean;
    ficheTechnique?: boolean;
    avisCSTB?: boolean;
    fds?: boolean;
    pvFeu?: boolean;
    pvAcoustique?: boolean;
    autresDocuments?: string | null;
    avisMO?: string | null;
    observationsMO?: string | null;
    nomMO?: string | null;
    prenomMO?: string | null;
    dateMO?: string | null;
    avisMOE?: string | null;
    observationsMOE?: string | null;
    nomMOE?: string | null;
    prenomMOE?: string | null;
    dateMOE?: string | null;
    avisBC?: string | null;
    observationsBC?: string | null;
    nomBC?: string | null;
    prenomBC?: string | null;
    dateBC?: string | null;
    notes?: string | null;
  }
) {
  await prisma.ficheAgrementProduit.update({
    where: { id },
    data: {
      statut: data.statut,
      modele: data.modele,
      chantierId: data.chantierId ?? null,
      devisId: data.devisId ?? null,
      operation: data.operation ?? null,
      lot: data.lot ?? null,
      zone: data.zone ?? null,
      niveau: data.niveau ?? null,
      emetteurNom: data.emetteurNom ?? null,
      emetteurDate: data.emetteurDate ? new Date(data.emetteurDate) : null,
      marque: data.marque ?? null,
      typeModele: data.typeModele ?? null,
      descriptionColoris: data.descriptionColoris ?? null,
      localisation: data.localisation ?? null,
      documentationJointe: data.documentationJointe ?? false,
      ficheTechnique: data.ficheTechnique ?? false,
      avisCSTB: data.avisCSTB ?? false,
      fds: data.fds ?? false,
      pvFeu: data.pvFeu ?? false,
      pvAcoustique: data.pvAcoustique ?? false,
      autresDocuments: data.autresDocuments ?? null,
      avisMO: data.avisMO ?? null,
      observationsMO: data.observationsMO ?? null,
      nomMO: data.nomMO ?? null,
      prenomMO: data.prenomMO ?? null,
      dateMO: data.dateMO ? new Date(data.dateMO) : null,
      avisMOE: data.avisMOE ?? null,
      observationsMOE: data.observationsMOE ?? null,
      nomMOE: data.nomMOE ?? null,
      prenomMOE: data.prenomMOE ?? null,
      dateMOE: data.dateMOE ? new Date(data.dateMOE) : null,
      avisBC: data.avisBC ?? null,
      observationsBC: data.observationsBC ?? null,
      nomBC: data.nomBC ?? null,
      prenomBC: data.prenomBC ?? null,
      dateBC: data.dateBC ? new Date(data.dateBC) : null,
      notes: data.notes ?? null,
    },
  });
  revalidatePath(`/etude-prix/agrement-produits/${id}`);
}

export async function supprimerFicheAgrement(id: string) {
  await prisma.ficheAgrementProduit.delete({ where: { id } });
  revalidatePath("/etude-prix/agrement-produits");
  redirect("/etude-prix/agrement-produits");
}
