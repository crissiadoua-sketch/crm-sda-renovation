export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";
import {
  CaMensuelChart,
  ClientTypePieChart,
  CaChantierBar,
  FunnelCommercialChart,
  RadarCorpsChart,
  DepensesBar,
  type CaMensuelData,
  type ClientTypeData,
  type CaChantierData,
  type FunnelData,
  type RadarCorpsData,
  type DepenseMensuelleData,
} from "@/components/charts/analytique-charts";
import { CLIENT_TYPE_LABELS } from "@/lib/reference";

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default async function AnalytiquePage() {
  const now = new Date();
  const y = now.getFullYear();
  const debutAnnee = new Date(y, 0, 1);

  const [
    factures,
    paiements,
    devis,
    clients,
    chantiers,
    depenses,
    articlesStock,
  ] = await Promise.all([
    prisma.facture.findMany({
      where: { dateEmission: { gte: debutAnnee } },
      select: { totalTTC: true, montantPaye: true, dateEmission: true, statut: true },
    }),
    prisma.paiement.findMany({
      where: { date: { gte: debutAnnee } },
      select: { montant: true, date: true },
    }),
    prisma.devis.findMany({
      where: { dateCreation: { gte: debutAnnee } },
      select: { totalTTC: true, dateCreation: true, statut: true },
    }),
    prisma.client.findMany({
      select: { type: true, statut: true },
    }),
    prisma.chantier.findMany({
      include: {
        factures: { select: { totalTTC: true, montantPaye: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.depense.findMany({
      where: { date: { gte: debutAnnee } },
      select: { montant: true, categorie: true, date: true },
    }),
    prisma.articleStock.findMany({
      select: { corpsEtat: true, stockActuel: true, prixUnitaireHT: true },
      where: { actif: true },
    }),
  ]);

  // ─── 1. CA mensuel ────────────────────────────────────────────────────────
  const caMensuel: CaMensuelData[] = MOIS.map((mois, i) => {
    const facturesM = factures.filter((f) => new Date(f.dateEmission).getMonth() === i);
    const paiementsM = paiements.filter((p) => new Date(p.date).getMonth() === i);
    const devisM = devis.filter((d) => new Date(d.dateCreation).getMonth() === i);
    return {
      mois,
      facture: Math.round(facturesM.reduce((acc, f) => acc + f.totalTTC, 0)),
      encaisse: Math.round(paiementsM.reduce((acc, p) => acc + p.montant, 0)),
      devis: Math.round(devisM.reduce((acc, d) => acc + d.totalTTC, 0)),
    };
  });

  // ─── 2. Répartition clients ───────────────────────────────────────────────
  const clientTypes: Record<string, number> = {};
  for (const c of clients) {
    const label = CLIENT_TYPE_LABELS[c.type] ?? c.type;
    clientTypes[label] = (clientTypes[label] ?? 0) + 1;
  }
  const clientTypeData: ClientTypeData[] = Object.entries(clientTypes)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value]) => ({ name, value }));

  // ─── 3. CA par chantier (top 10) ─────────────────────────────────────────
  const caChantierData: CaChantierData[] = chantiers
    .map((c) => ({
      nom: c.nom.slice(0, 28) + (c.nom.length > 28 ? "…" : ""),
      ca: Math.round(c.factures.reduce((acc, f) => acc + f.totalTTC, 0)),
      marge: Math.round(c.factures.reduce((acc, f) => acc + f.montantPaye, 0)),
    }))
    .filter((c) => c.ca > 0)
    .sort((a, b) => b.ca - a.ca)
    .slice(0, 8);

  // ─── 4. Funnel commercial ─────────────────────────────────────────────────
  const devisEmis = devis.length;
  const devisAcceptes = devis.filter((d) => d.statut === "ACCEPTE").length;
  const facturesCreees = factures.length;
  const facturesPayees = factures.filter((f) => f.statut === "PAYEE").length;

  const funnelData: FunnelData[] = [
    { name: "Devis émis", value: devisEmis, fill: "#94a3b8" },
    { name: "Devis acceptés", value: devisAcceptes, fill: "#29ABE2" },
    { name: "Facturés", value: facturesCreees, fill: "#F7941E" },
    { name: "Payés", value: facturesPayees, fill: "#10b981" },
  ];

  // ─── 5. Radar stock par corps d'état ─────────────────────────────────────
  const stockParCorps: Record<string, number> = {};
  for (const a of articlesStock) {
    stockParCorps[a.corpsEtat] = (stockParCorps[a.corpsEtat] ?? 0) + a.stockActuel * a.prixUnitaireHT;
  }
  const radarData: RadarCorpsData[] = Object.entries(stockParCorps)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([corpsEtat, valeur]) => ({ corpsEtat, valeur: Math.round(valeur) }));

  // ─── 6. Dépenses mensuelles par catégorie ────────────────────────────────
  const depensesMensuelles: DepenseMensuelleData[] = MOIS.map((mois, i) => {
    const depM = depenses.filter((d) => new Date(d.date).getMonth() === i);
    return {
      mois,
      MATERIAUX: Math.round(depM.filter((d) => d.categorie === "MATERIAUX").reduce((acc, d) => acc + d.montant, 0)),
      MAIN_OEUVRE: Math.round(depM.filter((d) => d.categorie === "MAIN_OEUVRE").reduce((acc, d) => acc + d.montant, 0)),
      SOUS_TRAITANCE: Math.round(depM.filter((d) => d.categorie === "SOUS_TRAITANCE").reduce((acc, d) => acc + d.montant, 0)),
      AUTRE: Math.round(depM.filter((d) => !["MATERIAUX", "MAIN_OEUVRE", "SOUS_TRAITANCE"].includes(d.categorie)).reduce((acc, d) => acc + d.montant, 0)),
    };
  });

  // ─── KPIs synthèse ───────────────────────────────────────────────────────
  const totalFacture = factures.reduce((acc, f) => acc + f.totalTTC, 0);
  const totalEncaisse = paiements.reduce((acc, p) => acc + p.montant, 0);
  const totalDepenses = depenses.reduce((acc, d) => acc + d.montant, 0);
  const txConversion = devisEmis > 0 ? Math.round((devisAcceptes / devisEmis) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Bandeau KPIs annuels */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: `CA facturé ${y}`, value: formatEuros(totalFacture), color: "text-brand-blue" },
          { label: "Encaissé", value: formatEuros(totalEncaisse), color: "text-emerald-600" },
          { label: "Dépenses", value: formatEuros(totalDepenses), color: "text-red-600" },
          { label: "Taux de conversion devis", value: `${txConversion} %`, color: "text-brand-orange-dark" },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{kpi.label}</p>
            <p className={`mt-2 text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* 1. Évolution CA mensuelle */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 font-semibold text-brand-navy">Évolution du chiffre d'affaires {y}</h3>
        <p className="mb-4 text-xs text-slate-400">Devis émis / Facturé / Encaissé — vue mensuelle</p>
        <CaMensuelChart data={caMensuel} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 2. Répartition clients par type */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 font-semibold text-brand-navy">Répartition des clients par type</h3>
          <p className="mb-4 text-xs text-slate-400">{clients.length} clients au total</p>
          <ClientTypePieChart data={clientTypeData} />
        </div>

        {/* 4. Funnel commercial */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 font-semibold text-brand-navy">Tunnel commercial {y}</h3>
          <p className="mb-4 text-xs text-slate-400">
            Devis émis → Acceptés → Facturés → Payés (taux conv. : {txConversion} %)
          </p>
          <FunnelCommercialChart data={funnelData} />
        </div>
      </div>

      {/* 3. CA par chantier */}
      {caChantierData.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 font-semibold text-brand-navy">CA par chantier (top {caChantierData.length})</h3>
          <p className="mb-4 text-xs text-slate-400">Facturé vs Encaissé</p>
          <CaChantierBar data={caChantierData} />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 5. Radar stock par corps d'état */}
        {radarData.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-1 font-semibold text-brand-navy">Valeur du stock par corps d'état</h3>
            <p className="mb-4 text-xs text-slate-400">En euros HT — top {radarData.length} corps</p>
            <RadarCorpsChart data={radarData} />
          </div>
        )}

        {/* 6. Dépenses mensuelles */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 font-semibold text-brand-navy">Dépenses mensuelles {y}</h3>
          <p className="mb-4 text-xs text-slate-400">Empilées par catégorie</p>
          <DepensesBar data={depensesMensuelles} />
        </div>
      </div>
    </div>
  );
}
