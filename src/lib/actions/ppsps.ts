"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  return value.trim() !== "" ? value.trim() : null;
}

function emptyToDate(value: FormDataEntryValue | null): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function emptyToInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const n = parseInt(value, 10);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Default risques for APPEL_OFFRE
// ---------------------------------------------------------------------------

const DEFAULT_RISQUES_APPEL_OFFRE = [
  {
    phase: "Installation de chantier",
    description: "Chutes, écrasements, électrisation",
    mesures: "Balisage du chantier, EPI obligatoire, consignation électrique",
    priorite: "ELEVE",
    ordre: 0,
  },
  {
    phase: "Terrassement",
    description: "Effondrement de fouilles, heurts d'engins",
    mesures: "Blindage des fouilles, zones d'exclusion autour des engins, signalisation",
    priorite: "ELEVE",
    ordre: 1,
  },
  {
    phase: "Travaux en hauteur",
    description: "Chutes de plain-pied et de hauteur",
    mesures: "Garde-corps, harnais antichute, filets de sécurité",
    priorite: "CRITIQUE",
    ordre: 2,
  },
  {
    phase: "Gros œuvre / Maçonnerie",
    description: "Chutes de matériaux, poussières",
    mesures: "Filets de protection, masques anti-poussières FFP2, casques obligatoires",
    priorite: "MOYEN",
    ordre: 3,
  },
  {
    phase: "Travaux électriques",
    description: "Électrisation, incendie",
    mesures: "Habilitation électrique, VAT, EPC",
    priorite: "ELEVE",
    ordre: 4,
  },
  {
    phase: "Finitions / Peinture",
    description: "Exposition aux solvants, chutes",
    mesures: "Ventilation renforcée, EPI (masque vapeurs organiques), échafaudages homologués",
    priorite: "MOYEN",
    ordre: 5,
  },
];

// ---------------------------------------------------------------------------
// createPPSPS
// ---------------------------------------------------------------------------

export async function createPPSPS(formData: FormData): Promise<void> {
  const modele = (formData.get("modele") as string) || "PERSONNALISE";
  const titre = (formData.get("titre") as string)?.trim();
  const chantierId = formData.get("chantierId") as string;

  if (!titre || !chantierId) {
    throw new Error("Titre et chantier sont requis.");
  }

  const ppsps = await prisma.pPSPS.create({
    data: {
      modele,
      titre,
      reference: emptyToNull(formData.get("reference")),
      nomOperation: emptyToNull(formData.get("nomOperation")),
      adresseChantier: emptyToNull(formData.get("adresseChantier")),
      maitreOuvrage: emptyToNull(formData.get("maitreOuvrage")),
      maitreOeuvre: emptyToNull(formData.get("maitreOeuvre")),
      coordonateurSPS: emptyToNull(formData.get("coordonateurSPS")),
      dateDebutChantier: emptyToDate(formData.get("dateDebutChantier")),
      dateFinChantier: emptyToDate(formData.get("dateFinChantier")),
      effectifPrevu: emptyToInt(formData.get("effectifPrevu")),
      chantierId,
      devisId: emptyToNull(formData.get("devisId")),
      assuranceDecennale: emptyToNull(formData.get("assuranceDecennale")),
      assuranceRC: emptyToNull(formData.get("assuranceRC")),
      // Auto-populate for APPEL_OFFRE
      ...(modele === "APPEL_OFFRE"
        ? {
            risques: {
              create: DEFAULT_RISQUES_APPEL_OFFRE,
            },
            secours: {
              create: [
                { type: "SAMU", telephone: "15" },
                { type: "POMPIERS", telephone: "18" },
                { type: "MEDECIN", telephone: "15" },
              ],
            },
          }
        : {}),
    },
  });

  redirect(`/ppsps/${ppsps.id}`);
}

// ---------------------------------------------------------------------------
// updatePPSPSInfo
// ---------------------------------------------------------------------------

export async function updatePPSPSInfo(id: string, formData: FormData): Promise<void> {
  const contenuLibreRaw = formData.get("contenuLibre");

  await prisma.pPSPS.update({
    where: { id },
    data: {
      modele: (formData.get("modele") as string) || "PERSONNALISE",
      statut: (formData.get("statut") as string) || "BROUILLON",
      titre: (formData.get("titre") as string)?.trim() || "",
      reference: emptyToNull(formData.get("reference")),
      nomOperation: emptyToNull(formData.get("nomOperation")),
      adresseChantier: emptyToNull(formData.get("adresseChantier")),
      maitreOuvrage: emptyToNull(formData.get("maitreOuvrage")),
      maitreOeuvre: emptyToNull(formData.get("maitreOeuvre")),
      coordonateurSPS: emptyToNull(formData.get("coordonateurSPS")),
      dateDebutChantier: emptyToDate(formData.get("dateDebutChantier")),
      dateFinChantier: emptyToDate(formData.get("dateFinChantier")),
      effectifPrevu: emptyToInt(formData.get("effectifPrevu")),
      chantierId: (formData.get("chantierId") as string) || "",
      devisId: emptyToNull(formData.get("devisId")),
      assuranceDecennale: emptyToNull(formData.get("assuranceDecennale")),
      assuranceRC: emptyToNull(formData.get("assuranceRC")),
      ...(typeof contenuLibreRaw === "string" && contenuLibreRaw.trim() !== ""
        ? { contenuLibre: contenuLibreRaw }
        : {}),
    },
  });

  revalidatePath(`/ppsps/${id}`);
}

// ---------------------------------------------------------------------------
// deletePPSPS
// ---------------------------------------------------------------------------

export async function deletePPSPS(id: string): Promise<void> {
  await prisma.pPSPS.delete({ where: { id } });
  revalidatePath("/ppsps");
  redirect("/ppsps");
}

// ---------------------------------------------------------------------------
// Risques
// ---------------------------------------------------------------------------

export async function addRisque(ppspsId: string, formData: FormData): Promise<void> {
  const epiRaw = formData.get("epi") as string | null;
  let epiJson: string | null = null;
  if (epiRaw && epiRaw.trim() !== "") {
    const epiArray = epiRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    epiJson = JSON.stringify(epiArray);
  }

  // Find current max ordre
  const existing = await prisma.pPSPSRisque.findMany({
    where: { ppspsId },
    select: { ordre: true },
  });
  const maxOrdre = existing.length > 0 ? Math.max(...existing.map((r) => r.ordre)) : -1;

  await prisma.pPSPSRisque.create({
    data: {
      ppspsId,
      ordre: maxOrdre + 1,
      phase: (formData.get("phase") as string)?.trim() || "",
      corpsEtat: emptyToNull(formData.get("corpsEtat")),
      description: (formData.get("description") as string)?.trim() || "",
      mesures: (formData.get("mesures") as string)?.trim() || "",
      responsable: emptyToNull(formData.get("responsable")),
      priorite: (formData.get("priorite") as string) || "MOYEN",
      epi: epiJson,
    },
  });

  revalidatePath(`/ppsps/${ppspsId}`);
}

export async function updateRisque(
  id: string,
  ppspsId: string,
  formData: FormData,
): Promise<void> {
  const epiRaw = formData.get("epi") as string | null;
  let epiJson: string | null = null;
  if (epiRaw && epiRaw.trim() !== "") {
    const epiArray = epiRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    epiJson = JSON.stringify(epiArray);
  }

  await prisma.pPSPSRisque.update({
    where: { id },
    data: {
      phase: (formData.get("phase") as string)?.trim() || "",
      corpsEtat: emptyToNull(formData.get("corpsEtat")),
      description: (formData.get("description") as string)?.trim() || "",
      mesures: (formData.get("mesures") as string)?.trim() || "",
      responsable: emptyToNull(formData.get("responsable")),
      priorite: (formData.get("priorite") as string) || "MOYEN",
      epi: epiJson,
    },
  });

  revalidatePath(`/ppsps/${ppspsId}`);
}

export async function deleteRisque(id: string, ppspsId: string): Promise<void> {
  await prisma.pPSPSRisque.delete({ where: { id } });
  revalidatePath(`/ppsps/${ppspsId}`);
}

// ---------------------------------------------------------------------------
// Secours
// ---------------------------------------------------------------------------

export async function addSecours(ppspsId: string, formData: FormData): Promise<void> {
  await prisma.pPSPSSecours.create({
    data: {
      ppspsId,
      type: (formData.get("type") as string) || "AUTRE",
      nom: emptyToNull(formData.get("nom")),
      telephone: (formData.get("telephone") as string)?.trim() || "",
      adresse: emptyToNull(formData.get("adresse")),
      distance: emptyToNull(formData.get("distance")),
    },
  });

  revalidatePath(`/ppsps/${ppspsId}`);
}

export async function deleteSecours(id: string, ppspsId: string): Promise<void> {
  await prisma.pPSPSSecours.delete({ where: { id } });
  revalidatePath(`/ppsps/${ppspsId}`);
}

// ---------------------------------------------------------------------------
// saveContenuLibre — merges a single section key or full JSON blob
// ---------------------------------------------------------------------------

export async function saveContenuLibre(id: string, formData: FormData): Promise<void> {
  const newJson = formData.get("contenuLibre") as string | null;

  if (!newJson) {
    revalidatePath(`/ppsps/${id}`);
    return;
  }

  // Load existing to merge
  const existing = await prisma.pPSPS.findUnique({
    where: { id },
    select: { contenuLibre: true },
  });

  let existingSections: Record<string, string> = {};
  if (existing?.contenuLibre) {
    try {
      existingSections = JSON.parse(existing.contenuLibre);
    } catch {
      // ignore
    }
  }

  let newSections: Record<string, string> = {};
  try {
    newSections = JSON.parse(newJson);
  } catch {
    revalidatePath(`/ppsps/${id}`);
    return;
  }

  const merged = { ...existingSections, ...newSections };

  await prisma.pPSPS.update({
    where: { id },
    data: { contenuLibre: JSON.stringify(merged) },
  });

  revalidatePath(`/ppsps/${id}`);
}
