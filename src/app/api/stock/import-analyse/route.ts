import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

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
[{"designation":"Tube PER 16/20 mm","reference":"REF123","unite":"ml","prixUnitaireHT":1.25,"conditionnement":"Rouleau 25 ml","corpsEtat":"PLO","categorie":"MATERIAU","notes":""},...]

Si aucun article n'est trouvé, retourne [].`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier fourni" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = file.type as "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "application/pdf";

    // Utilise les blocs document pour PDF, image pour les autres
    const contentBlock = mimeType === "application/pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
        }
      : {
          type: "image" as const,
          source: { type: "base64" as const, media_type: mimeType, data: base64 },
        };

    const response = await client.messages.create({
      model:      "claude-sonnet-4-6",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: PROMPT },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    // Extraire le JSON de la réponse
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ articles: [] });
    }

    const articles = JSON.parse(jsonMatch[0]) as ArticleExtrait[];
    return NextResponse.json({ articles });
  } catch (err) {
    console.error("Erreur analyse stock:", err);
    return NextResponse.json({ error: "Erreur lors de l'analyse" }, { status: 500 });
  }
}
