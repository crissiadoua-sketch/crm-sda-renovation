import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Vercel : autoriser jusqu'à 60s (analyse IA peut être lente)
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
};

const PROMPT = `Tu es un expert en gestion de stock BTP. Analyse cette facture ou ce devis fournisseur et extrais tous les articles/lignes produits.

Pour chaque article, retourne un objet JSON avec :
- designation : nom complet de l'article (string)
- reference : référence fournisseur si visible, sinon "" (string)
- unite : unité de mesure (u, m², ml, L, kg, m³, boîte, rouleau, sac, carton...) (string)
- prixUnitaireHT : prix unitaire HT en euros, nombre décimal (number, 0 si non trouvé)
- conditionnement : description du conditionnement si visible (ex. "Sac 25 kg", "Rouleau 25 ml", "") (string)
- corpsEtat : corps d'état le plus probable parmi : GO, CHA, COU, ETA, MEX, MIN, PLA, ISO, CAR, PEI, PLO, ELE, CVC, VRD, DEM, BUR, GEN (string)
- categorie : MATERIAU, FOURNITURE, OUTILLAGE, EPI ou CONSOMMABLE (string)
- notes : informations utiles complémentaires (string, peut être vide)

Retourne UNIQUEMENT un tableau JSON valide, sans texte autour. Exemple :
[{"designation":"Tube PER 16/20 mm","reference":"REF123","unite":"ml","prixUnitaireHT":1.25,"conditionnement":"Rouleau 25 ml","corpsEtat":"PLO","categorie":"MATERIAU","notes":""}]

Si aucun article n'est trouvé, retourne [].`;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Clé API Anthropic non configurée (ANTHROPIC_API_KEY manquante)." }, { status: 503 });
    }
    const client = new Anthropic({ apiKey });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    // Limite de taille : 20 Mo
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 20 Mo)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type;
    const isPDF = mimeType === "application/pdf";

    let response;

    if (isPDF) {
      // PDF : utilise le beta PDF support d'Anthropic
      response = await (client.beta.messages.create as Function)({
        model:      "claude-sonnet-4-6",
        max_tokens: 4096,
        betas:      ["pdfs-2024-09-25"],
        messages: [
          {
            role: "user",
            content: [
              {
                type:   "document",
                source: { type: "base64", media_type: "application/pdf", data: base64 },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      });
    } else {
      // Image (JPG, PNG, WEBP, GIF)
      const supportedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (!supportedTypes.includes(mimeType)) {
        return NextResponse.json({ error: `Format non supporté : ${mimeType}. Utilisez PDF, JPG, PNG ou WEBP.` }, { status: 400 });
      }
      response = await client.messages.create({
        model:      "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type:   "image",
                source: {
                  type:       "base64",
                  media_type: mimeType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
                  data:       base64,
                },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      });
    }

    const text = (response as { content: { type: string; text?: string }[] }).content[0]?.type === "text"
      ? ((response as { content: { type: string; text?: string }[] }).content[0] as { type: string; text: string }).text
      : "";

    // Extraire le JSON de la réponse
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ articles: [], debug: text.slice(0, 200) });
    }

    const articles = JSON.parse(jsonMatch[0]) as ArticleExtrait[];
    return NextResponse.json({ articles });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erreur analyse stock:", message);
    return NextResponse.json({ error: `Erreur : ${message}` }, { status: 500 });
  }
}
