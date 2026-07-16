"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export async function createDOE(formData: FormData): Promise<void> {
  const titre = (formData.get("titre") as string)?.trim();
  if (!titre) throw new Error("Le titre est requis.");

  const chantierId = formData.get("chantierId") as string;
  if (!chantierId) throw new Error("Le chantier est requis.");

  const devisId = emptyToNull(formData.get("devisId"));

  const doe = await prisma.dOE.create({
    data: {
      modele: (formData.get("modele") as string) || "PERSONNALISE",
      titre,
      reference: emptyToNull(formData.get("reference")),
      chantierId,
      devisId,
      intro: emptyToNull(formData.get("intro")),
      conclusion: emptyToNull(formData.get("conclusion")),
      statut: "BROUILLON",
    },
  });

  // Auto-generate sections from devis lignes if devisId provided
  if (devisId) {
    const lignes = await prisma.devisLigne.findMany({
      where: { devisId, type: "CHAPITRE" },
      orderBy: { ordre: "asc" },
    });

    for (let i = 0; i < lignes.length; i++) {
      const ligne = lignes[i];
      await prisma.dOESection.create({
        data: {
          doeId: doe.id,
          type: "TRAVAUX",
          titre: ligne.designation,
          corpsEtat: null,
          ordre: i,
        },
      });
    }
  }

  revalidatePath("/doe");
  redirect(`/doe/${doe.id}`);
}

export async function updateDOEInfo(id: string, formData: FormData): Promise<void> {
  await prisma.dOE.update({
    where: { id },
    data: {
      titre: (formData.get("titre") as string)?.trim() || undefined,
      modele: (formData.get("modele") as string) || undefined,
      statut: (formData.get("statut") as string) || undefined,
      reference: emptyToNull(formData.get("reference")),
      intro: emptyToNull(formData.get("intro")),
      conclusion: emptyToNull(formData.get("conclusion")),
    },
  });

  revalidatePath(`/doe/${id}`);
}

export async function deleteDOE(id: string): Promise<void> {
  const _doc = await prisma.dOE.findUnique({ where: { id }, select: { statut: true } });
  if (!_doc || _doc.statut !== "BROUILLON") return;
  await prisma.dOE.delete({ where: { id } });
  revalidatePath("/doe");
  redirect("/doe");
}

export async function addDOESection(doeId: string, formData: FormData): Promise<void> {
  // Find next order
  const last = await prisma.dOESection.findFirst({
    where: { doeId },
    orderBy: { ordre: "desc" },
    select: { ordre: true },
  });
  const ordre = (last?.ordre ?? -1) + 1;

  await prisma.dOESection.create({
    data: {
      doeId,
      type: (formData.get("type") as string) || "TRAVAUX",
      titre: (formData.get("titre") as string)?.trim() || "Nouvelle section",
      corpsEtat: emptyToNull(formData.get("corpsEtat")),
      description: emptyToNull(formData.get("description")),
      ordre,
    },
  });

  revalidatePath(`/doe/${doeId}`);
}

export async function updateDOESection(id: string, doeId: string, formData: FormData): Promise<void> {
  await prisma.dOESection.update({
    where: { id },
    data: {
      type: (formData.get("type") as string) || "TRAVAUX",
      titre: (formData.get("titre") as string)?.trim() || undefined,
      corpsEtat: emptyToNull(formData.get("corpsEtat")),
      description: emptyToNull(formData.get("description")),
    },
  });

  revalidatePath(`/doe/${doeId}`);
}

export async function deleteDOESection(id: string, doeId: string): Promise<void> {
  await prisma.dOESection.delete({ where: { id } });
  revalidatePath(`/doe/${doeId}`);
}

export async function attachFicheToDOESection(
  sectionId: string,
  doeId: string,
  ficheId: string,
): Promise<void> {
  if (!ficheId) return;
  await prisma.dOESection.update({
    where: { id: sectionId },
    data: { fiches: { connect: { id: ficheId } } },
  });
  revalidatePath(`/doe/${doeId}`);
}

/**
 * Form-based variant: reads ficheId from FormData.
 * Used when the ficheId comes from a <select> in the form (not a bound arg).
 */
export async function attachFicheFromForm(
  sectionId: string,
  doeId: string,
  formData: FormData,
): Promise<void> {
  const ficheId = formData.get("ficheId") as string | null;
  if (!ficheId) return;
  await prisma.dOESection.update({
    where: { id: sectionId },
    data: { fiches: { connect: { id: ficheId } } },
  });
  revalidatePath(`/doe/${doeId}`);
}

export async function detachFicheFromDOESection(
  sectionId: string,
  doeId: string,
  ficheId: string,
): Promise<void> {
  await prisma.dOESection.update({
    where: { id: sectionId },
    data: { fiches: { disconnect: { id: ficheId } } },
  });
  revalidatePath(`/doe/${doeId}`);
}

export async function moveDOESection(
  id: string,
  doeId: string,
  direction: "up" | "down",
): Promise<void> {
  const section = await prisma.dOESection.findUnique({ where: { id }, select: { ordre: true } });
  if (!section) return;

  const adjacent = await prisma.dOESection.findFirst({
    where: {
      doeId,
      ordre: direction === "up" ? { lt: section.ordre } : { gt: section.ordre },
    },
    orderBy: { ordre: direction === "up" ? "desc" : "asc" },
    select: { id: true, ordre: true },
  });

  if (!adjacent) return;

  // Swap ordre values
  await prisma.$transaction([
    prisma.dOESection.update({ where: { id }, data: { ordre: adjacent.ordre } }),
    prisma.dOESection.update({ where: { id: adjacent.id }, data: { ordre: section.ordre } }),
  ]);

  revalidatePath(`/doe/${doeId}`);
}
