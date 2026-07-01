"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prochainNumeroDocument } from "@/lib/codification";

async function genNumeroAC() {
  const items = await prisma.approvisionementChantier.findMany({ select: { numero: true } });
  return prochainNumeroDocument("AC", items.map((i) => i.numero));
}

export async function creerApprovisionement(formData: FormData) {
  const a = await prisma.approvisionementChantier.create({
    data: {
      numero: await genNumeroAC(),
      titre: (formData.get("titre") as string) || null,
      chantierId: (formData.get("chantierId") as string) || null,
      devisId: (formData.get("devisId") as string) || null,
      responsable: (formData.get("responsable") as string) || null,
    },
  });
  revalidatePath("/etude-prix/approvisionement");
  redirect(`/etude-prix/approvisionement/${a.id}`);
}

export async function sauvegarderApprovisionement(
  id: string,
  data: {
    titre?: string | null;
    chantierId?: string | null;
    devisId?: string | null;
    responsable?: string | null;
    notes?: string | null;
    lignes: {
      ordre: number;
      lot?: string;
      designation: string;
      rendementConso?: number | null;
      uniteRendement?: string;
      qteARealiser?: number | null;
      uniteQteARealiser?: string;
      pertesPercent?: number | null;
      unite?: string;
      conditionnement?: string;
      aCommander?: string;
    }[];
  }
) {
  const lignesCalc = data.lignes.map((l) => {
    const besoins = (l.qteARealiser ?? 0) * (l.rendementConso ?? 1);
    const besoinsAP = besoins * (1 + (l.pertesPercent ?? 0) / 100);
    return { ...l, besoinsMateriau: besoins, besoinsApresPertes: besoinsAP };
  });

  await prisma.$transaction([
    prisma.approvisionementLigne.deleteMany({ where: { approId: id } }),
    prisma.approvisionementChantier.update({
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
      prisma.approvisionementLigne.create({ data: { approId: id, ...l } })
    ),
  ]);
  revalidatePath(`/etude-prix/approvisionement/${id}`);
}

export async function supprimerApprovisionement(id: string) {
  await prisma.approvisionementChantier.delete({ where: { id } });
  revalidatePath("/etude-prix/approvisionement");
  redirect("/etude-prix/approvisionement");
}
