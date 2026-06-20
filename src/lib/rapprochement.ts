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
