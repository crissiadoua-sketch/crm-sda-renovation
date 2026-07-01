"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { prochainNumeroDocument } from "@/lib/codification";

async function nextNumeroBrp(): Promise<string> {
  const brps = await prisma.bonReservationPompe.findMany({ select: { numero: true } });
  return prochainNumeroDocument("BRP", brps.map((b) => b.numero));
}

export async function creerBonReservationPompe(formData: FormData): Promise<void> {
  const numero        = await nextNumeroBrp();
  const fournisseurId = formData.get("fournisseurId") as string;
  const chantierId    = (formData.get("chantierId") as string) || null;
  const clientId      = (formData.get("clientId") as string) || null;

  const brp = await prisma.bonReservationPompe.create({
    data: { numero, fournisseurId, chantierId, clientId },
  });

  revalidatePath("/bons-commande/pompe");
  redirect(`/bons-commande/pompe/${brp.id}`);
}

export async function sauvegarderBonReservationPompe(
  id: string,
  data: {
    fournisseurId:        string;
    chantierId?:          string;
    clientId?:            string;
    statut:               string;
    nomChantier?:         string;
    adresseChantier?:     string;
    contactTelephone?:    string;
    refAnalytique?:       string;
    dateReservation?:     string;
    heureArriveePompe?:   string;
    heureDebutPompage?:   string;
    heureFinPompage?:     string;
    cubagePrévu?:         number;
    centraleBeton?:       string;
    typePompe?:           string;
    avecFleche:           boolean;
    flecheMetres?:        number;
    sansFleche:           boolean;
    tuyauterieMetres?:    number;
    tuyauterieSupp:       boolean;
    tuyauterieSupplementaire?: number;
    prixHT?:              number;
    tauxTVA?:             number;
    modeReglement?:       string;
    conditions?:          string;
    notes?:               string;
  }
): Promise<void> {
  await prisma.bonReservationPompe.update({
    where: { id },
    data: {
      fournisseurId:           data.fournisseurId,
      chantierId:              data.chantierId || null,
      clientId:                data.clientId || null,
      statut:                  data.statut,
      nomChantier:             data.nomChantier || null,
      adresseChantier:         data.adresseChantier || null,
      contactTelephone:        data.contactTelephone || null,
      refAnalytique:           data.refAnalytique || null,
      dateReservation:         data.dateReservation ? new Date(data.dateReservation) : null,
      heureArriveePompe:       data.heureArriveePompe || null,
      heureDebutPompage:       data.heureDebutPompage || null,
      heureFinPompage:         data.heureFinPompage || null,
      cubagePrévu:             data.cubagePrévu ?? null,
      centraleBeton:           data.centraleBeton || null,
      typePompe:               data.typePompe || null,
      avecFleche:              data.avecFleche,
      flecheMetres:            data.flecheMetres ?? null,
      sansFleche:              data.sansFleche,
      tuyauterieMetres:        data.tuyauterieMetres ?? null,
      tuyauterieSupp:          data.tuyauterieSupp,
      tuyauterieSupplementaire: data.tuyauterieSupplementaire ?? null,
      prixHT:                  data.prixHT ?? null,
      tauxTVA:                 data.tauxTVA ?? 20,
      modeReglement:           data.modeReglement || null,
      conditions:              data.conditions || null,
      notes:                   data.notes || null,
    },
  });

  revalidatePath("/bons-commande/pompe");
  revalidatePath(`/bons-commande/pompe/${id}`);
}

export async function supprimerBonReservationPompe(id: string): Promise<void> {
  await prisma.bonReservationPompe.delete({ where: { id } });
  revalidatePath("/bons-commande/pompe");
  redirect("/bons-commande/pompe");
}
