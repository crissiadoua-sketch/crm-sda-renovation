"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stockerFichier, supprimerFichierStocke, recupererBufferFichier } from "@/lib/blob-storage";
import Anthropic from "@anthropic-ai/sdk";
import {
  calculerPoutre,
  calculerDalle,
  calculerPoteau,
  calculerDallage,
  calculerMargellePiscine,
  type TypeElement,
  type Materiau,
  type ConditionPoutre,
  type ConditionDalle,
  type NiveauCharge,
  type UsageDallage,
  type PortanceSol,
  type FinitionBeton,
  type MateriauMargelle,
} from "@/lib/calcul-structurel/pre-dimensionnement";

async function genNumeroPDIM(): Promise<string> {
  const count = await prisma.preDimensionnement.count();
  return `PDIM-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`;
}

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

function calculerResultat(formData: FormData) {
  const typeElement = formData.get("typeElement") as TypeElement;
  const materiau = formData.get("materiau") as Materiau;

  if (typeElement === "POUTRE") {
    const portee = parseFloat(formData.get("portee") as string);
    const condition = formData.get("condition") as ConditionPoutre;
    const niveauCharge = formData.get("niveauCharge") as NiveauCharge;
    return calculerPoutre({ materiau, portee, condition, niveauCharge });
  }
  if (typeElement === "DALLE") {
    const portee = parseFloat(formData.get("portee") as string);
    const condition = formData.get("condition") as ConditionDalle;
    const niveauCharge = formData.get("niveauCharge") as NiveauCharge;
    return calculerDalle({ materiau, portee, condition, niveauCharge });
  }
  if (typeElement === "DALLAGE") {
    const usageDallage = formData.get("usageDallage") as UsageDallage;
    const finitionRaw = formData.get("finitionBeton") as string;
    const finitionBeton = finitionRaw ? (finitionRaw as FinitionBeton) : undefined;

    if (usageDallage === "MARGELLE_PISCINE") {
      const materiauMargelle = formData.get("materiauMargelle") as MateriauMargelle;
      const largeurMargelle = parseFloat(formData.get("largeurMargelle") as string);
      const debordRaw = formData.get("debordMargelle") as string;
      const lineaireRaw = formData.get("lineaireM") as string;
      const portanceSolRaw = formData.get("portanceSol") as string;
      return calculerMargellePiscine({
        materiauMargelle,
        largeurMargelle,
        debordMargelle: debordRaw ? parseFloat(debordRaw) : undefined,
        lineaireM: lineaireRaw ? parseFloat(lineaireRaw) : undefined,
        finitionBeton,
        portanceSol: portanceSolRaw ? (portanceSolRaw as PortanceSol) : undefined,
      });
    }

    const niveauCharge = formData.get("niveauCharge") as NiveauCharge;
    const portanceSol = formData.get("portanceSol") as PortanceSol;
    const surfaceRaw = formData.get("surface") as string;
    return calculerDallage({
      usageDallage,
      niveauCharge,
      portanceSol,
      surface: surfaceRaw ? parseFloat(surfaceRaw) : undefined,
      finitionBeton,
    });
  }
  const effortNormal = parseFloat(formData.get("effortNormal") as string);
  const hauteurLibreRaw = formData.get("hauteurLibre") as string;
  const resistanceRaw = formData.get("resistance") as string;
  return calculerPoteau({
    materiau,
    effortNormal,
    hauteurLibre: hauteurLibreRaw ? parseFloat(hauteurLibreRaw) : undefined,
    resistance: resistanceRaw ? parseFloat(resistanceRaw) : undefined,
  });
}

export async function creerPreDimensionnement(formData: FormData): Promise<void> {
  const typeElement = formData.get("typeElement") as TypeElement;
  const materiau = formData.get("materiau") as Materiau;
  const resultat = calculerResultat(formData);

  const pdim = await prisma.preDimensionnement.create({
    data: {
      numero: await genNumeroPDIM(),
      titre: emptyToNull(formData.get("titre")),
      typeElement,
      materiau,
      portee: formData.get("portee") ? parseFloat(formData.get("portee") as string) : null,
      condition: emptyToNull(formData.get("condition")),
      niveauCharge: emptyToNull(formData.get("niveauCharge")),
      usagePreset: emptyToNull(formData.get("usagePreset")),
      usageDallage: emptyToNull(formData.get("usageDallage")),
      portanceSol: emptyToNull(formData.get("portanceSol")),
      surface: formData.get("surface") ? parseFloat(formData.get("surface") as string) : null,
      finitionBeton: emptyToNull(formData.get("finitionBeton")),
      materiauMargelle: emptyToNull(formData.get("materiauMargelle")),
      largeurMargelle: formData.get("largeurMargelle") ? parseFloat(formData.get("largeurMargelle") as string) : null,
      debordMargelle: formData.get("debordMargelle") ? parseFloat(formData.get("debordMargelle") as string) : null,
      lineaireM: formData.get("lineaireM") ? parseFloat(formData.get("lineaireM") as string) : null,
      effortNormal: formData.get("effortNormal") ? parseFloat(formData.get("effortNormal") as string) : null,
      hauteurLibre: formData.get("hauteurLibre") ? parseFloat(formData.get("hauteurLibre") as string) : null,
      resistance: formData.get("resistance") ? parseFloat(formData.get("resistance") as string) : null,
      resultatValeurCm: resultat.valeurCm,
      resultatLargeurCm: resultat.largeurCm ?? null,
      resultatLabel: resultat.label,
      formule: resultat.formule,
      hypotheses: resultat.hypotheses.join("\n"),
      chantierId: emptyToNull(formData.get("chantierId")),
      responsable: emptyToNull(formData.get("responsable")),
      notes: emptyToNull(formData.get("notes")),
    },
  });

  revalidatePath("/etude-prix/pre-dimensionnement");
  redirect(`/etude-prix/pre-dimensionnement/${pdim.id}`);
}

export async function modifierPreDimensionnement(id: string, formData: FormData): Promise<void> {
  const typeElement = formData.get("typeElement") as TypeElement;
  const materiau = formData.get("materiau") as Materiau;
  const resultat = calculerResultat(formData);

  await prisma.preDimensionnement.update({
    where: { id },
    data: {
      titre: emptyToNull(formData.get("titre")),
      typeElement,
      materiau,
      portee: formData.get("portee") ? parseFloat(formData.get("portee") as string) : null,
      condition: emptyToNull(formData.get("condition")),
      niveauCharge: emptyToNull(formData.get("niveauCharge")),
      usagePreset: emptyToNull(formData.get("usagePreset")),
      usageDallage: emptyToNull(formData.get("usageDallage")),
      portanceSol: emptyToNull(formData.get("portanceSol")),
      surface: formData.get("surface") ? parseFloat(formData.get("surface") as string) : null,
      finitionBeton: emptyToNull(formData.get("finitionBeton")),
      materiauMargelle: emptyToNull(formData.get("materiauMargelle")),
      largeurMargelle: formData.get("largeurMargelle") ? parseFloat(formData.get("largeurMargelle") as string) : null,
      debordMargelle: formData.get("debordMargelle") ? parseFloat(formData.get("debordMargelle") as string) : null,
      lineaireM: formData.get("lineaireM") ? parseFloat(formData.get("lineaireM") as string) : null,
      effortNormal: formData.get("effortNormal") ? parseFloat(formData.get("effortNormal") as string) : null,
      hauteurLibre: formData.get("hauteurLibre") ? parseFloat(formData.get("hauteurLibre") as string) : null,
      resistance: formData.get("resistance") ? parseFloat(formData.get("resistance") as string) : null,
      resultatValeurCm: resultat.valeurCm,
      resultatLargeurCm: resultat.largeurCm ?? null,
      resultatLabel: resultat.label,
      formule: resultat.formule,
      hypotheses: resultat.hypotheses.join("\n"),
      chantierId: emptyToNull(formData.get("chantierId")),
      responsable: emptyToNull(formData.get("responsable")),
      notes: emptyToNull(formData.get("notes")),
    },
  });

  revalidatePath("/etude-prix/pre-dimensionnement");
  revalidatePath(`/etude-prix/pre-dimensionnement/${id}`);
  redirect(`/etude-prix/pre-dimensionnement/${id}`);
}

export async function supprimerPreDimensionnement(id: string): Promise<void> {
  const docs = await prisma.preDimensionnementDocument.findMany({ where: { preDimensionnementId: id }, select: { url: true } });
  for (const doc of docs) {
    await supprimerFichierStocke(doc.url);
  }
  await prisma.preDimensionnement.delete({ where: { id } });
  revalidatePath("/etude-prix/pre-dimensionnement");
  redirect("/etude-prix/pre-dimensionnement");
}

export async function ajouterDocumentPreDimensionnement(id: string, formData: FormData): Promise<void> {
  const fichier = formData.get("fichier") as File | null;
  if (!fichier || fichier.size === 0) return;
  const type = (formData.get("type") as string) || "AUTRE";

  const { url, taille } = await stockerFichier(fichier, "pre-dimensionnement");

  await prisma.preDimensionnementDocument.create({
    data: {
      preDimensionnementId: id,
      type,
      nom: fichier.name,
      url,
      taille,
    },
  });

  revalidatePath(`/etude-prix/pre-dimensionnement/${id}`);
}

export async function supprimerDocumentPreDimensionnement(docId: string): Promise<void> {
  const doc = await prisma.preDimensionnementDocument.findUnique({ where: { id: docId } });
  if (!doc) return;
  await supprimerFichierStocke(doc.url);
  await prisma.preDimensionnementDocument.delete({ where: { id: docId } });
  revalidatePath(`/etude-prix/pre-dimensionnement/${doc.preDimensionnementId}`);
}

const IMAGE_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;

async function enregistrerAnalyseIA(docId: string, preDimensionnementId: string, texte: string): Promise<void> {
  await prisma.preDimensionnementDocument.update({
    where: { id: docId },
    data: { analyseIA: texte, analyseIADate: new Date() },
  });
  revalidatePath(`/etude-prix/pre-dimensionnement/${preDimensionnementId}`);
}

export async function analyserPlanIA(docId: string): Promise<void> {
  const doc = await prisma.preDimensionnementDocument.findUnique({ where: { id: docId } });
  if (!doc) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    await enregistrerAnalyseIA(
      docId,
      doc.preDimensionnementId,
      "Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans les variables d'environnement pour activer l'analyse automatique.",
    );
    return;
  }

  const fichier = await recupererBufferFichier(doc.url);
  if (!fichier) {
    await enregistrerAnalyseIA(docId, doc.preDimensionnementId, "Fichier introuvable — analyse impossible.");
    return;
  }

  const isPdf = fichier.contentType === "application/pdf";
  const mediaTypeImage = (IMAGE_MEDIA_TYPES as readonly string[]).includes(fichier.contentType)
    ? (fichier.contentType as (typeof IMAGE_MEDIA_TYPES)[number])
    : "image/jpeg";
  const data = fichier.buffer.toString("base64");

  const client = new Anthropic({ apiKey });
  const prompt =
    "Tu analyses un document technique BTP (plan de niveau, plan de coupe de détail, ou étude géotechnique). " +
    "Extrais et liste en français, de façon concise et structurée :\n" +
    "- Les cotes et dimensions visibles (portées, hauteurs, épaisseurs, surfaces), avec leur unité\n" +
    "- Le type d'ouvrage représenté si identifiable (dalle, poutre, poteau, dallage, fondation…)\n" +
    "- Toute indication de charge, d'usage ou de nature de sol mentionnée\n" +
    "Si le document est illisible ou ne contient pas d'information exploitable, dis-le clairement. " +
    "Rappelle systématiquement que cette lecture automatique doit être vérifiée par un humain avant tout usage.";

  let texte: string;
  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            isPdf
              ? { type: "document", source: { type: "base64", media_type: "application/pdf", data } }
              : { type: "image", source: { type: "base64", media_type: mediaTypeImage, data } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
    const bloc = response.content.find((b) => b.type === "text");
    texte = bloc && bloc.type === "text" ? bloc.text : "Aucune réponse exploitable de l'IA.";
  } catch (err) {
    texte = `Erreur lors de l'analyse IA : ${err instanceof Error ? err.message : "erreur inconnue"}`;
  }

  await enregistrerAnalyseIA(docId, doc.preDimensionnementId, texte);
}
