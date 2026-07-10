import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const devis = await prisma.devis.findMany({
    where: { numero: { in: ["DEV-2026-010", "DEV-2026-015", "DEV-2026-016", "DEV-2026-017"] } },
    include: { lignes: { orderBy: { ordre: "asc" } } },
    orderBy: { numero: "asc" },
  });

  for (const d of devis) {
    console.log(`\n${d.numero} — ${d.objet}`);
    console.log(`Total HT: ${d.totalHT} €`);
    for (const l of d.lignes) {
      if (l.type === "LIGNE") {
        const desig = l.designation?.replace(/<[^>]*>/g, "").replace(/\n[\s\S]*/, "").trim().slice(0, 60);
        console.log(`  [${l.ordre}] ${desig.padEnd(60)} | qté: ${l.quantite ?? "-"} | PU: ${l.prixUnitaireHT ?? "-"} | total: ${l.totalHT}`);
      }
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
