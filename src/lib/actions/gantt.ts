"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeSchedule, CycleError, type TaskNode } from "@/lib/gantt-scheduler";

const tacheInputSchema = z.object({
  clientId: z.string(), // id temporaire côté client (ou id réel existant), pour relier les dépendances
  nom: z.string().min(1, "Le nom de la tâche est requis."),
  duree: z.number().int().min(1),
  dateDebut: z.string(), // ISO — utilisée seulement comme ancrage pour les tâches sans prédécesseur
  avancement: z.number().int().min(0).max(100),
  statut: z.enum(["A_FAIRE", "EN_COURS", "TERMINEE"]),
  priorite: z.enum(["FAIBLE", "NORMALE", "HAUTE", "URGENTE"]),
  corpsEtat: z.string().nullable().optional(),
  ressource: z.string().nullable().optional(),
  intervenantType: z.enum(["SOUS_TRAITANT", "SALARIE", "INTERIMAIRE"]).nullable().optional(),
  intervenantId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  predecesseurClientIds: z.array(z.string()),
});

export type TachesGanttState = { error?: string } | undefined;

export async function updateTachesGantt(
  chantierId: string,
  _prevState: TachesGanttState,
  formData: FormData,
): Promise<TachesGanttState> {
  const raw = formData.get("taches");
  if (typeof raw !== "string") {
    return { error: "Données de planning invalides." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Données de planning invalides." };
  }

  const result = z.array(tacheInputSchema).safeParse(parsed);
  if (!result.success) {
    return { error: "Données de planning invalides." };
  }

  const rows = result.data;

  const chantier = await prisma.chantier.findUnique({
    where: { id: chantierId },
    select: { dateDebut: true },
  });
  if (!chantier) {
    return { error: "Chantier introuvable." };
  }
  const anchorDate = chantier.dateDebut ?? new Date();

  const taskNodes: TaskNode[] = rows.map((r) => ({
    id: r.clientId,
    duree: r.duree,
    dateDebut: new Date(r.dateDebut),
    predecesseurs: r.predecesseurClientIds,
  }));

  let scheduled;
  try {
    scheduled = computeSchedule(taskNodes, anchorDate);
  } catch (e) {
    if (e instanceof CycleError) {
      return { error: "Dépendances circulaires détectées entre les tâches — vérifiez les prédécesseurs." };
    }
    throw e;
  }

  const scheduledByClientId = new Map(scheduled.map((s) => [s.id, s]));

  await prisma.$transaction(async (tx) => {
    await tx.tacheGanttDependance.deleteMany({
      where: { predecesseur: { chantierId } },
    });
    await tx.tacheGantt.deleteMany({ where: { chantierId } });

    // Recréation séquentielle pour capturer les nouveaux ids et les relier par index (clientId -> id réel)
    const clientIdToRealId = new Map<string, string>();
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sched = scheduledByClientId.get(row.clientId)!;
      const created = await tx.tacheGantt.create({
        data: {
          chantierId,
          nom: row.nom,
          ordre: i + 1,
          duree: row.duree,
          dateDebut: sched.dateDebut,
          dateFin: sched.dateFin,
          avancement: row.avancement,
          statut: row.statut,
          priorite: row.priorite,
          corpsEtat: row.corpsEtat || null,
          ressource: row.ressource || null,
          intervenantType: row.intervenantType || null,
          intervenantId: row.intervenantId || null,
          notes: row.notes || null,
        },
      });
      clientIdToRealId.set(row.clientId, created.id);
    }

    for (const row of rows) {
      const successeurId = clientIdToRealId.get(row.clientId)!;
      for (const predClientId of row.predecesseurClientIds) {
        const predecesseurId = clientIdToRealId.get(predClientId);
        if (!predecesseurId) continue;
        await tx.tacheGanttDependance.create({
          data: { predecesseurId, successeurId },
        });
      }
    }
  });

  revalidatePath(`/chantiers/${chantierId}/planning`);
  revalidatePath(`/chantiers/${chantierId}`);
}
