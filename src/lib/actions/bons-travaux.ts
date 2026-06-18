"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function genNumeroBT() {
  const count = await prisma.bonTravaux.count();
  return `BT-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

export async function creerBonTravaux(formData: FormData) {
  const bt = await prisma.bonTravaux.create({
    data: {
      numero: await genNumeroBT(),
      titre: (formData.get("titre") as string) || "Nouveau bon de travaux",
      chantierId: (formData.get("chantierId") as string) || null,
      clientId: (formData.get("clientId") as string) || null,
      chefEquipe: (formData.get("chefEquipe") as string) || null,
      corpsEtat: (formData.get("corpsEtat") as string) || null,
    },
  });
  revalidatePath("/exploitation/bons-travaux");
  redirect(`/exploitation/bons-travaux/${bt.id}`);
}

export type BTEquipierData = {
  nom: string;
  prenom?: string | null;
  role?: string | null;
  qualif?: string | null;
};

export type BTTacheData = {
  ordre: number;
  description: string;
  quantite?: number | null;
  unite?: string | null;
  dureeEstimee?: number | null;
  statut: string;
  observations?: string | null;
};

export type BTData = {
  statut: string;
  titre: string;
  description?: string | null;
  chantierId?: string | null;
  clientId?: string | null;
  corpsEtat?: string | null;
  priorite: string;
  lieu?: string | null;
  dateDebut?: string | null;
  dateFin?: string | null;
  heureDebut?: string | null;
  heureFin?: string | null;
  chefEquipe?: string | null;
  observations?: string | null;
  notes?: string | null;
  equipe: BTEquipierData[];
  taches: BTTacheData[];
};

export async function sauvegarderBonTravaux(id: string, data: BTData) {
  await prisma.$transaction([
    prisma.bonTravauxEquipier.deleteMany({ where: { bonId: id } }),
    prisma.bonTravauxTache.deleteMany({ where: { bonId: id } }),
    prisma.bonTravaux.update({
      where: { id },
      data: {
        statut: data.statut,
        titre: data.titre,
        description: data.description ?? null,
        chantierId: data.chantierId ?? null,
        clientId: data.clientId ?? null,
        corpsEtat: data.corpsEtat ?? null,
        priorite: data.priorite,
        lieu: data.lieu ?? null,
        dateDebut: data.dateDebut ? new Date(data.dateDebut) : null,
        dateFin: data.dateFin ? new Date(data.dateFin) : null,
        heureDebut: data.heureDebut ?? null,
        heureFin: data.heureFin ?? null,
        chefEquipe: data.chefEquipe ?? null,
        observations: data.observations ?? null,
        notes: data.notes ?? null,
      },
    }),
    ...data.equipe.map(e =>
      prisma.bonTravauxEquipier.create({
        data: {
          bonId: id,
          nom: e.nom,
          prenom: e.prenom ?? null,
          role: e.role ?? null,
          qualif: e.qualif ?? null,
        },
      })
    ),
    ...data.taches.map(t =>
      prisma.bonTravauxTache.create({
        data: {
          bonId: id,
          ordre: t.ordre,
          description: t.description,
          quantite: t.quantite ?? null,
          unite: t.unite ?? null,
          dureeEstimee: t.dureeEstimee ?? null,
          statut: t.statut,
          observations: t.observations ?? null,
        },
      })
    ),
  ]);
  revalidatePath(`/exploitation/bons-travaux/${id}`);
}

export async function supprimerBonTravaux(id: string) {
  await prisma.bonTravaux.delete({ where: { id } });
  revalidatePath("/exploitation/bons-travaux");
  redirect("/exploitation/bons-travaux");
}
