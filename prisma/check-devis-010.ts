import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const devis = await prisma.devis.findMany({
    where: { numero: { in: ["DEV-2026-010","DEV-2026-011","DEV-2026-012","DEV-2026-013","DEV-2026-014","DEV-2026-015","DEV-2026-016","DEV-2026-017","DEV-2026-018"] } },
    include: { lignes: { orderBy: { ordre: "asc" } } },
    orderBy: { numero: "asc" },
  });

  for (const d of devis) {
    const lignesLigne = d.lignes.filter(l => l.type === "LIGNE");
    const sommeLignes = lignesLigne.reduce((s, l) => s + (l.totalHT ?? 0), 0);
    const ecart = Math.abs(sommeLignes - d.totalHT);

    console.log(`\n═══ ${d.numero} [${d.statut}] ═══`);
    console.log(`  Objet    : ${d.objet?.slice(0, 80)}`);
    console.log(`  totalHT  : ${d.totalHT.toFixed(2)} €`);
    console.log(`  SommeLig : ${sommeLignes.toFixed(2)} €`);
    console.log(`  Écart    : ${ecart.toFixed(4)} € ${ecart > 0.01 ? "⚠️  ERREUR" : "✓"}`);
    console.log(`  Nb lignes: ${d.lignes.length} total (${lignesLigne.length} LIGNE + ${d.lignes.filter(l => l.type === "CLAUSE_RESERVE").length} CLAUSE_RESERVE)`);

    // Détail lignes avec vérif PU×qté vs totalHT stocké
    for (const l of lignesLigne) {
      const calcul = (l.quantite ?? 0) * (l.prixUnitaireHT ?? 0);
      const diff = Math.abs(calcul - (l.totalHT ?? 0));
      const flag = diff > 0.05 ? " ⚠️ " : "";
      console.log(`    [${l.ordre}] ${l.designation?.replace(/<[^>]*>/g, "").split("\n")[0].trim().slice(0,45).padEnd(45)} | qté:${String(l.quantite ?? "—").padStart(4)} × ${String(l.prixUnitaireHT ?? "—").padStart(8)} = ${calcul.toFixed(2).padStart(9)} | stocké: ${(l.totalHT ?? 0).toFixed(2).padStart(9)}${flag}`);
    }

    // Mentions libres (premiers 200 chars)
    if (d.mentionsLibres) {
      console.log(`  Mentions : ${d.mentionsLibres.slice(0, 200).replace(/\n/g, " / ")}`);
    } else {
      console.log(`  Mentions : (vide)`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
