import { prisma } from "@/lib/prisma";

// Moteur centralisé de génération des références (devis, factures, bons,
// clients, fournisseurs...). Remplace les anciens générateurs dispersés
// (src/lib/numbering.ts, et les fonctions inline de chaque action) — le
// préfixe et le nombre de chiffres de chaque code sont désormais configurables
// via Paramètres > Codifications au lieu d'être codés en dur.
//
// Règle du gel légal (factures/devis) : prefixeEffectif() ne bascule sur
// prefixeAVenir qu'à partir de l'année anneeApplicationAVenir — fixée
// automatiquement à l'année suivante au moment de l'enregistrement (voir
// updateCodifications dans src/lib/actions/parametres.ts). Pas de tâche cron
// nécessaire, le bascule est purement déterministe par rapport à la date.

type ConfCodification = {
  prefixe: string;
  prefixeAVenir: string | null;
  anneeApplicationAVenir: number | null;
  nbChiffres: number;
  reinitialisationAnnee: boolean;
  geleLegalement: boolean;
};

async function getCodification(code: string): Promise<ConfCodification> {
  const conf = await prisma.codification.findUnique({ where: { code } });
  if (conf) return conf;
  // Repli défensif si la codification n'a pas (encore) de ligne en base —
  // ne doit jamais arriver après le seed initial, mais ne bloque jamais la
  // création d'un document pour autant.
  return { prefixe: code, prefixeAVenir: null, anneeApplicationAVenir: null, nbChiffres: 4, reinitialisationAnnee: true, geleLegalement: false };
}

function prefixeEffectif(conf: ConfCodification): string {
  const annee = new Date().getFullYear();
  if (conf.geleLegalement && conf.prefixeAVenir && conf.anneeApplicationAVenir && annee >= conf.anneeApplicationAVenir) {
    return conf.prefixeAVenir;
  }
  return conf.prefixe;
}

// Documents datés : PREFIXE-AAAA-NNN (compteur remis à 1 chaque année).
export async function prochainNumeroDocument(code: string, existing: string[]): Promise<string> {
  const conf = await getCodification(code);
  const prefixe = prefixeEffectif(conf);
  const base = conf.reinitialisationAnnee ? `${prefixe}-${new Date().getFullYear()}-` : `${prefixe}-`;
  const nums = existing
    .filter((n) => n.startsWith(base))
    .map((n) => parseInt(n.slice(base.length), 10))
    .filter(Number.isFinite);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${base}${String(next).padStart(conf.nbChiffres, "0")}`;
}

// Clients ET tiers (fournisseurs, sous-traitants) : PREFIXE-NNNN-INITIALES,
// jamais remis à 0 — tous suivent en réalité ce même format dans le code
// existant (fournisseurs.ts/sous-traitants.ts utilisaient déjà nextClientRef,
// pas un format sans initiales malgré ce que suggérait l'ancienne doc).
export async function prochaineReferenceClient(type: string, existing: string[], initiales: string): Promise<string> {
  const conf = await getCodification(type);
  const prefixe = prefixeEffectif(conf);
  const base = `${prefixe}-`;
  const nums = existing
    .filter((r) => r.startsWith(base))
    .map((r) => parseInt(r.split("-")[1] ?? "0", 10))
    .filter(Number.isFinite);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefixe}-${String(next).padStart(conf.nbChiffres, "0")}-${initiales}`;
}
