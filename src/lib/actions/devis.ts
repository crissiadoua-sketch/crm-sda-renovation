"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { prochainNumeroDocument } from "@/lib/codification";
import { randomBytes } from "crypto";
import { stockerFichier, supprimerFichierStocke } from "@/lib/blob-storage";
import { envoyerEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";

const devisHeaderSchema = z.object({
  chantierId: z.string().min(1, "Le chantier est requis."),
  statut: z.enum(["BROUILLON", "ENVOYE", "ACCEPTE", "REFUSE", "EXPIRE"]),
  dateValidite: z.string().optional(),
  referenceMarche: z.string().optional(),
  maitreOuvrage: z.string().optional(),
  maitreOeuvre: z.string().optional(),
  lot: z.string().optional(),
  objet: z.string().optional(),
  delaiExecution: z.string().optional(),
  modaliteReglement: z.string().optional(),
});

export type DevisState = {
  errors?: Record<string, string[]>;
} | undefined;

function emptyToNull(value?: string) {
  return value && value.trim() !== "" ? value : null;
}

function emptyToNullDate(value?: string) {
  return value && value.trim() !== "" ? new Date(value) : null;
}

export async function getNextDevisNumero() {
  const devis = await prisma.devis.findMany({ select: { numero: true } });
  return prochainNumeroDocument("DEV", devis.map((d) => d.numero));
}

export async function createDevis(
  _prevState: DevisState,
  formData: FormData,
): Promise<DevisState> {
  const validated = devisHeaderSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  const chantier = await prisma.chantier.findUnique({ where: { id: data.chantierId } });
  if (!chantier) {
    return { errors: { chantierId: ["Chantier introuvable."] } };
  }

  const numero = await getNextDevisNumero();

  const devis = await prisma.devis.create({
    data: {
      numero,
      chantierId: data.chantierId,
      clientId: chantier.clientId,
      statut: data.statut,
      dateValidite: emptyToNullDate(data.dateValidite),
      referenceMarche: emptyToNull(data.referenceMarche),
      maitreOuvrage: emptyToNull(data.maitreOuvrage),
      maitreOeuvre: emptyToNull(data.maitreOeuvre),
      lot: emptyToNull(data.lot),
      objet: emptyToNull(data.objet),
      delaiExecution: emptyToNull(data.delaiExecution),
      modaliteReglement: emptyToNull(data.modaliteReglement),
    },
  });

  revalidatePath("/devis");
  redirect(`/devis/${devis.id}`);
}

export async function updateDevisInfo(
  id: string,
  _prevState: DevisState,
  formData: FormData,
): Promise<DevisState> {
  const validated = devisHeaderSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const data = validated.data;

  const chantier = await prisma.chantier.findUnique({ where: { id: data.chantierId } });
  if (!chantier) {
    return { errors: { chantierId: ["Chantier introuvable."] } };
  }

  await prisma.devis.update({
    where: { id },
    data: {
      chantierId: data.chantierId,
      clientId: chantier.clientId,
      statut: data.statut,
      dateValidite: emptyToNullDate(data.dateValidite),
      referenceMarche: emptyToNull(data.referenceMarche),
      maitreOuvrage: emptyToNull(data.maitreOuvrage),
      maitreOeuvre: emptyToNull(data.maitreOeuvre),
      lot: emptyToNull(data.lot),
      objet: emptyToNull(data.objet),
      delaiExecution: emptyToNull(data.delaiExecution),
      modaliteReglement: emptyToNull(data.modaliteReglement),
    },
  });

  revalidatePath("/devis");
  revalidatePath(`/devis/${id}`);
  redirect(`/devis/${id}`);
}

export async function creerAvenant(devisParentId: string) {
  const parent = await prisma.devis.findUnique({
    where: { id: devisParentId },
    include: { avenants: true },
  });

  if (!parent) {
    redirect("/devis");
  }

  const numero = `${parent.numero}-AV${parent.avenants.length + 1}`;

  const avenant = await prisma.devis.create({
    data: {
      numero,
      chantierId: parent.chantierId,
      clientId: parent.clientId,
      statut: "BROUILLON",
      type: "AVENANT",
      devisParentId: parent.id,
      referenceMarche: parent.referenceMarche,
      maitreOuvrage: parent.maitreOuvrage,
      maitreOeuvre: parent.maitreOeuvre,
      lot: parent.lot,
      objet: parent.objet ? `Avenant — ${parent.objet}` : null,
      delaiExecution: parent.delaiExecution,
      modaliteReglement: parent.modaliteReglement,
    },
  });

  revalidatePath(`/devis/${devisParentId}`);
  revalidatePath("/devis");
  redirect(`/devis/${avenant.id}`);
}

export async function deleteDevis(id: string) {
  const _doc = await prisma.devis.findUnique({ where: { id }, select: { statut: true } });
  if (!_doc || _doc.statut !== "BROUILLON") return;
  try {
    await prisma.devis.delete({ where: { id } });
  } catch {
    redirect(`/devis/${id}?erreur=suppression`);
  }

  revalidatePath("/devis");
  redirect("/devis");
}

export async function retenirVariante(devisId: string, chantierId: string): Promise<void> {
  await prisma.devis.updateMany({
    where: { chantierId, statut: "BROUILLON", id: { not: devisId }, type: "INITIAL" },
    data: { statut: "EXPIRE" },
  });
  revalidatePath("/devis");
  redirect("/devis");
}

export async function supprimerVariante(devisId: string, chantierId: string): Promise<void> {
  try {
    await prisma.devis.delete({ where: { id: devisId } });
  } catch { /* ignoré si des factures liées */ }
  revalidatePath("/devis");
  redirect(`/devis/comparer/${chantierId}`);
}

export async function envoyerVariantes(chantierId: string, ids: string[]): Promise<void> {
  await prisma.devis.updateMany({
    where: { id: { in: ids }, chantierId, type: "INITIAL" },
    data: { statut: "ENVOYE" },
  });
  revalidatePath("/devis");
  revalidatePath(`/devis/comparer/${chantierId}`);
}

export async function genererLienVariantes(chantierId: string): Promise<string> {
  const { randomBytes } = await import("node:crypto");
  const token = randomBytes(20).toString("hex");
  await prisma.chantier.update({ where: { id: chantierId }, data: { tokenVariantes: token } });
  return token;
}

export async function clientSelectionneVariante(token: string, devisId: string): Promise<void> {
  const chantier = await prisma.chantier.findUnique({ where: { tokenVariantes: token } });
  if (!chantier) return;
  const devis = await prisma.devis.update({ where: { id: devisId }, data: { statut: "ACCEPTE" } });
  await prisma.devis.updateMany({
    where: { chantierId: chantier.id, statut: { in: ["BROUILLON", "ENVOYE"] }, id: { not: devisId }, type: "INITIAL" },
    data: { statut: "EXPIRE" },
  });
  await prisma.chantier.update({ where: { id: chantier.id }, data: { tokenVariantes: null } });
  revalidatePath("/devis");
  redirect(`/selection-variante/confirme?numero=${encodeURIComponent(devis.numero)}&chantier=${encodeURIComponent(chantier.nom)}`);
}

// ---------------------------------------------------------------------------
// Lignes de métré (chapitres / sous-chapitres / lignes)
// ---------------------------------------------------------------------------

const ligneInputSchema = z.object({
  type: z.enum(["CHAPITRE", "SOUS_CHAPITRE", "LIGNE", "CLAUSE_RESERVE"]),
  codeArticle: z.string().nullable().optional(),
  designation: z.string(),
  unite: z.string().nullable().optional(),
  quantite: z.number().nullable().optional(),
  prixUnitaireHT: z.number().nullable().optional(),
  coutUnitaireDS: z.number().nullable().optional(),
  remise: z.number().nullable().optional(),
  tauxTVA: z.number().nullable().optional(),
  styleTexte: z.string().optional(),
  clausesReserves: z.string().nullable().optional(), // JSON string[]
  sousTotalMasque: z.boolean().optional(),
  sousTotalManuel: z.number().nullable().optional(),
});

export type DevisLignesState = {
  error?: string;
} | undefined;

export async function updateDevisLignes(
  id: string,
  _prevState: DevisLignesState,
  formData: FormData,
): Promise<DevisLignesState> {
  const raw = formData.get("lignes");
  if (typeof raw !== "string") {
    return { error: "Données de métré invalides." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: "Données de métré invalides." };
  }

  const result = z.array(ligneInputSchema).safeParse(parsed);
  if (!result.success) {
    return { error: "Données de métré invalides." };
  }

  let totalHT = 0;
  let totalTVA = 0;
  let totalDS = 0;
  const lignesData = result.data.map((ligne, index) => {
    const remise = ligne.remise ?? 0;
    const total =
      ligne.type === "LIGNE" && ligne.quantite != null && ligne.prixUnitaireHT != null
        ? Math.round(ligne.quantite * ligne.prixUnitaireHT * (1 - remise / 100) * 100) / 100
        : null;

    if (ligne.type === "LIGNE" && total != null) {
      totalHT += total;
      totalTVA += total * ((ligne.tauxTVA ?? 20) / 100);
    }
    if (ligne.type === "LIGNE" && ligne.quantite != null && ligne.coutUnitaireDS != null) {
      totalDS += Math.round(ligne.quantite * ligne.coutUnitaireDS * 100) / 100;
    }

    return {
      ordre: index + 1,
      type: ligne.type,
      codeArticle: ligne.codeArticle ?? null,
      designation: ligne.designation,
      unite: ligne.unite ?? null,
      quantite: ligne.quantite ?? null,
      prixUnitaireHT: ligne.prixUnitaireHT ?? null,
      coutUnitaireDS: ligne.coutUnitaireDS ?? null,
      remise: ligne.remise ?? null,
      tauxTVA: ligne.tauxTVA ?? null,
      totalHT: total,
      styleTexte: ligne.styleTexte ?? "{}",
      clausesReserves: ligne.clausesReserves ?? null,
      sousTotalMasque: ligne.sousTotalMasque ?? false,
      sousTotalManuel: ligne.sousTotalManuel ?? null,
    };
  });

  totalHT = Math.round(totalHT * 100) / 100;
  totalTVA = Math.round(totalTVA * 100) / 100;
  totalDS = Math.round(totalDS * 100) / 100;
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100;

  await prisma.$transaction([
    prisma.devisLigne.deleteMany({ where: { devisId: id } }),
    prisma.devis.update({
      where: { id },
      data: {
        totalHT,
        totalTVA,
        totalTTC,
        totalDS,
        version: { increment: 1 },
        lignes: { create: lignesData },
      },
    }),
  ]);

  revalidatePath(`/devis/${id}`);
  revalidatePath("/devis");
}

// ---------------------------------------------------------------------------
// Mentions libres & notes internes
// ---------------------------------------------------------------------------

export async function updateMentionsDevis(id: string, formData: FormData): Promise<void> {
  await prisma.devis.update({
    where: { id },
    data: {
      mentionsLibres: (formData.get("mentionsLibres") as string) || null,
      notesInternes: (formData.get("notesInternes") as string) || null,
    },
  });
  revalidatePath(`/devis/${id}`);
}

// ---------------------------------------------------------------------------
// Page de garde
// ---------------------------------------------------------------------------

export async function updateDevisCouverture(
  id: string,
  data: {
    modeleCouverture: string;
    nomProjet?: string | null;
    photoProjetUrl?: string | null;
    photoRotation?: number;
    photoPositionX?: number;
    photoPositionY?: number;
    moNom?: string | null; moRepresentant?: string | null; moEmail?: string | null; moTelephone?: string | null;
    moeNom?: string | null; moeRepresentant?: string | null; moeEmail?: string | null; moeTelephone?: string | null;
    bets?: string | null;
    egNom?: string | null; egRepresentant?: string | null; egEmail?: string | null; egTelephone?: string | null;
    spsNom?: string | null; spsRepresentant?: string | null; spsTelephone?: string | null;
    opcNom?: string | null; opcRepresentant?: string | null; opcTelephone?: string | null;
    bordereauDiffusion?: string | null;
  }
) {
  "use server";
  await prisma.devis.update({ where: { id }, data });
  revalidatePath(`/devis/${id}`);
}

export async function uploadDevisPhoto(id: string, file: File): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) {
    return { error: "Le fichier doit être une image (JPEG, PNG…)." };
  }
  if (file.size > 8 * 1024 * 1024) {
    return { error: "Image trop volumineuse (8 Mo maximum)." };
  }

  const existing = await prisma.devis.findUnique({ where: { id }, select: { photoProjetUrl: true } });
  await supprimerFichierStocke(existing?.photoProjetUrl);

  const { url } = await stockerFichier(file, "devis-photos");
  await prisma.devis.update({ where: { id }, data: { photoProjetUrl: url } });

  revalidatePath(`/devis/${id}`);
  return { url };
}

export async function supprimerDevisPhoto(id: string): Promise<void> {
  const existing = await prisma.devis.findUnique({ where: { id }, select: { photoProjetUrl: true } });
  await supprimerFichierStocke(existing?.photoProjetUrl);
  await prisma.devis.update({ where: { id }, data: { photoProjetUrl: null } });
  revalidatePath(`/devis/${id}`);
}

// ---------------------------------------------------------------------------
// Conversion en facture
// ---------------------------------------------------------------------------

export async function convertirDevisEnFacture(devisId: string) {
  const devis = await prisma.devis.findUnique({
    where: { id: devisId },
    include: { lignes: true },
  });

  if (!devis) {
    redirect("/devis");
  }

  const factures = await prisma.facture.findMany({ select: { numero: true } });
  const numero = await prochainNumeroDocument("FAC", factures.map((f) => f.numero));

  const facture = await prisma.facture.create({
    data: {
      numero,
      chantierId: devis.chantierId,
      clientId: devis.clientId,
      devisId: devis.id,
      statut: "BROUILLON",
      type: "STANDARD",
      totalHT: devis.totalHT,
      totalTVA: devis.totalTVA,
      totalTTC: devis.totalTTC,
      lignes: {
        create: devis.lignes.map((ligne) => ({
          ordre: ligne.ordre,
          type: ligne.type,
          codeArticle: ligne.codeArticle,
          designation: ligne.designation,
          unite: ligne.unite,
          quantite: ligne.quantite,
          prixUnitaireHT: ligne.prixUnitaireHT,
          remise: ligne.remise,
          tauxTVA: ligne.tauxTVA,
          totalHT: ligne.totalHT,
        })),
      },
    },
  });

  revalidatePath(`/devis/${devisId}`);
  revalidatePath("/factures");
  revalidatePath(`/chantiers/${devis.chantierId}`);
  redirect(`/chantiers/${devis.chantierId}?facture=${facture.numero}`);
}

// ---------------------------------------------------------------------------
// Facturation par tranches (acompte / situation / solde)
// ---------------------------------------------------------------------------

export async function creerTranchesFacturation(
  devisId: string,
  tranches: Array<{ type: string; libelle: string; pourcentage: number }>,
): Promise<{ error?: string; chantierId?: string }> {
  if (tranches.length === 0) return { error: "Aucune tranche définie." };

  const total = tranches.reduce((s, t) => s + t.pourcentage, 0);
  if (total > 100.01) {
    return { error: `Total des pourcentages (${total.toFixed(1)} %) dépasse 100 %.` };
  }

  const devis = await prisma.devis.findUnique({ where: { id: devisId } });
  if (!devis) return { error: "Devis introuvable." };

  const numerosExistants = (await prisma.facture.findMany({ select: { numero: true } })).map(
    (f) => f.numero,
  );

  const tauxTVAMoyen =
    devis.totalHT > 0 ? Math.round((devis.totalTVA / devis.totalHT) * 100) : 20;

  for (const tranche of tranches) {
    const coeff = tranche.pourcentage / 100;
    const totalHT = Math.round(devis.totalHT * coeff * 100) / 100;
    const totalTVA = Math.round(devis.totalTVA * coeff * 100) / 100;
    const totalTTC = Math.round(devis.totalTTC * coeff * 100) / 100;

    const numero = await prochainNumeroDocument("FAC", numerosExistants);
    numerosExistants.push(numero);

    await prisma.facture.create({
      data: {
        numero,
        chantierId: devis.chantierId,
        clientId: devis.clientId,
        devisId: devis.id,
        statut: "BROUILLON",
        type: tranche.type,
        totalHT,
        totalTVA,
        totalTTC,
        lignes: {
          create: [
            {
              ordre: 1,
              type: "LIGNE",
              designation: tranche.libelle,
              unite: "Fft",
              quantite: 1,
              prixUnitaireHT: totalHT,
              remise: 0,
              tauxTVA: tauxTVAMoyen,
              totalHT,
            },
          ],
        },
      },
    });
  }

  revalidatePath(`/devis/${devisId}`);
  revalidatePath("/factures");
  revalidatePath(`/chantiers/${devis.chantierId}`);
  return { chantierId: devis.chantierId };
}

// ---------------------------------------------------------------------------
// Signature électronique
// ---------------------------------------------------------------------------

export async function genererLienSignature(devisId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await prisma.devis.update({
    where: { id: devisId },
    data: { signatureToken: token, statut: "ENVOYE" },
  });
  revalidatePath(`/devis/${devisId}`);
  return token;
}

export async function signerDevis(
  token: string,
  nomSignataire: string,
  imageSignature: string,
  adresseIp?: string,
  userAgent?: string,
): Promise<{ ok: boolean; error?: string }> {
  const devis = await prisma.devis.findUnique({
    where: { signatureToken: token },
    include: {
      client: { select: { prenom: true, nom: true, raisonSociale: true, email: true } },
      chantier: { select: { nom: true } },
      signature: { select: { id: true } },
    },
  });

  if (!devis) return { ok: false, error: "Lien invalide ou expiré." };
  if (devis.signature) return { ok: false, error: "Ce devis a déjà été signé." };

  await prisma.$transaction([
    prisma.signature.create({
      data: {
        devisId: devis.id,
        nomSignataire,
        imageSignature,
        adresseIp: adresseIp ?? null,
        userAgent: userAgent ?? null,
      },
    }),
    prisma.devis.update({
      where: { id: devis.id },
      data: { statut: "ACCEPTE" },
    }),
    prisma.devis.updateMany({
      where: {
        chantierId: devis.chantierId,
        id: { not: devis.id },
        statut: { notIn: ["ACCEPTE", "REFUSE"] },
      },
      data: { statut: "REFUSE" },
    }),
  ]);

  // Notification email à SDA
  const clientNom = devis.client?.raisonSociale ?? (`${devis.client?.prenom ?? ""} ${devis.client?.nom ?? ""}`.trim() || "Client");
  const lienDevis = `${APP_URL}/devis/${devis.id}`;
  const dateSignature = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date());
  await envoyerEmail({
    to: "contact@sda-renovation.com",
      cc: "christopher.siadoua@sda-renovation.com,facturation@sda-renovation.com",
    subject: `✅ Devis accepté — ${devis.numero} · ${clientNom}`,
    html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#1E2F6E;border-radius:10px 10px 0 0;padding:24px 32px">
    <p style="margin:0;font-size:22px;font-weight:bold;color:#fff">SDA Rénovation</p>
    <p style="margin:4px 0 0;font-size:13px;color:#93c5fd">Notification de signature</p>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none">
    <p style="margin:0 0 8px;font-size:24px">✅</p>
    <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#1E2F6E">Devis accepté et signé</p>
    <table style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #10b981;border-radius:6px;padding:20px 24px;margin-bottom:20px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:4px 24px">
        <p style="margin:4px 0;font-size:14px;color:#334155"><strong>Devis :</strong> ${devis.numero}</p>
        <p style="margin:4px 0;font-size:14px;color:#334155"><strong>Chantier :</strong> ${devis.chantier?.nom ?? "—"}</p>
        <p style="margin:4px 0;font-size:14px;color:#334155"><strong>Client :</strong> ${clientNom}</p>
        <p style="margin:4px 0;font-size:14px;color:#334155"><strong>Signataire :</strong> ${nomSignataire}</p>
        <p style="margin:4px 0;font-size:14px;color:#334155"><strong>Date :</strong> ${dateSignature}</p>
      </td></tr>
    </table>
    <div style="text-align:center;margin:24px 0">
      <a href="${lienDevis}" style="display:inline-block;background:#1E2F6E;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">Voir le devis signé →</a>
    </div>
  </td></tr>
  <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:16px 32px">
    <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">Notification automatique CRM SDA Rénovation</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  }).catch(() => { /* notification non bloquante */ });

  revalidatePath(`/devis/${devis.id}`);
  return { ok: true };
}

export async function refuserDevis(
  token: string,
  motif?: string,
): Promise<{ ok: boolean; error?: string }> {
  const devis = await prisma.devis.findUnique({
    where: { signatureToken: token },
    include: {
      client: { select: { prenom: true, nom: true, raisonSociale: true } },
      chantier: { select: { nom: true } },
      signature: { select: { id: true } },
    },
  });

  if (!devis) return { ok: false, error: "Lien invalide ou expiré." };
  if (devis.signature) return { ok: false, error: "Ce devis a déjà été traité." };
  if (devis.statut === "REFUSE") return { ok: false, error: "Ce devis est déjà refusé." };

  await prisma.devis.update({
    where: { id: devis.id },
    data: { statut: "REFUSE" },
  });

  // Notification email à SDA
  const clientNom = devis.client?.raisonSociale ?? (`${devis.client?.prenom ?? ""} ${devis.client?.nom ?? ""}`.trim() || "Client");
  const lienDevis = `${APP_URL}/devis/${devis.id}`;
  await envoyerEmail({
    to: "contact@sda-renovation.com",
      cc: "christopher.siadoua@sda-renovation.com,facturation@sda-renovation.com",
    subject: `❌ Devis refusé — ${devis.numero} · ${clientNom}`,
    html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px">
<tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%">
  <tr><td style="background:#1E2F6E;border-radius:10px 10px 0 0;padding:24px 32px">
    <p style="margin:0;font-size:22px;font-weight:bold;color:#fff">SDA Rénovation</p>
    <p style="margin:4px 0 0;font-size:13px;color:#93c5fd">Notification de refus</p>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;border:1px solid #e2e8f0;border-top:none">
    <p style="margin:0 0 8px;font-size:24px">❌</p>
    <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#dc2626">Devis refusé par le client</p>
    <table style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #ef4444;border-radius:6px;padding:20px 24px;margin-bottom:20px" cellpadding="0" cellspacing="0">
      <tr><td style="padding:4px 24px">
        <p style="margin:4px 0;font-size:14px;color:#334155"><strong>Devis :</strong> ${devis.numero}</p>
        <p style="margin:4px 0;font-size:14px;color:#334155"><strong>Chantier :</strong> ${devis.chantier?.nom ?? "—"}</p>
        <p style="margin:4px 0;font-size:14px;color:#334155"><strong>Client :</strong> ${clientNom}</p>
        ${motif ? `<p style="margin:8px 0 4px;font-size:14px;color:#334155"><strong>Motif :</strong> ${motif}</p>` : ""}
      </td></tr>
    </table>
    <div style="text-align:center;margin:24px 0">
      <a href="${lienDevis}" style="display:inline-block;background:#1E2F6E;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600">Voir le devis →</a>
    </div>
  </td></tr>
  <tr><td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:16px 32px">
    <p style="margin:0;font-size:11px;color:#94a3b8;text-align:center">Notification automatique CRM SDA Rénovation</p>
  </td></tr>
</table></td></tr></table>
</body></html>`,
  }).catch(() => { /* notification non bloquante */ });

  revalidatePath(`/devis/${devis.id}`);
  return { ok: true };
}

export async function accepterDevisParClient(
  token: string,
  nomSignataire: string,
  imageSignature?: string,
): Promise<{ ok: boolean; error?: string }> {
  const devis = await prisma.devis.findUnique({
    where: { signatureToken: token },
    select: { id: true, statut: true, chantierId: true, signature: { select: { id: true } } },
  });

  if (!devis) return { ok: false, error: "Lien invalide ou expiré." };
  if (devis.signature) return { ok: false, error: "Ce devis a déjà été traité." };

  await prisma.$transaction([
    prisma.signature.create({
      data: {
        devisId: devis.id,
        nomSignataire,
        imageSignature: imageSignature ?? "ACCEPTE_ELECTRONIQUEMENT",
        adresseIp: null,
        userAgent: null,
      },
    }),
    prisma.devis.update({
      where: { id: devis.id },
      data: { statut: "ACCEPTE" },
    }),
    prisma.devis.updateMany({
      where: {
        chantierId: devis.chantierId,
        id: { not: devis.id },
        statut: { notIn: ["ACCEPTE", "REFUSE"] },
      },
      data: { statut: "REFUSE" },
    }),
  ]);

  revalidatePath(`/devis/${devis.id}`);
  return { ok: true };
}

export async function refuserDevisParClient(
  token: string,
): Promise<{ ok: boolean; error?: string }> {
  const devis = await prisma.devis.findUnique({
    where: { signatureToken: token },
    select: { id: true, statut: true, chantierId: true, signature: { select: { id: true } } },
  });

  if (!devis) return { ok: false, error: "Lien invalide ou expiré." };
  if (devis.signature) return { ok: false, error: "Ce devis a déjà été accepté et ne peut plus être refusé." };

  await prisma.$transaction([
    prisma.devis.update({
      where: { id: devis.id },
      data: { statut: "REFUSE" },
    }),
    prisma.devis.updateMany({
      where: {
        chantierId: devis.chantierId,
        id: { not: devis.id },
        statut: { notIn: ["ACCEPTE", "REFUSE"] },
      },
      data: { statut: "REFUSE" },
    }),
  ]);

  revalidatePath(`/devis/${devis.id}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Synthèse analytique IA des variantes (Claude API)
// ---------------------------------------------------------------------------

export async function genererSyntheseVariantesIA(
  chantierId: string,
): Promise<{ synthese: string } | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans votre fichier .env." };
  }

  const [chantier, variantes] = await Promise.all([
    prisma.chantier.findUnique({
      where: { id: chantierId },
      include: { client: true },
    }),
    prisma.devis.findMany({
      where: { chantierId, type: "INITIAL" },
      include: { lignes: { orderBy: { ordre: "asc" } } },
      orderBy: { totalTTC: "asc" },
    }),
  ]);

  if (!chantier || variantes.length < 2) {
    return { error: "Il faut au moins 2 variantes pour générer une synthèse comparative." };
  }

  const stripHtml = (s: string | null) => (s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  const clientCivilite = chantier.client?.civilite ?? "";
  const clientNom = `${clientCivilite} ${chantier.client?.nom ?? ""}`.trim() || "Madame, Monsieur";
  const clientPrenom = chantier.client?.prenom ?? null;

  const offresDesc = variantes.map((v, i) => {
    const chapitres = v.lignes
      .filter((l) => l.type === "CHAPITRE")
      .map((l) => stripHtml(l.designation))
      .filter(Boolean)
      .slice(0, 8);

    const lignesMateriaux = v.lignes
      .filter((l) => l.type === "LIGNE" && l.designation)
      .slice(0, 8)
      .map((l) => stripHtml(l.designation?.split("\n")[0] ?? ""))
      .filter(Boolean);

    return [
      `--- OFFRE ${i + 1} : ${stripHtml(v.objet) || v.numero} ---`,
      `Numéro de devis : ${v.numero}`,
      `Total HT : ${v.totalHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`,
      `Total TTC : ${v.totalTTC.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`,
      `Délai d'exécution : ${v.delaiExecution ?? "non précisé"}`,
      `Modalités de règlement : ${v.modaliteReglement ?? "non précisées"}`,
      chapitres.length > 0 ? `Chapitres : ${chapitres.join(" | ")}` : null,
      lignesMateriaux.length > 0 ? `Prestations principales : ${lignesMateriaux.join(" | ")}` : null,
    ].filter(Boolean).join("\n");
  });

  const prompt = `Tu es un expert consultant en construction et rénovation pour l'entreprise SDA Rénovation. Ta mission est de rédiger une synthèse analytique comparative professionnelle à l'attention du client, pour l'aider à choisir entre plusieurs offres.

CONTEXTE DU PROJET :
Chantier : ${chantier.nom}
Client : ${clientPrenom ? `${clientPrenom} ${chantier.client?.nom ?? ""}` : clientNom}
Nombre d'offres : ${variantes.length}

DÉTAIL DES OFFRES :
${offresDesc.join("\n\n")}

INSTRUCTIONS DE RÉDACTION :
1. Rédige un email professionnel directement adressé au client (tutoiement exclu, vouvoiement).
2. Commence par "Bonjour ${clientPrenom ?? clientNom}," puis une introduction chaleureuse rappelant le projet.
3. Pour chaque offre, analyse-la sur ces 5 axes (une section par offre) :
   - Aspect Technique : qualité des matériaux, performance, durabilité, conformité aux normes
   - Aspect Budgétaire : positionnement prix, rapport qualité-prix, transparence des coûts
   - Aspect Esthétique : rendu visuel attendu, finitions, style et personnalisation possible
   - Produits & Délais : disponibilité des matériaux, sur-mesure éventuel, délai de réalisation
   - Adéquation à vos attentes : niveau de prestation proposé, points forts selon les besoins du projet
4. Conclus avec une recommandation nuancée qui aide le client à trancher sans lui imposer un choix.
5. Termine par "Nous restons à votre disposition pour tout échange complémentaire." et une formule de politesse.
6. Langue : français uniquement. Ton : expert, bienveillant, professionnel, concis.
7. Format : texte brut uniquement (PAS de markdown, PAS d'astérisques, PAS de tirets de liste), des sections bien séparées par des sauts de ligne.
8. Ne mentionne pas les numéros de devis dans le corps — utilise uniquement le nom des offres (ex. "Offre Économique", "Offre Premium").`;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });
    const text = (response.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined)?.text ?? "";
    if (!text) return { error: "L'IA n'a pas retourné de contenu. Réessayez." };
    return { synthese: text };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return { error: `Erreur IA : ${msg}` };
  }
}
