"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";

export async function createTache(formData: FormData) {
  const user = await getUser();

  const titre = (formData.get("titre") as string | null)?.trim() ?? "";
  if (!titre) redirect("/taches/nouveau?erreur=titre");

  await prisma.tache.create({
    data: {
      titre,
      description: (formData.get("description") as string | null)?.trim() || null,
      statut: (formData.get("statut") as string | null) ?? "A_FAIRE",
      priorite: (formData.get("priorite") as string | null) ?? "NORMALE",
      periodicite: (formData.get("periodicite") as string | null) ?? "PONCTUELLE",
      service: (formData.get("service") as string | null) || null,
      dateEcheance: formData.get("dateEcheance")
        ? new Date(formData.get("dateEcheance") as string)
        : null,
      commentaires: (formData.get("commentaires") as string | null)?.trim() || null,
      assigneAId: (formData.get("assigneAId") as string | null) || null,
      chantierId: (formData.get("chantierId") as string | null) || null,
      creeParId: user.id,
    },
  });

  revalidatePath("/taches");
  redirect("/taches");
}

export async function updateTacheStatut(id: string, statut: string) {
  const data: Record<string, unknown> = { statut };
  if (statut === "TERMINEE") data.dateRealisation = new Date();
  await prisma.tache.update({ where: { id }, data });
  revalidatePath("/taches");
}

export async function updateTache(id: string, formData: FormData) {
  await prisma.tache.update({
    where: { id },
    data: {
      titre: (formData.get("titre") as string | null)?.trim() ?? "",
      description: (formData.get("description") as string | null)?.trim() || null,
      statut: (formData.get("statut") as string | null) ?? "A_FAIRE",
      priorite: (formData.get("priorite") as string | null) ?? "NORMALE",
      periodicite: (formData.get("periodicite") as string | null) ?? "PONCTUELLE",
      service: (formData.get("service") as string | null) || null,
      dateEcheance: formData.get("dateEcheance")
        ? new Date(formData.get("dateEcheance") as string)
        : null,
      commentaires: (formData.get("commentaires") as string | null)?.trim() || null,
      assigneAId: (formData.get("assigneAId") as string | null) || null,
      chantierId: (formData.get("chantierId") as string | null) || null,
    },
  });
  revalidatePath("/taches");
}

export async function deleteTache(id: string) {
  await prisma.tache.delete({ where: { id } });
  revalidatePath("/taches");
  redirect("/taches");
}
