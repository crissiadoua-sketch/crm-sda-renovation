import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const bc = await prisma.bonCommande.findFirst({ where: { numero: "BC-2026-0002" }, include: { lignes: true } });
  if (!bc) { console.error("BC-2026-0002 introuvable"); return; }

  // Tarifs CCL standard Toulouse — à ajuster sur présentation du devis CCL
  // Treillis ST15C 25m² : ~110€ HT/rouleau
  // Cales béton 30mm : ~0.30€ HT/u
  const lignesUpdates = [
    { ordre: 1, prixUnitaireHT: 110.00, quantite: 1,  totalHT: 110.00  }, // Treillis ST15C
    { ordre: 2, prixUnitaireHT: 0.30,   quantite: 25, totalHT: 7.50    }, // Cales 30mm
  ];

  let totalHT = 0;
  for (const l of lignesUpdates) {
    const ligne = bc.lignes.find((x) => x.ordre === l.ordre);
    if (!ligne) continue;
    await prisma.bonCommandeLigne.update({
      where: { id: ligne.id },
      data: { prixUnitaireHT: l.prixUnitaireHT, quantite: l.quantite, totalHT: l.totalHT },
    });
    totalHT += l.totalHT;
    console.log(`✅ Ligne ${l.ordre} → ${l.prixUnitaireHT}€/u × ${l.quantite} = ${l.totalHT}€ HT`);
  }

  await prisma.bonCommande.update({
    where: { id: bc.id },
    data: { totalHT, totalTVA: totalHT * 0.2, totalTTC: totalHT * 1.2 },
  });
  console.log(`\n✅ BC-2026-0002 CCL mis à jour : ${totalHT}€ HT — ${(totalHT * 1.2).toFixed(2)}€ TTC`);
  console.log(`   (Prix estimatifs — à ajuster sur devis CCL reçu)`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
