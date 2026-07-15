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
  const numero          = await nextNumeroPvr();
  const categorie       = (formData.get("categorie") as string) || "SUPPORT";
  const typeSupport     = (formData.get("typeSupport") as string) || "PRESTATION";
  const fournisseurId   = (formData.get("fournisseurId") as string) || null;
  const sousTraitantId  = (formData.get("sousTraitantId") as string) || null;
  const chantierId      = (formData.get("chantierId") as string) || null;
  const clientId        = (formData.get("clientId") as string) || null;
  const objet           = (formData.get("objet") as string) || null;

  const pvr = await prisma.pvReception.create({
    data: { numero, categorie, typeSupport, fournisseurId, sousTraitantId, chantierId, clientId, objet },
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
    sousTraitantId?: string;
    repMO?:          string;
    fonctionRepMO?:  string;
    emailRepMO?:     string;
    repPrestataire?:      string;
    fonctionPrestataire?: string;
    emailPrestataire?:    string;
    resultat?:       string;
    motifRefus?:     string;
    dateEffet?:      string;
    // BTP guarantees
    garantiePerfaitAchevement?: boolean;
    garantieBiennale?:          boolean;
    garantieDecennale?:         boolean;
    dateFinParfaitAchevement?:  string;
    dateFinBiennale?:           string;
    dateFinDecennale?:          string;
    assuranceDecennaleNo?:      string;
    assuranceDONo?:             string;
    maitreOeuvreNom?:           string;
    maitreOeuvreEmail?:         string;
    // Support guarantees
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
        sousTraitantId:  data.sousTraitantId || null,
        repMO:           data.repMO || null,
        fonctionRepMO:   data.fonctionRepMO || null,
        emailRepMO:      data.emailRepMO || null,
        repPrestataire:       data.repPrestataire || null,
        fonctionPrestataire:  data.fonctionPrestataire || null,
        emailPrestataire:     data.emailPrestataire || null,
        resultat:        data.resultat || null,
        motifRefus:      data.motifRefus || null,
        dateEffet:       data.dateEffet ? new Date(data.dateEffet) : null,
        garantiePerfaitAchevement: data.garantiePerfaitAchevement ?? false,
        garantieBiennale:          data.garantieBiennale ?? false,
        garantieDecennale:         data.garantieDecennale ?? false,
        dateFinParfaitAchevement:  data.dateFinParfaitAchevement ? new Date(data.dateFinParfaitAchevement) : null,
        dateFinBiennale:           data.dateFinBiennale ? new Date(data.dateFinBiennale) : null,
        dateFinDecennale:          data.dateFinDecennale ? new Date(data.dateFinDecennale) : null,
        assuranceDecennaleNo:      data.assuranceDecennaleNo || null,
        assuranceDONo:             data.assuranceDONo || null,
        maitreOeuvreNom:           data.maitreOeuvreNom || null,
        maitreOeuvreEmail:         data.maitreOeuvreEmail || null,
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
// Signature électronique (page publique — sans compte)
// ---------------------------------------------------------------------------

export async function signerPvReception(
  token: string,
  role: "MO" | "PRESTATAIRE",
  signataireNom: string,
  signatureImage: string,
): Promise<{ ok: boolean; error?: string }> {
  const pvr = await prisma.pvReception.findUnique({
    where: { shareToken: token },
    include: {
      chantier: { select: { nom: true } },
    },
  });

  if (!pvr) return { ok: false, error: "Lien invalide ou expiré." };
  if (pvr.shareExpiry && pvr.shareExpiry < new Date()) return { ok: false, error: "Ce lien a expiré." };

  const alreadySigned = role === "MO" ? !!pvr.dateSignatureMO : !!pvr.dateSignaturePrestataire;
  if (alreadySigned) return { ok: false, error: "Ce PV a déjà été signé par cette partie." };

  const dateSignature = new Date();

  await prisma.pvReception.update({
    where: { id: pvr.id },
    data:
      role === "MO"
        ? { signatureMO: signatureImage, dateSignatureMO: dateSignature, repMO: signataireNom || pvr.repMO }
        : { signaturePrestataire: signatureImage, dateSignaturePrestataire: dateSignature, repPrestataire: signataireNom || pvr.repPrestataire },
  });

  // Notification à SDA
  try {
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";
    const dateStr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(dateSignature);
    const roleLabel = role === "MO" ? "Maître d'ouvrage" : "Prestataire / Sous-traitant";
    await envoyerEmail({
      from: "SDA Rénovation <contact@sda-renovation.com>",
      to: "contact@sda-renovation.com",
      subject: `✅ PV de réception ${pvr.numero} signé — ${roleLabel}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">✅ PV de réception signé</p>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${pvr.numero}</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:6px 0;color:#64748b;width:40%">Signataire</td><td style="padding:6px 0;font-weight:600;color:#1e293b">${signataireNom}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Rôle</td><td style="padding:6px 0;color:#374151">${roleLabel}</td></tr>
              ${pvr.chantier ? `<tr><td style="padding:6px 0;color:#64748b">Chantier</td><td style="padding:6px 0;color:#374151">${pvr.chantier.nom}</td></tr>` : ""}
              <tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;color:#374151">${dateStr}</td></tr>
            </table>
            <div style="margin-top:20px;text-align:center">
              <a href="${APP_URL}/pv-reception/${pvr.id}" style="display:inline-block;background:#1E2F6E;color:#fff;text-decoration:none;padding:10px 28px;border-radius:6px;font-size:14px;font-weight:600">Voir dans le CRM</a>
            </div>
          </div>
        </div>`,
      text: `PV ${pvr.numero} signé par ${signataireNom} (${roleLabel}) le ${dateStr}.`,
    });
  } catch { /* notification non bloquante */ }

  revalidatePath(`/pv-reception/${pvr.id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Supprimer
// ---------------------------------------------------------------------------
export async function supprimerPvReception(id: string): Promise<void> {
  await prisma.pvReception.delete({ where: { id } });
  revalidatePath("/pv-reception");
  redirect("/pv-reception");
}
