"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prochainNumeroDocument } from "@/lib/codification";

async function genNumeroRCH() {
  const items = await prisma.rapportHebdomadaire.findMany({ select: { numero: true } });
  return prochainNumeroDocument("RCH", items.map((i) => i.numero));
}

export async function creerRapportHebdo(formData: FormData) {
  const now = new Date();
  // Calcul numéro de semaine ISO
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const semaine = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);

  const rapport = await prisma.rapportHebdomadaire.create({
    data: {
      numero: await genNumeroRCH(),
      chantierId: (formData.get("chantierId") as string) || null,
      clientId:   (formData.get("clientId")   as string) || null,
      responsable: (formData.get("responsable") as string) || null,
      semaine,
      annee: now.getFullYear(),
    },
  });
  revalidatePath("/exploitation/rapports-hebdo");
  redirect(`/exploitation/rapports-hebdo/${rapport.id}`);
}

export type RCHData = {
  statut: string;
  chantierId?: string | null;
  clientId?: string | null;
  semaine?: number;
  annee?: number;
  dateDebut?: string | null;
  dateFin?: string | null;
  responsable?: string | null;
  avancementGlobal?: number | null;
  meteoSemaine?: string | null;
  travauxEffectues?: string | null;
  problemes?: string | null;
  actionsASuivre?: string | null;
  previsionsSemaineSuivante?: string | null;
  heuresTotales?: number | null;
  notes?: string | null;
  lignes: { ordre: number; tache: string; avancementDebut?: number | null; avancementFin?: number | null; commentaire?: string | null }[];
};

export async function sauvegarderRapportHebdo(id: string, data: RCHData) {
  await prisma.$transaction([
    prisma.rapportHebdomadaireLigne.deleteMany({ where: { rapportId: id } }),
    prisma.rapportHebdomadaire.update({
      where: { id },
      data: {
        statut: data.statut,
        chantierId: data.chantierId ?? null,
        clientId: data.clientId ?? null,
        semaine: data.semaine,
        annee: data.annee,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        responsable: data.responsable ?? null,
        avancementGlobal: data.avancementGlobal ?? null,
        meteoSemaine: data.meteoSemaine ?? null,
        travauxEffectues: data.travauxEffectues ?? null,
        problemes: data.problemes ?? null,
        actionsASuivre: data.actionsASuivre ?? null,
        previsionsSemaineSuivante: data.previsionsSemaineSuivante ?? null,
        heuresTotales: data.heuresTotales ?? null,
        notes: data.notes ?? null,
      },
    }),
    ...data.lignes.map(l =>
      prisma.rapportHebdomadaireLigne.create({ data: { rapportId: id, ...l } })
    ),
  ]);
  revalidatePath(`/exploitation/rapports-hebdo/${id}`);
}

export async function supprimerRapportHebdo(id: string) {
  const _doc = await prisma.rapportHebdomadaire.findUnique({ where: { id }, select: { statut: true } });
  if (!_doc || _doc.statut !== "BROUILLON") return;
  await prisma.rapportHebdomadaire.delete({ where: { id } });
  revalidatePath("/exploitation/rapports-hebdo");
  redirect("/exploitation/rapports-hebdo");
}
