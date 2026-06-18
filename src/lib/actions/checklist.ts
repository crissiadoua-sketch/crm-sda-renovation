"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateChecklistItem(
  chantierId: string,
  cle: string,
  formData: FormData
): Promise<void> {
  const statut = (formData.get("statut") as string) || "MANQUANT";

  // Preserve existing dateReception when upgrading RECU→VALIDE; clear it otherwise
  const existing = await prisma.checklistDocumentChantier.findUnique({
    where: { chantierId_cle: { chantierId, cle } },
    select: { dateReception: true },
  });

  const dateReception =
    statut === "RECU" || statut === "VALIDE"
      ? (existing?.dateReception ?? new Date())
      : null;

  await prisma.checklistDocumentChantier.upsert({
    where: { chantierId_cle: { chantierId, cle } },
    update: { statut, dateReception },
    create: { chantierId, cle, statut, dateReception },
  });

  revalidatePath(`/chantiers/${chantierId}`);
}
