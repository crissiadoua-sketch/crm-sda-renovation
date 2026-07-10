import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // 1. Corriger les deux références malformées
  const fixes = [
    { ancien: "AFF-2026-2026019", nouveau: "AFF-2026-019" },
    { ancien: "AFF-2026-20262026020", nouveau: "AFF-2026-020" },
  ];

  console.log("══════════ CORRECTION DES RÉFÉRENCES CHANTIERS ══════════\n");

  for (const fix of fixes) {
    const chantier = await prisma.chantier.findFirst({ where: { reference: fix.ancien } });
    if (!chantier) {
      console.log(`  ⚠️  Référence "${fix.ancien}" introuvable (déjà corrigée ?)`);
      continue;
    }
    await prisma.chantier.update({
      where: { id: chantier.id },
      data: { reference: fix.nouveau },
    });
    console.log(`  ✓  ${fix.ancien}  →  ${fix.nouveau}  (${chantier.nom.slice(0, 50)})`);
  }

  // 2. Mettre à jour la codification CH → AFF
  const conf = await prisma.codification.findUnique({ where: { code: "CH" } });
  if (conf && conf.prefixe !== "AFF") {
    await prisma.codification.update({
      where: { code: "CH" },
      data: { prefixe: "AFF" },
    });
    console.log(`\n  ✓  Codification CH : préfixe "${conf.prefixe}" → "AFF"`);
  } else if (conf?.prefixe === "AFF") {
    console.log(`\n  ✓  Codification CH : déjà sur "AFF"`);
  } else {
    console.log(`\n  ⚠️  Codification CH introuvable en base`);
  }

  // 3. Vérification finale
  console.log("\n══════════ ÉTAT APRÈS CORRECTION ══════════\n");
  const chantiers = await prisma.chantier.findMany({ select: { reference: true, nom: true }, orderBy: { createdAt: "asc" } });
  for (const c of chantiers) {
    console.log(`  "${c.reference}" → ${c.nom.slice(0, 60)}`);
  }

  // Prochaine référence
  const confAff = await prisma.codification.findUnique({ where: { code: "CH" } });
  if (confAff) {
    const base = confAff.reinitialisationAnnee ? `${confAff.prefixe}-${new Date().getFullYear()}-` : `${confAff.prefixe}-`;
    const refs = chantiers.map(c => c.reference);
    const nums = refs.filter(n => n.startsWith(base)).map(n => parseInt(n.slice(base.length), 10)).filter(Number.isFinite);
    const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
    console.log(`\n  Prochaine référence chantier : "${base}${String(next).padStart(confAff.nbChiffres, "0")}"`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
