"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

// Codification : CORPSID-CAT-NNNN  ex: PLO-MAT-0001
export async function nextStockRef(corpsEtat: string, categorie: string): Promise<string> {
  const prefix = `${corpsEtat}-${categorie.slice(0, 3)}-`;
  const existing = await prisma.articleStock.findMany({
    where: { reference: { startsWith: prefix } },
    select: { reference: true },
  });
  let max = 0;
  for (const { reference } of existing) {
    const n = parseInt(reference.slice(prefix.length), 10);
    if (!isNaN(n) && n > max) max = n;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

export async function createArticleStock(formData: FormData) {
  const corpsEtat = (formData.get("corpsEtat") as string | null) ?? "GEN";
  const categorie = (formData.get("categorie") as string | null) ?? "MATERIAU";
  const reference = await nextStockRef(corpsEtat, categorie);

  await prisma.articleStock.create({
    data: {
      reference,
      designation: (formData.get("designation") as string | null)?.trim() ?? "",
      corpsEtat,
      categorie,
      emplacement: (formData.get("emplacement") as string | null) ?? "DEPOT",
      unite: (formData.get("unite") as string | null) ?? "u",
      conditionnement: (formData.get("conditionnement") as string | null)?.trim() || null,
      ratioConsommation: parseFloat((formData.get("ratioConsommation") as string | null) ?? "1") || 1,
      prixUnitaireHT: parseFloat((formData.get("prixUnitaireHT") as string | null) ?? "0") || 0,
      fournisseurId: (formData.get("fournisseurId") as string | null) || null,
      refFournisseur: (formData.get("refFournisseur") as string | null)?.trim() || null,
      indexMatiere: (formData.get("indexMatiere") as string | null)?.trim() || null,
      stockActuel: parseFloat((formData.get("stockActuel") as string | null) ?? "0") || 0,
      stockMinimum: parseFloat((formData.get("stockMinimum") as string | null) ?? "0") || 0,
      stockMaximum: formData.get("stockMaximum")
        ? parseFloat(formData.get("stockMaximum") as string) || null
        : null,
      delaiLivraisonJours: formData.get("delaiLivraisonJours")
        ? parseInt(formData.get("delaiLivraisonJours") as string, 10) || null
        : null,
      gammeOffre: (formData.get("gammeOffre") as string | null)?.trim() || null,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  revalidatePath("/stock");
  redirect("/stock");
}

export async function updateArticleStock(id: string, formData: FormData) {
  const article = await prisma.articleStock.findUnique({ where: { id }, select: { prixUnitaireHT: true } });

  const nouveauPrix = parseFloat((formData.get("prixUnitaireHT") as string | null) ?? "0") || 0;
  const ancienPrix = article?.prixUnitaireHT ?? 0;

  await prisma.articleStock.update({
    where: { id },
    data: {
      designation: (formData.get("designation") as string | null)?.trim() ?? "",
      corpsEtat: (formData.get("corpsEtat") as string | null) ?? "GEN",
      categorie: (formData.get("categorie") as string | null) ?? "MATERIAU",
      emplacement: (formData.get("emplacement") as string | null) ?? "DEPOT",
      unite: (formData.get("unite") as string | null) ?? "u",
      conditionnement: (formData.get("conditionnement") as string | null)?.trim() || null,
      ratioConsommation: parseFloat((formData.get("ratioConsommation") as string | null) ?? "1") || 1,
      prixUnitaireHT: nouveauPrix,
      fournisseurId: (formData.get("fournisseurId") as string | null) || null,
      refFournisseur: (formData.get("refFournisseur") as string | null)?.trim() || null,
      indexMatiere: (formData.get("indexMatiere") as string | null)?.trim() || null,
      stockMinimum: parseFloat((formData.get("stockMinimum") as string | null) ?? "0") || 0,
      stockMaximum: formData.get("stockMaximum")
        ? parseFloat(formData.get("stockMaximum") as string) || null
        : null,
      delaiLivraisonJours: formData.get("delaiLivraisonJours")
        ? parseInt(formData.get("delaiLivraisonJours") as string, 10) || null
        : null,
      gammeOffre: (formData.get("gammeOffre") as string | null)?.trim() || null,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  // Enregistrer dans l'historique si le prix a changé
  if (nouveauPrix !== ancienPrix && ancienPrix > 0) {
    const variation = ((nouveauPrix - ancienPrix) / ancienPrix) * 100;
    await prisma.historiquePrix.create({
      data: {
        articleId: id,
        prixHT: nouveauPrix,
        variation: Math.round(variation * 100) / 100,
        source: "FOURNISSEUR",
        notes: `Mise à jour manuelle — ancien prix : ${ancienPrix.toFixed(2)} €`,
      },
    });
  }

  revalidatePath("/stock");
  revalidatePath(`/stock/${id}`);
}

export async function createMouvement(formData: FormData) {
  const articleId = formData.get("articleId") as string;
  const type = (formData.get("type") as string | null) ?? "ENTREE";
  const quantite = parseFloat((formData.get("quantite") as string | null) ?? "0") || 0;
  const prixUnitaireHT = parseFloat((formData.get("prixUnitaireHT") as string | null) ?? "0") || 0;

  await prisma.mouvementStock.create({
    data: {
      articleId,
      type,
      quantite,
      prixUnitaireHT: prixUnitaireHT > 0 ? prixUnitaireHT : null,
      motif: (formData.get("motif") as string | null)?.trim() || null,
      refDocument: (formData.get("refDocument") as string | null)?.trim() || null,
      chantierId: (formData.get("chantierId") as string | null) || null,
      notes: (formData.get("notes") as string | null)?.trim() || null,
    },
  });

  // Mettre à jour le stock actuel
  const delta = type === "ENTREE" || type === "INVENTAIRE" ? quantite : -quantite;
  await prisma.articleStock.update({
    where: { id: articleId },
    data: { stockActuel: { increment: type === "INVENTAIRE" ? 0 : delta } },
  });

  // Pour un inventaire on force la valeur
  if (type === "INVENTAIRE") {
    await prisma.articleStock.update({ where: { id: articleId }, data: { stockActuel: quantite } });
  }

  revalidatePath(`/stock/${articleId}`);
  revalidatePath("/stock");
}

export async function deleteArticleStock(id: string) {
  await prisma.articleStock.delete({ where: { id } });
  revalidatePath("/stock");
  redirect("/stock");
}

export async function updateEmplacementStock(id: string, emplacement: string) {
  const valid = ["DEPOT", "BUREAU", "CHANTIER"];
  if (!valid.includes(emplacement)) return;
  await prisma.articleStock.update({ where: { id }, data: { emplacement } });
  revalidatePath("/stock");
  revalidatePath(`/stock/${id}`);
}

export async function updateGammeStock(id: string, gamme: string) {
  const valid = ["ECO", "OPT", "COM", ""];
  if (!valid.includes(gamme)) return;
  await prisma.articleStock.update({ where: { id }, data: { gammeOffre: gamme || null } });
  revalidatePath("/stock");
  revalidatePath(`/stock/${id}`);
}

export type ImportArticle = {
  designation:     string;
  reference:       string;
  unite:           string;
  prixUnitaireHT:  number;
  conditionnement: string;
  corpsEtat:       string;
  categorie:       string;
  notes:           string;
  fournisseurId?:  string;
};

export async function importerArticlesStock(articles: ImportArticle[]): Promise<{ created: number; errors: string[] }> {
  let created = 0;
  const errors: string[] = [];

  for (const a of articles) {
    try {
      const corpsEtat = a.corpsEtat || "GEN";
      const categorie = a.categorie || "MATERIAU";
      const reference = await nextStockRef(corpsEtat, categorie);

      await prisma.articleStock.create({
        data: {
          reference,
          designation:      a.designation.trim(),
          corpsEtat,
          categorie,
          emplacement:      "DEPOT",
          unite:            a.unite || "u",
          conditionnement:  a.conditionnement || null,
          prixUnitaireHT:   a.prixUnitaireHT || 0,
          refFournisseur:   a.reference || null,
          fournisseurId:    a.fournisseurId || null,
          notes:            a.notes || null,
          stockActuel:      0,
          stockMinimum:     0,
        },
      });
      created++;
    } catch (e) {
      errors.push(`${a.designation}: ${String(e)}`);
    }
  }

  revalidatePath("/stock");
  return { created, errors };
}
