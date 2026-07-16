"use server";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prochainNumeroDocument } from "@/lib/codification";

// ── PAQ ──────────────────────────────────────────────────────────────────────
export async function creerPAQ(formData: FormData) {
  const items = await prisma.planAssuranceQualite.findMany({ select: { numero: true } });
  const numero = await prochainNumeroDocument("PAQ", items.map((i) => i.numero));
  const paq = await prisma.planAssuranceQualite.create({
    data: {
      numero,
      chantierId: (formData.get("chantierId") as string) || null,
      clientId: (formData.get("clientId") as string) || null,
      objetMarche: (formData.get("objetMarche") as string) || null,
      redacteurNom: (formData.get("redacteurNom") as string) || null,
    },
  });
  redirect(`/qualite/paq/${paq.id}`);
}

export async function sauvegarderPAQ(id: string, data: {
  statut: string; version: string; chantierId?: string | null; clientId?: string | null;
  dateEmission?: string | null; dateRevision?: string | null; redacteurNom?: string | null;
  approbateurNom?: string | null; objetMarche?: string | null; delaiExecution?: string | null;
  listeIntervenants?: string | null; proceduresQualite?: string | null;
  planControle?: string | null; enregistrements?: string | null; notes?: string | null;
}) {
  const { dateEmission, dateRevision, ...rest } = data;
  await prisma.planAssuranceQualite.update({
    where: { id },
    data: {
      ...rest,
      dateEmission: dateEmission ? new Date(dateEmission) : null,
      dateRevision: dateRevision ? new Date(dateRevision) : null,
    },
  });
  revalidatePath(`/qualite/paq/${id}`);
  revalidatePath("/qualite/paq");
}

export async function supprimerPAQ(id: string) {
  const _doc = await prisma.planAssuranceQualite.findUnique({ where: { id }, select: { statut: true } });
  if (!_doc || _doc.statut !== "BROUILLON") return;
  await prisma.planAssuranceQualite.delete({ where: { id } });
  revalidatePath("/qualite/paq");
  redirect("/qualite/paq");
}

// ── Fiche Autocontrôle ────────────────────────────────────────────────────────
export async function creerFicheAutocontrole(formData: FormData) {
  const items = await prisma.ficheAutocontrole.findMany({ select: { numero: true } });
  const numero = await prochainNumeroDocument("FACO", items.map((i) => i.numero));
  const fac = await prisma.ficheAutocontrole.create({
    data: {
      numero,
      chantierId: (formData.get("chantierId") as string) || null,
      clientId: (formData.get("clientId") as string) || null,
      lot: (formData.get("lot") as string) || null,
      ouvrage: (formData.get("ouvrage") as string) || null,
      controleurNom: (formData.get("controleurNom") as string) || null,
    },
  });
  redirect(`/qualite/autocontrole/${fac.id}`);
}

export async function sauvegarderFicheAutocontrole(id: string, data: {
  statut: string; chantierId?: string | null; clientId?: string | null; paqId?: string | null;
  lot?: string | null; ouvrage?: string | null; localisation?: string | null;
  dateControle?: string | null; controleurNom?: string | null; entreprise?: string | null;
  observations?: string | null; notes?: string | null;
  points: { ordre: number; critere: string; exigence?: string | null; resultat: string; observations?: string | null }[];
}) {
  const { points, dateControle, ...rest } = data;
  await prisma.$transaction([
    prisma.ficheAutocontrolePoint.deleteMany({ where: { ficheId: id } }),
    prisma.ficheAutocontrole.update({
      where: { id },
      data: { ...rest, dateControle: dateControle ? new Date(dateControle) : null },
    }),
  ]);
  if (points.length > 0) {
    await prisma.ficheAutocontrolePoint.createMany({
      data: points.map((p) => ({ ...p, ficheId: id })),
    });
  }
  revalidatePath(`/qualite/autocontrole/${id}`);
  revalidatePath("/qualite/autocontrole");
}

export async function supprimerFicheAutocontrole(id: string) {
  await prisma.ficheAutocontrole.delete({ where: { id } });
  revalidatePath("/qualite/autocontrole");
  redirect("/qualite/autocontrole");
}

// ── DAACT ─────────────────────────────────────────────────────────────────────
export async function creerDAACT(formData: FormData) {
  const items = await prisma.dAACT.findMany({ select: { numero: true } });
  const numero = await prochainNumeroDocument("DAT", items.map((i) => i.numero));
  const daact = await prisma.dAACT.create({
    data: {
      numero,
      chantierId: (formData.get("chantierId") as string) || null,
      clientId: (formData.get("clientId") as string) || null,
      natureTravaux: (formData.get("natureTravaux") as string) || null,
      nomDeclarant: (formData.get("nomDeclarant") as string) || null,
    },
  });
  redirect(`/qualite/daact/${daact.id}`);
}

export async function sauvegarderDAACT(id: string, data: {
  statut: string; chantierId?: string | null; clientId?: string | null;
  adresseChantier?: string | null; dateAchevement?: string | null; dateDepot?: string | null;
  natureTravaux?: string | null; nomDeclarant?: string | null; qualiteDeclarant?: string | null;
  conformePC: boolean; reservesMO?: string | null; dateReponse?: string | null; notes?: string | null;
}) {
  const { dateAchevement, dateDepot, dateReponse, ...rest } = data;
  await prisma.dAACT.update({
    where: { id },
    data: {
      ...rest,
      dateAchevement: dateAchevement ? new Date(dateAchevement) : null,
      dateDepot: dateDepot ? new Date(dateDepot) : null,
      dateReponse: dateReponse ? new Date(dateReponse) : null,
    },
  });
  revalidatePath(`/qualite/daact/${id}`);
  revalidatePath("/qualite/daact");
}

export async function supprimerDAACT(id: string) {
  const _doc = await prisma.dAACT.findUnique({ where: { id }, select: { statut: true } });
  if (!_doc || _doc.statut !== "BROUILLON") return;
  await prisma.dAACT.delete({ where: { id } });
  revalidatePath("/qualite/daact");
  redirect("/qualite/daact");
}
