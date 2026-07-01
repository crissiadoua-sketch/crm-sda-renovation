/**
 * Système de codification SDA Rénovation
 *
 * Format clients/tiers : PREFIX-NNNN-INITIALES
 * Format documents     : PREFIX-AAAA-NNN
 *
 * Les préfixes, le nombre de chiffres et la règle de gel légal (devis/
 * factures : tout changement de préfixe ne prend effet qu'à l'exercice
 * suivant) sont désormais configurables dans Paramètres > Codifications —
 * voir src/lib/codification.ts pour le moteur de génération. Ce fichier ne
 * garde que le calcul des initiales et les libellés d'affichage, qui n'ont
 * pas vocation à changer.
 */

// ─── Types et labels clients ──────────────────────────────────────────────────

export const CLIENT_TYPES = [
  "PA", "CO", "SY", "AR", "ARI", "AS", "PB", "PHB", "ET", "CT", "MA", "AI", "P", "SCI",
] as const;

export type ClientType = typeof CLIENT_TYPES[number];

/** Préfixe de codification = le type lui-même */
export const CLIENT_TYPE_LABELS: Record<string, string> = {
  PA:  "Particulier",
  CO:  "Copropriété",
  SY:  "Syndic",
  AR:  "Architecte",
  ARI: "Architecte d'intérieur",
  AS:  "Assurance sinistre",
  PB:  "Professionnel BTP",
  PHB: "Professionnel hors BTP",
  ET:  "État",
  CT:  "Collectivité territoriale",
  MA:  "Mairie",
  AI:  "Agence immobilière",
  P:   "Promoteur",
  SCI: "SCI",
};

/** Retourne vrai si le type est un particulier (format prénom + nom) */
export function isParticulier(type: string): boolean {
  return type === "PA";
}

// ─── Calcul des initiales ─────────────────────────────────────────────────────

/**
 * Calcule les initiales à partir des données du client :
 * - Particulier : 1ère lettre du prénom + 1ère lettre du nom
 * - Entreprise / collectivité : initiales du contact, sinon 2 premières lettres de la raison sociale
 */
export function calcInitiales(opts: {
  prenom?: string | null;
  nom?: string | null;
  raisonSociale?: string | null;
  contact?: string | null;
}): string {
  const clean = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");

  // Prénom + Nom (particulier ou architecte individuel)
  if (opts.prenom && opts.nom) {
    const p = clean(opts.prenom)[0] ?? "";
    const n = clean(opts.nom)[0] ?? "";
    return (p + n) || "XX";
  }

  // Contact fourni (copropriété, syndic, etc.)
  if (opts.contact) {
    const parts = opts.contact.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = clean(parts[0])[0] ?? "";
      const last = clean(parts[parts.length - 1])[0] ?? "";
      return (first + last) || "XX";
    }
    return clean(opts.contact).slice(0, 2) || "XX";
  }

  // Raison sociale (ignore les mots courts type SA/SARL/SAS/DE/LA…)
  if (opts.raisonSociale) {
    const SKIP = new Set(["SA", "SAS", "SARL", "SCI", "EURL", "SASU", "DE", "DU", "LA", "LE", "LES", "ET", "L"]);
    const words = opts.raisonSociale.trim().split(/\s+/).filter((w) => !SKIP.has(w.toUpperCase()) && w.length > 1);
    if (words.length >= 2) {
      return (clean(words[0])[0] ?? "") + (clean(words[1])[0] ?? "");
    }
    if (words.length === 1) return clean(words[0]).slice(0, 2);
    return clean(opts.raisonSociale).slice(0, 2) || "XX";
  }

  // Repli sur nom seul
  if (opts.nom) return clean(opts.nom).slice(0, 2) || "XX";

  return "XX";
}

// ─── Labels lisibles pour l'interface ────────────────────────────────────────

export const DEVIS_TYPE_LABELS: Record<string, string> = {
  INITIAL: "Devis initial",
  VARIANTE: "Variante de devis",
  AVENANT: "Avenant",
};

export const FACTURE_TYPE_LABELS: Record<string, string> = {
  STANDARD: "Facture",
  ACOMPTE: "Facture d'acompte",
  SITUATION: "Facture de situation",
  SOLDE: "Facture de solde",
  AVOIR: "Avoir",
};

export const FACTURE_TYPE_BADGE: Record<string, "blue" | "orange" | "green" | "gray" | "navy"> = {
  STANDARD: "blue",
  ACOMPTE: "orange",
  SITUATION: "navy",
  SOLDE: "green",
  AVOIR: "gray",
};
