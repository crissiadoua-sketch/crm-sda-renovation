import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const fournisseurs = await prisma.fournisseur.findMany({ select: { id: true, nom: true } });
  console.log("\nFournisseurs dans le CRM :");
  for (const f of fournisseurs) console.log(`  ${f.id.slice(0,8)}… — ${f.nom}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
