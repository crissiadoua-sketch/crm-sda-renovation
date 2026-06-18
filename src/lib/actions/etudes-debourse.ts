"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function genNumeroEDS() {
  const count = await prisma.etudeDebourse.count();
  return `EDS-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

export async function creerEtudeDebourse(formData: FormData) {
  const e = await prisma.etudeDebourse.create({
    data: {
      numero: await genNumeroEDS(),
      titre: (formData.get("titre") as string) || null,
      chantierId: (formData.get("chantierId") as string) || null,
      devisId: (formData.get("devisId") as string) || null,
      responsable: (formData.get("responsable") as string) || null,
      coeffK: parseFloat((formData.get("coeffK") as string) || "1.0"),
    },
  });
  revalidatePath("/etude-prix/debourses-secs");
  redirect(`/etude-prix/debourses-secs/${e.id}`);
}

type ElementData = {
  ordre: number;
  designation: string;
  unite?: string;
  quantite: number;
  prixUnitaire: number;
  montantMateriaux: number;
  montantMateriel: number;
  montantMO: number;
};

type PosteData = {
  ordre: number;
  codeOuvrage?: string;
  unite?: string;
  designation: string;
  ouvrageId?: string;
  elements: ElementData[];
};

export async function sauvegarderEtudeDebourse(
  id: string,
  data: {
    titre?: string | null;
    chantierId?: string | null;
    devisId?: string | null;
    responsable?: string | null;
    coeffK: number;
    notes?: string | null;
    postes: PosteData[];
  },
) {
  // Calculer les totaux par poste et globaux
  const postesCalc = data.postes.map((p) => {
    const totalMat = p.elements.reduce((s, e) => s + e.montantMateriaux, 0);
    const totalMtl = p.elements.reduce((s, e) => s + e.montantMateriel, 0);
    const totalMO = p.elements.reduce((s, e) => s + e.montantMO, 0);
    return {
      ...p,
      totalMateriauxHT: totalMat,
      totalMaterielHT: totalMtl,
      totalMOHT: totalMO,
      totalDSPoste: totalMat + totalMtl + totalMO,
    };
  });
  const globalMat = postesCalc.reduce((s, p) => s + p.totalMateriauxHT, 0);
  const globalMtl = postesCalc.reduce((s, p) => s + p.totalMaterielHT, 0);
  const globalMO = postesCalc.reduce((s, p) => s + p.totalMOHT, 0);

  // Supprimer tous les éléments et postes existants
  const postes = await prisma.etudeDeboursePoste.findMany({
    where: { etudeId: id },
    select: { id: true },
  });
  await prisma.$transaction([
    ...postes.map((p) =>
      prisma.etudeDebourseElement.deleteMany({ where: { posteId: p.id } }),
    ),
    prisma.etudeDeboursePoste.deleteMany({ where: { etudeId: id } }),
    prisma.etudeDebourse.update({
      where: { id },
      data: {
        titre: data.titre ?? null,
        chantierId: data.chantierId ?? null,
        devisId: data.devisId ?? null,
        responsable: data.responsable ?? null,
        coeffK: data.coeffK,
        notes: data.notes ?? null,
        totalMateriauxHT: globalMat,
        totalMaterielHT: globalMtl,
        totalMOHT: globalMO,
        totalDSHT: globalMat + globalMtl + globalMO,
      },
    }),
  ]);
  // Créer les postes et leurs éléments séquentiellement
  for (const p of postesCalc) {
    const { elements, ...posteData } = p;
    const createdPoste = await prisma.etudeDeboursePoste.create({
      data: { etudeId: id, ...posteData },
    });
    if (elements.length > 0) {
      await prisma.etudeDebourseElement.createMany({
        data: elements.map((e) => ({ posteId: createdPoste.id, ...e })),
      });
    }
  }
  revalidatePath(`/etude-prix/debourses-secs/${id}`);
}

export async function supprimerEtudeDebourse(id: string) {
  await prisma.etudeDebourse.delete({ where: { id } });
  revalidatePath("/etude-prix/debourses-secs");
  redirect("/etude-prix/debourses-secs");
}
