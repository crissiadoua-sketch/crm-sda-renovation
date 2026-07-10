import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const numeros = ["DEV-2026-010","DEV-2026-011","DEV-2026-012","DEV-2026-013","DEV-2026-014","DEV-2026-015","DEV-2026-016","DEV-2026-017","DEV-2026-018"];
  const devis = await prisma.devis.findMany({
    where: { numero: { in: numeros } },
    include: { lignes: { where: { type: "CLAUSE_RESERVE" } } },
    orderBy: { numero: "asc" },
  });

  for (const d of devis) {
    const cr = d.lignes[0];
    if (!cr) {
      console.log(`${d.numero} ❌ PAS de ligne CLAUSE_RESERVE`);
      continue;
    }
    let clauses: string[] = [];
    try { clauses = JSON.parse(cr.clausesReserves ?? "[]"); } catch {}
    if (clauses.length === 0) {
      console.log(`${d.numero} ⚠️  CLAUSE_RESERVE présente mais clausesReserves VIDE`);
    } else {
      console.log(`${d.numero} ✓  ${clauses.length} clauses`);
      clauses.forEach((c, i) => console.log(`   ${i+1}. ${c.slice(0,80)}`));
    }
    console.log();
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
