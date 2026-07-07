import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const chantiers = await prisma.chantier.findMany({
    select: { id: true, nom: true, reference: true },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  for (const c of chantiers) console.log(c.reference, "|", c.nom, "|", c.id.slice(0, 8));
}

main().catch(console.error).finally(() => prisma.$disconnect());
