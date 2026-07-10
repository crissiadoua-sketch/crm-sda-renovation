import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const [
    chantiers,
    tempsUnitaires,
    depenses,
    bonsCommande,
    contrats,
    historiquePrix,
  ] = await Promise.all([
    prisma.chantier.findMany({
      where: { statut: { not: "ANNULE" } },
      select: {
        id: true, nom: true, reference: true, statut: true, budgetEstime: true,
        factures: { where: { statut: { not: "ANNULEE" } }, select: { totalHT: true, totalTTC: true } },
        bonsCommande: { where: { statut: { not: "ANNULE" } }, select: { totalHT: true, statut: true } },
        depenses: { select: { montant: true, type: true, categorie: true, libelle: true } },
      },
    }),
    prisma.tempsUnitaire.findMany({
      orderBy: { corpsEtat: "asc" },
      select: { id: true, designation: true, corpsEtat: true, nature: true, unite: true, tempsUnitaire: true },
    }),
    prisma.depense.findMany({
      where: { type: "REEL" },
      select: { libelle: true, montant: true, categorie: true, chantierId: true, date: true },
      orderBy: { date: "desc" },
      take: 50,
    }),
    prisma.bonCommande.findMany({
      where: { statut: { in: ["RECU", "RECU_PARTIEL"] } },
      include: { fournisseur: { select: { nom: true } }, chantier: { select: { nom: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.contratSousTraitance.findMany({
      where: { statut: { in: ["SIGNE", "TERMINE"] } },
      include: { sousTraitant: { select: { nom: true } }, chantier: { select: { nom: true } } },
    }),
    (prisma as any).historiquePrix?.findMany?.({
      orderBy: { dateMAJ: "desc" },
      take: 30,
    }).catch(() => []),
  ]);

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  DONNÉES ÉCONOMIQUES SDA RÉNOVATION — EXTRACTION CRM");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // ── Temps unitaires
  console.log(`\n📐 TEMPS UNITAIRES (${tempsUnitaires.length} entrées) :`);
  if (tempsUnitaires.length === 0) {
    console.log("   Aucun temps unitaire renseigné dans le CRM");
  } else {
    for (const t of tempsUnitaires) {
      console.log(`   [${t.corpsEtat}] ${t.designation} | ${t.tempsUnitaire}h/${t.unite} | nature: ${t.nature}`);
    }
  }

  // ── Marges chantiers
  console.log(`\n📊 MARGES CHANTIERS (${chantiers.length} chantiers actifs) :`);
  const marges: Array<{ nom: string; budget: number; caFact: number; couts: number; marge: number; tauxMarge: number }> = [];
  for (const c of chantiers) {
    const caFact = c.factures.reduce((s, f) => s + f.totalHT, 0);
    const budget = c.budgetEstime ?? 0;
    const coutsBc = c.bonsCommande.filter(b => ["RECU", "RECU_PARTIEL"].includes(b.statut)).reduce((s, b) => s + b.totalHT, 0);
    const coutsDepReel = c.depenses.filter(d => d.type === "REEL").reduce((s, d) => s + d.montant, 0);
    const coutsTotaux = coutsBc + coutsDepReel;
    const base = budget > 0 ? budget : caFact;
    const marge = base - coutsTotaux;
    const tauxMarge = base > 0 ? (marge / base) * 100 : 0;
    if (base > 0 || coutsTotaux > 0) {
      marges.push({ nom: c.nom, budget: base, caFact, couts: coutsTotaux, marge, tauxMarge });
      console.log(`   ${c.nom.slice(0,40).padEnd(40)} | CA/budget: ${base.toFixed(0).padStart(8)}€ | coûts: ${coutsTotaux.toFixed(0).padStart(8)}€ | marge: ${marge.toFixed(0).padStart(8)}€ (${tauxMarge.toFixed(1)}%)`);
    }
  }

  if (marges.length > 0) {
    const margeMoyenne = marges.filter(m => m.tauxMarge !== 0).reduce((s, m) => s + m.tauxMarge, 0) / marges.filter(m => m.tauxMarge !== 0).length;
    console.log(`\n   → Taux de marge moyen sur chantiers documentés : ${margeMoyenne.toFixed(1)}%`);
  }

  // ── Dépenses réelles par catégorie
  console.log(`\n💸 DÉPENSES RÉELLES RÉCENTES (${depenses.length}) :`);
  const parCat: Record<string, { total: number; count: number }> = {};
  for (const d of depenses) {
    if (!parCat[d.categorie]) parCat[d.categorie] = { total: 0, count: 0 };
    parCat[d.categorie].total += d.montant;
    parCat[d.categorie].count++;
  }
  for (const [cat, val] of Object.entries(parCat)) {
    console.log(`   ${cat.padEnd(20)} : ${val.count} opérations, total ${val.total.toLocaleString("fr-FR")}€, moy ${(val.total/val.count).toFixed(0)}€`);
  }

  // ── Contrats sous-traitance
  console.log(`\n👷 CONTRATS SOUS-TRAITANCE SIGNÉS/TERMINÉS (${contrats.length}) :`);
  for (const c of contrats) {
    const pu = c.montantHT && c.objet ? `${(c.montantHT / 1).toFixed(0)}€ HT` : "—";
    console.log(`   ${c.numero} | ${c.sousTraitant.nom.slice(0,25).padEnd(25)} | ${c.objet?.slice(0,40) ?? ""} | ${pu}`);
  }

  // ── Bons commande reçus
  console.log(`\n📦 ACHATS FOURNISSEURS RÉCENTS (BCs reçus) :`);
  for (const bc of bonsCommande) {
    console.log(`   ${bc.numero} | ${bc.fournisseur.nom.slice(0,25).padEnd(25)} | ${bc.chantier?.nom?.slice(0,30) ?? "—"} | ${bc.totalHT.toFixed(0)}€ HT`);
  }

  // ── Analyse de la structure de coût des devis LHERM (V2 comme référence)
  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("  STRUCTURE DE COÛT DEVIS LHERM (RÉFÉRENCE SURFACE 94 m²)");
  console.log("═══════════════════════════════════════════════════════════════\n");

  const lhermDevis = await prisma.devis.findMany({
    where: { numero: { startsWith: "DEV-2026-0" }, chantier: { nom: { contains: "LHERM" } } },
    include: { lignes: { orderBy: { ordre: "asc" } } },
    orderBy: { numero: "asc" },
  });

  for (const d of lhermDevis) {
    const lignes = d.lignes.filter(l => l.type === "LIGNE");
    const materiau = lignes[1]; // ligne 2 = matériau principal
    const management = lignes[lignes.length - 1]; // dernière ligne = gestion
    const fixesHT = lignes.filter((_, i) => i !== 1 && i !== lignes.length - 1).reduce((s, l) => s + (l.totalHT ?? 0), 0);

    if (materiau && management) {
      const matPU = materiau.prixUnitaireHT ?? 0;
      const matTotal = materiau.totalHT ?? 0;
      const mgmtTotal = management.totalHT ?? 0;
      const mgmtPct = d.totalHT > 0 ? (mgmtTotal / d.totalHT * 100).toFixed(1) : "—";

      console.log(`   ${d.numero} | TotalHT: ${d.totalHT.toFixed(0)}€ | Matériau: ${matPU.toFixed(0)}€/u (${matTotal.toFixed(0)}€ total) | Fixe: ${fixesHT.toFixed(0)}€ | Gestion: ${mgmtTotal.toFixed(0)}€ (${mgmtPct}%)`);
    }
  }

  console.log("\n");
}

main().catch(console.error).finally(() => prisma.$disconnect());
