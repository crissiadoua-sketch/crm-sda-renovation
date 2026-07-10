import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // 1. État de la table Codification
  const codifs = await prisma.codification.findMany({ orderBy: { code: "asc" } });
  console.log(`\n══════════ TABLE CODIFICATION (${codifs.length} lignes) ══════════\n`);
  for (const c of codifs) {
    console.log(`  [${c.code}] label="${c.label}" prefixe="${c.prefixe}" nbChiffres=${c.nbChiffres} reinitialisationAnnee=${c.reinitialisationAnnee} geleLegalement=${c.geleLegalement}`);
    if (c.prefixeAVenir) console.log(`       → À venir: "${c.prefixeAVenir}" dès ${c.anneeApplicationAVenir}`);
  }

  // 2. Références chantiers actuelles
  const chantiers = await prisma.chantier.findMany({ select: { reference: true, nom: true }, orderBy: { createdAt: "asc" } });
  console.log(`\n══════════ RÉFÉRENCES CHANTIERS (${chantiers.length}) ══════════\n`);
  for (const c of chantiers) {
    console.log(`  "${c.reference}" → ${c.nom.slice(0, 60)}`);
  }

  // 3. Simuler la prochaine référence pour CH
  const conf = await prisma.codification.findUnique({ where: { code: "CH" } });
  if (conf) {
    const prefixe = conf.prefixe;
    const base = conf.reinitialisationAnnee ? `${prefixe}-${new Date().getFullYear()}-` : `${prefixe}-`;
    const refs = chantiers.map(c => c.reference);
    const nums = refs
      .filter(n => n.startsWith(base))
      .map(n => parseInt(n.slice(base.length), 10))
      .filter(Number.isFinite);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    const nextRef = `${base}${String(next).padStart(conf.nbChiffres, "0")}`;
    console.log(`\n══════════ PROCHAINE RÉFÉRENCE CHANTIER ══════════`);
    console.log(`  Code DB    : "CH"`);
    console.log(`  Préfixe    : "${prefixe}"`);
    console.log(`  Base       : "${base}"`);
    console.log(`  Refs match : ${refs.filter(n => n.startsWith(base)).join(", ") || "(aucune)"}`);
    console.log(`  Nums       : [${nums.join(", ")}]`);
    console.log(`  Prochain   : "${nextRef}"`);
  } else {
    console.log(`\n⚠️  Aucune Codification pour code="CH" — utilisation du repli défensif`);
    console.log(`  Prochain   : "CH-${new Date().getFullYear()}-0001" (fallback)`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
