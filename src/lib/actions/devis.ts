"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { prochainNumeroDocument } from "@/lib/codification";
import { randomBytes } from "crypto";
import { stockerFichier, supprimerFichierStocke } from "@/lib/blob-storage";

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
    select: { id: true, statut: true, signature: { select: { id: true } } },
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
  ]);

  revalidatePath(`/devis/${devis.id}`);
  return { ok: true };
}
