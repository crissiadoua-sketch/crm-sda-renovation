"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { genererSectionsInitiales } from "@/lib/memoire-technique";
import type { TypeMemoire, ModeleMemoire } from "@/lib/memoire-technique";
import { prochainNumeroDocument } from "@/lib/codification";

// ---------------------------------------------------------------------------
// Référence auto MT-YYYY-XXXX
// ---------------------------------------------------------------------------

async function genererReference(): Promise<string> {
  const memoires = await prisma.memoireTechnique.findMany({ select: { reference: true } });
  return prochainNumeroDocument("MT", memoires.map((m) => m.reference));
}

// ---------------------------------------------------------------------------
// Créer un nouveau mémoire technique
// ---------------------------------------------------------------------------

export async function creerMemoireTechnique(formData: FormData) {
  const chantierId   = formData.get("chantierId") as string;
  const devisId      = formData.get("devisId") as string | null;
  const titre        = formData.get("titre") as string;
  const type         = (formData.get("type") as TypeMemoire) ?? "TYPE_2";
  const modele       = (formData.get("modele") as ModeleMemoire) ?? "APPEL_OFFRE";
  const maitreOuvrage = formData.get("maitreOuvrage") as string | null;
  const objetMarche  = formData.get("objetMarche") as string | null;
  const lotNumero    = formData.get("lotNumero") as string | null;
  const lotDesignation = formData.get("lotDesignation") as string | null;
  const montantEstimeStr = formData.get("montantEstime") as string | null;

  if (!chantierId || !titre) throw new Error("Chantier et titre obligatoires");

  // Récupérer les données du chantier pour le pré-remplissage
  const chantier = await prisma.chantier.findUnique({
    where: { id: chantierId },
    include: {
      client: { select: { nom: true, prenom: true, raisonSociale: true } },
      devis: devisId ? { where: { id: devisId }, select: { numero: true, objet: true } } : undefined,
    },
  });

  const devis = devisId
    ? await prisma.devis.findUnique({ where: { id: devisId }, select: { numero: true, objet: true } })
    : null;

  const sections = genererSectionsInitiales(type, modele, {
    nomChantier: chantier?.nom,
    adresseChantier: chantier?.adresse || undefined,
    descriptionChantier: chantier?.description || undefined,
    clientNom: chantier?.client
      ? chantier.client.raisonSociale || `${chantier.client.prenom ?? ""} ${chantier.client.nom}`.trim()
      : undefined,
    dateDebut: chantier?.dateDebut ? new Date(chantier.dateDebut).toLocaleDateString("fr-FR") : undefined,
    dateFin: chantier?.dateFin ? new Date(chantier.dateFin).toLocaleDateString("fr-FR") : undefined,
    devisNumero: devis?.numero ?? undefined,
    devisObjet: devis?.objet ?? objetMarche ?? undefined,
  });

  const reference = await genererReference();

  const mt = await prisma.memoireTechnique.create({
    data: {
      reference,
      titre,
      type,
      modele,
      chantierId,
      devisId: devisId || null,
      maitreOuvrage: maitreOuvrage || null,
      objetMarche: objetMarche || chantier?.nom || null,
      lotNumero: lotNumero || null,
      lotDesignation: lotDesignation || null,
      montantEstime: montantEstimeStr ? parseFloat(montantEstimeStr) : null,
      sections: JSON.stringify(sections),
    },
  });

  redirect(`/memoires-techniques/${mt.id}`);
}

// ---------------------------------------------------------------------------
// Sauvegarder le contenu d'une section
// ---------------------------------------------------------------------------

export async function sauvegarderSection(
  memoireId: string,
  sectionKey: string,
  contenu: string
) {
  const mt = await prisma.memoireTechnique.findUnique({ where: { id: memoireId } });
  if (!mt) throw new Error("Mémoire introuvable");

  const sections = JSON.parse(mt.sections as string) as Record<string, unknown>;
  const section = sections[sectionKey] as Record<string, unknown> | undefined;
  if (section) {
    section.contenu = contenu;
  }

  await prisma.memoireTechnique.update({
    where: { id: memoireId },
    data: { sections: JSON.stringify(sections) },
  });

  revalidatePath(`/memoires-techniques/${memoireId}`);
}

// ---------------------------------------------------------------------------
// Sauvegarder toutes les sections (auto-save)
// ---------------------------------------------------------------------------

export async function sauvegarderToutesSections(
  memoireId: string,
  sections: Record<string, unknown>
) {
  await prisma.memoireTechnique.update({
    where: { id: memoireId },
    data: { sections: JSON.stringify(sections) },
  });
}

// ---------------------------------------------------------------------------
// Mettre à jour les métadonnées
// ---------------------------------------------------------------------------

export async function mettreAJourMetadonnees(memoireId: string, formData: FormData) {
  await prisma.memoireTechnique.update({
    where: { id: memoireId },
    data: {
      titre:          formData.get("titre") as string,
      maitreOuvrage:  (formData.get("maitreOuvrage") as string) || null,
      objetMarche:    (formData.get("objetMarche") as string) || null,
      lotNumero:      (formData.get("lotNumero") as string) || null,
      lotDesignation: (formData.get("lotDesignation") as string) || null,
      montantEstime:  formData.get("montantEstime") ? parseFloat(formData.get("montantEstime") as string) : null,
      dateRemise:     formData.get("dateRemise") ? new Date(formData.get("dateRemise") as string) : null,
      devisId:        (formData.get("devisId") as string) || null,
    },
  });
  revalidatePath(`/memoires-techniques/${memoireId}`);
}

// ---------------------------------------------------------------------------
// Changer le statut
// ---------------------------------------------------------------------------

export async function changerStatut(memoireId: string, statut: "BROUILLON" | "FINALISE" | "ENVOYE") {
  await prisma.memoireTechnique.update({
    where: { id: memoireId },
    data: { statut },
  });
  revalidatePath(`/memoires-techniques/${memoireId}`);
  revalidatePath("/memoires-techniques");
}

// ---------------------------------------------------------------------------
// Ajouter une section personnalisée
// ---------------------------------------------------------------------------

export async function ajouterSection(memoireId: string, titre: string) {
  const mt = await prisma.memoireTechnique.findUnique({ where: { id: memoireId } });
  if (!mt) throw new Error("Mémoire introuvable");

  const sections = JSON.parse(mt.sections as string) as Record<string, {
    titre: string; contenu: string; visible: boolean; ordre: number; nbPages: number; custom?: boolean;
  }>;

  const key = `custom_${Date.now()}`;
  const maxOrdre = Math.max(0, ...Object.values(sections).filter(s => s.ordre < 99).map(s => s.ordre));
  sections[key] = {
    titre,
    contenu: "Contenu de cette section…",
    visible: true,
    ordre: maxOrdre + 1,
    nbPages: 1,
    custom: true,
  };

  await prisma.memoireTechnique.update({
    where: { id: memoireId },
    data: { sections: JSON.stringify(sections) },
  });
  revalidatePath(`/memoires-techniques/${memoireId}`);
}

// ---------------------------------------------------------------------------
// Supprimer une section
// ---------------------------------------------------------------------------

export async function supprimerSection(memoireId: string, sectionKey: string) {
  const mt = await prisma.memoireTechnique.findUnique({ where: { id: memoireId } });
  if (!mt) throw new Error("Mémoire introuvable");

  const sections = JSON.parse(mt.sections as string) as Record<string, unknown>;
  delete sections[sectionKey];

  await prisma.memoireTechnique.update({
    where: { id: memoireId },
    data: { sections: JSON.stringify(sections) },
  });
  revalidatePath(`/memoires-techniques/${memoireId}`);
}

// ---------------------------------------------------------------------------
// Annexes — ajouter un lien de fichier (fichier uploadé séparément)
// ---------------------------------------------------------------------------

export async function ajouterAnnexe(
  memoireId: string,
  annexe: { titre: string; fichier: string; type: string; taille?: number }
) {
  const mt = await prisma.memoireTechnique.findUnique({ where: { id: memoireId } });
  if (!mt) throw new Error("Mémoire introuvable");

  const annexes = JSON.parse(mt.annexes as string) as Array<{
    id: string; titre: string; fichier: string; type: string; taille?: number; createdAt: string;
  }>;

  annexes.push({
    id: `annx_${Date.now()}`,
    titre: annexe.titre,
    fichier: annexe.fichier,
    type: annexe.type,
    taille: annexe.taille,
    createdAt: new Date().toISOString(),
  });

  await prisma.memoireTechnique.update({
    where: { id: memoireId },
    data: { annexes: JSON.stringify(annexes) },
  });
  revalidatePath(`/memoires-techniques/${memoireId}`);
}

// ---------------------------------------------------------------------------
// Annexes — supprimer
// ---------------------------------------------------------------------------

export async function supprimerAnnexe(memoireId: string, annexeId: string) {
  const mt = await prisma.memoireTechnique.findUnique({ where: { id: memoireId } });
  if (!mt) throw new Error("Mémoire introuvable");

  const annexes = (JSON.parse(mt.annexes as string) as Array<{ id: string }>)
    .filter((a) => a.id !== annexeId);

  await prisma.memoireTechnique.update({
    where: { id: memoireId },
    data: { annexes: JSON.stringify(annexes) },
  });
  revalidatePath(`/memoires-techniques/${memoireId}`);
}

// ---------------------------------------------------------------------------
// Dupliquer
// ---------------------------------------------------------------------------

export async function dupliquerMemoire(memoireId: string) {
  const mt = await prisma.memoireTechnique.findUnique({ where: { id: memoireId } });
  if (!mt) throw new Error("Mémoire introuvable");

  const reference = await genererReference();

  const copie = await prisma.memoireTechnique.create({
    data: {
      reference,
      titre: `${mt.titre} (copie)`,
      type: mt.type,
      modele: mt.modele,
      statut: "BROUILLON",
      chantierId: mt.chantierId,
      devisId: mt.devisId,
      maitreOuvrage: mt.maitreOuvrage,
      objetMarche: mt.objetMarche,
      lotNumero: mt.lotNumero,
      lotDesignation: mt.lotDesignation,
      montantEstime: mt.montantEstime,
      sections: mt.sections,
      annexes: "[]",
    },
  });

  redirect(`/memoires-techniques/${copie.id}`);
}

// ---------------------------------------------------------------------------
// Supprimer
// ---------------------------------------------------------------------------

export async function supprimerMemoire(memoireId: string) {
  const _doc = await prisma.memoireTechnique.findUnique({ where: { id: memoireId }, select: { statut: true } });
  if (!_doc || _doc.statut !== "BROUILLON") return;
  await prisma.memoireTechnique.delete({ where: { id: memoireId } });
  revalidatePath("/memoires-techniques");
  redirect("/memoires-techniques");
}
