export const dynamic = "force-dynamic";

import Link from "next/link";
import { TrendingUp, TrendingDown, AlertTriangle, ChevronRight, Info } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";

const STATUT_LABELS: Record<string, string> = {
  PROSPECT: "Prospect",
  DEVIS_ENVOYE: "Devis envoyé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

const STATUT_TONES: Record<string, string> = {
  PROSPECT: "bg-slate-100 text-slate-600",
  DEVIS_ENVOYE: "bg-blue-100 text-blue-700",
  EN_COURS: "bg-orange-100 text-orange-700",
  TERMINE: "bg-green-100 text-green-700",
  ANNULE: "bg-red-100 text-red-600",
};

function pct(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, (value / total) * 100));
}

function rentaColor(r: number | null) {
  if (r === null) return "text-slate-400";
  if (r >= 20) return "text-green-600 font-semibold";
  if (r >= 10) return "text-emerald-600 font-semibold";
  if (r >= 0) return "text-orange-500 font-semibold";
  return "text-red-600 font-semibold";
}

function KpiCard({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "good" | "bad" | "warn";
}) {
  const toneClass = {
    neutral: "text-brand-navy",
    good: "text-green-600",
    bad: "text-red-600",
    warn: "text-orange-500",
  }[tone];
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${toneClass}`}>{value}</p>
      {sub && <p className={`mt-0.5 text-sm font-semibold ${toneClass}`}>{sub}</p>}
    </div>
  );
}

export default async function MargeRentabilitePage() {
  const chantiers = await prisma.chantier.findMany({
    where: { statut: { not: "ANNULE" } },
    include: {
      devis: { where: { statut: "ACCEPTE", type: "INITIAL" } },
      factures: { where: { statut: { not: "ANNULEE" } } },
      bonsCommande: { where: { statut: { in: ["CONFIRME", "RECU_PARTIEL", "RECU"] } } },
      bonsCommandeBeton: { where: { statut: { in: ["CONFIRME", "LIVRE"] } } },
      contrats: { where: { statut: { in: ["SIGNE", "TERMINE"] } } },
      depenses: { where: { type: "REEL" } },
      reservationsPompe: { where: { statut: "CONFIRME" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const data = chantiers.map((c) => {
    const caPrévu = c.devis.reduce((s, d) => s + d.totalHT, 0);
    const dsPrévu = c.devis.reduce((s, d) => s + d.totalDS, 0);
    const caFacturé = c.factures.reduce((s, f) => s + f.totalHT, 0);
    const montantEncaissé = c.factures.reduce((s, f) => s + f.montantPaye, 0);

    const coutBC = c.bonsCommande.reduce((s, bc) => s + bc.totalHT, 0);
    const coutBCB = c.bonsCommandeBeton.reduce((s, bcb) => s + bcb.totalHT, 0);
    const coutCST = c.contrats.reduce((s, ct) => s + (ct.montantHT ?? 0), 0);
    const coutDepenses = c.depenses.reduce((s, d) => s + d.montant, 0);
    const coutPompe = c.reservationsPompe.reduce((s, p) => s + (p.prixHT ?? 0), 0);
    const coutsEngagés = coutBC + coutBCB + coutCST + coutDepenses + coutPompe;

    const margeBrute = caFacturé - coutsEngagés;
    const margeEncaissée = montantEncaissé - coutsEngagés;
    const margePrevisionnelle = caPrévu - coutsEngagés;
    const rentabilité = caFacturé > 0 ? (margeBrute / caFacturé) * 100 : null;
    const rentabilitéEncaissée = montantEncaissé > 0 ? (margeEncaissée / montantEncaissé) * 100 : null;
    const dérive = caPrévu > 0 && coutsEngagés > caPrévu;
    const écartDS = dsPrévu > 0 ? coutsEngagés - dsPrévu : null;

    return {
      id: c.id,
      reference: c.reference,
      nom: c.nom,
      statut: c.statut,
      budgetEstime: c.budgetEstime,
      caPrévu,
      dsPrévu,
      caFacturé,
      montantEncaissé,
      coutsEngagés,
      coutBC,
      coutBCB,
      coutCST,
      coutDepenses,
      coutPompe,
      margeBrute,
      margeEncaissée,
      margePrevisionnelle,
      rentabilité,
      rentabilitéEncaissée,
      dérive,
      écartDS,
    };
  });

  // Trier : dérive en premier, puis par rentabilité croissante (les moins bons en tête pour agir)
  data.sort((a, b) => {
    if (a.dérive && !b.dérive) return -1;
    if (!a.dérive && b.dérive) return 1;
    if (a.rentabilité === null && b.rentabilité === null) return 0;
    if (a.rentabilité === null) return 1;
    if (b.rentabilité === null) return -1;
    return a.rentabilité - b.rentabilité;
  });

  // KPIs globaux (chantiers EN_COURS + TERMINE uniquement pour les chiffres réels)
  const totalCaPrévu = data.reduce((s, d) => s + d.caPrévu, 0);
  const totalDSPrévu = data.reduce((s, d) => s + d.dsPrévu, 0);
  const totalCaFacturé = data.reduce((s, d) => s + d.caFacturé, 0);
  const totalEncaissé = data.reduce((s, d) => s + d.montantEncaissé, 0);
  const totalCouts = data.reduce((s, d) => s + d.coutsEngagés, 0);
  const totalMarge = totalCaFacturé - totalCouts;
  const totalMargeEncaissée = totalEncaissé - totalCouts;
  const rentabilitéGlobale = totalCaFacturé > 0 ? (totalMarge / totalCaFacturé) * 100 : 0;
  const nbEnDérive = data.filter((d) => d.dérive).length;
  const totalÉcartDS = totalDSPrévu > 0 ? totalCouts - totalDSPrévu : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">Marge &amp; Rentabilité</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Suivi DS réel vs CA — {data.length} chantier{data.length > 1 ? "s" : ""} actif{data.length > 1 ? "s" : ""}
          </p>
        </div>
        {nbEnDérive > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {nbEnDérive} chantier{nbEnDérive > 1 ? "s" : ""} en dérive de coûts
          </div>
        )}
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
        <KpiCard label="CA prévu (devis)" value={formatEuros(totalCaPrévu)} />
        <KpiCard label="CA facturé" value={formatEuros(totalCaFacturé)} />
        <KpiCard
          label="CA encaissé"
          value={formatEuros(totalEncaissé)}
          tone={totalEncaissé < totalCaFacturé ? "warn" : "good"}
        />
        <KpiCard
          label="DS prévu (devis)"
          value={totalDSPrévu > 0 ? formatEuros(totalDSPrévu) : "—"}
          tone="neutral"
        />
        <KpiCard
          label="DS réel (coûts engagés)"
          value={formatEuros(totalCouts)}
          tone={totalCouts > totalCaPrévu ? "bad" : "neutral"}
        />
        <KpiCard
          label="Écart DS réel − prévu"
          value={totalÉcartDS !== null ? `${totalÉcartDS >= 0 ? "+" : ""}${formatEuros(totalÉcartDS)}` : "—"}
          tone={totalÉcartDS === null ? "neutral" : totalÉcartDS > 0 ? "bad" : "good"}
        />
        <KpiCard
          label="Marge (CA facturé)"
          value={formatEuros(totalMarge)}
          sub={`${rentabilitéGlobale.toFixed(1)} % de rentabilité`}
          tone={totalMarge >= 0 ? "good" : "bad"}
        />
        <KpiCard
          label="Marge (encaissée)"
          value={formatEuros(totalMargeEncaissée)}
          sub={totalEncaissé > 0 ? `${((totalMargeEncaissée / totalEncaissé) * 100).toFixed(1)} % rentab.` : ""}
          tone={totalMargeEncaissée >= 0 ? "good" : "bad"}
        />
      </div>

      {/* Légende DS */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
        <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span><strong className="text-slate-600">DS prévu</strong> = somme des déboursés secs des devis acceptés (coût de revient budgété)</span>
        <span><strong className="text-slate-600">DS réel</strong> = BCs matériaux + BC Béton + Sous-traitance + Dépenses + Pompage</span>
        <span><strong className="text-slate-600">Marge</strong> = CA facturé − DS réel</span>
        <span><strong className="text-slate-600">Rentabilité</strong> = Marge ÷ CA facturé</span>
      </div>

      {/* Tableau */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Chantier</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-right">CA prévu</th>
              <th className="px-4 py-3 text-right">CA facturé</th>
              <th className="px-4 py-3 text-right">Encaissé</th>
              <th className="px-4 py-3 text-right">DS prévu</th>
              <th className="px-4 py-3 text-right">DS réel</th>
              <th className="px-4 py-3 text-right">Écart DS</th>
              <th className="px-4 py-3 min-w-[140px]">Avancement</th>
              <th className="px-4 py-3 text-right">Marge / Rentab.</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => {
              const barCouts = pct(row.coutsEngagés, row.caPrévu || row.caFacturé || row.coutsEngagés);
              const barFacturé = pct(row.caFacturé, row.caPrévu || row.caFacturé);
              const alerteDérive = row.dérive;

              return (
                <tr
                  key={row.id}
                  className={`hover:bg-slate-50 ${alerteDérive ? "bg-red-50/50" : ""}`}
                >
                  <td className="px-4 py-3">
                    <Link href={`/chantiers/${row.id}`} className="group">
                      <span className="text-xs font-mono text-slate-400 group-hover:text-brand-blue">
                        {row.reference}
                      </span>
                      <p className="font-medium text-brand-navy group-hover:text-brand-blue group-hover:underline">
                        {row.nom}
                      </p>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUT_TONES[row.statut] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {STATUT_LABELS[row.statut] ?? row.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-slate-700">
                    {row.caPrévu > 0 ? formatEuros(row.caPrévu) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-slate-700">
                    {row.caFacturé > 0 ? formatEuros(row.caFacturé) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    <span className={row.montantEncaissé >= row.caFacturé ? "text-emerald-600" : "text-amber-600"}>
                      {row.montantEncaissé > 0 ? formatEuros(row.montantEncaissé) : <span className="text-slate-300">—</span>}
                    </span>
                    {row.caFacturé > 0 && row.montantEncaissé < row.caFacturé && (
                      <p className="text-[10px] text-slate-400">{((row.montantEncaissé / row.caFacturé) * 100).toFixed(0)}% encaissé</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-amber-700">
                    {row.dsPrévu > 0 ? formatEuros(row.dsPrévu) : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    <span className={alerteDérive ? "font-semibold text-red-600" : "text-slate-700"}>
                      {row.coutsEngagés > 0 ? formatEuros(row.coutsEngagés) : <span className="text-slate-300">—</span>}
                    </span>
                    {alerteDérive && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500">
                        <AlertTriangle className="h-3 w-3" /> dérive CA
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {row.écartDS !== null ? (
                      <span className={row.écartDS > 0 ? "font-semibold text-red-600" : "font-semibold text-green-600"}>
                        {row.écartDS > 0 ? "+" : ""}{formatEuros(row.écartDS)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {(row.caPrévu > 0 || row.coutsEngagés > 0) ? (
                      <div className="flex flex-col gap-1">
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          {/* Barre CA facturé (fond vert clair) */}
                          <div
                            className="absolute inset-y-0 left-0 rounded-full bg-green-200"
                            style={{ width: `${barFacturé}%` }}
                          />
                          {/* Barre coûts (premier plan) */}
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all ${alerteDérive ? "bg-red-500" : "bg-orange-400"}`}
                            style={{ width: `${Math.min(100, barCouts)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400">
                          {barCouts.toFixed(0)}% du CA prévu engagé
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">Pas de données</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {row.caFacturé > 0 ? (
                      <div>
                        <span className={row.margeBrute >= 0 ? "text-green-600" : "text-red-600"}>
                          {row.margeBrute >= 0 ? "+" : ""}
                          {formatEuros(row.margeBrute)}
                        </span>
                        {row.montantEncaissé > 0 && (
                          <p className={`text-[10px] ${row.margeEncaissée >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                            enc. {row.margeEncaissée >= 0 ? "+" : ""}{formatEuros(row.margeEncaissée)}
                          </p>
                        )}
                      </div>
                    ) : row.caPrévu > 0 ? (
                      <span className="text-slate-400 text-xs" title="Prévisionnel (aucune facture)">
                        {row.margePrevisionnelle >= 0 ? "~+" : "~"}
                        {formatEuros(row.margePrevisionnelle)}
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.rentabilité !== null ? (
                      <div>
                        <span className={`text-sm ${rentaColor(row.rentabilité)}`}>
                          {row.rentabilité >= 0 ? "+" : ""}
                          {row.rentabilité.toFixed(1)}%
                        </span>
                        {row.rentabilitéEncaissée !== null && (
                          <p className={`text-[10px] ${row.rentabilitéEncaissée >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                            enc. {row.rentabilitéEncaissée >= 0 ? "+" : ""}{row.rentabilitéEncaissée.toFixed(1)}%
                          </p>
                        )}
                      </div>
                    ) : row.caPrévu > 0 ? (
                      <span className="text-xs text-slate-400">non facturé</span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/marge-rentabilite/${row.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:border-brand-blue hover:text-brand-blue transition"
                    >
                      Détail <ChevronRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr>
                <td colSpan={12} className="px-4 py-10 text-center text-slate-400">
                  Aucun chantier actif.
                </td>
              </tr>
            )}
          </tbody>
          {data.length > 0 && (
            <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold text-slate-600">
              <tr>
                <td className="px-4 py-3" colSpan={2}>
                  Total ({data.length} chantiers)
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatEuros(totalCaPrévu)}</td>
                <td className="px-4 py-3 text-right font-mono">{formatEuros(totalCaFacturé)}</td>
                <td className="px-4 py-3 text-right font-mono text-amber-600">{formatEuros(totalEncaissé)}</td>
                <td className="px-4 py-3 text-right font-mono text-amber-700">
                  {totalDSPrévu > 0 ? formatEuros(totalDSPrévu) : "—"}
                </td>
                <td className="px-4 py-3 text-right font-mono">{formatEuros(totalCouts)}</td>
                <td className="px-4 py-3 text-right font-mono">
                  {totalÉcartDS !== null ? (
                    <span className={totalÉcartDS > 0 ? "text-red-600" : "text-green-600"}>
                      {totalÉcartDS > 0 ? "+" : ""}{formatEuros(totalÉcartDS)}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3"></td>
                <td className="px-4 py-3 text-right font-mono">
                  <span className={totalMarge >= 0 ? "text-green-600" : "text-red-600"}>
                    {totalMarge >= 0 ? "+" : ""}
                    {formatEuros(totalMarge)}
                  </span>
                  {totalEncaissé > 0 && (
                    <p className={`text-[10px] ${totalMargeEncaissée >= 0 ? "text-emerald-500" : "text-red-400"}`}>
                      enc. {totalMargeEncaissée >= 0 ? "+" : ""}{formatEuros(totalMargeEncaissée)}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`${rentaColor(rentabilitéGlobale)}`}>
                    {rentabilitéGlobale >= 0 ? "+" : ""}
                    {rentabilitéGlobale.toFixed(1)}%
                  </span>
                </td>
                <td></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Décomposition des coûts */}
      {data.some((d) => d.coutsEngagés > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-brand-navy">Décomposition des coûts engagés</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="pb-2 text-left font-semibold">Chantier</th>
                  <th className="pb-2 text-right font-semibold">Matériaux (BC)</th>
                  <th className="pb-2 text-right font-semibold">Béton (BCB)</th>
                  <th className="pb-2 text-right font-semibold">Sous-traitance</th>
                  <th className="pb-2 text-right font-semibold">Dépenses</th>
                  <th className="pb-2 text-right font-semibold">Pompage</th>
                  <th className="pb-2 text-right font-semibold text-brand-navy">Total DS réel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {data
                  .filter((d) => d.coutsEngagés > 0)
                  .map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="py-2 pr-4 font-medium text-slate-700">
                        <span className="text-[10px] text-slate-400 mr-1">{row.reference}</span>
                        {row.nom}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-600">
                        {row.coutBC > 0 ? formatEuros(row.coutBC) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-600">
                        {row.coutBCB > 0 ? formatEuros(row.coutBCB) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-600">
                        {row.coutCST > 0 ? formatEuros(row.coutCST) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-600">
                        {row.coutDepenses > 0 ? formatEuros(row.coutDepenses) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 text-right font-mono text-slate-600">
                        {row.coutPompe > 0 ? formatEuros(row.coutPompe) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2 text-right font-mono font-semibold text-brand-navy">
                        {formatEuros(row.coutsEngagés)}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="border-t border-slate-200 font-semibold text-slate-700">
                <tr>
                  <td className="pt-2 pr-4">Total</td>
                  <td className="pt-2 text-right font-mono">{formatEuros(data.reduce((s, d) => s + d.coutBC, 0))}</td>
                  <td className="pt-2 text-right font-mono">{formatEuros(data.reduce((s, d) => s + d.coutBCB, 0))}</td>
                  <td className="pt-2 text-right font-mono">{formatEuros(data.reduce((s, d) => s + d.coutCST, 0))}</td>
                  <td className="pt-2 text-right font-mono">{formatEuros(data.reduce((s, d) => s + d.coutDepenses, 0))}</td>
                  <td className="pt-2 text-right font-mono">{formatEuros(data.reduce((s, d) => s + d.coutPompe, 0))}</td>
                  <td className="pt-2 text-right font-mono font-bold text-brand-navy">{formatEuros(totalCouts)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
