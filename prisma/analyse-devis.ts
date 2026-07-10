import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  // 9 derniers devis (par date de création)
  const derniers9 = await prisma.devis.findMany({
    orderBy: { createdAt: "desc" },
    take: 9,
    include: {
      client: { select: { nom: true, prenom: true, raisonSociale: true } },
      chantier: { select: { nom: true, reference: true } },
      lignes: { orderBy: { ordre: "asc" }, select: { type: true, designation: true, quantite: true, prixUnitaireHT: true, totalHT: true, ordre: true } },
    },
  });

  // Tous les autres devis pour stats globales
  const tousLesDevis = await prisma.devis.findMany({
    select: {
      id: true, numero: true, statut: true, type: true, totalHT: true, totalTTC: true,
      dateCreation: true, createdAt: true,
      client: { select: { nom: true, prenom: true, raisonSociale: true } },
      chantier: { select: { nom: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const tous = tousLesDevis;
  const ids9 = new Set(derniers9.map(d => d.id));
  const autres = tous.filter(d => !ids9.has(d.id));

  // Stats globales (hors 9 derniers)
  const autresAvecMontant = autres.filter(d => d.totalHT > 0);
  const moyenneHT = autresAvecMontant.length > 0
    ? autresAvecMontant.reduce((s, d) => s + d.totalHT, 0) / autresAvecMontant.length
    : 0;
  const maxHT = autresAvecMontant.length > 0 ? Math.max(...autresAvecMontant.map(d => d.totalHT)) : 0;
  const minHT = autresAvecMontant.length > 0 ? Math.min(...autresAvecMontant.filter(d => d.totalHT > 0).map(d => d.totalHT)) : 0;

  // Répartition par statut (tous devis)
  const statutCounts: Record<string, number> = {};
  for (const d of tous) {
    statutCounts[d.statut] = (statutCounts[d.statut] ?? 0) + 1;
  }

  // Taux d'acceptation global
  const acceptes = tous.filter(d => d.statut === "ACCEPTE").length;
  const envoyes  = tous.filter(d => ["ENVOYE", "ACCEPTE", "REFUSE"].includes(d.statut)).length;
  const tauxAccept = envoyes > 0 ? (acceptes / envoyes * 100).toFixed(1) : "N/A";

  // CA total des devis acceptés
  const caAccepte = tous.filter(d => d.statut === "ACCEPTE").reduce((s, d) => s + d.totalTTC, 0);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  ANALYSE DES DEVIS — CRM SDA RÉNOVATION");
  console.log("═══════════════════════════════════════════════════════════════\n");

  console.log(`📊 BASE TOTALE : ${tous.length} devis`);
  console.log(`   Répartition : ${Object.entries(statutCounts).map(([k,v]) => `${k}=${v}`).join(", ")}`);
  console.log(`   Taux acceptation : ${tauxAccept}% (${acceptes}/${envoyes} envoyés)`);
  console.log(`   CA devis acceptés : ${caAccepte.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`);
  console.log(`\n📈 GAMME DE PRIX (${autres.length} devis hors 9 derniers) :`);
  console.log(`   Minimum  : ${minHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT`);
  console.log(`   Moyenne  : ${moyenneHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT`);
  console.log(`   Maximum  : ${maxHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT`);

  // Quartiles
  const sorted = [...autresAvecMontant].sort((a, b) => a.totalHT - b.totalHT).map(d => d.totalHT);
  const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
  const q2 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
  console.log(`   Q1 (25%) : ${q1.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT`);
  console.log(`   Médiane  : ${q2.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT`);
  console.log(`   Q3 (75%) : ${q3.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT`);

  function classerMontant(ht: number): string {
    if (ht <= 0) return "❓ Sans montant";
    if (ht < q1)  return "🟢 Petit chantier (< Q1)";
    if (ht < q2)  return "🔵 Chantier moyen-bas (Q1-médiane)";
    if (ht < q3)  return "🟡 Chantier moyen-haut (médiane-Q3)";
    if (ht < maxHT * 0.8) return "🟠 Grand chantier (Q3-top 20%)";
    return "🔴 Très grand chantier (top 20%)";
  }

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  LES 9 DERNIERS DEVIS — CLASSEMENT");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Trier les 9 derniers par totalHT décroissant pour l'analyse
  const tries = [...derniers9].sort((a, b) => b.totalHT - a.totalHT);

  for (const d of tries) {
    const clientNom = d.client.raisonSociale ?? `${d.client.prenom ?? ""} ${d.client.nom}`.trim();
    const position = sorted.filter(v => v < d.totalHT).length;
    const percentile = sorted.length > 0 ? ((position / sorted.length) * 100).toFixed(0) : "N/A";

    const lignesType = d.lignes.filter(l => l.type === "LIGNE");
    const nbLignes = lignesType.length;
    const hasChapitres = d.lignes.some(l => l.type === "CHAPITRE");

    console.log(`┌─ ${d.numero} [${d.statut}${d.type !== "INITIAL" ? ` · ${d.type}` : ""}]`);
    console.log(`│  Client   : ${clientNom}`);
    if (d.chantier) console.log(`│  Chantier : ${d.chantier.nom}`);
    if (d.objet) console.log(`│  Objet    : ${d.objet}`);
    console.log(`│  Total HT : ${d.totalHT.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`);
    console.log(`│  Total TTC: ${d.totalTTC.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}`);
    if (d.totalHT > 0 && sorted.length > 0) {
      console.log(`│  Position : ${classerMontant(d.totalHT)} — ${percentile}e percentile`);
    }
    console.log(`│  Structure: ${nbLignes} lignes${hasChapitres ? " (avec chapitres)" : " plates"}`);
    console.log(`└─ Créé le  : ${d.createdAt.toLocaleDateString("fr-FR")}\n`);
  }

  // Analyse comparative globale des 9 derniers
  const totalHT9 = tries.filter(d => d.totalHT > 0);
  if (totalHT9.length > 0) {
    const moy9 = totalHT9.reduce((s, d) => s + d.totalHT, 0) / totalHT9.length;
    const max9 = Math.max(...totalHT9.map(d => d.totalHT));
    const min9 = Math.min(...totalHT9.map(d => d.totalHT));

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("  SYNTHÈSE COMPARATIVE");
    console.log("═══════════════════════════════════════════════════════════════\n");
    console.log(`  9 derniers devis (avec montant) :`);
    console.log(`  • Fourchette : ${min9.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} → ${max9.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT`);
    console.log(`  • Moyenne    : ${moy9.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} HT`);
    console.log(`  • vs moyenne CRM : ${moy9 >= moyenneHT ? "+" : ""}${((moy9 - moyenneHT) / moyenneHT * 100).toFixed(1)}%`);
    console.log(`  • Statuts    : ${tries.map(d => d.statut).join(", ")}`);

    // Répartition dans les quartiles
    const repartition = { bas: 0, moy_bas: 0, moy_haut: 0, grand: 0, tres_grand: 0, sans: 0 };
    for (const d of tries) {
      if (d.totalHT <= 0) { repartition.sans++; continue; }
      if (d.totalHT < q1) repartition.bas++;
      else if (d.totalHT < q2) repartition.moy_bas++;
      else if (d.totalHT < q3) repartition.moy_haut++;
      else if (d.totalHT < maxHT * 0.8) repartition.grand++;
      else repartition.tres_grand++;
    }
    console.log(`\n  Répartition dans la gamme CRM :`);
    if (repartition.bas > 0)       console.log(`  🟢 Petits chantiers      : ${repartition.bas}`);
    if (repartition.moy_bas > 0)   console.log(`  🔵 Moyens-bas            : ${repartition.moy_bas}`);
    if (repartition.moy_haut > 0)  console.log(`  🟡 Moyens-haut           : ${repartition.moy_haut}`);
    if (repartition.grand > 0)     console.log(`  🟠 Grands chantiers      : ${repartition.grand}`);
    if (repartition.tres_grand > 0)console.log(`  🔴 Très grands chantiers : ${repartition.tres_grand}`);
    if (repartition.sans > 0)      console.log(`  ❓ Sans montant          : ${repartition.sans}`);
    console.log("");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
