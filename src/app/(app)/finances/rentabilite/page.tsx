export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  TrendingUp, TrendingDown, ChevronRight, BarChart3, Settings2,
  ArrowRight, AlertTriangle, Wallet, Target,
  Receipt, ShoppingCart, Users, Building2, Truck, Scale,
  CalendarDays, ArrowUpRight, ArrowDownRight, TrendingUp as Trend2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";
import { RentabiliteActions } from "@/components/finances/rentabilite-actions";

function computeIS(r: number) {
  if (r <= 0) return 0;
  return Math.min(r, 42500) * 0.15 + Math.max(0, r - 42500) * 0.25;
}

function pct(val: number, base: number) {
  if (base === 0) return 0;
  return Math.round((val / base) * 1000) / 10;
}

function EcartBadge({ reel, budget, inverser = false }: { reel: number; budget: number; inverser?: boolean }) {
  const diff = reel - budget;
  if (Math.abs(diff) < 0.5) return <span className="text-xs text-slate-400">—</span>;
  const positif = inverser ? diff < 0 : diff > 0;
  return (
    <span className={`text-xs font-medium ${positif ? "text-emerald-600" : "text-red-500"}`}>
      {diff > 0 ? "+" : ""}{formatEuros(diff)}
    </span>
  );
}

export default async function RentabilitePage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee: anneeParam } = await searchParams;
  const annee = parseInt(anneeParam ?? "") || new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => annee - 2 + i);

  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee, 11, 31, 23, 59, 59);
  const debutN1 = new Date(annee - 1, 0, 1);
  const finN1 = new Date(annee - 1, 11, 31, 23, 59, 59);
  const periodMonths = Array.from({ length: 12 }, (_, i) =>
    `${annee}-${String(i + 1).padStart(2, "0")}`
  );

  // ── DONNÉES ANNÉE N ──────────────────────────────────────────────────
  const [
    factures,
    depenses,
    bulletins,
    adhesions,
    interimaires,
    bonsCommande,
    contratsSTR,
    notesFrais,
    budgets,
    paiements,
  ] = await Promise.all([
    prisma.facture.findMany({
      where: { dateEmission: { gte: debut, lte: fin }, statut: { notIn: ["BROUILLON", "ANNULEE"] } },
      select: {
        totalHT: true, totalTVA: true,
        dateEmission: true,
        chantierId: true,
        chantier: { select: { nom: true, reference: true } },
      },
    }),
    prisma.depense.findMany({
      where: { date: { gte: debut, lte: fin }, type: "REEL" },
      select: {
        montant: true, categorie: true,
        date: true,
        chantierId: true,
        chantier: { select: { nom: true, reference: true } },
      },
    }),
    prisma.bulletinDePaie.findMany({
      where: { periode: { in: periodMonths }, statut: { in: ["VALIDE", "PAYE"] } },
      select: { totalBrut: true, cotisationsPatronales: true, netAPayer: true },
    }),
    prisma.adhesionMutuelle.findMany({
      where: { actif: true, dateAdhesion: { lte: fin } },
      include: { formuleMutuelle: { select: { cotisationPatronale: true } } },
    }),
    prisma.suiviHeureInterimaire.findMany({
      where: { createdAt: { gte: debut, lte: fin } },
      select: {
        coutTotalHT: true,
        createdAt: true,
        chantierId: true,
        chantier: { select: { nom: true, reference: true } },
      },
    }),
    prisma.bonCommande.findMany({
      where: {
        dateCreation: { gte: debut, lte: fin },
        statut: { in: ["CONFIRME", "RECU_PARTIEL", "RECU"] },
      },
      select: {
        totalHT: true,
        dateCreation: true,
        chantierId: true,
        chantier: { select: { nom: true, reference: true } },
      },
    }),
    prisma.contratSousTraitance.findMany({
      where: { createdAt: { gte: debut, lte: fin }, statut: { in: ["SIGNE", "EN_COURS", "TERMINE"] } },
      select: {
        montantHT: true,
        createdAt: true,
        chantierId: true,
        chantier: { select: { nom: true, reference: true } },
      },
    }),
    prisma.noteDeFrais.findMany({
      where: { date: { gte: debut, lte: fin }, statut: "REMBOURSEE" },
      select: { montant: true },
    }),
    prisma.budgetChargesSociete.findMany({
      where: { annee },
      orderBy: [{ type: "asc" }, { categorie: "asc" }],
    }),
    prisma.paiement.findMany({
      where: { date: { gte: debut, lte: fin } },
      select: { montant: true },
    }),
  ]);

  // ── DONNÉES ANNÉE N-1 ────────────────────────────────────────────────
  const [facturesN1, depensesN1, bcN1, cstN1, interimN1] = await Promise.all([
    prisma.facture.findMany({
      where: { dateEmission: { gte: debutN1, lte: finN1 }, statut: { notIn: ["BROUILLON", "ANNULEE"] } },
      select: { totalHT: true },
    }),
    prisma.depense.findMany({
      where: { date: { gte: debutN1, lte: finN1 }, type: "REEL" },
      select: { montant: true, categorie: true },
    }),
    prisma.bonCommande.findMany({
      where: { dateCreation: { gte: debutN1, lte: finN1 }, statut: { in: ["CONFIRME", "RECU_PARTIEL", "RECU"] } },
      select: { totalHT: true },
    }),
    prisma.contratSousTraitance.findMany({
      where: { createdAt: { gte: debutN1, lte: finN1 }, statut: { in: ["SIGNE", "EN_COURS", "TERMINE"] } },
      select: { montantHT: true },
    }),
    prisma.suiviHeureInterimaire.findMany({
      where: { createdAt: { gte: debutN1, lte: finN1 } },
      select: { coutTotalHT: true },
    }),
  ]);

  // ── CA ───────────────────────────────────────────────────────────────
  const caHT = factures.reduce((s, f) => s + f.totalHT, 0);
  const caEncaissé = paiements.reduce((s, p) => s + p.montant, 0);

  // ── CHARGES VARIABLES RÉELLES ────────────────────────────────────────
  const dep = (cat: string) => depenses.filter((d) => d.categorie === cat).reduce((s, d) => s + d.montant, 0);
  const rMat = bonsCommande.reduce((s, b) => s + b.totalHT, 0) + dep("MATERIAUX");
  const rST = contratsSTR.reduce((s, c) => s + (c.montantHT ?? 0), 0) + dep("SOUS_TRAITANCE");
  const rTransport = dep("TRANSPORT");
  const rMO = dep("MAIN_OEUVRE");
  const rInterim = interimaires.reduce((s, h) => s + h.coutTotalHT, 0);
  const rNotesFrais = notesFrais.reduce((s, n) => s + n.montant, 0);
  const rAutreVar = dep("AUTRE");
  const totalCVReelles = rMat + rST + rTransport + rMO + rInterim + rNotesFrais + rAutreVar;
  const mcvReelle = caHT - totalCVReelles;
  const txMCVReelle = pct(mcvReelle, caHT);

  // ── CHARGES FIXES RÉELLES ─────────────────────────────────────────────
  const rSalaires = bulletins.reduce((s, b) => s + b.totalBrut + b.cotisationsPatronales, 0)
    + adhesions.reduce((s, a) => s + a.formuleMutuelle.cotisationPatronale * 12, 0);
  const rLoyer = dep("LOYER");
  const rAssurance = dep("ASSURANCE");
  const rAdmin = dep("ADMINISTRATIF");
  const rImpots = dep("IMPOT_TAXE");
  const rAmort = dep("AMORTISSEMENT");
  const rInvest = dep("INVESTISSEMENT");
  const totalCFReelles = rSalaires + rLoyer + rAssurance + rAdmin + rImpots + rAmort + rInvest;

  const resultatExploitationReel = mcvReelle - totalCFReelles;
  const isReel = computeIS(resultatExploitationReel - rAmort);
  const resultatNetReel = resultatExploitationReel - rAmort - isReel;

  // ── BUDGETS ──────────────────────────────────────────────────────────
  const budgetByCat = (cat: string, type: "FIXE" | "VARIABLE") =>
    budgets.filter((b) => b.categorie === cat && b.type === type).reduce((s, b) => s + b.montantAnnuel, 0);
  const budgetByType = (type: "FIXE" | "VARIABLE") =>
    budgets.filter((b) => b.type === type).reduce((s, b) => s + b.montantAnnuel, 0);

  const bMat = budgetByCat("MATERIAUX", "VARIABLE");
  const bST = budgetByCat("SOUS_TRAITANCE", "VARIABLE");
  const bTransport = budgetByCat("TRANSPORT", "VARIABLE");
  const bMO = budgetByCat("MAIN_OEUVRE", "VARIABLE");
  const bInterim = budgetByCat("INTERIM", "VARIABLE");
  const bAutreVar = budgetByCat("AUTRE", "VARIABLE");
  const totalCVBudget = budgetByType("VARIABLE");
  const bSalaires = budgetByCat("SALAIRES", "FIXE");
  const bLoyer = budgetByCat("LOYER", "FIXE");
  const bAssurance = budgetByCat("ASSURANCE", "FIXE");
  const bAdmin = budgetByCat("ADMINISTRATIF", "FIXE");
  const bImpots = budgetByCat("IMPOT_TAXE", "FIXE");
  const bAmort = budgetByCat("AMORTISSEMENT", "FIXE");
  const bInvest = budgetByCat("INVESTISSEMENT", "FIXE");
  const totalCFBudget = budgetByType("FIXE");
  const caBudget = 0;
  const txMCVBudget = txMCVReelle;
  const hasBudget = budgets.length > 0;

  // ── SEUIL DE RENTABILITÉ ─────────────────────────────────────────────
  const tauxMCVPourSR = txMCVReelle / 100;
  const seuilRentabilite = tauxMCVPourSR > 0 ? totalCFReelles / tauxMCVPourSR : 0;
  const seuilBudget = txMCVBudget > 0 && totalCFBudget > 0 ? totalCFBudget / (txMCVBudget / 100) : 0;

  // ── TENDANCE MENSUELLE ───────────────────────────────────────────────
  const moisLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

  const caParMois = Array.from({ length: 12 }, (_, m) =>
    factures.filter((f) => new Date(f.dateEmission).getMonth() === m).reduce((s, f) => s + f.totalHT, 0)
  );
  const chargesParMois = Array.from({ length: 12 }, (_, m) => {
    const depM = depenses.filter((d) => new Date(d.date).getMonth() === m).reduce((s, d) => s + d.montant, 0);
    const bcM = bonsCommande.filter((b) => new Date(b.dateCreation).getMonth() === m).reduce((s, b) => s + b.totalHT, 0);
    const cstM = contratsSTR.filter((c) => new Date(c.createdAt).getMonth() === m).reduce((s, c) => s + (c.montantHT ?? 0), 0);
    const intM = interimaires.filter((h) => new Date(h.createdAt).getMonth() === m).reduce((s, h) => s + h.coutTotalHT, 0);
    return depM + bcM + cstM + intM;
  });
  const resultatParMois = caParMois.map((ca, i) => ca - chargesParMois[i]);
  const maxMoisVal = Math.max(...caParMois, ...chargesParMois, 1);

  // ── TOP CHANTIERS ────────────────────────────────────────────────────
  type ChantierData = { id: string; nom: string; reference: string; ca: number; couts: number };
  const chantierMap = new Map<string, ChantierData>();

  const getOrCreate = (id: string, nom: string, ref: string): ChantierData => {
    if (!chantierMap.has(id)) chantierMap.set(id, { id, nom, reference: ref, ca: 0, couts: 0 });
    return chantierMap.get(id)!;
  };

  factures.forEach((f) => {
    if (f.chantierId && f.chantier) {
      getOrCreate(f.chantierId, f.chantier.nom, f.chantier.reference ?? "").ca += f.totalHT;
    }
  });
  bonsCommande.forEach((bc) => {
    if (bc.chantierId && bc.chantier) {
      getOrCreate(bc.chantierId, bc.chantier.nom, bc.chantier.reference ?? "").couts += bc.totalHT;
    }
  });
  depenses.forEach((d) => {
    if (d.chantierId && d.chantier) {
      getOrCreate(d.chantierId, d.chantier.nom, d.chantier.reference ?? "").couts += d.montant;
    }
  });
  contratsSTR.forEach((c) => {
    if (c.chantierId && c.chantier) {
      getOrCreate(c.chantierId, c.chantier.nom, c.chantier.reference ?? "").couts += (c.montantHT ?? 0);
    }
  });
  interimaires.forEach((h) => {
    if (h.chantierId && h.chantier) {
      getOrCreate(h.chantierId, h.chantier.nom, h.chantier.reference ?? "").couts += h.coutTotalHT;
    }
  });

  const topChantiers = [...chantierMap.values()]
    .filter((c) => c.ca > 0)
    .map((c) => ({ ...c, marge: c.ca - c.couts, txMarge: ((c.ca - c.couts) / c.ca) * 100 }))
    .sort((a, b) => b.marge - a.marge)
    .slice(0, 6);

  const maxMarge = Math.max(...topChantiers.map((c) => Math.abs(c.marge)), 1);

  // ── PRÉVISIONNEL DE CLÔTURE ──────────────────────────────────────────
  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1; // 1-12
  const moisEcoules = annee === todayYear ? Math.max(1, todayMonth) : 12;
  const moisRestants = 12 - moisEcoules;
  const caMoisMoyen = caHT / moisEcoules;
  const totalCharges = totalCVReelles + totalCFReelles;
  const chargesMoisMoyennes = totalCharges / moisEcoules;
  const caProjecte = caMoisMoyen * 12;
  const chargesProjectees = chargesMoisMoyennes * 12;
  const resultatProjecte = caProjecte - chargesProjectees;
  const seuilAtteintProjecte = seuilRentabilite > 0 && caProjecte >= seuilRentabilite;
  const moisAvantSR = seuilRentabilite > 0 && caMoisMoyen > 0
    ? Math.max(0, Math.ceil(seuilRentabilite / caMoisMoyen) - moisEcoules)
    : null;

  // ── COMPARATIF N vs N-1 ──────────────────────────────────────────────
  const caN1 = facturesN1.reduce((s, f) => s + f.totalHT, 0);
  const depN1 = (cat: string) => depensesN1.filter((d) => d.categorie === cat).reduce((s, d) => s + d.montant, 0);
  const chargesVarN1 = bcN1.reduce((s, b) => s + b.totalHT, 0)
    + cstN1.reduce((s, c) => s + (c.montantHT ?? 0), 0)
    + interimN1.reduce((s, h) => s + h.coutTotalHT, 0)
    + depN1("MATERIAUX") + depN1("SOUS_TRAITANCE") + depN1("TRANSPORT") + depN1("MAIN_OEUVRE") + depN1("AUTRE");
  const chargesFixN1 = depN1("LOYER") + depN1("ASSURANCE") + depN1("ADMINISTRATIF") + depN1("IMPOT_TAXE") + depN1("AMORTISSEMENT") + depN1("INVESTISSEMENT");
  const totalChargesN1 = chargesVarN1 + chargesFixN1;
  const mcvN1 = caN1 - chargesVarN1;
  const txMCVN1 = caN1 > 0 ? (mcvN1 / caN1) * 100 : 0;
  const resultatN1 = mcvN1 - chargesFixN1;

  const varCA = caN1 > 0 ? ((caHT - caN1) / caN1) * 100 : null;
  const varCharges = totalChargesN1 > 0 ? ((totalCharges - totalChargesN1) / totalChargesN1) * 100 : null;
  const varResultat = resultatN1 !== 0 ? ((resultatNetReel - resultatN1) / Math.abs(resultatN1)) * 100 : null;
  const varMCV = txMCVN1 > 0 ? txMCVReelle - txMCVN1 : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Styles impression */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 15mm 12mm; }
          body { font-size: 11px !important; }
          .print-hide { display: none !important; }
          .kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
          tr { break-inside: avoid; }
          h2, h3 { break-after: avoid; }
        }
        #main-content:fullscreen {
          overflow-y: auto;
          background: #f8fafc;
          padding: 2rem;
        }
      `}</style>

      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1 print:hidden">
            <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Tableau de rentabilité</span>
          </nav>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-violet-600" />
            <h2 className="text-xl font-bold text-brand-navy">Rentabilité société — {annee}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Compte de résultat analytique · Marge sur coût variable · Seuil de rentabilité
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <RentabiliteActions />
          <div className="flex items-center gap-2 print:hidden">
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
              {years.map((y) => (
                <Link
                  key={y}
                  href={`/finances/rentabilite?annee=${y}`}
                  className={`px-3 py-1.5 text-sm font-medium transition ${
                    y === annee ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {y}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Liens inter-modules */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {[
          { href: "/tresorerie", label: "Trésorerie", icon: Wallet },
          { href: "/finances", label: "Dépenses", icon: TrendingDown },
          { href: "/factures", label: "Factures", icon: Receipt },
          { href: "/marge-rentabilite", label: "Rentabilité chantiers", icon: TrendingUp },
          { href: `/comptabilite/bilan?annee=${annee}`, label: "Bilan comptable", icon: Scale },
          { href: `/finances/charges?annee=${annee}`, label: "Budget des charges", icon: Settings2 },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-brand-blue/40 hover:bg-blue-50 hover:text-brand-blue transition"
          >
            <Icon className="h-3 w-3" />
            {label}
          </Link>
        ))}
      </div>

      {/* Alerte si pas de budget */}
      {!hasBudget && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 print:hidden">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            Aucun budget de charges saisi pour {annee}.{" "}
            <Link href={`/finances/charges?annee=${annee}`} className="font-semibold underline">
              Saisir les budgets →
            </Link>
          </span>
        </div>
      )}

      {/* ── KPI CARDS ─────────────────────────────────────────────────── */}
      <div className="kpi-grid grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Chiffre d'affaires (facturé)"
          value={formatEuros(caHT)}
          sub={`Encaissé : ${formatEuros(caEncaissé)}`}
          color="blue"
          icon={<Receipt className="h-5 w-5" />}
        />
        <KpiCard
          title="Marge sur coût variable"
          value={formatEuros(mcvReelle)}
          sub={`Taux : ${txMCVReelle.toFixed(1)} %`}
          color={mcvReelle >= 0 ? "green" : "red"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="Résultat d'exploitation"
          value={formatEuros(resultatExploitationReel)}
          sub={`${pct(resultatExploitationReel, caHT).toFixed(1)} % du CA`}
          color={resultatExploitationReel >= 0 ? "green" : "red"}
          icon={<Target className="h-5 w-5" />}
        />
        <KpiCard
          title="Résultat net estimé"
          value={formatEuros(resultatNetReel)}
          sub={`IS estimé : ${formatEuros(isReel)}`}
          color={resultatNetReel >= 0 ? "green" : "red"}
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      {/* ── COMPARATIF N vs N-1 ───────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-700 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <Trend2 className="h-4 w-4" />
            Comparatif {annee} vs {annee - 1}
          </h3>
          <span className="text-xs text-white/60">Évolution annuelle</span>
        </div>
        <div className="grid grid-cols-2 gap-0 sm:grid-cols-4 divide-x divide-slate-100">
          <CompareCell label="Chiffre d'affaires" valN={caHT} valN1={caN1} variation={varCA} />
          <CompareCell label="Total charges" valN={totalCharges} valN1={totalChargesN1} variation={varCharges} inverser />
          <CompareCell label="Résultat net" valN={resultatNetReel} valN1={resultatN1} variation={varResultat} />
          <CompareCellPct label="Taux MCV" valN={txMCVReelle} valN1={txMCVN1} variation={varMCV} />
        </div>
      </div>

      {/* ── SEUIL DE RENTABILITÉ ──────────────────────────────────────── */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-violet-800">
          <Target className="h-5 w-5" />
          Seuil de rentabilité (point mort)
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-violet-600">Taux de marge sur coût variable</p>
            <p className="text-2xl font-bold text-violet-800">{txMCVReelle.toFixed(1)} %</p>
          </div>
          <div>
            <p className="text-xs text-violet-600">Seuil de rentabilité (CA minimum)</p>
            <p className="text-2xl font-bold text-violet-800">{formatEuros(seuilRentabilite)}</p>
            <p className="text-xs text-violet-500">= Charges fixes ÷ Taux MCV</p>
          </div>
          <div>
            <p className="text-xs text-violet-600">CA réel {annee} / SR</p>
            {seuilRentabilite > 0 ? (
              <>
                <p className={`text-2xl font-bold ${caHT >= seuilRentabilite ? "text-emerald-700" : "text-red-600"}`}>
                  {pct(caHT, seuilRentabilite).toFixed(0)} %
                </p>
                <p className="text-xs text-violet-500">
                  {caHT >= seuilRentabilite
                    ? `✓ Seuil atteint (+${formatEuros(caHT - seuilRentabilite)})`
                    : `⚠ Manque ${formatEuros(seuilRentabilite - caHT)}`}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">—</p>
            )}
          </div>
        </div>
        {seuilRentabilite > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-violet-600 mb-1">
              <span>0 €</span>
              <span className="font-medium">SR : {formatEuros(seuilRentabilite)}</span>
              {caHT > seuilRentabilite && <span className="font-medium text-emerald-700">CA : {formatEuros(caHT)}</span>}
            </div>
            <div className="relative h-4 rounded-full bg-violet-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${caHT >= seuilRentabilite ? "bg-emerald-500" : "bg-red-400"}`}
                style={{ width: `${Math.min(100, pct(caHT, seuilRentabilite))}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── TENDANCE MENSUELLE ────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-brand-blue/10 border-b border-brand-blue/20 px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-brand-navy flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Tendance mensuelle — {annee}
          </h3>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-emerald-400" /> CA HT</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-red-300" /> Charges</span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-end gap-1 h-32">
            {caParMois.map((ca, i) => {
              const charges = chargesParMois[i];
              const resultat = resultatParMois[i];
              const caH = Math.round((ca / maxMoisVal) * 100);
              const chH = Math.round((charges / maxMoisVal) * 100);
              const hasData = ca > 0 || charges > 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  {/* Tooltip */}
                  {hasData && (
                    <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block z-10 bg-slate-800 text-white text-[10px] rounded-md px-2 py-1.5 whitespace-nowrap shadow-lg pointer-events-none">
                      <p className="font-semibold">{moisLabels[i]} {annee}</p>
                      <p>CA : {formatEuros(ca)}</p>
                      <p>Charges : {formatEuros(charges)}</p>
                      <p className={resultat >= 0 ? "text-emerald-300" : "text-red-300"}>
                        Résultat : {formatEuros(resultat)}
                      </p>
                    </div>
                  )}
                  <div className="flex items-end gap-px w-full h-28">
                    <div
                      className={`flex-1 rounded-t-sm transition-all ${hasData ? "bg-emerald-400 hover:bg-emerald-500" : "bg-slate-100"}`}
                      style={{ height: `${caH}%` }}
                    />
                    <div
                      className={`flex-1 rounded-t-sm transition-all ${hasData ? "bg-red-300 hover:bg-red-400" : "bg-slate-100"}`}
                      style={{ height: `${chH}%` }}
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 leading-none">{moisLabels[i]}</span>
                </div>
              );
            })}
          </div>

          {/* Récap mensuel */}
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
            <div className="text-center">
              <p className="text-xs text-slate-500">CA moyen / mois</p>
              <p className="text-sm font-semibold text-emerald-700">{formatEuros(caHT / 12)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Charges moyennes / mois</p>
              <p className="text-sm font-semibold text-red-500">{formatEuros(totalCharges / 12)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500">Résultat moyen / mois</p>
              <p className={`text-sm font-semibold ${(caHT - totalCharges) / 12 >= 0 ? "text-brand-navy" : "text-red-600"}`}>
                {formatEuros((caHT - totalCharges) / 12)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRÉVISIONNEL DE CLÔTURE ───────────────────────────────────── */}
      {annee === todayYear && (
        <div className="rounded-xl border border-brand-orange/20 bg-brand-orange/5 shadow-sm overflow-hidden">
          <div className="bg-brand-orange/10 border-b border-brand-orange/20 px-5 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-brand-navy flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-orange" />
              Prévisionnel de clôture {annee}
            </h3>
            <span className="text-xs text-slate-500">
              {moisEcoules} mois écoulés · {moisRestants} mois restants
            </span>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <PrevCard
                label="CA projeté annuel"
                value={caProjecte}
                base={`Rythme : ${formatEuros(caMoisMoyen)} / mois`}
                positive
              />
              <PrevCard
                label="Charges projetées"
                value={chargesProjectees}
                base={`Rythme : ${formatEuros(chargesMoisMoyennes)} / mois`}
              />
              <PrevCard
                label="Résultat projeté"
                value={resultatProjecte}
                base={resultatProjecte >= 0 ? "Bénéfice estimé" : "Déficit estimé"}
                positive={resultatProjecte >= 0}
                highlight
              />
            </div>

            {seuilRentabilite > 0 && (
              <div className={`mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                seuilAtteintProjecte
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-amber-200 bg-amber-50 text-amber-700"
              }`}>
                {seuilAtteintProjecte ? (
                  <>
                    <span className="text-lg">✓</span>
                    <span>
                      Le seuil de rentabilité ({formatEuros(seuilRentabilite)}) devrait être atteint au rythme actuel.
                      CA projeté supérieur de{" "}
                      <strong>{formatEuros(caProjecte - seuilRentabilite)}</strong>.
                    </span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>
                      Seuil de rentabilité non atteint en projection ({formatEuros(seuilRentabilite)}).
                      {moisAvantSR !== null && moisAvantSR > 0
                        ? ` Il faudrait ${moisAvantSR} mois supplémentaire${moisAvantSR > 1 ? "s" : ""} au rythme actuel.`
                        : ""}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TOP CHANTIERS RENTABLES ────────────────────────────────────── */}
      {topChantiers.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-100 px-5 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-brand-navy flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Top chantiers rentables — {annee}
            </h3>
            <span className="text-xs text-slate-400">CA · Coûts · Marge</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-5 py-2.5 text-left">Chantier</th>
                  <th className="px-4 py-2.5 text-right w-32">CA HT</th>
                  <th className="px-4 py-2.5 text-right w-32">Coûts</th>
                  <th className="px-4 py-2.5 text-right w-32">Marge</th>
                  <th className="px-4 py-2.5 text-left w-48">Taux marge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {topChantiers.map((c) => {
                  const barW = Math.round(Math.min(100, (Math.abs(c.marge) / maxMarge) * 100));
                  const positive = c.marge >= 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="px-5 py-2.5">
                        <Link href={`/chantiers/${c.id}`} className="hover:text-brand-blue">
                          <p className="font-medium text-slate-700 truncate max-w-xs">{c.nom}</p>
                          <p className="text-xs text-slate-400">{c.reference}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatEuros(c.ca)}</td>
                      <td className="px-4 py-2.5 text-right text-slate-600">{formatEuros(c.couts)}</td>
                      <td className={`px-4 py-2.5 text-right font-semibold ${positive ? "text-emerald-700" : "text-red-600"}`}>
                        {formatEuros(c.marge)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${positive ? "bg-emerald-400" : "bg-red-400"}`}
                              style={{ width: `${barW}%` }}
                            />
                          </div>
                          <span className={`text-xs font-medium w-12 text-right ${positive ? "text-emerald-700" : "text-red-500"}`}>
                            {c.txMarge.toFixed(1)} %
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-5 py-2.5 bg-slate-50/50 flex justify-end">
            <Link href="/marge-rentabilite" className="text-xs text-brand-blue hover:underline flex items-center gap-1">
              Voir la rentabilité détaillée de tous les chantiers <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {/* ── COMPTE DE RÉSULTAT ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-brand-navy px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Compte de résultat analytique — {annee}</h3>
          {hasBudget && (
            <div className="flex items-center gap-4 text-xs text-white/70">
              <span>Budget</span>
              <span>Réel</span>
              <span>Écart</span>
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
              <th className="px-5 py-2.5 text-left">Poste</th>
              {hasBudget && <th className="px-4 py-2.5 text-right w-36">Budget</th>}
              <th className="px-4 py-2.5 text-right w-36">Réel</th>
              {hasBudget && <th className="px-4 py-2.5 text-right w-36">Écart</th>}
            </tr>
          </thead>
          <tbody>
            <SectionHeader label="Chiffre d'affaires HT" />
            <DataRow label="Factures émises (base engagement)" icon={<Receipt className="h-3.5 w-3.5 text-emerald-500" />}
              budget={caBudget || undefined} reel={caHT} hasBudget={hasBudget} link="/factures" inverse />
            <DataRow label="Encaissements réels (paiements reçus)" icon={<Wallet className="h-3.5 w-3.5 text-blue-400" />}
              reel={caEncaissé} hasBudget={hasBudget} link="/factures" inverse />

            <SectionHeader label="Charges variables" color="orange" />
            <DataRow label="Achats matériaux (BC + dépenses)" icon={<ShoppingCart className="h-3.5 w-3.5 text-slate-400" />}
              budget={bMat || undefined} reel={rMat} hasBudget={hasBudget} link="/bons-commande" />
            <DataRow label="Sous-traitance (contrats + dépenses)" icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
              budget={bST || undefined} reel={rST} hasBudget={hasBudget} link="/contrats-sous-traitance" />
            <DataRow label="Transport & déplacement" icon={<Truck className="h-3.5 w-3.5 text-slate-400" />}
              budget={bTransport || undefined} reel={rTransport} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Main-d'œuvre directe" icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
              budget={bMO || undefined} reel={rMO} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Intérimaires" icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
              budget={bInterim || undefined} reel={rInterim} hasBudget={hasBudget} link="/finances" />
            <DataRow label="Notes de frais" icon={<Receipt className="h-3.5 w-3.5 text-slate-400" />}
              reel={rNotesFrais} hasBudget={hasBudget} link="/notes-de-frais" />
            {rAutreVar > 0 && (
              <DataRow label="Autres charges variables" budget={bAutreVar || undefined} reel={rAutreVar} hasBudget={hasBudget} link="/depenses" />
            )}
            <TotalRow
              label="= Marge sur coût variable"
              value={mcvReelle}
              budget={hasBudget && totalCVBudget > 0 ? (caBudget > 0 ? caBudget - totalCVBudget : undefined) : undefined}
              taux={txMCVReelle}
              hasBudget={hasBudget}
              positive
            />

            <SectionHeader label="Charges fixes" color="blue" />
            <DataRow label="Personnel (salaires + charges + mutuelle)" icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
              budget={bSalaires || undefined} reel={rSalaires} hasBudget={hasBudget} link="/rh/bulletins" />
            <DataRow label="Loyer & charges locatives" icon={<Building2 className="h-3.5 w-3.5 text-slate-400" />}
              budget={bLoyer || undefined} reel={rLoyer} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Assurances" icon={<Building2 className="h-3.5 w-3.5 text-slate-400" />}
              budget={bAssurance || undefined} reel={rAssurance} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Frais administratifs" budget={bAdmin || undefined} reel={rAdmin} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Impôts & taxes" budget={bImpots || undefined} reel={rImpots} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Amortissements" budget={bAmort || undefined} reel={rAmort} hasBudget={hasBudget} link="/depenses" />
            {rInvest > 0 && (
              <DataRow label="Investissements" budget={bInvest || undefined} reel={rInvest} hasBudget={hasBudget} link="/depenses" />
            )}
            <TotalRow label="= Résultat d'exploitation (EBE)" value={resultatExploitationReel} taux={pct(resultatExploitationReel, caHT)} hasBudget={hasBudget} />

            <SectionHeader label="Résultat net" color="slate" />
            <DataRow label="IS estimé (15 % ≤ 42 500 € / 25 % au-delà)" reel={-isReel} hasBudget={hasBudget} link="/comptabilite" />
            <TotalRow label="= Résultat net" value={resultatNetReel} taux={pct(resultatNetReel, caHT)} hasBudget={hasBudget} bold />
          </tbody>
        </table>
      </div>

      {/* Lien vers budget */}
      <div className="flex justify-center print:hidden">
        <Link
          href={`/finances/charges?annee=${annee}`}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-sm hover:border-brand-blue/40 hover:text-brand-blue transition"
        >
          <Settings2 className="h-4 w-4" />
          {hasBudget ? "Modifier le budget des charges" : "Saisir le budget des charges pour activer la comparaison"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, color, icon,
}: {
  title: string; value: string; sub: string;
  color: "blue" | "green" | "red" | "orange";
  icon: React.ReactNode;
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-emerald-50 border-emerald-200 text-emerald-600",
    red: "bg-red-50 border-red-200 text-red-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium opacity-80">{title}</p>
        <span className="opacity-60">{icon}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  );
}

function CompareCell({ label, valN, valN1, variation, inverser = false }: {
  label: string; valN: number; valN1: number; variation: number | null; inverser?: boolean;
}) {
  const positive = inverser ? (variation ?? 0) <= 0 : (variation ?? 0) >= 0;
  return (
    <div className="p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-brand-navy">{formatEuros(valN)}</p>
      <p className="text-xs text-slate-400 mt-0.5">N-1 : {formatEuros(valN1)}</p>
      {variation !== null && (
        <p className={`text-xs font-medium mt-1 flex items-center gap-0.5 ${positive ? "text-emerald-600" : "text-red-500"}`}>
          {positive
            ? <ArrowUpRight className="h-3 w-3" />
            : <ArrowDownRight className="h-3 w-3" />}
          {variation > 0 ? "+" : ""}{variation.toFixed(1)} %
        </p>
      )}
    </div>
  );
}

function CompareCellPct({ label, valN, valN1, variation }: {
  label: string; valN: number; valN1: number; variation: number | null;
}) {
  const positive = (variation ?? 0) >= 0;
  return (
    <div className="p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-lg font-bold text-brand-navy">{valN.toFixed(1)} %</p>
      <p className="text-xs text-slate-400 mt-0.5">N-1 : {valN1.toFixed(1)} %</p>
      {variation !== null && (
        <p className={`text-xs font-medium mt-1 flex items-center gap-0.5 ${positive ? "text-emerald-600" : "text-red-500"}`}>
          {positive
            ? <ArrowUpRight className="h-3 w-3" />
            : <ArrowDownRight className="h-3 w-3" />}
          {variation > 0 ? "+" : ""}{variation.toFixed(1)} pts
        </p>
      )}
    </div>
  );
}

function PrevCard({ label, value, base, positive = false, highlight = false }: {
  label: string; value: number; base: string; positive?: boolean; highlight?: boolean;
}) {
  const col = highlight
    ? (positive ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50")
    : "border-slate-200 bg-white";
  const textCol = highlight
    ? (positive ? "text-emerald-700" : "text-red-600")
    : "text-brand-navy";
  return (
    <div className={`rounded-xl border p-4 ${col}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${textCol}`}>{formatEuros(value)}</p>
      <p className="text-xs text-slate-400 mt-0.5">{base}</p>
    </div>
  );
}

function SectionHeader({ label, color = "slate" }: { label: string; color?: "orange" | "blue" | "slate" }) {
  const bg = color === "orange" ? "bg-brand-orange/8" : color === "blue" ? "bg-brand-blue/8" : "bg-slate-50";
  const text = color === "orange" ? "text-brand-orange-dark" : color === "blue" ? "text-brand-navy" : "text-slate-600";
  return (
    <tr className={`border-t border-b border-slate-100 ${bg}`}>
      <td colSpan={4} className={`px-5 py-2 text-xs font-bold uppercase tracking-wider ${text}`}>
        {label}
      </td>
    </tr>
  );
}

function DataRow({
  label, icon, budget, reel, hasBudget, link, inverse = false,
}: {
  label: string;
  icon?: React.ReactNode;
  budget?: number;
  reel: number;
  hasBudget: boolean;
  link?: string;
  inverse?: boolean;
}) {
  return (
    <tr className="hover:bg-slate-50/50 border-b border-slate-50">
      <td className="px-5 py-2 text-slate-600">
        {link ? (
          <Link href={link} className="flex items-center gap-2 hover:text-brand-blue group">
            {icon}
            {label}
            <ArrowRight className="ml-auto h-3 w-3 text-slate-300 group-hover:text-brand-blue" />
          </Link>
        ) : (
          <span className="flex items-center gap-2">{icon}{label}</span>
        )}
      </td>
      {hasBudget && (
        <td className="px-4 py-2 text-right text-slate-400 text-xs">
          {budget != null && budget !== 0 ? formatEuros(budget) : "—"}
        </td>
      )}
      <td className={`px-4 py-2 text-right font-medium ${reel < 0 ? "text-red-600" : "text-slate-700"}`}>
        {formatEuros(Math.abs(reel))}
      </td>
      {hasBudget && (
        <td className="px-4 py-2 text-right">
          {budget != null && budget !== 0
            ? <EcartBadge reel={reel} budget={budget} inverser={inverse} />
            : <span className="text-xs text-slate-300">—</span>
          }
        </td>
      )}
    </tr>
  );
}

function TotalRow({
  label, value, budget, taux, hasBudget, positive = false, bold = false,
}: {
  label: string; value: number; budget?: number; taux: number; hasBudget: boolean;
  positive?: boolean; bold?: boolean;
}) {
  const color = value >= 0 ? "text-emerald-700" : "text-red-600";
  const bg = value >= 0 ? "bg-emerald-50/60" : "bg-red-50/60";
  return (
    <tr className={`border-t-2 border-slate-200 ${bg}`}>
      <td className={`px-5 py-3 text-sm ${bold ? "font-bold" : "font-semibold"} text-slate-800`}>
        {label}
        <span className="ml-2 text-xs font-normal text-slate-500">({taux.toFixed(1)} % du CA)</span>
      </td>
      {hasBudget && (
        <td className="px-4 py-3 text-right text-sm font-medium text-slate-500">
          {budget != null ? formatEuros(budget) : "—"}
        </td>
      )}
      <td className={`px-4 py-3 text-right text-sm ${bold ? "font-bold" : "font-semibold"} ${color}`}>
        {formatEuros(value)}
      </td>
      {hasBudget && (
        <td className="px-4 py-3 text-right">
          {budget != null ? <EcartBadge reel={value} budget={budget} inverser={positive} /> : "—"}
        </td>
      )}
    </tr>
  );
}
