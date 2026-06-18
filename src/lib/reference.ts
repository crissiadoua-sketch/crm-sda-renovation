/**
 * Système de codification SDA Rénovation
 *
 * Format clients/tiers : PREFIX-NNNN-INITIALES
 * Format documents     : PREFIX-AAAA-NNN
 *
 * ⚠️  RÈGLE COMPTABLE : Le système de codification est figé pour
 * l'exercice en cours. Il ne peut être modifié qu'en fin d'exercice
 * (bilan annuel) pour prendre effet sur l'exercice suivant.
 * Cette règle s'applique en particulier aux factures.
 *
 * ┌────────────────────────────────┬───────┬────────────────────────────────┐
 * │ Type de client / tiers         │ Préf. │ Exemple                        │
 * ├────────────────────────────────┼───────┼────────────────────────────────┤
 * │ Particulier                    │ PA    │ PA-0001-JD                     │
 * │ Copropriété                    │ CO    │ CO-0001-AR                     │
 * │ Syndic                         │ SY    │ SY-0001-MB                     │
 * │ Architecte                     │ AR    │ AR-0001-PL                     │
 * │ Architecte d'intérieur         │ ARI   │ ARI-0001-CD                    │
 * │ Assurance sinistre             │ AS    │ AS-0001-AG                     │
 * │ Professionnel BTP              │ PB    │ PB-0001-TL                     │
 * │ Professionnel hors BTP         │ PHB   │ PHB-0001-MD                    │
 * │ État                           │ ET    │ ET-0001-MI                     │
 * │ Collectivité territoriale      │ CT    │ CT-0001-GR                     │
 * │ Mairie                         │ MA    │ MA-0001-CM                     │
 * │ Agence immobilière             │ AI    │ AI-0001-MV                     │
 * │ Promoteur                      │ P     │ P-0001-BS                      │
 * │ SCI                            │ SCI   │ SCI-0001-DP                    │
 * ├────────────────────────────────┼───────┼────────────────────────────────┤
 * │ Fournisseur                    │ FOU   │ FOU-0001                       │
 * │ Sous-traitant                  │ ST    │ ST-0001                        │
 * ├────────────────────────────────┼───────┼────────────────────────────────┤
 * │ Devis initial                  │ DEV   │ DEV-2026-001                   │
 * │ Variante de devis              │ DVA   │ DVA-2026-001                   │
 * │ Avenant de devis               │ AVN   │ AVN-2026-001                   │
 * │ Facture (standard/acompte/sld) │ FAC   │ FAC-2026-001                   │
 * │ Facture de situation           │ SIT   │ SIT-2026-001                   │
 * │ Avoir                          │ AVO   │ AVO-2026-001                   │
 * │ Bon de commande                │ BDC   │ BDC-2026-001                   │
 * │ Bon de livraison               │ BDL   │ BDL-2026-001                   │
 * │ Dossier / Affaire chantier     │ AFF   │ AFF-2026-001                   │
 * │ Contrat de sous-traitance      │ CST   │ CST-2026-001                   │
 * │ Ordre de mission               │ OM    │ OM-2026-001                    │
 * └────────────────────────────────┴───────┴────────────────────────────────┘
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

// ─── Référence client (PREFIX-NNNN-INITIALES) ────────────────────────────────

/**
 * Génère la prochaine référence client.
 * La numérotation est séquentielle PAR TYPE.
 */
export function nextClientRef(
  type: string,
  existingRefs: string[],
  initiales: string,
): string {
  const p = `${type}-`;
  const nums = existingRefs
    .filter((r): r is string => typeof r === "string" && r.startsWith(p))
    .map((r) => {
      // Format: "PA-0001-JD" → extrait le numérique entre le 1er et 2ème tiret
      const parts = r.split("-");
      return parseInt(parts[1] ?? "0", 10);
    })
    .filter(Number.isFinite);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${type}-${String(next).padStart(4, "0")}-${initiales}`;
}

// ─── Référence tiers sans initiales (FOU-NNNN, ST-NNNN) ──────────────────────

function pad4(n: number) {
  return String(n).padStart(4, "0");
}

export function nextTiersRef(prefix: string, existing: string[]): string {
  const p = `${prefix}-`;
  const nums = existing
    .filter((r): r is string => typeof r === "string" && r.startsWith(p))
    .map((r) => parseInt(r.slice(p.length).split("-")[0] ?? "0", 10))
    .filter(Number.isFinite);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${p}${pad4(next)}`;
}

// ─── Documents datés (PREFIX-AAAA-NNN) ───────────────────────────────────────

function year() {
  return new Date().getFullYear();
}

export function nextDocRef(prefix: string, existing: string[]): string {
  const y = year();
  const prefixYear = `${prefix}-${y}-`;
  const nums = existing
    .filter((r) => r.startsWith(prefixYear))
    .map((r) => parseInt(r.slice(prefixYear.length), 10))
    .filter(Number.isFinite);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefixYear}${String(next).padStart(3, "0")}`;
}

// ─── Préfixes par type de document ───────────────────────────────────────────

export function devisPrefix(type: string): string {
  if (type === "VARIANTE") return "DVA";
  if (type === "AVENANT") return "AVN";
  return "DEV";
}

export function facturePrefix(type: string): string {
  if (type === "SITUATION") return "SIT";
  if (type === "AVOIR") return "AVO";
  return "FAC";
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
