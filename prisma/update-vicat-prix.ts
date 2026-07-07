import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // BCB-2026-0001 — Béton VICAT C25/30 XF1 S3 D20, 3m³ → 145 €/m³ HT (prix rendu chantier Toulouse)
  const bcb = await prisma.bonCommandeBeton.findFirst({ where: { numero: "BCB-2026-0001" } });
  if (bcb) {
    await prisma.bonCommandeBeton.update({ where: { id: bcb.id }, data: { prixM3: 145.0 } });
    console.log(`✅ BCB-2026-0001 — ${bcb.qteTotale} m³ × 145 €/m³ = ${145 * bcb.qteTotale} € HT`);
  } else {
    console.error("BCB-2026-0001 introuvable");
  }

  // BC-2026-0001 — Granulats VICAT hérisson 0/20, 7t → 30 €/t HT
  const bc = await prisma.bonCommande.findFirst({
    where: { numero: "BC-2026-0001" },
    include: { lignes: true },
  });
  if (bc) {
    let totalHT = 0;
    for (const ligne of bc.lignes) {
      const pu = 30.0;
      const qte = ligne.quantite ?? 7;
      const tot = Math.round(pu * qte * 100) / 100;
      await prisma.bonCommandeLigne.update({
        where: { id: ligne.id },
        data: { prixUnitaireHT: pu, totalHT: tot },
      });
      totalHT += tot;
      console.log(`✅ ${ligne.designation} — ${qte}t × ${pu} €/t = ${tot} € HT`);
    }
    const tva = Math.round(totalHT * 0.2 * 100) / 100;
    await prisma.bonCommande.update({
      where: { id: bc.id },
      data: { totalHT, totalTVA: tva, totalTTC: totalHT + tva },
    });
    console.log(`✅ BC-2026-0001 GRANULATS VICAT : ${totalHT} € HT — ${(totalHT + tva).toFixed(2)} € TTC`);
  } else {
    console.error("BC-2026-0001 introuvable");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
