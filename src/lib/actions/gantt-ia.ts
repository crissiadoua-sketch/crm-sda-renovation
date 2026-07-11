"use server";

import { prisma } from "@/lib/prisma";
import { CORPS_ETAT_LABELS } from "@/lib/corps-etat";

export type TacheIA = {
  nom: string;
  corpsEtat: string;
  duree: number;
  ordre: number;
  predecesseurOrdres: number[];
  priorite: "FAIBLE" | "NORMALE" | "HAUTE" | "URGENTE";
  notes: string;
};

export type PlanningIAResult =
  | { taches: TacheIA[]; devisInfo: string }
  | { error: string };

export async function genererPlanningIA(chantierId: string): Promise<PlanningIAResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "Clé API Anthropic non configurée (ANTHROPIC_API_KEY manquante)." };
  }

  const chantier = await prisma.chantier.findUnique({
    where: { id: chantierId },
    include: {
      client: true,
      devis: {
        where: { statut: { in: ["ACCEPTE", "ENVOYE", "BROUILLON"] } },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: {
          lignes: { orderBy: { ordre: "asc" } },
          signature: { select: { id: true } },
        },
      },
    },
  });

  if (!chantier) return { error: "Chantier introuvable." };

  // Préférer le devis signé, puis accepté, puis le plus récent
  const devis =
    chantier.devis.find((d) => d.signature) ??
    chantier.devis.find((d) => d.statut === "ACCEPTE") ??
    chantier.devis[0];

  if (!devis) {
    return { error: "Aucun devis trouvé pour ce chantier. Créez d'abord un devis." };
  }

  const stripHtml = (s: string | null | undefined) =>
    (s ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  const lignesDesc = devis.lignes
    .map((l) => {
      if (l.type === "CHAPITRE") return `\n## ${stripHtml(l.designation)}`;
      if (l.type === "LIGNE") {
        const qte = l.quantite ? `${l.quantite} ${l.unite ?? ""}` : "";
        const pu = l.prixUnitaireHT ? `à ${Number(l.prixUnitaireHT).toLocaleString("fr-FR")}€/u` : "";
        return `- ${stripHtml(l.designation)} ${qte} ${pu}`.trim();
      }
      return null;
    })
    .filter(Boolean)
    .join("\n");

  const corpsEtatList = Object.entries(CORPS_ETAT_LABELS)
    .map(([code, label]) => `${code}: ${label}`)
    .join("\n");

  const dateDebutStr = chantier.dateDebut
    ? new Date(chantier.dateDebut).toLocaleDateString("fr-FR")
    : "non définie";

  const statutDevis = devis.signature ? "SIGNÉ" : devis.statut;
  const devisInfo = `${devis.numero}${devis.objet ? ` — ${stripHtml(devis.objet)}` : ""} (${statutDevis}) — TTC : ${Number(devis.totalTTC).toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`;

  const prompt = `Tu es un expert en conduite de travaux et planification de chantier pour SDA Rénovation, entreprise tous corps d'état.
Génère un planning de travaux réaliste à partir du devis ci-dessous. Réponds UNIQUEMENT avec un tableau JSON valide, sans texte avant ni après.

CHANTIER :
Nom : ${chantier.nom}
Date de début prévue : ${dateDebutStr}
Délai d'exécution : ${devis.delaiExecution ?? "non précisé"}
Devis : ${devisInfo}

CONTENU DU DEVIS :
${lignesDesc || "(contenu non disponible)"}

CODES CORPS D'ÉTAT DISPONIBLES (utilise exactement ces codes) :
${corpsEtatList}

RÈGLES OBLIGATOIRES :
1. Entre 8 et 20 tâches concrètes basées sur le contenu du devis
2. Respecter l'ordre DTU : TER → MAC/DAL → COV/ZIN → MEN (ext) → ITE/RAV → PLO/ELE → PLA → AGE/RMU/RSD/RSS → PEI → SER
3. Chaque tâche a un code corpsEtat parmi ceux listés, ou "" si hors corps d'état (installation, nettoyage)
4. Durées réalistes en jours ouvrés : installation=1j, terrassement=2-5j, maçonnerie=3-10j, ravalement=5-15j, peinture=3-7j, etc.
5. predecesseurOrdres = liste des numéros d'ordre des tâches dont celle-ci dépend (logique construction)
6. Tâche 1 = "Installation de chantier" (corpsEtat:"", duree:1, predecesseurOrdres:[])
7. Dernière tâche = "Repli de chantier et nettoyage" (corpsEtat:"", predecesseurs = toutes les tâches terminales)
8. priorite : "HAUTE" pour gros œuvre/structurel, "NORMALE" pour le reste, "FAIBLE" pour finitions légères

FORMAT JSON (respecter exactement cette structure) :
[
  {"nom":"Installation de chantier","corpsEtat":"","duree":1,"ordre":1,"predecesseurOrdres":[],"priorite":"NORMALE","notes":""},
  {"nom":"Terrassement et fouilles","corpsEtat":"TER","duree":3,"ordre":2,"predecesseurOrdres":[1],"priorite":"HAUTE","notes":""},
  ...
]`;

  try {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 3000,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      (response.content.find((b) => b.type === "text") as { type: "text"; text: string } | undefined)?.text ?? "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return { error: "L'IA n'a pas retourné de JSON valide. Réessayez." };

    const taches: TacheIA[] = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(taches) || taches.length === 0) {
      return { error: "L'IA n'a pas généré de tâches. Réessayez." };
    }

    return { taches, devisInfo };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return { error: `Erreur IA : ${msg}` };
  }
}
