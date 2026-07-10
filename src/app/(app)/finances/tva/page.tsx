import Link from "next/link";
import { ChevronRight, Receipt, ShoppingCart, ArrowRight, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";

const MOIS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default async function TVAPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; regime?: string }>;
}) {
  const { annee: anneeParam, regime: regimeParam } = await searchParams;
  const annee = parseInt(anneeParam ?? "") || new Date().getFullYear();
  const regime = regimeParam === "encaissements" ? "encaissements" : "debit";
  const years = Array.from({ length: 4 }, (_, i) => annee - 1 + i);

  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee, 11, 31, 23, 59, 59);

  const [factures, bonsCommande, contratsAL] = await Promise.all([
    prisma.facture.findMany({
      where: { dateEmission: { gte: debut, lte: fin }, statut: { notIn: ["BROUILLON", "ANNULEE"] } },
      select: { totalHT: true, totalTVA: true, dateEmission: true, statut: true, numero: true },
    }),
    prisma.bonCommande.findMany({
      where: { dateCreation: { gte: debut, lte: fin }, statut: { in: ["CONFIRME", "RECU_PARTIEL", "RECU"] } },
      select: { totalHT: true, totalTVA: true, dateCreation: true },
    }),
    // Contrats sous-traitance en auto-liquidation (TVA à déclarer par le maître d'œuvre)
    prisma.contratSousTraitance.findMany({
      where: {
        createdAt: { gte: debut, lte: fin },
        autoLiquidationTVA: true,
        statut: { in: ["SIGNE", "EN_COURS", "TERMINE"] },
      },
      select: { montantHT: true, tauxTVA: true, createdAt: true, numero: true },
    }),
  ]);

  // ── PAR MOIS ─────────────────────────────────────────────────────────
  type MoisData = {
    tvaCollectee: number;
    tvaDeductibleBC: number;
    tvaAutoLiq: number; // TVA auto-liquidation (collectée ET déductible = neutre mais à déclarer)
    caHT: number;
    achatsHT: number;
  };

  const parMois: MoisData[] = Array.from({ length: 12 }, () => ({
    tvaCollectee: 0,
    tvaDeductibleBC: 0,
    tvaAutoLiq: 0,
    caHT: 0,
    achatsHT: 0,
  }));

  factures.forEach((f) => {
    const m = new Date(f.dateEmission).getMonth();
    parMois[m].tvaCollectee += f.totalTVA;
    parMois[m].caHT += f.totalHT;
  });

  bonsCommande.forEach((bc) => {
    const m = new Date(bc.dateCreation).getMonth();
    parMois[m].tvaDeductibleBC += bc.totalTVA;
    parMois[m].achatsHT += bc.totalHT;
  });

  contratsAL.forEach((c) => {
    const m = new Date(c.createdAt).getMonth();
    const tva = (c.montantHT ?? 0) * ((c.tauxTVA ?? 20) / 100);
    parMois[m].tvaAutoLiq += tva;
  });

  // ── TOTAUX ANNUELS ────────────────────────────────────────────────────
  const totalTVACollectee = parMois.reduce((s, m) => s + m.tvaCollectee, 0);
  const totalTVADeductible = parMois.reduce((s, m) => s + m.tvaDeductibleBC, 0);
  const totalTVAAutoLiq = parMois.reduce((s, m) => s + m.tvaAutoLiq, 0);
  const totalTVANette = totalTVACollectee - totalTVADeductible;
  const totalCAHT = parMois.reduce((s, m) => s + m.caHT, 0);
  const totalAchatsHT = parMois.reduce((s, m) => s + m.achatsHT, 0);

  // ── TRIMESTRES ────────────────────────────────────────────────────────
  const trimestres = [
    { label: "T1 (Jan–Mar)", mois: [0, 1, 2] },
    { label: "T2 (Avr–Jun)", mois: [3, 4, 5] },
    { label: "T3 (Jul–Sep)", mois: [6, 7, 8] },
    { label: "T4 (Oct–Déc)", mois: [9, 10, 11] },
  ].map(({ label, mois }) => {
    const collectee = mois.reduce((s, i) => s + parMois[i].tvaCollectee, 0);
    const deductible = mois.reduce((s, i) => s + parMois[i].tvaDeductibleBC, 0);
    const autoLiq = mois.reduce((s, i) => s + parMois[i].tvaAutoLiq, 0);
    return { label, collectee, deductible, autoLiq, nette: collectee - deductible };
  });

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Suivi TVA</span>
          </nav>
          <h2 className="text-xl font-bold text-brand-navy">Suivi TVA — {annee}</h2>
          <p className="mt-1 text-sm text-slate-500">
            TVA collectée · TVA déductible · Auto-liquidation sous-traitance · Éléments CA3
          </p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
          {years.map((y) => (
            <Link key={y} href={`?annee=${y}`}
              className={`px-3 py-1.5 text-sm font-medium transition ${y === annee ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-50"}`}>
              {y}
            </Link>
          ))}
        </div>
      </div>

      {/* Info auto-liquidation */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        <Info className="h-5 w-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">Auto-liquidation TVA sous-traitance (BTP)</p>
          <p className="text-xs mt-0.5 text-blue-600">
            Les sous-traitants BTP facturent HT uniquement. En tant que maître d'œuvre, vous déclarez la TVA
            en tant que <strong>collectée et déductible simultanément</strong> — impact net nul mais déclaration obligatoire sur la CA3.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <TvaKpi label="TVA collectée (CA)" value={totalTVACollectee} color="emerald"
          sub={`CA HT : ${formatEuros(totalCAHT)}`} />
        <TvaKpi label="TVA déductible (Achats)" value={totalTVADeductible} color="blue"
          sub={`Achats HT : ${formatEuros(totalAchatsHT)}`} />
        <TvaKpi label="TVA auto-liquidation" value={totalTVAAutoLiq} color="violet"
          sub={`${contratsAL.length} contrat${contratsAL.length > 1 ? "s" : ""} ST`} />
        <TvaKpi
          label="TVA nette à payer"
          value={totalTVANette}
          color={totalTVANette >= 0 ? "orange" : "emerald"}
          sub={totalTVANette >= 0 ? "À reverser au Trésor" : "Crédit de TVA"}
        />
      </div>

      {/* Tableau mensuel */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-brand-navy px-5 py-3">
          <h3 className="font-semibold text-white">Récapitulatif mensuel — {annee}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                <th className="px-5 py-2.5 text-left w-20">Mois</th>
                <th className="px-4 py-2.5 text-right">CA HT</th>
                <th className="px-4 py-2.5 text-right">TVA collectée</th>
                <th className="px-4 py-2.5 text-right">Achats HT</th>
                <th className="px-4 py-2.5 text-right">TVA déductible</th>
                <th className="px-4 py-2.5 text-right">Auto-liq ST</th>
                <th className="px-4 py-2.5 text-right font-bold">Solde TVA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {parMois.map((m, i) => {
                const nette = m.tvaCollectee - m.tvaDeductibleBC;
                const hasData = m.caHT > 0 || m.achatsHT > 0 || m.tvaAutoLiq > 0;
                return (
                  <tr key={i} className={`${hasData ? "hover:bg-slate-50/50" : "opacity-40"}`}>
                    <td className="px-5 py-2 font-medium text-slate-700">{MOIS[i]}</td>
                    <td className="px-4 py-2 text-right text-slate-600 text-xs">{m.caHT > 0 ? formatEuros(m.caHT) : "—"}</td>
                    <td className="px-4 py-2 text-right text-emerald-700 font-medium">{m.tvaCollectee > 0 ? formatEuros(m.tvaCollectee) : "—"}</td>
                    <td className="px-4 py-2 text-right text-slate-600 text-xs">{m.achatsHT > 0 ? formatEuros(m.achatsHT) : "—"}</td>
                    <td className="px-4 py-2 text-right text-blue-600 font-medium">{m.tvaDeductibleBC > 0 ? formatEuros(m.tvaDeductibleBC) : "—"}</td>
                    <td className="px-4 py-2 text-right text-violet-600 text-xs">{m.tvaAutoLiq > 0 ? formatEuros(m.tvaAutoLiq) : "—"}</td>
                    <td className={`px-4 py-2 text-right font-bold ${nette > 0 ? "text-brand-orange-dark" : nette < 0 ? "text-emerald-700" : "text-slate-400"}`}>
                      {hasData ? formatEuros(nette) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold">
                <td className="px-5 py-3 text-brand-navy">TOTAL {annee}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatEuros(totalCAHT)}</td>
                <td className="px-4 py-3 text-right text-emerald-700">{formatEuros(totalTVACollectee)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{formatEuros(totalAchatsHT)}</td>
                <td className="px-4 py-3 text-right text-blue-600">{formatEuros(totalTVADeductible)}</td>
                <td className="px-4 py-3 text-right text-violet-600">{formatEuros(totalTVAAutoLiq)}</td>
                <td className={`px-4 py-3 text-right font-bold text-lg ${totalTVANette > 0 ? "text-brand-orange-dark" : "text-emerald-700"}`}>
                  {formatEuros(totalTVANette)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Récapitulatif trimestriel (CA3) */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-700 px-5 py-3">
          <h3 className="font-semibold text-white">Éléments CA3 par trimestre — {annee}</h3>
        </div>
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4 divide-x divide-slate-100">
          {trimestres.map((t) => (
            <div key={t.label} className="p-4">
              <p className="text-xs font-semibold text-slate-500 mb-3">{t.label}</p>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">TVA collectée</span>
                  <span className="font-medium text-emerald-700">{formatEuros(t.collectee)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">TVA déductible</span>
                  <span className="font-medium text-blue-600">−{formatEuros(t.deductible)}</span>
                </div>
                {t.autoLiq > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Auto-liq (info)</span>
                    <span className="text-violet-500">{formatEuros(t.autoLiq)}</span>
                  </div>
                )}
                <div className={`flex justify-between text-sm font-bold border-t border-slate-100 pt-2 mt-1 ${t.nette > 0 ? "text-brand-orange-dark" : "text-emerald-700"}`}>
                  <span>{t.nette > 0 ? "À payer" : "Crédit"}</span>
                  <span>{formatEuros(Math.abs(t.nette))}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lien vers factures et CST */}
      <div className="flex flex-wrap gap-3">
        <Link href="/factures" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:text-brand-blue hover:border-brand-blue/30 transition">
          <Receipt className="h-4 w-4" /> Voir les factures <ArrowRight className="h-3 w-3" />
        </Link>
        <Link href="/contrats-sous-traitance" className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 shadow-sm hover:text-brand-blue hover:border-brand-blue/30 transition">
          <ShoppingCart className="h-4 w-4" /> Contrats sous-traitance <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function TvaKpi({ label, value, sub, color }: {
  label: string; value: number; sub: string;
  color: "emerald" | "blue" | "violet" | "orange";
}) {
  const colors = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-700",
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colors[color]}`}>
      <p className="text-xs font-medium opacity-80 mb-1">{label}</p>
      <p className="text-xl font-bold">{formatEuros(value)}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  );
}
