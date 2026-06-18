"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function genNumeroFC() {
  const count = await prisma.fraisChantier.count();
  return `FC-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

export async function creerFraisChantier(formData: FormData) {
  const f = await prisma.fraisChantier.create({
    data: {
      numero: await genNumeroFC(),
      titre: (formData.get("titre") as string) || null,
      chantierId: (formData.get("chantierId") as string) || null,
      devisId: (formData.get("devisId") as string) || null,
      periode: (formData.get("periode") as string) || null,
      responsable: (formData.get("responsable") as string) || null,
    },
  });
  revalidatePath("/exploitation/frais-chantier");
  redirect(`/exploitation/frais-chantier/${f.id}`);
}

export async function sauvegarderFraisChantier(
  id: string,
  data: {
    titre?: string | null;
    chantierId?: string | null;
    devisId?: string | null;
    periode?: string | null;
    responsable?: string | null;
    notes?: string | null;
    lignes: {
      ordre: number;
      categorie: string;
      designation: string;
      fournisseur?: string;
      date?: string | null;
      montantHT: number;
      tauxTVA: number;
      montantTTC: number;
      refFacture?: string;
      notes?: string;
    }[];
  },
) {
  const totalHT = data.lignes.reduce((s, l) => s + l.montantHT, 0);
  const totalTVA = data.lignes.reduce(
    (s, l) => s + (l.montantHT * l.tauxTVA) / 100,
    0,
  );
  await prisma.$transaction([
    prisma.fraisChantierLigne.deleteMany({ where: { fraisId: id } }),
    prisma.fraisChantier.update({
      where: { id },
      data: {
        titre: data.titre ?? null,
        chantierId: data.chantierId ?? null,
        devisId: data.devisId ?? null,
        periode: data.periode ?? null,
        responsable: data.responsable ?? null,
        notes: data.notes ?? null,
        totalHT,
        totalTVA,
        totalTTC: totalHT + totalTVA,
      },
    }),
    ...data.lignes.map((l) =>
      prisma.fraisChantierLigne.create({
        data: {
          fraisId: id,
          ...l,
          date: l.date ? new Date(l.date) : null,
        },
      }),
    ),
  ]);
  revalidatePath(`/exploitation/frais-chantier/${id}`);
  revalidatePath("/tresorerie");
  revalidatePath("/finances");
}

export async function supprimerFraisChantier(id: string) {
  await prisma.fraisChantier.delete({ where: { id } });
  revalidatePath("/exploitation/frais-chantier");
  redirect("/exploitation/frais-chantier");
}
