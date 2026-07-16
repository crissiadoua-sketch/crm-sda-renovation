"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prochainNumeroDocument } from "@/lib/codification";
import { envoyerEmail } from "@/lib/email";
import crypto from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://crm.sda-renovation.com";

async function genNumeroPRC() {
  const items = await prisma.pVReunionChantier.findMany({ select: { numero: true } });
  return prochainNumeroDocument("PRC", items.map((i) => i.numero));
}

export async function creerPVReunionChantier(formData: FormData) {
  const pv = await prisma.pVReunionChantier.create({
    data: {
      numero:      await genNumeroPRC(),
      chantierId:  (formData.get("chantierId")  as string) || null,
      clientId:    (formData.get("clientId")    as string) || null,
      typeReunion: (formData.get("typeReunion") as string) || "COORDINATION",
    },
  });
  revalidatePath("/exploitation/pv-reunion");
  redirect(`/exploitation/pv-reunion/${pv.id}`);
}

export type PVRCData = {
  statut: string;
  chantierId?: string | null;
  clientId?: string | null;
  dateReunion?: string | null;
  lieuReunion?: string | null;
  heureDebut?: string | null;
  heureFin?: string | null;
  typeReunion?: string;
  animateur?: string | null;
  redacteur?: string | null;
  prochaineDateReunion?: string | null;
  prochaineLieu?: string | null;
  notes?: string | null;
  participants: { nom: string; societe?: string | null; fonction?: string | null; present?: boolean; email?: string | null }[];
  points: { ordre: number; titre: string; contenu?: string | null }[];
  actions: { ordre: number; description: string; responsable?: string | null; echeance?: string | null; statut?: string }[];
};

export async function sauvegarderPVReunionChantier(id: string, data: PVRCData) {
  // Récupérer les tokens existants pour ne pas les écraser au save
  const existing = await prisma.pVReunionChantierParticipant.findMany({
    where: { pvId: id },
    select: { nom: true, shareToken: true, tokenExpiry: true, signatureImage: true, dateSigne: true },
  });
  const tokenMap = new Map(existing.map(p => [p.nom, p]));

  await prisma.$transaction([
    prisma.pVReunionChantierParticipant.deleteMany({ where: { pvId: id } }),
    prisma.pVReunionChantierPoint.deleteMany({ where: { pvId: id } }),
    prisma.pVReunionChantierAction.deleteMany({ where: { pvId: id } }),
    prisma.pVReunionChantier.update({
      where: { id },
      data: {
        statut: data.statut,
        chantierId: data.chantierId ?? null,
        clientId: data.clientId ?? null,
        dateReunion: data.dateReunion ? new Date(data.dateReunion) : null,
        lieuReunion: data.lieuReunion ?? null,
        heureDebut: data.heureDebut ?? null,
        heureFin: data.heureFin ?? null,
        typeReunion: data.typeReunion,
        animateur: data.animateur ?? null,
        redacteur: data.redacteur ?? null,
        prochaineDateReunion: data.prochaineDateReunion ? new Date(data.prochaineDateReunion) : null,
        prochaineLieu: data.prochaineLieu ?? null,
        notes: data.notes ?? null,
      },
    }),
    ...data.participants.map(p => {
      const prev = tokenMap.get(p.nom);
      return prisma.pVReunionChantierParticipant.create({
        data: {
          pvId: id,
          nom: p.nom,
          societe: p.societe ?? null,
          fonction: p.fonction ?? null,
          present: p.present ?? false,
          email: p.email ?? null,
          shareToken: prev?.shareToken ?? null,
          tokenExpiry: prev?.tokenExpiry ?? null,
          signatureImage: prev?.signatureImage ?? null,
          dateSigne: prev?.dateSigne ?? null,
        },
      });
    }),
    ...data.points.map(pt =>
      prisma.pVReunionChantierPoint.create({ data: { pvId: id, ...pt } })
    ),
    ...data.actions.map(a =>
      prisma.pVReunionChantierAction.create({
        data: {
          pvId: id,
          ordre: a.ordre,
          description: a.description,
          responsable: a.responsable ?? null,
          echeance: a.echeance ? new Date(a.echeance) : null,
          statut: a.statut ?? "OUVERTE",
        },
      })
    ),
  ]);
  revalidatePath(`/exploitation/pv-reunion/${id}`);
}

export async function supprimerPVReunionChantier(id: string) {
  const _doc = await prisma.pVReunionChantier.findUnique({ where: { id }, select: { statut: true } });
  if (!_doc || _doc.statut !== "BROUILLON") return;
  await prisma.pVReunionChantier.delete({ where: { id } });
  revalidatePath("/exploitation/pv-reunion");
  redirect("/exploitation/pv-reunion");
}

// ── Workflow Signature ───────────────────────────────────────────────────────

export async function envoyerSignaturePRCParEmail(pvId: string, participantId: string): Promise<{ ok: boolean; error?: string }> {
  const pv = await prisma.pVReunionChantier.findUnique({
    where: { id: pvId },
    include: {
      chantier: { select: { nom: true } },
      participants: { where: { id: participantId } },
    },
  });
  if (!pv) return { ok: false, error: "PV introuvable." };

  const participant = pv.participants[0];
  if (!participant) return { ok: false, error: "Participant introuvable." };
  if (!participant.email) return { ok: false, error: "Aucun email renseigné pour ce participant." };

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

  await prisma.pVReunionChantierParticipant.update({
    where: { id: participantId },
    data: { shareToken: token, tokenExpiry: expiry },
  });

  const lien = `${APP_URL}/prc-public/${token}`;
  const dateReunion = pv.dateReunion
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(pv.dateReunion))
    : "—";

  const result = await envoyerEmail({
    to: participant.email,
    subject: `PV de Réunion de Chantier ${pv.numero} — Signature requise`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#fff;font-size:20px;font-weight:bold">PV de Réunion — Signature requise</p>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${pv.numero}</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p style="margin:0 0 12px;color:#334155">Bonjour ${participant.nom},</p>
          <p style="margin:0 0 12px;color:#334155">
            SDA Rénovation vous invite à consulter et signer le procès-verbal de réunion de chantier :
          </p>
          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 20px">
            <p style="margin:0 0 6px;font-size:13px;color:#64748b">Référence</p>
            <p style="margin:0;font-size:16px;font-weight:bold;color:#1E2F6E">${pv.numero}</p>
            ${pv.chantier ? `<p style="margin:4px 0 0;font-size:13px;color:#334155">Chantier : ${pv.chantier.nom}</p>` : ""}
            <p style="margin:4px 0 0;font-size:13px;color:#334155">Date de réunion : ${dateReunion}</p>
          </div>
          <a href="${lien}" style="display:inline-block;background:#1E2F6E;color:#fff;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
            ✍️ Consulter et signer le PV
          </a>
          <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">
            Après votre signature, SDA Rénovation signera à son tour et vous pourrez télécharger le document signé.
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:#94a3b8">
            Ce lien est personnel et sécurisé. Ne le partagez pas.
          </p>
        </div>
        <div style="padding:12px 0;text-align:center">
          <p style="margin:0;font-size:11px;color:#94a3b8">SDA Rénovation · contact@sda-renovation.com</p>
        </div>
      </div>
    `,
  });

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/exploitation/pv-reunion/${pvId}`);
  return { ok: true };
}

export async function signerPRC(token: string, signataireNom: string, signatureImage: string): Promise<{ ok: boolean; error?: string }> {
  const participant = await prisma.pVReunionChantierParticipant.findUnique({
    where: { shareToken: token },
    include: { pv: { include: { chantier: { select: { nom: true } } } } },
  });
  if (!participant) return { ok: false, error: "Lien invalide." };
  if (participant.tokenExpiry && participant.tokenExpiry < new Date()) return { ok: false, error: "Ce lien a expiré." };
  if (participant.dateSigne) return { ok: false, error: "Vous avez déjà signé ce document." };

  await prisma.pVReunionChantierParticipant.update({
    where: { id: participant.id },
    data: {
      signatureImage,
      dateSigne: new Date(),
      nom: signataireNom || participant.nom,
    },
  });

  // Notification SDA
  const pv = participant.pv;
  const lienCRM = `${APP_URL}/exploitation/pv-reunion/${pv.id}`;
  const dateStr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(new Date());

  await envoyerEmail({
    to: "contact@sda-renovation.com",
    subject: `✍️ PRC ${pv.numero} — Signature reçue de ${signataireNom || participant.nom}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">✍️ Signature reçue</p>
          <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${pv.numero}</p>
        </div>
        <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
          <p style="margin:0 0 12px;color:#334155">
            <strong>${signataireNom || participant.nom}</strong>${participant.societe ? ` (${participant.societe})` : ""}
            a signé le PV de réunion le ${dateStr}.
          </p>
          ${pv.chantier ? `<p style="margin:0 0 12px;color:#334155">Chantier : ${pv.chantier.nom}</p>` : ""}
          <a href="${lienCRM}" style="display:inline-block;background:#1E2F6E;color:#fff;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
            Apposer ma contre-signature →
          </a>
        </div>
      </div>
    `,
  }).catch(() => {});

  revalidatePath(`/exploitation/pv-reunion/${pv.id}`);
  return { ok: true };
}

export async function signerPRCSDA(pvId: string, signataireNom: string, signatureImage: string): Promise<{ ok: boolean; error?: string }> {
  const pv = await prisma.pVReunionChantier.findUnique({
    where: { id: pvId },
    include: {
      chantier: { select: { nom: true } },
      participants: { select: { nom: true, email: true, shareToken: true, signatureImage: true, dateSigne: true } },
    },
  });
  if (!pv) return { ok: false, error: "PV introuvable." };

  await prisma.pVReunionChantier.update({
    where: { id: pvId },
    data: {
      signatureSDA: signatureImage,
      dateSigSDA: new Date(),
      signataireNomSDA: signataireNom,
      statut: "DIFFUSE",
    },
  });

  // Notifier les participants qui ont signé — ils peuvent maintenant télécharger
  const dateStr = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date());
  for (const p of pv.participants) {
    if (!p.email || !p.shareToken || !p.dateSigne) continue;
    const dlUrl = `${APP_URL}/api/pv-reunion-chantier/${pvId}/dl?token=${p.shareToken}`;
    await envoyerEmail({
      to: p.email,
      subject: `PV de Réunion ${pv.numero} — Document signé disponible`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1E2F6E;padding:20px 24px;border-radius:8px 8px 0 0">
            <p style="margin:0;color:#fff;font-size:18px;font-weight:bold">✅ PV signé par les deux parties</p>
            <p style="margin:4px 0 0;color:#93c5fd;font-size:13px">${pv.numero}</p>
          </div>
          <div style="background:#fff;padding:24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
            <p style="margin:0 0 12px;color:#334155">Bonjour ${p.nom},</p>
            <p style="margin:0 0 16px;color:#334155">
              SDA Rénovation a apposé sa signature le ${dateStr}. Le procès-verbal de réunion est maintenant définitivement signé.
              Vous pouvez télécharger le document PDF signé :
            </p>
            <a href="${dlUrl}" style="display:inline-block;background:#16a34a;color:#fff;font-weight:bold;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px">
              📄 Télécharger le PV signé (PDF)
            </a>
            <p style="margin:20px 0 0;font-size:11px;color:#94a3b8">SDA Rénovation · contact@sda-renovation.com</p>
          </div>
        </div>
      `,
    }).catch(() => {});
  }

  revalidatePath(`/exploitation/pv-reunion/${pvId}`);
  return { ok: true };
}
