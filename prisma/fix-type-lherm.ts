import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const numeros = [
    "DEV-2026-010", "DEV-2026-011", "DEV-2026-012", "DEV-2026-013",
    "DEV-2026-014", "DEV-2026-015", "DEV-2026-016", "DEV-2026-017",
  ];
  const r = await prisma.devis.updateMany({
    where: { numero: { in: numeros } },
    data: { type: "INITIAL" },
  });
  console.log(`✓ ${r.count} devis LHERM passés en type INITIAL`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
