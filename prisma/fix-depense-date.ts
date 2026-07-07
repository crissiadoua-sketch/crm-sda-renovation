import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const dep = await prisma.depense.findFirst({
    where: { libelle: { contains: "BETON AVENUE" } },
  });

  if (!dep) {
    console.error("Dépense BETON AVENUE introuvable — elle n'a pas été créée");
    // Vérifier le nombre total de dépenses
    const count = await prisma.depense.count();
    console.log(`Nombre total de dépenses en base : ${count}`);
    return;
  }

  console.log(`Dépense trouvée : ${dep.libelle} — ${dep.montant} € — date : ${dep.date.toISOString().slice(0, 10)}`);

  // Passer la date à aujourd'hui (juillet) pour qu'elle soit visible immédiatement
  await prisma.depense.update({
    where: { id: dep.id },
    data: { date: new Date("2026-07-06") },
  });
  console.log("✅ Date mise à jour : 06/07/2026 — visible dans le module Dépenses (juillet)");
}

main().catch(console.error).finally(() => prisma.$disconnect());
