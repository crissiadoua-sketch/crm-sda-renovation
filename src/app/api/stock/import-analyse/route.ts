import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

export const maxDuration = 60;

export type ArticleExtrait = {
  designation:     string;
  reference:       string;
  unite:           string;
  prixUnitaireHT:  number;
  conditionnement: string;
  corpsEtat:       string;
  categorie:       string;
  notes:           string;
  doublon?:        boolean; // true si article déjà présent en stock
  doublonRef?:     string;  // référence de l'article existant
};

function buildPrompt(fournisseurs: { id: string; nom: string }[]): string {
  const listeFournisseurs = fournisseurs.length > 0
    ? `\nFOURNISSEURS CONNUS DANS LE CRM (pour matching) :\n${fournisseurs.map((f) => `- "${f.nom}" → id: ${f.id}`).join("\n")}\n`
    : "";

  return `Tu es un expert en gestion de stock BTP. Analyse ce document (facture, devis, bon de livraison, catalogue ou liste de prix fournisseur).
${listeFournisseurs}
ÉTAPE 1 — Identifie le fournisseur émetteur du document (nom de l'entreprise en haut de la facture/devis). Si tu le retrouves dans la liste des fournisseurs CRM ci-dessus, utilise son id exact. Sinon, indique son nom tel qu'écrit dans le document.

ÉTAPE 2 — Extrais TOUS les articles/produits avec désignation identifiable.

EXCLUSIONS STRICTES (ne jamais extraire) :
- Éco-contribution, éco-participation, VALOBAT, ECOLOGIC, DEEE, REP, contribution environnementale
- Frais de port, frais de livraison, transport
- Remises, ristournes, escomptes, avoirs
- TVA, taxes diverses
- Toute ligne dont le montant est une taxe ou contribution environnementale

FORMAT DE RÉPONSE — Retourne UNIQUEMENT ce JSON (sans texte autour) :
{
  "fournisseurNom": "nom du fournisseur détecté ou null",
  "fournisseurId": "id si trouvé dans la liste CRM, sinon null",
  "articles": [
    {
      "designation": "nom complet de l'article",
      "reference": "référence fournisseur ou code article, sinon vide",
      "unite": "u, m², ml, L, kg, m³, boîte, rouleau, sac, carton, palette ou lot",
      "prixUnitaireHT": 0.00,
      "conditionnement": "ex: Sac 25 kg, ou vide",
      "corpsEtat": "GO|CHA|COU|ETA|MEX|MIN|PLA|ISO|CAR|PEI|PLO|ELE|CVC|VRD|DEM|BUR|GEN",
      "categorie": "MATERIAU|FOURNITURE|OUTILLAGE|EPI|CONSOMMABLE",
      "notes": ""
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API Anthropic non configurée (ANTHROPIC_API_KEY manquante)." }, { status: 503 });
    }
    const client = new Anthropic({ apiKey });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const fournisseursJson = formData.get("fournisseurs") as string | null;
    const fournisseurs: { id: string; nom: string }[] = fournisseursJson ? JSON.parse(fournisseursJson) : [];

    if (!file) return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type;
    const isPDF = mimeType === "application/pdf";
    const prompt = buildPrompt(fournisseurs);

    let response;
    if (isPDF) {
      response = await (client.beta.messages.create as Function)({
        model: "claude-sonnet-4-6", max_tokens: 4096, betas: ["pdfs-2024-09-25"],
        messages: [{ role: "user", content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: prompt },
        ]}],
      });
    } else {
      const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!supportedTypes.includes(mimeType)) {
        return NextResponse.json({ error: `Format non supporté : ${mimeType}` }, { status: 400 });
      }
      response = await client.messages.create({
        model: "claude-sonnet-4-6", max_tokens: 4096,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif", data: base64 } },
          { type: "text", text: prompt },
        ]}],
      });
    }

    const text = (response as { content: { type: string; text?: string }[] }).content[0]?.type === "text"
      ? ((response as { content: { type: string; text?: string }[] }).content[0] as { type: string; text: string }).text
      : "";

    console.log("Claude response (first 500):", text.slice(0, 500));

    // Extraire le JSON — supporte objet {articles:[...]} ET tableau direct [...]
    // dans un bloc ```json ou en texte brut
    let parsed: { fournisseurNom?: string; fournisseurId?: string; articles?: ArticleExtrait[] } | null = null;

    // 1. Bloc ```json {...}``` ou ```json [...]```
    const codeBlockObj = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/s);
    const codeBlockArr = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/s);

    if (codeBlockObj?.[1]) {
      try { parsed = JSON.parse(codeBlockObj[1]); } catch { /* ignore */ }
    }
    if (!parsed && codeBlockArr?.[1]) {
      try { parsed = { articles: JSON.parse(codeBlockArr[1]) }; } catch { /* ignore */ }
    }

    // 2. Objet direct avec clé "articles"
    if (!parsed) {
      const directObj = text.match(/\{[\s\S]*"articles"[\s\S]*\}/s);
      if (directObj?.[0]) { try { parsed = JSON.parse(directObj[0]); } catch { /* ignore */ } }
    }

    // 3. Tableau direct
    if (!parsed) {
      const arrMatch = text.match(/\[[\s\S]*\]/s);
      if (arrMatch?.[0]) { try { parsed = { articles: JSON.parse(arrMatch[0]) }; } catch { /* ignore */ } }
    }

    if (!parsed?.articles?.length) {
      return NextResponse.json({ articles: [], debug: `Aucun article extrait. Réponse Claude : ${text.slice(0, 400)}` });
    }

    // Détection des doublons dans le stock existant
    const stockExistant = await prisma.articleStock.findMany({
      select: { reference: true, designation: true, refFournisseur: true },
    });

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

    const articlesAvecDoublons: ArticleExtrait[] = parsed.articles.map((a) => {
      // Doublon par référence fournisseur
      if (a.reference) {
        const byRef = stockExistant.find((s) => s.refFournisseur && normalize(s.refFournisseur) === normalize(a.reference));
        if (byRef) return { ...a, doublon: true, doublonRef: byRef.reference };
      }
      // Doublon par désignation (similarité exacte normalisée)
      const byDesig = stockExistant.find((s) => normalize(s.designation) === normalize(a.designation));
      if (byDesig) return { ...a, doublon: true, doublonRef: byDesig.reference };
      return { ...a, doublon: false };
    });

    return NextResponse.json({
      articles:        articlesAvecDoublons,
      fournisseurNom:  parsed.fournisseurNom ?? null,
      fournisseurId:   parsed.fournisseurId ?? null,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erreur analyse stock:", message);
    return NextResponse.json({ error: `Erreur : ${message}` }, { status: 500 });
  }
}
