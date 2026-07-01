"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prochainNumeroDocument } from "@/lib/codification";

async function genNumeroDA() {
  const items = await prisma.demandeApprovisionnement.findMany({ select: { numero: true } });
  return prochainNumeroDocument("DA", items.map((i) => i.numero));
}

export async function creerDemandeAppro(formData: FormData) {
  const da = await prisma.demandeApprovisionnement.create({
    data: {
      numero:       await genNumeroDA(),
      chantierId:   (formData.get("chantierId")   as string) || null,
      service:      (formData.get("service")      as string) || "PRODUCTION",
      demandeurNom: (formData.get("demandeurNom") as string) || null,
    },
  });
  revalidatePath("/exploitation/demandes-appro");
  redirect(`/exploitation/demandes-appro/${da.id}`);
}

export type DALigneData = {
  ordre: number;
  designation: string;
  reference?: string | null;
  quantite?: number;
  unite?: string;
  prixUnitaireHT?: number;
  tauxTVA?: number;
  totalHT?: number;
  justification?: string | null;
};

export type DAData = {
  statut: string;
  chantierId?: string | null;
  clientId?: string | null;
  fournisseurId?: string | null;
  service?: string;
  demandeurNom?: string | null;
  demandeurEmail?: string | null;
  validateurNom?: string | null;
  urgence?: string;
  dateSouhaitee?: string | null;
  adresseLivraison?: string | null;
  notes?: string | null;
  lignes: DALigneData[];
};

export async function sauvegarderDemandeAppro(id: string, data: DAData) {
  const totalHT  = data.lignes.reduce((s, l) => s + (l.totalHT ?? 0), 0);
  const totalTVA = data.lignes.reduce((s, l) => s + (l.totalHT ?? 0) * (l.tauxTVA ?? 20) / 100, 0);
  const totalTTC = totalHT + totalTVA;

  await prisma.$transaction([
    prisma.demandeApprovisionnementLigne.deleteMany({ where: { demandeId: id } }),
    prisma.demandeApprovisionnement.update({
      where: { id },
      data: {
        statut: data.statut,
        chantierId: data.chantierId ?? null,
        clientId: data.clientId ?? null,
        fournisseurId: data.fournisseurId ?? null,
        service: data.service,
        demandeurNom: data.demandeurNom ?? null,
        demandeurEmail: data.demandeurEmail ?? null,
        validateurNom: data.validateurNom ?? null,
        urgence: data.urgence,
        dateSouhaitee: data.dateSouhaitee ? new Date(data.dateSouhaitee) : null,
        adresseLivraison: data.adresseLivraison ?? null,
        totalHT,
        totalTVA,
        totalTTC,
        notes: data.notes ?? null,
      },
    }),
    ...data.lignes.map(l =>
      prisma.demandeApprovisionnementLigne.create({
        data: {
          demandeId: id,
          ordre: l.ordre,
          designation: l.designation,
          reference: l.reference ?? null,
          quantite: l.quantite ?? 1,
          unite: l.unite ?? "u",
          prixUnitaireHT: l.prixUnitaireHT ?? 0,
          tauxTVA: l.tauxTVA ?? 20,
          totalHT: l.totalHT ?? 0,
          justification: l.justification ?? null,
        },
      })
    ),
  ]);
  revalidatePath(`/exploitation/demandes-appro/${id}`);
}

export async function supprimerDemandeAppro(id: string) {
  await prisma.demandeApprovisionnement.delete({ where: { id } });
  revalidatePath("/exploitation/demandes-appro");
  redirect("/exploitation/demandes-appro");
}
