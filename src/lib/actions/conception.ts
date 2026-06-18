"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

// ──────────────────────────────────────────────────────────
// Catalogue de matériaux & équipements
// ──────────────────────────────────────────────────────────

export async function createElementCatalogue(formData: FormData): Promise<void> {
  const categorie = (formData.get("categorie") as string) || "MATERIAUX";
  const designation = (formData.get("designation") as string) || "";
  if (!designation.trim()) throw new Error("Désignation requise");

  let imagePath: string | undefined;
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    imagePath = await saveUpload(imageFile, "conception/elements");
  }

  await prisma.elementCatalogue.create({
    data: {
      categorie,
      sousCategorie: (formData.get("sousCategorie") as string) || null,
      designation: designation.trim(),
      reference: (formData.get("reference") as string) || null,
      marque: (formData.get("marque") as string) || null,
      unite: (formData.get("unite") as string) || "unité",
      description: (formData.get("description") as string) || null,
      matiere: (formData.get("matiere") as string) || null,
      finition: (formData.get("finition") as string) || null,
      couleur: (formData.get("couleur") as string) || null,
      prixUnitHT: formData.get("prixUnitHT") ? parseFloat(formData.get("prixUnitHT") as string) : null,
      fournisseur: (formData.get("fournisseur") as string) || null,
      notes: (formData.get("notes") as string) || null,
      image: imagePath ?? null,
    },
  });
  redirect("/conception");
}

export async function updateElementCatalogue(id: string, formData: FormData): Promise<void> {
  const existing = await prisma.elementCatalogue.findUnique({ where: { id }, select: { image: true } });

  let imagePath: string | undefined | null = existing?.image;
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    if (existing?.image) await tryDelete(existing.image);
    imagePath = await saveUpload(imageFile, "conception/elements");
  }

  await prisma.elementCatalogue.update({
    where: { id },
    data: {
      categorie: (formData.get("categorie") as string) || "MATERIAUX",
      sousCategorie: (formData.get("sousCategorie") as string) || null,
      designation: ((formData.get("designation") as string) || "").trim(),
      reference: (formData.get("reference") as string) || null,
      marque: (formData.get("marque") as string) || null,
      unite: (formData.get("unite") as string) || "unité",
      description: (formData.get("description") as string) || null,
      matiere: (formData.get("matiere") as string) || null,
      finition: (formData.get("finition") as string) || null,
      couleur: (formData.get("couleur") as string) || null,
      prixUnitHT: formData.get("prixUnitHT") ? parseFloat(formData.get("prixUnitHT") as string) : null,
      fournisseur: (formData.get("fournisseur") as string) || null,
      notes: (formData.get("notes") as string) || null,
      image: imagePath ?? null,
    },
  });
  revalidatePath("/conception");
  revalidatePath(`/conception/elements/${id}`);
}

export async function deleteElementCatalogue(id: string): Promise<void> {
  const el = await prisma.elementCatalogue.findUnique({ where: { id }, select: { image: true } });
  if (el?.image) await tryDelete(el.image);
  await prisma.elementCatalogue.delete({ where: { id } });
  redirect("/conception");
}

// ──────────────────────────────────────────────────────────
// Plans & rendus (import depuis ArchiCAD / SketchUp / CEDREO…)
// ──────────────────────────────────────────────────────────

export async function uploadPlanConception(formData: FormData): Promise<void> {
  const titre = (formData.get("titre") as string) || "";
  if (!titre.trim()) throw new Error("Titre requis");

  const fichier = formData.get("fichier") as File | null;
  if (!fichier || fichier.size === 0) throw new Error("Fichier requis");

  const filePath = await saveUpload(fichier, "conception/plans");

  await prisma.planConception.create({
    data: {
      titre: titre.trim(),
      description: (formData.get("description") as string) || null,
      type: (formData.get("type") as string) || "PLAN",
      source: (formData.get("source") as string) || null,
      fichier: filePath,
      taille: fichier.size,
      chantierId: (formData.get("chantierId") as string) || null,
    },
  });
  redirect("/conception/plans");
}

export async function deletePlanConception(id: string): Promise<void> {
  const plan = await prisma.planConception.findUnique({ where: { id }, select: { fichier: true } });
  if (plan?.fichier) await tryDelete(plan.fichier);
  await prisma.planConception.delete({ where: { id } });
  redirect("/conception/plans");
}

// ──────────────────────────────────────────────────────────
// Seed données exemples (appelé depuis la page)
// ──────────────────────────────────────────────────────────

export async function seedCatalogue(): Promise<{ created: number }> {
  const existing = await prisma.elementCatalogue.count();
  if (existing > 0) return { created: 0 };

  const items = ELEMENTS_CATALOGUE_DEFAUT;
  await prisma.elementCatalogue.createMany({ data: items });
  revalidatePath("/conception");
  return { created: items.length };
}

// ──────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────

async function saveUpload(file: File, subfolder: string): Promise<string> {
  const uploadDir = path.join(process.cwd(), "storage", "uploads", subfolder);
  await mkdir(uploadDir, { recursive: true });
  const ext = path.extname(file.name) || "";
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);
  return `/uploads/${subfolder}/${filename}`;
}

async function tryDelete(filePath: string): Promise<void> {
  try {
    const full = path.join(process.cwd(), "storage", filePath.replace(/^\//, ""));
    await unlink(full);
  } catch {
    // ignore if file not found
  }
}

// ──────────────────────────────────────────────────────────
// Données de référence par défaut
// ──────────────────────────────────────────────────────────

const ELEMENTS_CATALOGUE_DEFAUT = [
  // MENUISERIE_INT — Agencement & menuiserie intérieure
  { categorie: "MENUISERIE_INT", sousCategorie: "Portes intérieures", designation: "Porte intérieure isoplane", unite: "unité", matiere: "Bois", finition: "Peint blanc" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Portes intérieures", designation: "Porte intérieure pleine bois massif", unite: "unité", matiere: "Bois massif", finition: "Vernis naturel" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Placard & dressing", designation: "Dressing sur mesure", unite: "ml", matiere: "Mélaminé", finition: "Blanc mat" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Placard & dressing", designation: "Armoire encastrée 2 vantaux", unite: "unité", matiere: "Contreplaqué", finition: "Laqué" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Escaliers", designation: "Escalier bois droit", unite: "unité", matiere: "Chêne massif", finition: "Huilé" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Escaliers", designation: "Escalier métal-bois limon apparent", unite: "unité", matiere: "Acier + Bois", finition: "Thermolaqué noir" },
  { categorie: "MENUISERIE_INT", sousCategorie: "Cloisons", designation: "Cloison bois agencement bureau", unite: "ml", matiere: "Contreplaqué", finition: "Stratifié" },

  // MOBILIER — Mobilier & équipements design
  { categorie: "MOBILIER", sousCategorie: "Salle de bain", designation: "Meuble vasque suspendu design 80cm", unite: "unité", matiere: "MDF laqué", finition: "Mat blanc" },
  { categorie: "MOBILIER", sousCategorie: "Salle de bain", designation: "Meuble vasque double vasque 120cm", unite: "unité", matiere: "Bois + Céramique", finition: "Bois naturel" },
  { categorie: "MOBILIER", sousCategorie: "Salle de bain", designation: "Colonne de rangement salle de bain", unite: "unité", matiere: "MDF", finition: "Laqué" },
  { categorie: "MOBILIER", sousCategorie: "Cuisine", designation: "Meuble bas de cuisine 60cm", unite: "unité", matiere: "Mélaminé", finition: "Chêne clair" },
  { categorie: "MOBILIER", sousCategorie: "Cuisine", designation: "Meuble haut de cuisine 60cm", unite: "unité", matiere: "Mélaminé", finition: "Blanc mat" },
  { categorie: "MOBILIER", sousCategorie: "Plan de travail", designation: "Plan de travail stratifié 38mm", unite: "ml", matiere: "Stratifié", finition: "Uni blanc" },
  { categorie: "MOBILIER", sousCategorie: "Plan de travail", designation: "Plan de travail béton ciré", unite: "ml", matiere: "Béton ciré", finition: "Ciré gris" },

  // MATERIAUX — Matériaux de revêtement et structure
  { categorie: "MATERIAUX", sousCategorie: "Béton décoratif", designation: "Béton désactivé", unite: "m²", matiere: "Béton", finition: "Désactivé" },
  { categorie: "MATERIAUX", sousCategorie: "Béton décoratif", designation: "Béton ciré sol intérieur", unite: "m²", matiere: "Béton", finition: "Ciré" },
  { categorie: "MATERIAUX", sousCategorie: "Béton décoratif", designation: "Béton lissé tolérance 2mm/2m", unite: "m²", matiere: "Béton", finition: "Lissé" },
  { categorie: "MATERIAUX", sousCategorie: "Béton décoratif", designation: "Béton quartz anti-dérapant", unite: "m²", matiere: "Béton quartz", finition: "Quartz" },
  { categorie: "MATERIAUX", sousCategorie: "Béton décoratif", designation: "Béton taloché finition lisse", unite: "m²", matiere: "Béton", finition: "Taloché" },
  { categorie: "MATERIAUX", sousCategorie: "Bois", designation: "Parquet massif chêne 14mm", unite: "m²", matiere: "Chêne massif", finition: "Huilé naturel" },
  { categorie: "MATERIAUX", sousCategorie: "Bois", designation: "Parquet contrecollé chêne 15mm", unite: "m²", matiere: "Chêne", finition: "Verni mat" },
  { categorie: "MATERIAUX", sousCategorie: "Bois", designation: "Lambris bois pin naturel", unite: "m²", matiere: "Pin", finition: "Vernis naturel" },
  { categorie: "MATERIAUX", sousCategorie: "Métal & acier", designation: "Plaque acier brut", unite: "m²", matiere: "Acier", finition: "Brut" },
  { categorie: "MATERIAUX", sousCategorie: "Métal & acier", designation: "Plaque acier thermolaqué", unite: "m²", matiere: "Acier", finition: "Thermolaqué noir mat" },
  { categorie: "MATERIAUX", sousCategorie: "Métal & acier", designation: "Tôle galvanisée", unite: "m²", matiere: "Acier galvanisé", finition: "Galvanisé" },
  { categorie: "MATERIAUX", sousCategorie: "Cuivre & laiton", designation: "Feuille de cuivre 0.6mm", unite: "m²", matiere: "Cuivre", finition: "Naturel" },
  { categorie: "MATERIAUX", sousCategorie: "Cuivre & laiton", designation: "Profilé laiton brossé", unite: "ml", matiere: "Laiton", finition: "Brossé" },
  { categorie: "MATERIAUX", sousCategorie: "Cuivre & laiton", designation: "Rosace dorée laiton", unite: "unité", matiere: "Laiton", couleur: "Or", finition: "Poli brillant" },
  { categorie: "MATERIAUX", sousCategorie: "Panneaux", designation: "Contreplaqué okoumé 15mm", unite: "m²", matiere: "Contreplaqué" },
  { categorie: "MATERIAUX", sousCategorie: "Panneaux", designation: "Panneau mélaminé blanc 19mm", unite: "m²", matiere: "Mélaminé", finition: "Blanc mat" },
  { categorie: "MATERIAUX", sousCategorie: "Panneaux", designation: "Panneau stratifié HPL 6mm", unite: "m²", matiere: "Stratifié HPL" },

  // MENUISERIE_EXT — Menuiserie extérieure
  { categorie: "MENUISERIE_EXT", sousCategorie: "Fenêtres", designation: "Fenêtre PVC double vitrage 2V", unite: "unité", matiere: "PVC", finition: "Blanc" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Fenêtres", designation: "Fenêtre aluminium à rupture de pont thermique", unite: "unité", matiere: "Aluminium", finition: "Thermolaqué RAL 7016" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Portes", designation: "Porte d'entrée aluminium sécurisée", unite: "unité", matiere: "Aluminium", finition: "Thermolaqué" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Portes", designation: "Porte de garage basculante", unite: "unité", matiere: "Acier", finition: "Laqué" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Baies & coulissants", designation: "Baie vitrée coulissante aluminium", unite: "unité", matiere: "Aluminium", finition: "RAL 7016" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Volets", designation: "Volet roulant aluminium motorisé", unite: "unité", matiere: "Aluminium" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Volets", designation: "Volet battant PVC", unite: "unité", matiere: "PVC", finition: "Blanc" },
  { categorie: "MENUISERIE_EXT", sousCategorie: "Vélux & coupoles", designation: "Fenêtre de toit VELUX", unite: "unité", matiere: "Bois + Alu" },

  // CHARPENTE — Éléments de charpente
  { categorie: "CHARPENTE", sousCategorie: "Charpente traditionnelle", designation: "Chevron 63×150 sapin traité", unite: "ml", matiere: "Sapin traité" },
  { categorie: "CHARPENTE", sousCategorie: "Charpente traditionnelle", designation: "Faîtage bois sapin 75×100", unite: "ml", matiere: "Sapin" },
  { categorie: "CHARPENTE", sousCategorie: "Charpente traditionnelle", designation: "Fermette industrielle standard", unite: "unité", matiere: "Sapin" },
  { categorie: "CHARPENTE", sousCategorie: "Ossature bois", designation: "Ossature bois montant 45×120", unite: "ml", matiere: "Douglas" },
  { categorie: "CHARPENTE", sousCategorie: "Charpente métallique", designation: "Poutrelle acier HEA 140", unite: "ml", matiere: "Acier" },
  { categorie: "CHARPENTE", sousCategorie: "Charpente métallique", designation: "Poutrelle acier IPE 200", unite: "ml", matiere: "Acier" },
  { categorie: "CHARPENTE", sousCategorie: "Accessoires", designation: "Connecteur métallique charpente", unite: "unité", matiere: "Acier galvanisé" },

  // COUVERTURE — Couverture & zingerie
  { categorie: "COUVERTURE", sousCategorie: "Tuiles", designation: "Tuile terre cuite canal", unite: "m²", matiere: "Terre cuite" },
  { categorie: "COUVERTURE", sousCategorie: "Tuiles", designation: "Tuile béton double-romane", unite: "m²", matiere: "Béton" },
  { categorie: "COUVERTURE", sousCategorie: "Ardoises", designation: "Ardoise naturelle 32×22cm", unite: "m²", matiere: "Ardoise naturelle" },
  { categorie: "COUVERTURE", sousCategorie: "Bac acier", designation: "Bac acier nervuré isolé", unite: "m²", matiere: "Acier galvanisé" },
  { categorie: "COUVERTURE", sousCategorie: "Membrane étanchéité", designation: "Membrane EPDM 1.2mm", unite: "m²", matiere: "EPDM" },
  { categorie: "COUVERTURE", sousCategorie: "Zingerie", designation: "Gouttière demi-ronde zinc", unite: "ml", matiere: "Zinc" },
  { categorie: "COUVERTURE", sousCategorie: "Zingerie", designation: "Descente d'eau pluviale zinc Ø80", unite: "ml", matiere: "Zinc" },
  { categorie: "COUVERTURE", sousCategorie: "Zingerie", designation: "Noquet zinc solin", unite: "ml", matiere: "Zinc" },
  { categorie: "COUVERTURE", sousCategorie: "Zingerie", designation: "Faîtière zinc avec closoir", unite: "ml", matiere: "Zinc" },

  // RAVALEMENT — Ravalement de façade
  { categorie: "RAVALEMENT", sousCategorie: "Enduits", designation: "Enduit monocouche finition grattée", unite: "m²", finition: "Grattée" },
  { categorie: "RAVALEMENT", sousCategorie: "Enduits", designation: "Enduit monocouche finition talochée", unite: "m²", finition: "Talochée" },
  { categorie: "RAVALEMENT", sousCategorie: "Enduits", designation: "Enduit projeté finition rustique", unite: "m²", finition: "Rustique" },
  { categorie: "RAVALEMENT", sousCategorie: "ITE", designation: "Isolation thermique extérieure polystyrène 100mm", unite: "m²", matiere: "Polystyrène EPS" },
  { categorie: "RAVALEMENT", sousCategorie: "ITE", designation: "ITE laine de roche 140mm", unite: "m²", matiere: "Laine de roche" },
  { categorie: "RAVALEMENT", sousCategorie: "Peinture façade", designation: "Peinture siloxane hydrofuge", unite: "m²", finition: "Lisse satiné" },
  { categorie: "RAVALEMENT", sousCategorie: "Pierre", designation: "Ravalement pierre naturelle + rejointoiement", unite: "m²", matiere: "Pierre naturelle" },
  { categorie: "RAVALEMENT", sousCategorie: "Bardage", designation: "Bardage bois Douglas vertical", unite: "m²", matiere: "Douglas", finition: "Naturel" },
  { categorie: "RAVALEMENT", sousCategorie: "Bardage", designation: "Bardage composite fibro-ciment", unite: "m²", matiere: "Fibro-ciment" },

  // MATIERES_PREM — Matières premières et granulats
  { categorie: "MATIERES_PREM", sousCategorie: "Granulats", designation: "Sable de construction 0/4", unite: "tonne", matiere: "Sable" },
  { categorie: "MATIERES_PREM", sousCategorie: "Granulats", designation: "Gravier 0/20 concassé", unite: "tonne", matiere: "Gravier" },
  { categorie: "MATIERES_PREM", sousCategorie: "Granulats", designation: "Gravier 6/20 roulé", unite: "tonne", matiere: "Gravier" },
  { categorie: "MATIERES_PREM", sousCategorie: "Granulats", designation: "Gravillons décoratifs 8/16", unite: "tonne", matiere: "Gravillons" },
  { categorie: "MATIERES_PREM", sousCategorie: "Géotextile", designation: "Géotextile non tissé 150g/m²", unite: "m²", matiere: "Polypropylène" },
  { categorie: "MATIERES_PREM", sousCategorie: "Géotextile", designation: "Géomembrane PEHD 1mm", unite: "m²", matiere: "PEHD" },
  { categorie: "MATIERES_PREM", sousCategorie: "Liants", designation: "Ciment CEM II 42.5 sac 25kg", unite: "sac", matiere: "Ciment" },
  { categorie: "MATIERES_PREM", sousCategorie: "Liants", designation: "Chaux hydraulique naturelle NHL5", unite: "sac", matiere: "Chaux" },

  // PLOMBERIE — Plomberie & sanitaire
  { categorie: "PLOMBERIE", sousCategorie: "Tuyauterie", designation: "Tube PER multicouche 16mm", unite: "ml", matiere: "PER" },
  { categorie: "PLOMBERIE", sousCategorie: "Tuyauterie", designation: "Tube cuivre 16×18mm", unite: "ml", matiere: "Cuivre" },
  { categorie: "PLOMBERIE", sousCategorie: "Tuyauterie", designation: "Tube PVC évacuation Ø100", unite: "ml", matiere: "PVC" },
  { categorie: "PLOMBERIE", sousCategorie: "Sanitaires", designation: "WC suspendu céramique blanc", unite: "unité", matiere: "Céramique", finition: "Blanc" },
  { categorie: "PLOMBERIE", sousCategorie: "Sanitaires", designation: "Lavabo à poser céramique", unite: "unité", matiere: "Céramique" },
  { categorie: "PLOMBERIE", sousCategorie: "Sanitaires", designation: "Vasque à encastrer ronde", unite: "unité", matiere: "Céramique" },
  { categorie: "PLOMBERIE", sousCategorie: "Sanitaires", designation: "Douche à l'italienne bac receveur", unite: "unité" },
  { categorie: "PLOMBERIE", sousCategorie: "Sanitaires", designation: "Baignoire acrylique 170×70cm", unite: "unité", matiere: "Acrylique" },
  { categorie: "PLOMBERIE", sousCategorie: "Robinetterie", designation: "Mitigeur lavabo chromé", unite: "unité", matiere: "Laiton", finition: "Chromé" },
  { categorie: "PLOMBERIE", sousCategorie: "Robinetterie", designation: "Mitigeur douche thermostatique", unite: "unité", matiere: "Laiton", finition: "Chromé" },
  { categorie: "PLOMBERIE", sousCategorie: "Robinetterie", designation: "Robinet de cuisine mitigeur", unite: "unité", matiere: "Laiton" },
  { categorie: "PLOMBERIE", sousCategorie: "Eau chaude", designation: "Chauffe-eau thermodynamique 200L", unite: "unité" },
  { categorie: "PLOMBERIE", sousCategorie: "Eau chaude", designation: "Ballon d'eau chaude 300L", unite: "unité" },

  // CVC — Chauffage, ventilation, climatisation & VMC
  { categorie: "CVC", sousCategorie: "Chauffage", designation: "Chaudière à condensation gaz", unite: "unité" },
  { categorie: "CVC", sousCategorie: "Chauffage", designation: "Chaudière biomasse à granulés 20kW", unite: "unité" },
  { categorie: "CVC", sousCategorie: "Chauffage", designation: "Pompe à chaleur air/eau 8kW", unite: "unité" },
  { categorie: "CVC", sousCategorie: "Chauffage", designation: "Radiateur acier à eau chaude", unite: "unité", matiere: "Acier" },
  { categorie: "CVC", sousCategorie: "Chauffage", designation: "Plancher chauffant hydraulique", unite: "m²" },
  { categorie: "CVC", sousCategorie: "Climatisation", designation: "Unité intérieure split system 2.5kW", unite: "unité" },
  { categorie: "CVC", sousCategorie: "Climatisation", designation: "Unité extérieure climatiseur", unite: "unité" },
  { categorie: "CVC", sousCategorie: "VMC", designation: "VMC simple flux autoréglable", unite: "unité" },
  { categorie: "CVC", sousCategorie: "VMC", designation: "VMC double flux avec échangeur", unite: "unité" },
  { categorie: "CVC", sousCategorie: "VMC", designation: "Bouche d'extraction VMC cuisine", unite: "unité" },
  { categorie: "CVC", sousCategorie: "VMC", designation: "Gaine souple VMC Ø125mm", unite: "ml" },

  // ELECTRICITE — Équipements électriques
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Prise de courant 2P+T encastrée", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Double prise de courant 2P+T", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Prise USB Type-C encastrée", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Interrupteur va-et-vient simple", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Interrupteur double allumage", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Prises & interrupteurs", designation: "Variateur d'éclairage LED", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Tableau électrique", designation: "Tableau électrique 13 modules mono", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Tableau électrique", designation: "Tableau électrique 26 modules mono", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Tableau électrique", designation: "Disjoncteur différentiel 30mA type AC", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Tableau électrique", designation: "Disjoncteur divisionnaire 16A", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Câblage", designation: "Câble électrique HO7VU 2.5mm² rouge", unite: "ml" },
  { categorie: "ELECTRICITE", sousCategorie: "Câblage", designation: "Câble électrique HO7VU 1.5mm² bleu", unite: "ml" },
  { categorie: "ELECTRICITE", sousCategorie: "Câblage", designation: "Câble VDI catégorie 6 RJ45", unite: "ml" },
  { categorie: "ELECTRICITE", sousCategorie: "Éclairage", designation: "Spot encastré LED 7W", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Éclairage", designation: "Plafonnier LED 24W", unite: "unité" },
  { categorie: "ELECTRICITE", sousCategorie: "Domotique", designation: "Module domotique KNX", unite: "unité" },
];
