import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
async function main() {
  const clients = await prisma.client.findMany({
    where: { OR: [
      { nom: { contains: "candeau", mode: "insensitive" } },
      { prenom: { contains: "fabrice", mode: "insensitive" } },
    ]},
    select: { id: true, type: true, nom: true, prenom: true, reference: true },
  });
  console.log("CLIENTS:", JSON.stringify(clients, null, 2));

  const devisNums = await prisma.devis.findMany({
    select: { numero: true },
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  console.log("DERNIERS DEVIS:", JSON.stringify(devisNums));

  const chantiers = await prisma.chantier.findMany({
    where: { OR: [
      { nom: { contains: "lherm", mode: "insensitive" } },
      { nom: { contains: "candeau", mode: "insensitive" } },
    ]},
    select: { id: true, nom: true, reference: true },
  });
  console.log("CHANTIERS:", JSON.stringify(chantiers));
}
main().finally(() => prisma.$disconnect());
