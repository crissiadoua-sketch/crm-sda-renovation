"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function genNumeroPRC() {
  const count = await prisma.pVReunionChantier.count();
  const year = new Date().getFullYear();
  return `PRC-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function creerPVReunionChantier(formData: FormData) {
  const pv = await prisma.pVReunionChantier.create({
    data: {
      numero:      await genNumeroPRC(),
      chantierId:  (formData.get("chantierId")  as string) || null,
      clientId:    (formData.get("clientId")    as string) || null,
      typeReunion: (formData.get("typeReunion") as string) || "COORDINATION",
    },
  });
  revalidatePath("/exploitation/pv-reunion-chantier");
  redirect(`/exploitation/pv-reunion-chantier/${pv.id}`);
}

export type PVRCData = {
  statut: string;
  chantierId?: string | null;
  clientId?: string | null;
  dateReunion?: string | null;
  lieuReunion?: string | null;
  heureDebut?: string | null;
  heureFin?: string | null;
  typeReunion?: string;
  animateur?: string | null;
  redacteur?: string | null;
  prochaineDateReunion?: string | null;
  prochaineLieu?: string | null;
  notes?: string | null;
  participants: { nom: string; societe?: string | null; fonction?: string | null; present?: boolean }[];
  points: { ordre: number; titre: string; contenu?: string | null }[];
  actions: { ordre: number; description: string; responsable?: string | null; echeance?: string | null; statut?: string }[];
};

export async function sauvegarderPVReunionChantier(id: string, data: PVRCData) {
  await prisma.$transaction([
    prisma.pVReunionChantierParticipant.deleteMany({ where: { pvId: id } }),
    prisma.pVReunionChantierPoint.deleteMany({ where: { pvId: id } }),
    prisma.pVReunionChantierAction.deleteMany({ where: { pvId: id } }),
    prisma.pVReunionChantier.update({
      where: { id },
      data: {
        statut: data.statut,
        chantierId: data.chantierId ?? null,
        clientId: data.clientId ?? null,
        dateReunion: data.dateReunion ? new Date(data.dateReunion) : null,
        lieuReunion: data.lieuReunion ?? null,
        heureDebut: data.heureDebut ?? null,
        heureFin: data.heureFin ?? null,
        typeReunion: data.typeReunion,
        animateur: data.animateur ?? null,
        redacteur: data.redacteur ?? null,
        prochaineDateReunion: data.prochaineDateReunion ? new Date(data.prochaineDateReunion) : null,
        prochaineLieu: data.prochaineLieu ?? null,
        notes: data.notes ?? null,
      },
    }),
    ...data.participants.map(p =>
      prisma.pVReunionChantierParticipant.create({ data: { pvId: id, ...p } })
    ),
    ...data.points.map(pt =>
      prisma.pVReunionChantierPoint.create({ data: { pvId: id, ...pt } })
    ),
    ...data.actions.map(a =>
      prisma.pVReunionChantierAction.create({
        data: {
          pvId: id,
          ordre: a.ordre,
          description: a.description,
          responsable: a.responsable ?? null,
          echeance: a.echeance ? new Date(a.echeance) : null,
          statut: a.statut ?? "OUVERTE",
        },
      })
    ),
  ]);
  revalidatePath(`/exploitation/pv-reunion-chantier/${id}`);
}

export async function supprimerPVReunionChantier(id: string) {
  await prisma.pVReunionChantier.delete({ where: { id } });
  revalidatePath("/exploitation/pv-reunion-chantier");
  redirect("/exploitation/pv-reunion-chantier");
}
