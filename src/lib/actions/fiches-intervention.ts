"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prochainNumeroDocument } from "@/lib/codification";

async function genNumeroFI() {
  const fiches = await prisma.ficheIntervention.findMany({ select: { numero: true } });
  return prochainNumeroDocument("FI", fiches.map((f) => f.numero));
}

export async function creerFicheIntervention(formData: FormData) {
  const fi = await prisma.ficheIntervention.create({
    data: {
      numero: await genNumeroFI(),
      chantierId: (formData.get("chantierId") as string) || null,
      clientId:   (formData.get("clientId")   as string) || null,
      responsable: (formData.get("responsable") as string) || null,
    },
  });
  revalidatePath("/exploitation/fiches-intervention");
  redirect(`/exploitation/fiches-intervention/${fi.id}`);
}

export type FIData = {
  statut: string;
  chantierId?: string | null;
  clientId?: string | null;
  dateIntervention?: string;
  heureDebut?: string | null;
  heureFin?: string | null;
  responsable?: string | null;
  meteo?: string | null;
  tempC?: number | null;
  travauxRealises?: string | null;
  materielsUtilises?: string | null;
  incidents?: string | null;
  observations?: string | null;
  notes?: string | null;
  equipiers: { nom: string; prenom?: string; role?: string; heureDebut?: string; heureFin?: string; heuresTotales?: number | null }[];
  travaux: { ordre: number; description: string; avancementPct?: number | null; quantite?: number | null; unite?: string; observations?: string }[];
};

export async function sauvegarderFicheIntervention(id: string, data: FIData) {
  await prisma.$transaction([
    prisma.ficheInterventionEquipier.deleteMany({ where: { ficheId: id } }),
    prisma.ficheInterventionTravail.deleteMany({ where: { ficheId: id } }),
    prisma.ficheIntervention.update({
      where: { id },
      data: {
        statut: data.statut,
        chantierId: data.chantierId ?? null,
        clientId: data.clientId ?? null,
        dateIntervention: data.dateIntervention ? new Date(data.dateIntervention) : undefined,
        heureDebut: data.heureDebut ?? null,
        heureFin: data.heureFin ?? null,
        responsable: data.responsable ?? null,
        meteo: data.meteo ?? null,
        tempC: data.tempC ?? null,
        travauxRealises: data.travauxRealises ?? null,
        materielsUtilises: data.materielsUtilises ?? null,
        incidents: data.incidents ?? null,
        observations: data.observations ?? null,
        notes: data.notes ?? null,
      },
    }),
    ...data.equipiers.map(e =>
      prisma.ficheInterventionEquipier.create({ data: { ficheId: id, ...e } })
    ),
    ...data.travaux.map(t =>
      prisma.ficheInterventionTravail.create({ data: { ficheId: id, ...t } })
    ),
  ]);
  revalidatePath(`/exploitation/fiches-intervention/${id}`);
}

export async function supprimerFicheIntervention(id: string) {
  await prisma.ficheIntervention.delete({ where: { id } });
  revalidatePath("/exploitation/fiches-intervention");
  redirect("/exploitation/fiches-intervention");
}
