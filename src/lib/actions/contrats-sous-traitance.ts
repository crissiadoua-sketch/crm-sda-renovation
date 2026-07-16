"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { prochainNumeroDocument } from "@/lib/codification";

async function nextNumeroContrat(): Promise<string> {
  const contrats = await prisma.contratSousTraitance.findMany({ select: { numero: true } });
  return prochainNumeroDocument("CST", contrats.map((c) => c.numero));
}

export async function creerContrat(formData: FormData): Promise<void> {
  const sousTraitantId = formData.get("sousTraitantId") as string;
  const chantierId     = formData.get("chantierId") as string;
  const numero         = await nextNumeroContrat();
  const signatureToken = randomBytes(32).toString("hex");

  const contrat = await prisma.contratSousTraitance.create({
    data: { numero, sousTraitantId, chantierId, signatureToken },
  });

  revalidatePath("/contrats-sous-traitance");
  redirect(`/contrats-sous-traitance/${contrat.id}`);
}

export async function mettreAJourContrat(id: string, formData: FormData): Promise<void> {
  const objet             = (formData.get("objet") as string) || null;
  const lot               = (formData.get("lot") as string) || null;
  const montantHT         = formData.get("montantHT") ? parseFloat(formData.get("montantHT") as string) : null;
  const tauxTVA           = formData.get("tauxTVA") ? parseFloat(formData.get("tauxTVA") as string) : null;
  const retenueGarantie   = formData.get("retenueGarantie") ? parseFloat(formData.get("retenueGarantie") as string) : null;
  const delaiExecution    = (formData.get("delaiExecution") as string) || null;
  const modaliteReglement = (formData.get("modaliteReglement") as string) || null;
  const penalitesRetard   = (formData.get("penalitesRetard") as string) || null;
  const assuranceRC       = (formData.get("assuranceRC") as string) || null;
  const notes             = (formData.get("notes") as string) || null;
  const clausesPersonnalisees = (formData.get("clausesPersonnalisees") as string) || null;
  const statut            = formData.get("statut") as string;
  const dateDebutStr      = (formData.get("dateDebut") as string) || null;
  const dateFinStr        = (formData.get("dateFin") as string) || null;

  await prisma.contratSousTraitance.update({
    where: { id },
    data: {
      objet, lot, montantHT, tauxTVA, retenueGarantie,
      delaiExecution, modaliteReglement, penalitesRetard, assuranceRC,
      notes, clausesPersonnalisees, statut,
      dateDebut: dateDebutStr ? new Date(dateDebutStr) : null,
      dateFin:   dateFinStr   ? new Date(dateFinStr)   : null,
    },
  });

  revalidatePath("/contrats-sous-traitance");
  revalidatePath(`/contrats-sous-traitance/${id}`);
}

export async function creerContratDepuisOrdreMission(ordreMissionId: string): Promise<void> {
  const om = await prisma.ordreMission.findUnique({
    where: { id: ordreMissionId },
    include: { sousTraitant: true, chantier: true },
  });
  if (!om || !om.chantierId) return;

  // Vérifier qu'un contrat n'existe pas déjà pour ce ST sur ce chantier
  if (!om.sousTraitantId) return; // OM intérimaire — pas de contrat ST
  const existing = await prisma.contratSousTraitance.findFirst({
    where: { sousTraitantId: om.sousTraitantId, chantierId: om.chantierId ?? undefined },
  });
  if (existing) {
    redirect(`/contrats-sous-traitance/${existing.id}`);
    return;
  }

  const numero = await nextNumeroContrat();
  const signatureToken = randomBytes(32).toString("hex");

  const contrat = await prisma.contratSousTraitance.create({
    data: {
      numero,
      sousTraitantId: om.sousTraitantId,
      chantierId:     om.chantierId ?? undefined,
      signatureToken,
      objet:          om.titre,
      lot:            om.sousTraitant?.specialite ?? null,
      dateDebut:      om.dateDebut,
      dateFin:        om.dateFin ?? null,
    },
  });

  revalidatePath("/contrats-sous-traitance");
  redirect(`/contrats-sous-traitance/${contrat.id}`);
}

export async function supprimerContrat(id: string): Promise<void> {
  const _doc = await prisma.contratSousTraitance.findUnique({ where: { id }, select: { statut: true } });
  if (!_doc || _doc.statut !== "BROUILLON") return;
  await prisma.contratSousTraitance.delete({ where: { id } });
  revalidatePath("/contrats-sous-traitance");
  redirect("/contrats-sous-traitance");
}

// ---------------------------------------------------------------------------
// Signature électronique publique (sous-traitant, sans compte)
// ---------------------------------------------------------------------------

export async function signerContrat(
  token: string,
  signataireNom: string,
  signatureImage: string,
  signatureIp?: string,
): Promise<{ ok: boolean; error?: string }> {
  const contrat = await prisma.contratSousTraitance.findUnique({
    where: { signatureToken: token },
    include: {
      sousTraitant: { select: { nom: true, email: true } },
      chantier:     { select: { nom: true } },
    },
  });

  if (!contrat) return { ok: false, error: "Lien invalide ou expiré." };
  if (contrat.dateSignature) return { ok: false, error: "Ce contrat a déjà été signé." };

  const dateSignature = new Date();

  await prisma.contratSousTraitance.update({
    where: { id: contrat.id },
    data: {
      statut: "SIGNE",
      signataireNom,
      signatureImage,
      dateSignature,
      signatureIp: signatureIp ?? null,
    },
  });

  // Notification email à SDA
  try {
    const { envoyerEmail } = await import("@/lib/email");
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";
    const dateStr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(dateSignature);
    await envoyerEmail({
      from: "SDA Rénovation <contact@sda-renovation.com>",
      to: "contact@sda-renovation.com",
      subject: `✅ Contrat ${contrat.numero} signé — ${contrat.sousTraitant.nom}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">✅ Contrat signé électroniquement</p>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${contrat.numero}</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 16px;font-size:14px;color:#334155">Le contrat de sous-traitance <strong>${contrat.numero}</strong> vient d'être signé.</p>
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <tr><td style="padding:6px 0;color:#64748b;width:40%">Signataire</td><td style="padding:6px 0;font-weight:600;color:#1e293b">${signataireNom}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Sous-traitant</td><td style="padding:6px 0;color:#374151">${contrat.sousTraitant.nom}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Chantier</td><td style="padding:6px 0;color:#374151">${contrat.chantier.nom}</td></tr>
              <tr><td style="padding:6px 0;color:#64748b">Date</td><td style="padding:6px 0;color:#374151">${dateStr}</td></tr>
              ${signatureIp ? `<tr><td style="padding:6px 0;color:#64748b">IP</td><td style="padding:6px 0;font-family:monospace;color:#374151">${signatureIp}</td></tr>` : ""}
            </table>
            <div style="margin-top:20px;text-align:center">
              <a href="${APP_URL}/contrats-sous-traitance/${contrat.id}" style="display:inline-block;background:#1E2F6E;color:#fff;text-decoration:none;padding:10px 28px;border-radius:6px;font-size:14px;font-weight:600">Voir dans le CRM</a>
            </div>
          </div>
        </div>`,
      text: `Contrat ${contrat.numero} signé par ${signataireNom} (${contrat.sousTraitant.nom}) - Chantier : ${contrat.chantier.nom} - Le ${dateStr}`,
    });
  } catch { /* notification non bloquante */ }

  revalidatePath(`/contrats-sous-traitance/${contrat.id}`);
  return { ok: true };
}
