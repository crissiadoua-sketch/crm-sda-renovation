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
      dateLevee?:   string;
    }[];
  }
): Promise<void> {
  // Préserver conformite/observations des lignes si la partie externe a déjà signé.
  // La sauvegarde CRM utilise deleteMany+create (pas d'upsert), ce qui écraserait
  // les données remplies par le signataire externe via la page publique.
  const pvCheck = await prisma.pvReception.findUnique({
    where: { id },
    select: {
      categorie:                true,
      dateSignatureMO:          true,
      dateSignaturePrestataire: true,
      lignes: { select: { ordre: true, conformite: true, observations: true } },
    },
  });

  const externalSigned = pvCheck?.categorie === "TRAVAUX_CLIENT"
    ? !!pvCheck?.dateSignatureMO
    : !!pvCheck?.dateSignaturePrestataire;

  // Map ordre → {conformite, observations} issues du signataire externe
  const signedConformite = new Map<number, { conformite: string; observations: string | null }>();
  if (externalSigned && pvCheck?.lignes) {
    for (const l of pvCheck.lignes) {
      signedConformite.set(l.ordre, { conformite: l.conformite, observations: l.observations });
    }
  }

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
    ...data.lignes.map((l, i) => {
      const signed = signedConformite.get(i);
      return prisma.pvReceptionLigne.create({
        data: {
          pvReceptionId: id,
          ordre:         i,
          designation:   l.designation,
          reference:     l.reference || null,
          quantite:      l.quantite ?? null,
          unite:         l.unite || null,
          conformite:    signed ? signed.conformite  : l.conformite,
          observations:  signed ? signed.observations : l.observations || null,
        },
      });
    }),
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
          dateLevee:     r.dateLevee ? new Date(r.dateLevee) : null,
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

  let pvr = await prisma.pvReception.findUnique({ where: { id } });
  if (!pvr) return { ok: false, error: "PV de Réception introuvable." };

  // Auto-générer le token si absent
  if (!pvr.shareToken) {
    const token  = randomBytes(24).toString("hex");
    const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    pvr = await prisma.pvReception.update({
      where: { id },
      data: {
        shareToken: token,
        shareExpiry: expiry,
        statut: pvr.statut === "BROUILLON" ? "FINALISE" : pvr.statut,
      },
    });
    revalidatePath(`/pv-reception/${id}`);
  }

  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const lien = `${APP_URL}/pv-public/${pvr.shareToken}`;

  return envoyerEmail({
    from: "SDA Rénovation <contact@sda-renovation.com>",
    to: destinataire,
    subject: `✍️ PV de réception ${pvr.numero}${pvr.objet ? ` — ${pvr.objet}` : ""} — Votre signature est requise`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">PV de Réception ${pvr.numero}</p>
          ${pvr.objet ? `<p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${pvr.objet}</p>` : ""}
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p style="margin:0 0 16px;font-size:14px;color:#374151">
            Bonjour,<br/><br/>
            Veuillez lire le procès-verbal de réception ci-dessous et apposer votre signature électronique pour le valider.
          </p>
          <div style="text-align:center;margin:24px 0">
            <a href="${lien}" style="display:inline-block;background:#1E2F6E;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:700">✍️ Lire et signer le PV de réception</a>
          </div>
          <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center">
            Une fois votre signature apposée, SDA Rénovation signera à son tour et vous recevrez le document final.
          </p>
        </div>
      </div>`,
    text: `Bonjour,\n\nVeuillez lire et signer le PV de réception ${pvr.numero}.\n\nLien de signature : ${lien}\n\nCordialement,\nSDA Rénovation`,
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
// Signature électronique par la partie externe (page publique — sans compte)
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

  // Notification à SDA : "le client a signé, vous devez maintenant signer à votre tour"
  try {
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";
    const dateStr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(dateSignature);
    const roleLabel = role === "MO" ? "Maître d'ouvrage / Client" : "Prestataire / Sous-traitant";
    await envoyerEmail({
      from: "SDA Rénovation <contact@sda-renovation.com>",
      to: "contact@sda-renovation.com",
      subject: `✍️ PV ${pvr.numero} — Signature reçue, votre contre-signature est requise`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">✍️ Signature reçue — contre-signature requise</p>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${pvr.numero}</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 16px;font-size:14px;color:#374151">
              <strong>${signataireNom}</strong> (${roleLabel}) a signé le PV de réception.
              Vous devez maintenant apposer votre signature dans le CRM pour finaliser le document.
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
              <tr><td style="padding:6px 0;color:#64748b;width:40%">Signataire</td><td style="padding:6px 0;font-weight:600;color:#1e293b">${signataireNom}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Rôle</td><td style="padding:6px 0;color:#374151">${roleLabel}</td></tr>
              ${pvr.chantier ? `<tr><td style="padding:6px 0;color:#64748b">Chantier</td><td style="padding:6px 0;color:#374151">${pvr.chantier.nom}</td></tr>` : ""}
              <tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;color:#374151">${dateStr}</td></tr>
            </table>
            <div style="text-align:center">
              <a href="${APP_URL}/pv-reception/${pvr.id}" style="display:inline-block;background:#F7941E;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:700">✍️ Signer à mon tour dans le CRM</a>
            </div>
          </div>
        </div>`,
      text: `PV ${pvr.numero} signé par ${signataireNom} (${roleLabel}) le ${dateStr}. Veuillez apposer votre signature dans le CRM.`,
    });
  } catch { /* notification non bloquante */ }

  revalidatePath(`/pv-reception/${pvr.id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Signature SDA (côté CRM — authenticated)
// ---------------------------------------------------------------------------

export async function signerPvReceptionSDA(
  pvId: string,
  signataireNom: string,
  signatureImage: string,
): Promise<{ ok: boolean; error?: string }> {
  const pvr = await prisma.pvReception.findUnique({
    where: { id: pvId },
    include: {
      chantier:     { select: { nom: true } },
      client:       { select: { nom: true, prenom: true, raisonSociale: true, email: true } },
      sousTraitant: { select: { nom: true, email: true } },
      fournisseur:  { select: { nom: true, email: true } },
    },
  });

  if (!pvr) return { ok: false, error: "PV introuvable." };

  const isTravauxClient = pvr.categorie === "TRAVAUX_CLIENT";

  // Vérifier que la partie externe a déjà signé
  const externalSigned = isTravauxClient ? !!pvr.dateSignatureMO : !!pvr.dateSignaturePrestataire;
  if (!externalSigned) return { ok: false, error: "La partie externe doit signer en premier." };

  // Vérifier que SDA n'a pas encore signé
  const sdaAlreadySigned = isTravauxClient ? !!pvr.dateSignaturePrestataire : !!pvr.dateSignatureMO;
  if (sdaAlreadySigned) return { ok: false, error: "SDA Rénovation a déjà signé ce PV." };

  const dateSignature = new Date();

  await prisma.pvReception.update({
    where: { id: pvId },
    data: {
      statut: "SIGNE",
      ...(isTravauxClient
        ? { signaturePrestataire: signatureImage, dateSignaturePrestataire: dateSignature, repPrestataire: signataireNom }
        : { signatureMO: signatureImage, dateSignatureMO: dateSignature, repMO: signataireNom }),
    },
  });

  // Email de notification à la partie externe : "le PV est maintenant signé, vous pouvez télécharger"
  try {
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";
    const dateStr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(dateSignature);

    const destinataire = isTravauxClient
      ? (pvr.emailRepMO || pvr.client?.email)
      : (pvr.emailPrestataire || pvr.sousTraitant?.email || pvr.fournisseur?.email);

    const nomExterne = isTravauxClient
      ? (pvr.client?.raisonSociale || `${pvr.client?.prenom ?? ""} ${pvr.client?.nom ?? ""}`.trim() || "Client")
      : (pvr.sousTraitant?.nom || pvr.fournisseur?.nom || "Prestataire");

    const dlUrl = pvr.shareToken
      ? `${APP_URL}/api/pv-reception/${pvr.id}/dl?token=${pvr.shareToken}`
      : null;

    if (destinataire) {
      await envoyerEmail({
        from: "SDA Rénovation <contact@sda-renovation.com>",
        to: destinataire,
        subject: `✅ PV de réception ${pvr.numero} — Document signé disponible`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
            <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
              <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">✅ PV de réception signé par les deux parties</p>
              <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${pvr.numero}</p>
            </div>
            <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
              <p style="margin:0 0 16px;font-size:14px;color:#374151">
                Bonjour ${nomExterne},
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#374151">
                Le PV de réception <strong>${pvr.numero}</strong> a maintenant été signé par les deux parties.
                Vous pouvez télécharger le document final en cliquant sur le bouton ci-dessous.
              </p>
              <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
                ${pvr.chantier ? `<tr><td style="padding:6px 0;color:#64748b;width:40%">Chantier</td><td style="padding:6px 0;color:#374151">${pvr.chantier.nom}</td></tr>` : ""}
                <tr><td style="padding:6px 0;color:#64748b">Date de signature</td><td style="padding:6px 0;color:#374151">${dateStr}</td></tr>
                <tr><td style="padding:6px 0;color:#64748b">Signé par SDA</td><td style="padding:6px 0;color:#374151">${signataireNom}</td></tr>
              </table>
              ${dlUrl ? `<div style="text-align:center"><a href="${dlUrl}" style="display:inline-block;background:#1E2F6E;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:700">📄 Télécharger le PV signé (PDF)</a></div>` : ""}
            </div>
            <p style="text-align:center;margin-top:16px;font-size:12px;color:#94a3b8">SDA Rénovation · ${process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com"}</p>
          </div>`,
        text: `Le PV ${pvr.numero} a été signé par les deux parties le ${dateStr}. ${dlUrl ? `Télécharger : ${dlUrl}` : ""}`,
      });
    }
  } catch { /* notification non bloquante */ }

  revalidatePath("/pv-reception");
  revalidatePath(`/pv-reception/${pvId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Soumettre le contrôle + signer (partie externe via lien public)
// ---------------------------------------------------------------------------
export async function signerAvecControle(
  token: string,
  role: "MO" | "PRESTATAIRE",
  signataireNom: string,
  signatureImage: string,
  lignesControle: { id: string; conformite: string; observations: string }[],
  resultat: string,
): Promise<{ ok: boolean; error?: string }> {
  const pvr = await prisma.pvReception.findUnique({
    where: { shareToken: token },
    include: { chantier: { select: { nom: true } } },
  });

  if (!pvr) return { ok: false, error: "Lien invalide ou expiré." };
  if (pvr.shareExpiry && pvr.shareExpiry < new Date()) return { ok: false, error: "Ce lien a expiré." };

  const alreadySigned = role === "MO" ? !!pvr.dateSignatureMO : !!pvr.dateSignaturePrestataire;
  if (alreadySigned) return { ok: false, error: "Ce PV a déjà été signé par cette partie." };

  const dateSignature = new Date();

  // Mettre à jour la conformité + observations de chaque ligne
  await Promise.all(
    lignesControle.map((l) =>
      prisma.pvReceptionLigne.update({
        where: { id: l.id },
        data: { conformite: l.conformite, observations: l.observations || null },
      })
    )
  );

  // Enregistrer la signature + résultat
  await prisma.pvReception.update({
    where: { id: pvr.id },
    data: {
      resultat: resultat || null,
      ...(role === "MO"
        ? { signatureMO: signatureImage, dateSignatureMO: dateSignature, repMO: signataireNom || pvr.repMO }
        : { signaturePrestataire: signatureImage, dateSignaturePrestataire: dateSignature, repPrestataire: signataireNom || pvr.repPrestataire }),
    },
  });

  // Notification email à SDA
  try {
    const APP_URL    = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";
    const dateStr    = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(dateSignature);
    const roleLabel  = role === "MO" ? "Maître d'ouvrage / Client" : "Prestataire / Sous-traitant";
    const resLabel   = ({ ACCEPTE: "Accepté sans réserve", ACCEPTE_RESERVES: "Accepté avec réserves", REFUSE: "Refusé" } as Record<string, string>)[resultat] ?? "—";
    const resColor   = resultat === "ACCEPTE" ? "#16a34a" : resultat === "REFUSE" ? "#dc2626" : "#d97706";
    await envoyerEmail({
      from: "SDA Rénovation <contact@sda-renovation.com>",
      to:   "contact@sda-renovation.com",
      subject: `✍️ PV ${pvr.numero} — Signature reçue (${resLabel}), contre-signature requise`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">✍️ Signature reçue — contre-signature requise</p>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${pvr.numero}</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 16px;font-size:14px;color:#374151">
              <strong>${signataireNom}</strong> (${roleLabel}) a rempli le contrôle de conformité et signé le PV.
            </p>
            <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:20px">
              <tr><td style="padding:6px 0;color:#64748b;width:40%">Signataire</td><td style="padding:6px 0;font-weight:600;color:#1e293b">${signataireNom}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Rôle</td><td style="padding:6px 0;color:#374151">${roleLabel}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Décision</td><td style="padding:6px 0;font-weight:700;color:${resColor}">${resLabel}</td></tr>
              ${pvr.chantier ? `<tr><td style="padding:6px 0;color:#64748b">Chantier</td><td style="padding:6px 0;color:#374151">${pvr.chantier.nom}</td></tr>` : ""}
              <tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;color:#374151">${dateStr}</td></tr>
            </table>
            <div style="text-align:center">
              <a href="${APP_URL}/pv-reception/${pvr.id}" style="display:inline-block;background:#F7941E;color:#fff;text-decoration:none;padding:12px 32px;border-radius:6px;font-size:14px;font-weight:700">✍️ Signer à mon tour dans le CRM</a>
            </div>
          </div>
        </div>`,
      text: `PV ${pvr.numero} — ${signataireNom} (${roleLabel}) a signé avec décision : ${resLabel}. Date : ${dateStr}. Veuillez signer dans le CRM.`,
    });
  } catch { /* notification non bloquante */ }

  revalidatePath(`/pv-reception/${pvr.id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Supprimer
// ---------------------------------------------------------------------------
export async function supprimerPvReception(id: string): Promise<void> {
  const _doc = await prisma.pvReception.findUnique({ where: { id }, select: { statut: true } });
  if (!_doc || _doc.statut !== "BROUILLON") return;
  await prisma.pvReception.delete({ where: { id } });
  revalidatePath("/pv-reception");
  redirect("/pv-reception");
}
