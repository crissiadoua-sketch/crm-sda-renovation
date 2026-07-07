import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // BCB-2026-0001 : total réel du devis VICAT 00730064
  const bcb = await prisma.bonCommandeBeton.findFirst({ where: { numero: "BCB-2026-0001" } });
  if (!bcb) { console.error("BCB-2026-0001 introuvable"); return; }

  await prisma.bonCommandeBeton.update({
    where: { id: bcb.id },
    data: { totalHT: 625.21, totalTTC: 750.25 },
  });
  console.log("✅ BCB-2026-0001 — totalHT : 625,21 € — totalTTC : 750,25 €");
}

main().catch(console.error).finally(() => prisma.$disconnect());
