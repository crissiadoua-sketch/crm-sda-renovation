import { differenceInCalendarDays } from "date-fns";

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
const MONTANT_TOKEN = /(-?\d{1,3}(?:[ .]\d{3})*,\d{2})\s*€?\s*$/;

/**
 * Parse un relevé bancaire au format PDF — "best effort" : un PDF est une mise en page visuelle,
 * pas un format de données structuré, donc fiable uniquement si le texte est sélectionnable
 * (export direct depuis l'espace bancaire en ligne, pas un scan/photo). Chaque ligne de texte est
 * retenue comme transaction si elle contient à la fois une date et un montant en fin de ligne ;
 * le libellé est ce qu'il reste après avoir retiré ces deux jetons. Les lignes ne correspondant pas
 * à ce schéma (en-têtes, totaux, solde…) sont ignorées silencieusement.
 */
export async function parsePdfReleve(buffer: Buffer): Promise<LigneImportee[]> {
  // DOMMatrix est une API navigateur absente de Node.js — pdfjs-dist en a besoin même
  // pour l'extraction de texte (transformations matricielles internes).
  if (typeof globalThis.DOMMatrix === "undefined") {
    (globalThis as Record<string, unknown>).DOMMatrix = class DOMMatrixPolyfill {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      m11=1; m12=0; m13=0; m14=0; m21=0; m22=1; m23=0; m24=0;
      m31=0; m32=0; m33=1; m34=0; m41=0; m42=0; m43=0; m44=1;
      is2D = true; isIdentity = true;
      constructor(init?: number[] | string) {
        if (Array.isArray(init) && init.length >= 6) {
          [this.a, this.b, this.c, this.d, this.e, this.f] = init as number[];
          this.m11 = this.a; this.m12 = this.b; this.m21 = this.c;
          this.m22 = this.d; this.m41 = this.e; this.m42 = this.f;
        }
      }
      multiply() { return this; }
      premultiply() { return this; }
      inverse() { return this; }
      translate() { return this; }
      scale() { return this; }
      scale3d() { return this; }
      rotate() { return this; }
      rotateAxisAngle() { return this; }
      rotateFromVector() { return this; }
      skewX() { return this; }
      skewY() { return this; }
      flipX() { return this; }
      flipY() { return this; }
      transformPoint(p?: { x?: number; y?: number }) { return { x: p?.x ?? 0, y: p?.y ?? 0, z: 0, w: 1 }; }
      toFloat32Array() { return new Float32Array([this.a, this.b, this.c, this.d, this.e, this.f]); }
      toFloat64Array() { return new Float64Array([this.a, this.b, this.c, this.d, this.e, this.f]); }
      toString() { return `matrix(${this.a},${this.b},${this.c},${this.d},${this.e},${this.f})`; }
    };
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  let texte: string;
  try {
    const result = await parser.getText();
    texte = result.text;
  } finally {
    await parser.destroy();
  }

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
    // Sans libellé, c'est presque toujours une ligne de solde/total plutôt qu'une vraie transaction.
    if (!libelle) continue;

    resultat.push({
      date,
      libelle,
      montant: parseMontantFr(matchMontant[1]),
      reference: null,
    });
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
