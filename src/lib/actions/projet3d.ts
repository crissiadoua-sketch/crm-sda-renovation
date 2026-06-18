"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";

export async function creerProjet3D(formData: FormData) {
  await getUser();

  const projet = await prisma.projet3D.create({
    data: {
      titre: (formData.get("titre") as string) || "Nouveau projet 3D",
      description: (formData.get("description") as string) || null,
      chantierId: (formData.get("chantierId") as string) || null,
      scene: "[]",
      settings: JSON.stringify({
        longueur: Number(formData.get("longueur")) || 10,
        largeur: Number(formData.get("largeur")) || 8,
        hauteur: Number(formData.get("hauteur")) || 2.7,
      }),
    },
  });

  redirect(`/conception/3d/${projet.id}`);
}

export async function sauvegarderScene(
  projetId: string,
  scene: string,
  settings?: string
) {
  await getUser();

  await prisma.projet3D.update({
    where: { id: projetId },
    data: {
      scene,
      ...(settings ? { settings } : {}),
    },
  });

  revalidatePath(`/conception/3d/${projetId}`);
}

export async function supprimerProjet3D(projetId: string) {
  await getUser();
  await prisma.projet3D.delete({ where: { id: projetId } });
  redirect("/conception/3d");
}

export async function dupliquerProjet3D(projetId: string) {
  await getUser();

  const original = await prisma.projet3D.findUnique({ where: { id: projetId } });
  if (!original) return;

  const copie = await prisma.projet3D.create({
    data: {
      titre: `${original.titre} (copie)`,
      description: original.description,
      chantierId: original.chantierId,
      scene: original.scene,
      settings: original.settings,
    },
  });

  redirect(`/conception/3d/${copie.id}`);
}
