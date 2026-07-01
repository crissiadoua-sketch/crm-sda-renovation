"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { envoyerEmail } from "@/lib/email";
import { prochainNumeroDocument } from "@/lib/codification";

async function nextNumeroPvr(): Promise<string> {
  const pvs = await prisma.pvReception.findMany({ select: { numero: true } });
  return prochainNumeroDocument("PVR", pvs.map((p) => p.numero));
}

// ---------------------------------------------------------------------------
// Créer un PV de Réception
// ---------------------------------------------------------------------------
export async function creerPvReception(formData: FormData): Promise<void> {
  const numero         = await nextNumeroPvr();
  const typeSupport    = (formData.get("typeSupport") as string) || "PRESTATION";
  const fournisseurId  = (formData.get("fournisseurId") as string) || null;
  const chantierId     = (formData.get("chantierId") as string) || null;
  const clientId       = (formData.get("clientId") as string) || null;
  const objet          = (formData.get("objet") as string) || null;

  const pvr = await prisma.pvReception.create({
    data: { numero, typeSupport, fournisseurId, chantierId, clientId, objet },
  });

  revalidatePath("/pv-reception");
  redirect(`/pv-reception/${pvr.id}`);
}

// ---------------------------------------------------------------------------
// Sauvegarder toutes les données (avec lignes + réserves en transaction)
// ---------------------------------------------------------------------------
export async function sauvegarderPvReception(
  id: string,
  data: {
    statut:          string;
    typeSupport:     string;
    objet?:          string;
    descriptionPrestations?: string;
    dateReception?:  string;
    lieuReception?:  string;
    periodeDebut?:   string;
    periodeFin?:     string;
    refContrat?:     string;
    refDevis?:       string;
    refCommande?:    string;
    refBonLivraison?: string;
    clientId?:       string;
    chantierId?:     string;
    fournisseurId?:  string;
    repMO?:          string;
    fonctionRepMO?:  string;
    emailRepMO?:     string;
    repPrestataire?:      string;
    fonctionPrestataire?: string;
    emailPrestataire?:    string;
    resultat?:       string;
    motifRefus?:     string;
    dateEffet?:      string;
    garantieConformite: boolean;
    dureeGarantie?:  string;
    notes?:          string;
    lignes: {
      designation:  string;
      reference?:   string;
      quantite?:    number;
      unite?:       string;
      conformite:   string;
      observations?: string;
    }[];
    reserves: {
      description:  string;
      delaiLevee?:  string;
      responsable?: string;
      statut:       string;
      commentaireLevee?: string;
    }[];
  }
): Promise<void> {
  await prisma.$transaction([
    prisma.pvReception.update({
      where: { id },
      data: {
        statut:          data.statut,
        typeSupport:     data.typeSupport,
        objet:           data.objet || null,
        descriptionPrestations: data.descriptionPrestations || null,
        dateReception:   data.dateReception ? new Date(data.dateReception) : null,
        lieuReception:   data.lieuReception || null,
        periodeDebut:    data.periodeDebut ? new Date(data.periodeDebut) : null,
        periodeFin:      data.periodeFin ? new Date(data.periodeFin) : null,
        refContrat:      data.refContrat || null,
        refDevis:        data.refDevis || null,
        refCommande:     data.refCommande || null,
        refBonLivraison: data.refBonLivraison || null,
        clientId:        data.clientId || null,
        chantierId:      data.chantierId || null,
        fournisseurId:   data.fournisseurId || null,
        repMO:           data.repMO || null,
        fonctionRepMO:   data.fonctionRepMO || null,
        emailRepMO:      data.emailRepMO || null,
        repPrestataire:       data.repPrestataire || null,
        fonctionPrestataire:  data.fonctionPrestataire || null,
        emailPrestataire:     data.emailPrestataire || null,
        resultat:        data.resultat || null,
        motifRefus:      data.motifRefus || null,
        dateEffet:       data.dateEffet ? new Date(data.dateEffet) : null,
        garantieConformite: data.garantieConformite,
        dureeGarantie:   data.dureeGarantie || null,
        notes:           data.notes || null,
      },
    }),
    prisma.pvReceptionLigne.deleteMany({ where: { pvReceptionId: id } }),
    prisma.pvReceptionReserve.deleteMany({ where: { pvReceptionId: id } }),
    ...data.lignes.map((l, i) =>
      prisma.pvReceptionLigne.create({
        data: {
          pvReceptionId: id,
          ordre:         i,
          designation:   l.designation,
          reference:     l.reference || null,
          quantite:      l.quantite ?? null,
          unite:         l.unite || null,
          conformite:    l.conformite,
          observations:  l.observations || null,
        },
      })
    ),
    ...data.reserves.map((r, i) =>
      prisma.pvReceptionReserve.create({
        data: {
          pvReceptionId: id,
          ordre:         i,
          description:   r.description,
          delaiLevee:    r.delaiLevee ? new Date(r.delaiLevee) : null,
          responsable:   r.responsable || null,
          statut:        r.statut,
          commentaireLevee: r.commentaireLevee || null,
        },
      })
    ),
  ]);

  revalidatePath("/pv-reception");
  revalidatePath(`/pv-reception/${id}`);
}

// ---------------------------------------------------------------------------
// Générer / réinitialiser le lien de partage
// ---------------------------------------------------------------------------
export async function genererLienPartage(id: string): Promise<string> {
  const token = randomBytes(24).toString("hex");
  const expiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 jours

  await prisma.pvReception.update({
    where: { id },
    data: { shareToken: token, shareExpiry: expiry },
  });

  revalidatePath(`/pv-reception/${id}`);
  return token;
}

// ---------------------------------------------------------------------------
// Envoyer le lien de partage par email depuis le CRM (compte SMTP de l'entreprise)
// ---------------------------------------------------------------------------
export async function envoyerLienPvParEmail(
  id: string,
  destinataire: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!destinataire) return { ok: false, error: "Adresse email manquante." };

  const pvr = await prisma.pvReception.findUnique({ where: { id } });
  if (!pvr) return { ok: false, error: "PV de Réception introuvable." };
  if (!pvr.shareToken) return { ok: false, error: "Générez d'abord le lien de partage." };

  const lien = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/pv-public/${pvr.shareToken}`;

  return envoyerEmail({
    to: destinataire,
    subject: `PV de Réception ${pvr.numero}`,
    text: `Bonjour,\n\nVeuillez trouver ci-dessous le lien vers le PV de Réception ${pvr.numero} :\n\n${lien}\n\nCordialement,\nSDA Rénovation`,
    html: `<p>Bonjour,</p><p>Veuillez trouver ci-dessous le lien vers le PV de Réception <strong>${pvr.numero}</strong> :</p><p><a href="${lien}">${lien}</a></p><p>Cordialement,<br/>SDA Rénovation</p>`,
  });
}

// ---------------------------------------------------------------------------
// Finaliser (passe en FINALISE + génère le token si absent)
// ---------------------------------------------------------------------------
export async function finaliserPvReception(id: string): Promise<string> {
  const existing = await prisma.pvReception.findUnique({
    where: { id },
    select: { shareToken: true },
  });

  const token = existing?.shareToken ?? randomBytes(24).toString("hex");
  const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 an

  await prisma.pvReception.update({
    where: { id },
    data: { statut: "FINALISE", shareToken: token, shareExpiry: expiry },
  });

  revalidatePath("/pv-reception");
  revalidatePath(`/pv-reception/${id}`);
  return token;
}

// ---------------------------------------------------------------------------
// Supprimer
// ---------------------------------------------------------------------------
export async function supprimerPvReception(id: string): Promise<void> {
  await prisma.pvReception.delete({ where: { id } });
  revalidatePath("/pv-reception");
  redirect("/pv-reception");
}
