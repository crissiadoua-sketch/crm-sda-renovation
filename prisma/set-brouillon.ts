import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const devis = await prisma.devis.findMany({
    where: { statut: "ENVOYE" },
    orderBy: { createdAt: "desc" },
    take: 9,
    select: { id: true, numero: true },
  });

  console.log(`${devis.length} devis ENVOYE trouvés :`, devis.map((d) => d.numero).join(", "));

  if (devis.length === 0) {
    console.log("Rien à faire.");
    return;
  }

  const result = await prisma.devis.updateMany({
    where: { id: { in: devis.map((d) => d.id) } },
    data: { statut: "BROUILLON" },
  });

  console.log(`✓ ${result.count} devis passés en BROUILLON`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
