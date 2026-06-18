"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function genNumeroCMR() {
  const count = await prisma.coutMateriauxRenduChantier.count();
  return `CMR-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

export async function creerCoutMateriaux(formData: FormData) {
  const c = await prisma.coutMateriauxRenduChantier.create({
    data: {
      numero: await genNumeroCMR(),
      titre: (formData.get("titre") as string) || null,
      chantierId: (formData.get("chantierId") as string) || null,
      devisId: (formData.get("devisId") as string) || null,
      responsable: (formData.get("responsable") as string) || null,
    },
  });
  revalidatePath("/etude-prix/cout-materiaux");
  redirect(`/etude-prix/cout-materiaux/${c.id}`);
}

export type CMRLigneData = {
  ordre: number;
  reference?: string;
  designation: string;
  unite?: string;
  prixAchatHT: number;
  transportKm?: number | null;
  transportPU?: number | null;
  dechargementH?: number | null;
  dechargementDH?: number | null;
  pertesPercent?: number | null;
};

export async function sauvegarderCoutMateriaux(
  id: string,
  data: {
    titre?: string | null;
    chantierId?: string | null;
    devisId?: string | null;
    responsable?: string | null;
    notes?: string | null;
    lignes: CMRLigneData[];
  }
) {
  const lignesCalc = data.lignes.map((l) => {
    const transport = (l.transportKm ?? 0) * (l.transportPU ?? 0);
    const dechargement = (l.dechargementH ?? 0) * (l.dechargementDH ?? 0);
    const baseHT = l.prixAchatHT + transport + dechargement;
    const prixRevient = baseHT * (1 + (l.pertesPercent ?? 0) / 100);
    return {
      ...l,
      transportTotal: transport,
      dechargementTotal: dechargement,
      prixRevientRenduChantier: prixRevient,
    };
  });

  await prisma.$transaction([
    prisma.coutMateriauxLigne.deleteMany({ where: { coutId: id } }),
    prisma.coutMateriauxRenduChantier.update({
      where: { id },
      data: {
        titre: data.titre ?? null,
        chantierId: data.chantierId ?? null,
        devisId: data.devisId ?? null,
        responsable: data.responsable ?? null,
        notes: data.notes ?? null,
      },
    }),
    ...lignesCalc.map((l) =>
      prisma.coutMateriauxLigne.create({ data: { coutId: id, ...l } })
    ),
  ]);
  revalidatePath(`/etude-prix/cout-materiaux/${id}`);
}

export async function supprimerCoutMateriaux(id: string) {
  await prisma.coutMateriauxRenduChantier.delete({ where: { id } });
  revalidatePath("/etude-prix/cout-materiaux");
  redirect("/etude-prix/cout-materiaux");
}
