"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { prochainNumeroDocument } from "@/lib/codification";

async function nextNumeroBcf(): Promise<string> {
  const bcs = await prisma.bonCommandeFournitures.findMany({ select: { numero: true } });
  return prochainNumeroDocument("BCF", bcs.map((b) => b.numero));
}

export async function creerBonCommandeFournitures(formData: FormData): Promise<void> {
  const numero        = await nextNumeroBcf();
  const fournisseurId = formData.get("fournisseurId") as string;
  const type          = (formData.get("type") as string) || "BUREAU";
  const service       = (formData.get("service") as string) || "ADMINISTRATION";

  const bcf = await prisma.bonCommandeFournitures.create({
    data: { numero, fournisseurId, type, service },
  });

  revalidatePath("/bons-commande/fournitures");
  redirect(`/bons-commande/fournitures/${bcf.id}`);
}

export async function sauvegarderBcf(
  id: string,
  data: {
    statut:           string;
    type:             string;
    fournisseurId:    string;
    service:          string;
    demandeurNom?:    string;
    demandeurEmail?:  string;
    validateurNom?:   string;
    refBudget?:       string;
    refBonLivraison?: string;
    adresseLivraison?: string;
    dateSouhaitee?:   string;
    modeReglement?:   string;
    notes?:           string;
    lignes: {
      categorie:      string;
      designation:    string;
      reference?:     string;
      quantite:       number;
      unite:          string;
      prixUnitaireHT: number;
      tauxTVA:        number;
    }[];
  }
): Promise<void> {
  const totalHT  = data.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaireHT, 0);
  const totalTVA = data.lignes.reduce((s, l) => s + l.quantite * l.prixUnitaireHT * l.tauxTVA / 100, 0);
  const totalTTC = totalHT + totalTVA;

  await prisma.$transaction([
    prisma.bonCommandeFournitures.update({
      where: { id },
      data: {
        statut:           data.statut,
        type:             data.type,
        fournisseurId:    data.fournisseurId,
        service:          data.service,
        demandeurNom:     data.demandeurNom || null,
        demandeurEmail:   data.demandeurEmail || null,
        validateurNom:    data.validateurNom || null,
        refBudget:        data.refBudget || null,
        refBonLivraison:  data.refBonLivraison || null,
        adresseLivraison: data.adresseLivraison || null,
        dateSouhaitee:    data.dateSouhaitee ? new Date(data.dateSouhaitee) : null,
        modeReglement:    data.modeReglement || null,
        notes:            data.notes || null,
        totalHT, totalTVA, totalTTC,
      },
    }),
    prisma.bonCommandeFournituresLigne.deleteMany({ where: { bonCommandeFournituresId: id } }),
    ...data.lignes.map((l, i) =>
      prisma.bonCommandeFournituresLigne.create({
        data: {
          bonCommandeFournituresId: id,
          ordre:          i,
          categorie:      l.categorie,
          designation:    l.designation,
          reference:      l.reference || null,
          quantite:       l.quantite,
          unite:          l.unite,
          prixUnitaireHT: l.prixUnitaireHT,
          tauxTVA:        l.tauxTVA,
          totalHT:        l.quantite * l.prixUnitaireHT,
        },
      })
    ),
  ]);

  revalidatePath("/bons-commande/fournitures");
  revalidatePath(`/bons-commande/fournitures/${id}`);
}

export async function supprimerBcf(id: string): Promise<void> {
  const _doc = await prisma.bonCommandeFournitures.findUnique({ where: { id }, select: { statut: true } });
  if (!_doc || _doc.statut !== "BROUILLON") return;
  await prisma.bonCommandeFournitures.delete({ where: { id } });
  revalidatePath("/bons-commande/fournitures");
  redirect("/bons-commande/fournitures");
}
