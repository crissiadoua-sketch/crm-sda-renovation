import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const b = await prisma.bonCommandeBeton.findFirst({
    where: { numero: "BCB-2026-0001" },
    include: {
      fournisseur: { select: { nom: true, email: true, telephone: true } },
      chantier: { select: { nom: true, reference: true } },
    },
  });
  console.log(JSON.stringify(b, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
