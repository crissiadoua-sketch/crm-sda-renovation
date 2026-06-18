"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

/* ------------------------------------------------------------------ */
/*  Créer une conversation                                               */
/* ------------------------------------------------------------------ */

export async function createConversation(formData: FormData) {
  const session = await verifySession();

  const nom = formData.get("nom") as string | null;
  const type = (formData.get("type") as string) || "GROUPE";
  const suppressionAuto = (formData.get("suppressionAuto") as string) || "JAMAIS";
  const participantIds = formData.getAll("participantIds") as string[];

  if (!participantIds.length) return;

  // Toujours inclure l'auteur
  const allIds = Array.from(new Set([session.userId, ...participantIds]));

  const conv = await prisma.conversation.create({
    data: {
      nom: nom || null,
      type,
      suppressionAuto,
      participants: {
        create: allIds.map(userId => ({ userId })),
      },
    },
  });

  redirect(`/messagerie/${conv.id}`);
}

/* ------------------------------------------------------------------ */
/*  Envoyer un message                                                   */
/* ------------------------------------------------------------------ */

export async function sendMessage(formData: FormData) {
  const session = await verifySession();

  const conversationId = formData.get("conversationId") as string;
  const texte = (formData.get("texte") as string | null)?.trim() || null;
  const piecesJointesJson = formData.get("piecesJointes") as string | null;

  if (!texte && !piecesJointesJson) return;

  // Vérifier que l'utilisateur est participant
  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.userId } },
  });
  if (!participant) return;

  type PJ = { nom: string; url: string; type: string; taille?: number };
  const pj: PJ[] = piecesJointesJson ? JSON.parse(piecesJointesJson) : [];

  await prisma.message.create({
    data: {
      conversationId,
      senderId: session.userId,
      texte,
      piecesJointes: pj.length > 0
        ? { create: pj.map(f => ({ nom: f.nom, url: f.url, type: f.type, taille: f.taille ?? null })) }
        : undefined,
    },
  });

  // Mettre à jour updatedAt de la conversation (pour tri liste)
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  revalidatePath(`/messagerie/${conversationId}`);
}

/* ------------------------------------------------------------------ */
/*  Mettre à jour la suppression automatique                            */
/* ------------------------------------------------------------------ */

export async function updateSuppressionAuto(conversationId: string, freq: string) {
  const session = await verifySession();

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.userId } },
  });
  if (!participant) return;

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { suppressionAuto: freq },
  });

  revalidatePath(`/messagerie/${conversationId}`);
}

/* ------------------------------------------------------------------ */
/*  Supprimer une conversation                                           */
/* ------------------------------------------------------------------ */

export async function deleteConversation(conversationId: string) {
  const session = await verifySession();

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: session.userId } },
  });
  if (!participant) return;

  await prisma.conversation.delete({ where: { id: conversationId } });

  revalidatePath("/messagerie");
  redirect("/messagerie");
}

/* ------------------------------------------------------------------ */
/*  Nettoyage automatique — appelé à l'ouverture d'une conv            */
/* ------------------------------------------------------------------ */

export async function cleanupExpiredMessages(conversationId: string) {
  const conv = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { suppressionAuto: true },
  });
  if (!conv || conv.suppressionAuto === "JAMAIS") return;

  const days = conv.suppressionAuto === "7_JOURS" ? 7
    : conv.suppressionAuto === "30_JOURS" ? 30
    : 90;

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  await prisma.message.deleteMany({
    where: { conversationId, createdAt: { lt: cutoff } },
  });
}
