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

const PROMPT = `Tu es un expert en gestion de stock BTP. Analyse ce document (facture, devis, bon de livraison, catalogue ou liste de prix fournisseur) et extrais TOUS les articles/produits/lignes que tu peux identifier.

Sois très permissif : extrais tout ce qui ressemble à un produit, matériau, fourniture ou prestation avec une désignation. Même si le prix n'est pas visible, inclus l'article avec prixUnitaireHT = 0.

EXCLUSIONS STRICTES — N'extrais JAMAIS les lignes suivantes (ce ne sont pas des produits) :
- Éco-contribution, éco-participation, éco-taxe
- DEEE (Déchets d'Équipements Électriques et Électroniques)
- Éco-mobilier, éco-emballage, éco-organisme
- REP (Responsabilité Élargie du Producteur)
- Frais de port, frais de livraison, frais de transport
- Remises, ristournes, escomptes
- TVA, taxes diverses
- Toute ligne dont la désignation contient "éco-contribution", "contribution environnementale", "taxe", "REP", "DEEE"

Pour chaque article, retourne un objet JSON :
- designation : nom complet de l'article (string, OBLIGATOIRE)
- reference : référence fournisseur/code article si visible, sinon "" (string)
- unite : unité de mesure la plus probable (u, m², ml, L, kg, m³, boîte, rouleau, sac, carton, palette, lot) (string)
- prixUnitaireHT : prix unitaire HT en euros, nombre décimal. Si TTC, déduire la TVA. 0 si absent. (number)
- conditionnement : ex. "Sac 25 kg", "Rouleau 25 ml", "" si absent (string)
- corpsEtat : parmi GO, CHA, COU, ETA, MEX, MIN, PLA, ISO, CAR, PEI, PLO, ELE, CVC, VRD, DEM, BUR, GEN. Choisis le plus logique selon la désignation. (string)
- categorie : MATERIAU, FOURNITURE, OUTILLAGE, EPI ou CONSOMMABLE (string)
- notes : conditionnement spécial, marque, norme, infos utiles (string)

Retourne UNIQUEMENT le tableau JSON, sans texte avant ou après, sans markdown.
Exemple : [{"designation":"Tube PER 16/20 mm","reference":"REF123","unite":"ml","prixUnitaireHT":1.25,"conditionnement":"Rouleau 25 ml","corpsEtat":"PLO","categorie":"MATERIAU","notes":""}]

Si le document ne contient vraiment aucun produit identifiable, retourne [].`;

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

    console.log("Claude response (first 500):", text.slice(0, 500));

    // Extraire le JSON — cherche d'abord un bloc ```json ... ```, puis un tableau nu
    let jsonStr: string | null = null;
    const codeBlock = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (codeBlock) {
      jsonStr = codeBlock[1];
    } else {
      const direct = text.match(/\[[\s\S]*\]/);
      if (direct) jsonStr = direct[0];
    }

    if (!jsonStr) {
      return NextResponse.json({ articles: [], debug: `Claude a répondu mais sans JSON détectable. Réponse : ${text.slice(0, 300)}` });
    }

    try {
      const articles = JSON.parse(jsonStr) as ArticleExtrait[];
      if (articles.length === 0) {
        return NextResponse.json({ articles: [], debug: "Claude a retourné un tableau vide — document non reconnu comme facture/devis fournisseur." });
      }
      return NextResponse.json({ articles });
    } catch {
      return NextResponse.json({ articles: [], debug: `JSON invalide retourné par Claude : ${jsonStr.slice(0, 200)}` });
    }

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Erreur analyse stock:", message);
    return NextResponse.json({ error: `Erreur : ${message}` }, { status: 500 });
  }
}
