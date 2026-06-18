"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

async function nextNumeroBcb(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `BCB-${year}-`;
  const last = await prisma.bonCommandeBeton.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: "desc" },
    select: { numero: true },
  });
  const seq = last ? parseInt(last.numero.split("-")[2] ?? "0", 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

// ---------------------------------------------------------------------------
// Créer un BC Béton
// ---------------------------------------------------------------------------

export async function creerBonCommandeBeton(formData: FormData): Promise<void> {
  const numero        = await nextNumeroBcb();
  const fournisseurId = formData.get("fournisseurId") as string;
  const chantierId    = (formData.get("chantierId") as string) || null;

  const bcb = await prisma.bonCommandeBeton.create({
    data: { numero, fournisseurId, chantierId },
  });

  revalidatePath("/bons-commande/beton");
  redirect(`/bons-commande/beton/${bcb.id}`);
}

// ---------------------------------------------------------------------------
// Mettre à jour toutes les données du BC Béton
// ---------------------------------------------------------------------------

export async function sauvegarderBonCommandeBeton(
  id: string,
  data: {
    fournisseurId:   string;
    chantierId?:     string;
    statut:          string;
    nomChantier?:    string;
    adresseChantier?:string;
    refAnalytique?:  string;
    modeReglement?:  string;
    // NF EN 206
    classeResistance?: string;
    classeExposition?: string;
    consistance?:      string;
    affaissement?:     number;
    dmax?:             number;
    typeCiment?:       string;
    rapportEauCiment?: number;
    teneurCimentMin?:  number;
    adjuvant?:         string;
    chlorures?:        string;
    // Commande
    qteTotale:        number;
    prixM3?:          number;
    betonPompe:       boolean;
    essaisBeton:      boolean;
    ajoutEau:         boolean;
    modeMiseEnOeuvre?: string;
    // Planning
    dateLivraison?:   string;
    heureDebut?:      string;
    heureFin?:        string;
    cadenceM3h?:      number;
    observations?:    string;
    notes?:           string;
    // Livraisons
    livraisons: {
      dateLivraison: string;
      quantiteM3:    number;
      heureDebut?:   string;
      heureFin?:     string;
      cadenceM3h?:   number;
      observations?: string;
    }[];
  }
): Promise<void> {
  await prisma.$transaction([
    prisma.bonCommandeBeton.update({
      where: { id },
      data: {
        fournisseurId:    data.fournisseurId,
        chantierId:       data.chantierId || null,
        statut:           data.statut,
        nomChantier:      data.nomChantier || null,
        adresseChantier:  data.adresseChantier || null,
        refAnalytique:    data.refAnalytique || null,
        modeReglement:    data.modeReglement || null,
        classeResistance: data.classeResistance || null,
        classeExposition: data.classeExposition || null,
        consistance:      data.consistance || null,
        affaissement:     data.affaissement ?? null,
        dmax:             data.dmax ?? null,
        typeCiment:       data.typeCiment || null,
        rapportEauCiment: data.rapportEauCiment ?? null,
        teneurCimentMin:  data.teneurCimentMin ?? null,
        adjuvant:         data.adjuvant || null,
        chlorures:        data.chlorures || null,
        qteTotale:        data.qteTotale,
        prixM3:           data.prixM3 ?? null,
        betonPompe:       data.betonPompe,
        essaisBeton:      data.essaisBeton,
        ajoutEau:         data.ajoutEau,
        modeMiseEnOeuvre: data.modeMiseEnOeuvre || null,
        dateLivraison:    data.dateLivraison ? new Date(data.dateLivraison) : null,
        heureDebut:       data.heureDebut || null,
        heureFin:         data.heureFin || null,
        cadenceM3h:       data.cadenceM3h ?? null,
        observations:     data.observations || null,
        notes:            data.notes || null,
      },
    }),
    prisma.bonCommandeBetonLivraison.deleteMany({ where: { bonCommandeBetonId: id } }),
    ...data.livraisons.map((l, i) =>
      prisma.bonCommandeBetonLivraison.create({
        data: {
          bonCommandeBetonId: id,
          ordre:          i,
          dateLivraison:  new Date(l.dateLivraison),
          quantiteM3:     l.quantiteM3,
          heureDebut:     l.heureDebut || null,
          heureFin:       l.heureFin || null,
          cadenceM3h:     l.cadenceM3h ?? null,
          observations:   l.observations || null,
        },
      })
    ),
  ]);

  revalidatePath("/bons-commande/beton");
  revalidatePath(`/bons-commande/beton/${id}`);
}

export async function supprimerBonCommandeBeton(id: string): Promise<void> {
  await prisma.bonCommandeBeton.delete({ where: { id } });
  revalidatePath("/bons-commande/beton");
  redirect("/bons-commande/beton");
}
