"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function genNumeroFNC() {
  const count = await prisma.ficheNonConformite.count();
  const year = new Date().getFullYear();
  return `FNC-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function creerFicheNonConformite(formData: FormData) {
  const fnc = await prisma.ficheNonConformite.create({
    data: {
      numero: await genNumeroFNC(),
      chantierId:    (formData.get("chantierId")    as string) || null,
      typeNC:        (formData.get("typeNC")        as string) || "EXECUTION",
      constateePar:  (formData.get("constateePar")  as string) || null,
    },
  });
  revalidatePath("/exploitation/fiches-non-conformite");
  redirect(`/exploitation/fiches-non-conformite/${fnc.id}`);
}

export type FNCData = {
  statut: string;
  chantierId?: string | null;
  clientId?: string | null;
  fournisseurId?: string | null;
  typeNC?: string;
  gravite?: string;
  dateConstat?: string;
  constateePar?: string | null;
  description?: string | null;
  causeIdentifiee?: string | null;
  actionCorrective?: string | null;
  dateEcheance?: string | null;
  responsableAction?: string | null;
  dateVerification?: string | null;
  verifiePar?: string | null;
  resultatVerification?: string | null;
  observations?: string | null;
  notes?: string | null;
};

export async function sauvegarderFicheNonConformite(id: string, data: FNCData) {
  await prisma.ficheNonConformite.update({
    where: { id },
    data: {
      statut: data.statut,
      chantierId: data.chantierId ?? null,
      clientId: data.clientId ?? null,
      fournisseurId: data.fournisseurId ?? null,
      typeNC: data.typeNC,
      gravite: data.gravite,
      dateConstat: data.dateConstat ? new Date(data.dateConstat) : undefined,
      constateePar: data.constateePar ?? null,
      description: data.description ?? null,
      causeIdentifiee: data.causeIdentifiee ?? null,
      actionCorrective: data.actionCorrective ?? null,
      dateEcheance: data.dateEcheance ? new Date(data.dateEcheance) : null,
      responsableAction: data.responsableAction ?? null,
      dateVerification: data.dateVerification ? new Date(data.dateVerification) : null,
      verifiePar: data.verifiePar ?? null,
      resultatVerification: data.resultatVerification ?? null,
      observations: data.observations ?? null,
      notes: data.notes ?? null,
    },
  });
  revalidatePath(`/exploitation/fiches-non-conformite/${id}`);
}

export async function supprimerFicheNonConformite(id: string) {
  await prisma.ficheNonConformite.delete({ where: { id } });
  revalidatePath("/exploitation/fiches-non-conformite");
  redirect("/exploitation/fiches-non-conformite");
}
