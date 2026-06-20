"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stockerFichier, supprimerFichierStocke } from "@/lib/blob-storage";

// ─── Dossiers ────────────────────────────────────────────────────────────────

const dossierSchema = z.object({
  nom: z.string().min(1, "Le nom est requis.").max(100),
  parentId: z.string().nullable().optional(),
});

export type DossierState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function createDossier(
  _prev: DossierState,
  formData: FormData,
): Promise<DossierState> {
  const validated = dossierSchema.safeParse({
    nom: formData.get("nom"),
    parentId: formData.get("parentId") || null,
  });
  if (!validated.success) return { errors: validated.error.flatten().fieldErrors };

  const { nom, parentId } = validated.data;
  const siblings = await prisma.dossier.findMany({
    where: { parentId: parentId ?? null },
    select: { ordre: true },
  });
  const ordre = siblings.length > 0 ? Math.max(...siblings.map((s) => s.ordre)) + 1 : 0;

  const dossier = await prisma.dossier.create({
    data: { nom, parentId: parentId ?? null, ordre },
  });

  revalidatePath("/documents");
  redirect(`/documents?dossier=${dossier.id}`);
}

export async function renameDossier(id: string, nom: string): Promise<void> {
  if (!nom.trim()) return;
  await prisma.dossier.update({ where: { id }, data: { nom: nom.trim() } });
  revalidatePath("/documents");
}

export async function deleteDossier(id: string): Promise<void> {
  const dossier = await prisma.dossier.findUnique({ where: { id } });
  if (!dossier || dossier.systeme) return;

  // Supprime récursivement les fichiers physiques des documents du dossier et sous-dossiers
  await deleteDocumentsInDossier(id);
  await prisma.dossier.delete({ where: { id } });
  revalidatePath("/documents");
  redirect("/documents");
}

async function deleteDocumentsInDossier(dossierId: string): Promise<void> {
  const docs = await prisma.document.findMany({ where: { dossierId }, select: { chemin: true } });
  for (const doc of docs) {
    await supprimerFichierStocke(doc.chemin);
  }
  await prisma.document.deleteMany({ where: { dossierId } });

  const enfants = await prisma.dossier.findMany({ where: { parentId: dossierId }, select: { id: true } });
  for (const e of enfants) {
    await deleteDocumentsInDossier(e.id);
  }
}

// ─── Documents / Fichiers ─────────────────────────────────────────────────────

export type DocumentState = { errors?: Record<string, string[]>; message?: string } | undefined;

export async function uploadDocument(
  _prev: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const fichier = formData.get("fichier") as File | null;
  if (!fichier || fichier.size === 0) {
    return { errors: { fichier: ["Aucun fichier sélectionné."] } };
  }

  const { url: chemin, nomFichier, taille } = await stockerFichier(fichier, "documents");
  const dossierId = formData.get("dossierId") as string | null;
  const description = (formData.get("description") as string) || undefined;

  await prisma.document.create({
    data: {
      nom: fichier.name,
      nomFichier,
      type: fichier.type || "application/octet-stream",
      chemin,
      taille,
      description,
      dossierId: dossierId || null,
    },
  });

  revalidatePath("/documents");
  return undefined;
}

export async function renameDocument(id: string, nom: string): Promise<void> {
  if (!nom.trim()) return;
  await prisma.document.update({ where: { id }, data: { nom: nom.trim() } });
  revalidatePath("/documents");
}

export async function moveDocument(id: string, dossierId: string | null): Promise<void> {
  await prisma.document.update({ where: { id }, data: { dossierId } });
  revalidatePath("/documents");
}

export async function deleteDocument(id: string): Promise<void> {
  const doc = await prisma.document.findUnique({ where: { id }, select: { chemin: true } });
  if (!doc) return;
  await supprimerFichierStocke(doc.chemin);
  await prisma.document.delete({ where: { id } });
  revalidatePath("/documents");
}

// ─── Helpers pour le seed ─────────────────────────────────────────────────────

export async function ensureArborescenceBTP(): Promise<void> {
  const existing = await prisma.dossier.count();
  if (existing > 0) return;

  type ArboNode = { nom: string; enfants?: string[] };
  const tree: ArboNode[] = [
    {
      nom: "Direction Générale",
      enfants: ["Stratégie & Développement", "Comptes-rendus de direction", "Reporting & Tableaux de bord"],
    },
    {
      nom: "Service Commercial",
      enfants: ["Prospects & Opportunités", "Devis & Propositions commerciales", "Contrats clients signés", "Appels d'offres", "Références & Supports marketing"],
    },
    {
      nom: "Service Opérations & Chantiers",
      enfants: ["Plans, métrés & études techniques", "Rapports journaliers de chantier", "Photos de chantier", "PV de réception & levée de réserves", "Ordres de service & Avenants"],
    },
    {
      nom: "Service Achats & Approvisionnement",
      enfants: ["Bons de commande émis", "Bons de livraison reçus", "Fiches techniques & Datasheets produits", "Catalogues fournisseurs"],
    },
    {
      nom: "Service Sous-traitance",
      enfants: ["Contrats de sous-traitance", "DC4 & Agréments maître d'ouvrage", "Attestations & Assurances sous-traitants", "Situations de travaux sous-traitants"],
    },
    {
      nom: "Service Administratif & Juridique",
      enfants: ["Assurances société (RC Pro & Décennale)", "Certifications & Labels (RGE, Qualibat)", "Kbis, Statuts & Registre du Commerce", "Contrats & Conventions", "Licences, Abonnements & Logiciels"],
    },
    {
      nom: "Service Financier & Comptabilité",
      enfants: ["Facturation clients", "Factures fournisseurs & Achats", "Relevés bancaires", "Déclarations TVA & Fiscales", "Bilans & Comptes annuels", "Notes de frais"],
    },
    {
      nom: "Service Ressources Humaines",
      enfants: ["Contrats de travail & Avenants", "Bulletins de salaire", "Registre unique du personnel", "Formations, Habilitations & Certifications", "Visites médicales & Aptitudes", "EPI, Sécurité & Prévention"],
    },
    {
      nom: "QSE — Qualité, Sécurité, Environnement",
      enfants: ["Document Unique d'Évaluation des Risques (DUER)", "Plans de prévention", "PPSPS", "Fiches de données sécurité (FDS)", "Certificats & Audits qualité"],
    },
    {
      nom: "Archives",
      enfants: ["2024", "2025", "Antérieures"],
    },
  ];

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    const parent = await prisma.dossier.create({
      data: { nom: node.nom, systeme: true, ordre: i },
    });
    if (node.enfants) {
      for (let j = 0; j < node.enfants.length; j++) {
        await prisma.dossier.create({
          data: { nom: node.enfants[j], parentId: parent.id, systeme: true, ordre: j },
        });
      }
    }
  }
}
