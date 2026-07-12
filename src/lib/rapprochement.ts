import { differenceInCalendarDays } from "date-fns";
import { inflateSync, inflateRawSync } from "zlib";

export type LigneImportee = {
  date: Date;
  libelle: string;
  montant: number; // positif = crédit, négatif = débit
  reference: string | null;
};

function parseMontantFr(raw: string): number {
  // "1 234,56" / "1.234,56" / "-12,30" / "1234.56" → 1234.56
  const nettoye = raw.replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const valeur = parseFloat(nettoye);
  return Number.isFinite(valeur) ? valeur : parseFloat(raw.replace(",", ".")) || 0;
}

function parseDateFr(raw: string): Date | null {
  const s = raw.trim();
  // dd/mm/yyyy ou dd-mm-yyyy
  const m1 = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (m1) return new Date(Number(m1[3]), Number(m1[2]) - 1, Number(m1[1]));
  // yyyy-mm-dd
  const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m2) return new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]));
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Parse un relevé bancaire au format CSV — supporte les exports bancaires français usuels :
 * - colonnes "Date;Libellé;Montant" (un seul montant signé)
 * - colonnes "Date;Libellé;Débit;Crédit" (deux colonnes séparées)
 * Détecte automatiquement le séparateur (; ou ,) et les en-têtes (insensible à la casse/accents).
 */
export function parseCsvReleve(contenu: string): LigneImportee[] {
  const lignesBrutes = contenu.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lignesBrutes.length === 0) return [];

  const separateur = lignesBrutes[0].includes(";") ? ";" : ",";
  const entetes = lignesBrutes[0].split(separateur).map((h) =>
    h.trim().toLowerCase().replace(/[éèê]/g, "e").replace(/["']/g, ""),
  );

  const idxDate = entetes.findIndex((h) => h.includes("date"));
  const idxLibelle = entetes.findIndex((h) => h.includes("libelle") || h.includes("description") || h.includes("intitule"));
  const idxMontant = entetes.findIndex((h) => h === "montant" || h.includes("amount"));
  const idxDebit = entetes.findIndex((h) => h.includes("debit"));
  const idxCredit = entetes.findIndex((h) => h.includes("credit"));
  const idxReference = entetes.findIndex((h) => h.includes("reference") || h.includes("ref"));

  if (idxDate === -1 || (idxMontant === -1 && idxDebit === -1 && idxCredit === -1)) {
    throw new Error("Format CSV non reconnu — colonnes attendues : Date, Libellé, Montant (ou Débit/Crédit).");
  }

  const resultat: LigneImportee[] = [];
  for (let i = 1; i < lignesBrutes.length; i++) {
    const cols = lignesBrutes[i].split(separateur).map((c) => c.trim().replace(/^"|"$/g, ""));
    const date = parseDateFr(cols[idxDate] ?? "");
    if (!date) continue;

    let montant = 0;
    if (idxMontant !== -1 && cols[idxMontant]) {
      montant = parseMontantFr(cols[idxMontant]);
    } else {
      const debit = idxDebit !== -1 && cols[idxDebit] ? parseMontantFr(cols[idxDebit]) : 0;
      const credit = idxCredit !== -1 && cols[idxCredit] ? parseMontantFr(cols[idxCredit]) : 0;
      montant = credit - Math.abs(debit);
    }

    resultat.push({
      date,
      libelle: cols[idxLibelle] ?? "",
      montant,
      reference: idxReference !== -1 ? (cols[idxReference] || null) : null,
    });
  }
  return resultat;
}

/**
 * Parse un relevé bancaire au format OFX (SGML) — extraction par expressions régulières des blocs
 * <STMTTRN>...</STMTTRN>, sans dépendance externe. Couvre les exports OFX 1.x standards.
 */
export function parseOfxReleve(contenu: string): LigneImportee[] {
  const blocs = contenu.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? [];
  const resultat: LigneImportee[] = [];

  function extraire(bloc: string, tag: string): string | null {
    const m = bloc.match(new RegExp(`<${tag}>([^<\\r\\n]*)`, "i"));
    return m ? m[1].trim() : null;
  }

  for (const bloc of blocs) {
    const dtposted = extraire(bloc, "DTPOSTED");
    const trnamt = extraire(bloc, "TRNAMT");
    if (!dtposted || !trnamt) continue;
    const annee = Number(dtposted.slice(0, 4));
    const mois = Number(dtposted.slice(4, 6));
    const jour = Number(dtposted.slice(6, 8));
    const date = new Date(annee, mois - 1, jour);
    if (Number.isNaN(date.getTime())) continue;

    const libelle = extraire(bloc, "NAME") ?? extraire(bloc, "MEMO") ?? "";
    const reference = extraire(bloc, "CHECKNUM") ?? extraire(bloc, "REFNUM") ?? extraire(bloc, "FITID");

    resultat.push({ date, libelle, montant: parseFloat(trnamt) || 0, reference });
  }
  return resultat;
}

const DATE_TOKEN = /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/;
const MONTANT_TOKEN = /(-?\d{1,3}(?:[ .]\d{3})*,\d{2})\s*[\x80¨€]?\s*$/;

// Unescape PDF literal string (\n \r \t \\ \( \) \ooo)
function unescapePdf(s: string): string {
  return s.replace(/\\([nrt\\()0-7]{1,3})/g, (_, c) => {
    if (c === "n") return "\n";
    if (c === "r") return "\r";
    if (c === "t") return "\t";
    if (c === "\\" || c === "(" || c === ")") return c;
    return String.fromCharCode(parseInt(c, 8));
  });
}

// Decode hex string <4865...> → binary string
function hexToStr(hex: string): string {
  const h = hex.replace(/\s/g, "");
  let r = "";
  for (let i = 0; i < h.length - 1; i += 2)
    r += String.fromCharCode(parseInt(h.slice(i, i + 2), 16));
  return r;
}

// Detect and decode UTF-16 BE strings (CIDFont / Type 0 fonts).
// Returns the decoded string if the heuristic fires, otherwise the original.
function tryUtf16(s: string): string {
  if (s.length < 4) return s;
  // BOM \xFE\xFF
  if (s.charCodeAt(0) === 0xfe && s.charCodeAt(1) === 0xff) {
    let r = "";
    for (let i = 2; i + 1 < s.length; i += 2)
      r += String.fromCharCode((s.charCodeAt(i) << 8) | s.charCodeAt(i + 1));
    return r || s;
  }
  // Heuristic: ≥60% of even-position bytes are 0x00 AND ≥60% of odd-position bytes are printable
  const n = Math.min(s.length & ~1, 16); // even, up to 16
  let evNull = 0, odPrint = 0;
  for (let i = 0; i + 1 < n; i += 2) {
    if (s.charCodeAt(i) === 0) evNull++;
    const c = s.charCodeAt(i + 1);
    if ((c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff)) odPrint++;
  }
  const pairs = n >> 1;
  if (pairs > 0 && evNull >= Math.ceil(pairs * 0.6) && odPrint >= Math.ceil(pairs * 0.6)) {
    let r = "";
    for (let i = 0; i + 1 < s.length; i += 2)
      r += String.fromCharCode((s.charCodeAt(i) << 8) | s.charCodeAt(i + 1));
    return r;
  }
  return s;
}

// Extract text from ONE decompressed content stream using PDF text operators.
// Handles Tj, TJ, and ' operators; also decodes UTF-16 BE (CIDFont).
function extractFromStream(s: string): string {
  const parts: string[] = [];

  // Match text-showing operators: (literal) Tj/TJ/'  |  <hex> Tj/TJ/'  |  [array] TJ
  const re =
    /(?:\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9a-fA-F\s]+)>|\[([^\]]*)\])\s*(?:T[jJ]|')/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    if (m[1] !== undefined) {
      const t = tryUtf16(unescapePdf(m[1]));
      if (t.trim()) parts.push(t);
    } else if (m[2] !== undefined) {
      const t = tryUtf16(hexToStr(m[2]));
      if (t.trim()) parts.push(t);
    } else if (m[3] !== undefined) {
      const inner = m[3];
      const chunk: string[] = [];
      const reEl = /\(([^)\\]*(?:\\.[^)\\]*)*)\)|<([0-9a-fA-F\s]+)>/g;
      let me;
      while ((me = reEl.exec(inner)) !== null) {
        chunk.push(
          me[1] !== undefined ? tryUtf16(unescapePdf(me[1])) : tryUtf16(hexToStr(me[2])),
        );
      }
      const joined = chunk.join("");
      if (joined.trim()) parts.push(joined);
    }
  }
  return parts.join("\n");
}

// Try zlib decompression; use raw bytes as fallback
function decompressOrRaw(data: Buffer): Buffer {
  try { return inflateSync(data); } catch { /* */ }
  try { return inflateRawSync(data); } catch { /* */ }
  return data;
}

// ── Parser Crédit Agricole ────────────────────────────────────────────────────
// Format spécifique : dates DD.MM (sans année), montants avec ¨ en fin de ligne
// ou sur une ligne séparée, colonnes Débit/Crédit distinctes.

function parsePdfCA(texte: string): LigneImportee[] | null {
  if (!/Ancien solde|CREDIT AGRICOLE|Date d.arr/i.test(texte)) return null;

  // Année extraite d'une date complète présente dans le document (ex. "30.04.2026")
  const yearM = texte.match(/\b\d{2}[./]\d{2}[./](\d{4})\b/);
  if (!yearM) return null;
  const year = parseInt(yearM[1]);

  // Lignes utiles uniquement (sans en-têtes / pieds de page CA)
  const SKIP =
    /^(?:Ancien solde|Nouveau solde|Total des op|Date d.arr|RELEVE|SYNTHESE|CREDIT AGRICOLE|TOULOUSE|IBAN|BIC|SDA|T[eé]l|Fax|Internet|SOS|Page |Votre |Agence|Soci[eé]t[eé]|ZI |Caisse|Co-Auteur|CR |N°\s*\d+\s*$|\d{4,}\s*$)/i;
  const lines = texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !SKIP.test(l));

  // ── Patterns ──
  // Ligne qui commence par DD.MM DD.MM [texte...]
  const RE_DATES_TEXT = /^(\d{2})\.(\d{2})\s+\d{2}\.\d{2}\s+(.+)/;
  // Ligne DD.MM DD.MM seule
  const RE_DATES_ONLY = /^(\d{2})\.(\d{2})\s+\d{2}\.\d{2}$/;
  // Fragment DD.MM seul
  const RE_SINGLE_DATE = /^(\d{2})\.(\d{2})$/;
  // Fragment DD.MM suivi d'autre chose (date valeur + suite sur même fragment)
  const RE_DATE_PREFIX = /^(\d{2})\.(\d{2})\s+(.*)/;
  // Montant seul sur la ligne : "0,38 ¨" / "2 338,42" / "25,90 ¨"
  const RE_AMOUNT = /^(\d[\d\s]*,\d{2})\s*[\x80¨€]?\s*$/;
  // Montant en fin de ligne : "Libellé quelconque 310,00 ¨"
  const RE_AMOUNT_TRAIL = /^(.*)\s+(\d[\d\s]*,\d{2})\s*[\x80¨€]?\s*$/;

  interface Seg {
    day: number;
    month: number;
    parts: string[];
    amount: string | null;
  }

  const segs: Seg[] = [];
  let cur: Seg | null = null;
  let pendingDate: { day: number; month: number } | null = null;

  const flush = () => {
    if (cur) {
      segs.push(cur);
      cur = null;
    }
  };

  for (const line of lines) {
    // DD.MM DD.MM [texte...]
    const m1 = line.match(RE_DATES_TEXT);
    if (m1) {
      flush();
      pendingDate = null;
      cur = { day: parseInt(m1[1]), month: parseInt(m1[2]), parts: [], amount: null };
      const rest = m1[3].trim();
      const trailM = rest.match(RE_AMOUNT_TRAIL);
      if (trailM) {
        if (trailM[1].trim()) cur.parts.push(trailM[1].trim());
        cur.amount = trailM[2];
      } else {
        cur.parts.push(rest);
      }
      continue;
    }

    // DD.MM DD.MM seule
    const m2 = line.match(RE_DATES_ONLY);
    if (m2) {
      flush();
      pendingDate = null;
      cur = { day: parseInt(m2[1]), month: parseInt(m2[2]), parts: [], amount: null };
      continue;
    }

    // DD.MM seul — potentiel début de date opération
    const m3 = line.match(RE_SINGLE_DATE);
    if (m3) {
      if (!pendingDate) {
        flush();
        pendingDate = { day: parseInt(m3[1]), month: parseInt(m3[2]) };
      } else {
        // pendingDate = date opé → ce DD.MM est la date valeur, on démarre le segment
        cur = { day: pendingDate.day, month: pendingDate.month, parts: [], amount: null };
        pendingDate = null;
      }
      continue;
    }

    // Date opé en attente + ligne "DD.MM texte..." → date valeur + début de libellé
    if (pendingDate) {
      const m4 = line.match(RE_DATE_PREFIX);
      if (m4) {
        cur = { day: pendingDate.day, month: pendingDate.month, parts: [], amount: null };
        pendingDate = null;
        const rest = m4[3].trim();
        const trailM = rest.match(RE_AMOUNT_TRAIL);
        if (trailM) {
          if (trailM[1].trim()) cur.parts.push(trailM[1].trim());
          cur.amount = trailM[2];
        } else if (rest) {
          cur.parts.push(rest);
        }
        continue;
      }
      // Pas une date → le pendingDate n'était pas une date de transaction
      pendingDate = null;
    }

    if (!cur) continue;

    // Montant sur sa propre ligne
    const amM = line.match(RE_AMOUNT);
    if (amM && cur.amount === null) {
      cur.amount = amM[1];
      continue;
    }

    // Continuation du libellé (uniquement si le montant n'est pas encore trouvé)
    if (cur.amount === null) {
      cur.parts.push(line);
    }
  }
  flush();

  if (segs.length === 0) return null;

  // ── Détermination du sens débit/crédit ──
  const DEBIT_KW =
    /^(?:Prlv\b|Cotis\b|Commission\b|Frais\b|Lettre info\b|Virement Web\b|Virement Vir\b|Vir Inst\b)/i;
  const CREDIT_KW =
    /^(?:Rejet Prlv\b|Intér[eê]ts Cl\b|Avoir\b|Virement De\b|Remboursement\b)/i;
  // "Virement M Ou Mme X" / "Virement De X" → crédit (virement entrant)
  const VIREMENT_IN = /^Virement\s+(?:De\b|Du\b|M\b|Mme\b|Mr\b|[A-ZÉÀÈÙÂÊÎÔÛ])/;
  // "Virement Web" / "Virement Vir Inst vers" → débit (virement sortant)
  const VIREMENT_OUT = /^Virement\s+(?:Web\b|Vir\b|vers\b)/i;

  const resultat: LigneImportee[] = [];
  for (const s of segs) {
    if (!s.amount) continue;
    const montantAbs = parseMontantFr(s.amount.replace(/\s/g, ""));
    if (!Number.isFinite(montantAbs) || montantAbs <= 0) continue;

    const libelle = s.parts.join(" ").replace(/\s+/g, " ").trim();
    if (!libelle) continue;

    let isCredit = false; // par défaut : débit (sortie d'argent)
    if (CREDIT_KW.test(libelle)) isCredit = true;
    else if (DEBIT_KW.test(libelle)) isCredit = false;
    else if (VIREMENT_OUT.test(libelle)) isCredit = false;
    else if (VIREMENT_IN.test(libelle)) isCredit = true;

    resultat.push({
      date: new Date(year, s.month - 1, s.day),
      libelle,
      montant: isCredit ? montantAbs : -montantAbs,
      reference: null,
    });
  }

  return resultat.length > 0 ? resultat : null;
}

// ── Parser générique (fallback) ───────────────────────────────────────────────
// Cherche une DATE complète (DD/MM/YYYY) + MONTANT signé sur la même ligne.

/**
 * Parse un relevé bancaire PDF — extraction native Node.js (zlib + opérateurs PDF Tj/TJ).
 * Supporte le format Crédit Agricole (dates DD.MM, ¨) et le format générique (DATE + MONTANT
 * sur la même ligne). Aucune dépendance externe.
 *
 * Stratégie d'extraction :
 * 1. Utilise /Length du dictionnaire stream pour lire les données binaires exactes
 *    (évite d'être trompé par "\nendstream" dans les données compressées).
 * 2. Fallback regex si /Length est absent.
 * 3. Décompresse chaque stream (FlateDecode / FlateDecode raw).
 * 4. Extrait le texte via les opérateurs Tj / TJ / ' (littéral, hex, tableau).
 * 5. Applique un décodage UTF-16 BE si le texte semble encodé en 2 octets (CIDFont).
 */
export async function parsePdfReleve(buffer: Buffer): Promise<LigneImportee[]> {
  const raw = buffer.toString("binary");
  const allText: string[] = [];

  // Parcours de chaque marqueur "stream\n" dans le PDF
  const streamRe = /stream[ \t]*(\r?\n)/g;
  let sm;
  while ((sm = streamRe.exec(raw)) !== null) {
    const streamStart = sm.index + sm[0].length;

    // Cherche /Length N dans les 800 octets précédant "stream" (direct integer only)
    const lookback = raw.slice(Math.max(0, sm.index - 800), sm.index);
    const lenM = lookback.match(/\/Length\s+(\d+)/);

    let data: Buffer;
    if (lenM) {
      const len = parseInt(lenM[1]);
      if (len <= 0 || streamStart + len > raw.length) continue;
      data = Buffer.from(raw.slice(streamStart, streamStart + len), "binary");
    } else {
      // Fallback : recherche de "\nendstream" (moins fiable sur contenu binaire)
      const endIdx = raw.indexOf("\nendstream", streamStart);
      if (endIdx === -1) continue;
      data = Buffer.from(raw.slice(streamStart, endIdx), "binary");
    }

    const content = decompressOrRaw(data);
    const text = extractFromStream(content.toString("binary"));
    if (text.trim()) allText.push(text);
  }

  const texte = allText.join("\n");

  // Format Crédit Agricole en priorité
  const lignesCA = parsePdfCA(texte);
  if (lignesCA !== null) return lignesCA;

  // Fallback : parser générique (DATE + MONTANT sur la même ligne)
  const resultat: LigneImportee[] = [];
  for (const ligneBrute of texte.split(/\r?\n/)) {
    const ligne = ligneBrute.trim();
    if (!ligne) continue;
    const matchMontant = ligne.match(MONTANT_TOKEN);
    if (!matchMontant) continue;
    const avantMontant = ligne.slice(0, matchMontant.index).trim();
    const matchDate = avantMontant.match(DATE_TOKEN);
    if (!matchDate) continue;
    const date = parseDateFr(matchDate[1]);
    if (!date) continue;
    const libelle = avantMontant.slice(matchDate.index! + matchDate[0].length).trim();
    if (!libelle) continue;
    resultat.push({ date, libelle, montant: parseMontantFr(matchMontant[1]), reference: null });
  }
  return resultat;
}

export type CibleRapprochement = { id: string; montant: number; date: Date; label: string };

export type Correspondance = {
  cible: CibleRapprochement;
  confiance: "EXACTE" | "PROBABLE";
};

/**
 * Propose la meilleure correspondance pour une ligne de relevé parmi des cibles candidates
 * (paiements si montant > 0, dépenses si montant < 0) — appariement par montant exact puis
 * proximité de date. Non bloquant : c'est une suggestion, jamais un rapprochement automatique.
 */
export function proposerCorrespondance(
  ligne: { montant: number; date: Date },
  cibles: CibleRapprochement[],
  toleranceJours = 10,
): Correspondance | null {
  const montantAbs = Math.abs(ligne.montant);
  const candidats = cibles
    .filter((c) => Math.abs(Math.abs(c.montant) - montantAbs) < 0.01)
    .map((c) => ({ cible: c, ecartJours: Math.abs(differenceInCalendarDays(ligne.date, c.date)) }))
    .filter((c) => c.ecartJours <= toleranceJours)
    .sort((a, b) => a.ecartJours - b.ecartJours);

  if (candidats.length === 0) return null;
  const meilleur = candidats[0];
  return {
    cible: meilleur.cible,
    confiance: meilleur.ecartJours <= 3 ? "EXACTE" : "PROBABLE",
  };
}
