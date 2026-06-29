import Link from "next/link";
import { Landmark } from "lucide-react";
import { formatEuros } from "@/lib/format";
import { donneesComptables } from "@/lib/comptabilite-filtre";
import { ExportComptaButton } from "./export-compta-button";
import { ExportBilanButtons } from "./export-bilan-buttons";

export default async function ComptabilitePage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>;
}) {
  const { annee, mois } = await searchParams;

  const {
    year, month,
    factures, depenses, bonsCommande,
    caHT, caTTC, totalDep, totalAchHT,
  } = await donneesComptables(annee, mois);

  const now = new Date();
  const annees = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const moisLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
  const periodeQuery = `annee=${year}${month ? `&mois=${month}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Comptabilité & Export</h2>
          <p className="mt-1 text-sm text-slate-500">Export CSV, Excel et PDF pour votre expert-comptable</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/comptabilite/bilan"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Landmark className="h-4 w-4 text-brand-blue" />
            Bilan
          </Link>
          <ExportBilanButtons periodeQuery={periodeQuery} />
          <ExportComptaButton
            factureIds={factures.map(f => f.id)}
            depenseIds={depenses.map(d => d.id)}
            periode={month ? `${year}-${String(month).padStart(2, "0")}` : String(year)}
          />
        </div>
      </div>

      {/* Filtres période */}
      <form method="get" className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Année</label>
          <select name="annee" defaultValue={year}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {annees.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Mois (optionnel)</label>
          <select name="mois" defaultValue={mois ?? ""}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Toute l'année</option>
            {moisLabels.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-end">
          <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">
            Filtrer
          </button>
        </div>
      </form>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "CA HT facturé",    value: formatEuros(caHT),       sub: `TTC : ${formatEuros(caTTC)}`,  color: "text-emerald-700" },
          { label: "Achats HT (BC)",   value: formatEuros(totalAchHT), sub: `${bonsCommande.length} BC`,    color: "text-blue-700"    },
          { label: "Charges / dép.",   value: formatEuros(totalDep),   sub: `${depenses.length} lignes`,    color: "text-orange-700"  },
          { label: "Marge brute HT",   value: formatEuros(caHT - totalDep - totalAchHT), sub: "",           color: "text-brand-navy"  },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs text-slate-400 mb-1">{k.label}</p>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            {k.sub && <p className="text-xs text-slate-400 mt-0.5">{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* Journal des ventes */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <p className="font-semibold text-brand-navy">Journal des ventes — {factures.length} facture{factures.length !== 1 ? "s" : ""}</p>
        </div>
        {factures.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Aucune facture sur cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Numéro</th>
                  <th className="px-4 py-2">Client</th>
                  <th className="px-4 py-2">Statut</th>
                  <th className="px-4 py-2 text-right">HT</th>
                  <th className="px-4 py-2 text-right">TVA</th>
                  <th className="px-4 py-2 text-right">TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {factures.map(f => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 text-xs whitespace-nowrap">
                      {f.createdAt.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs">
                      <Link href={`/factures/${f.id}`} className="text-brand-blue hover:underline">{f.numero}</Link>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{f.client.raisonSociale}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{f.statut}</td>
                    <td className="px-4 py-2 text-right text-slate-600">{formatEuros(f.totalHT)}</td>
                    <td className="px-4 py-2 text-right text-slate-500">{formatEuros(f.totalTVA)}</td>
                    <td className="px-4 py-2 text-right font-semibold text-brand-navy">{formatEuros(f.totalTTC)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={4} className="px-4 py-2 text-xs font-semibold text-slate-500">Total</td>
                  <td className="px-4 py-2 text-right font-bold text-brand-navy">{formatEuros(caHT)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-slate-600">{formatEuros(caTTC - caHT)}</td>
                  <td className="px-4 py-2 text-right font-bold text-brand-navy">{formatEuros(caTTC)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Journal des achats */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <p className="font-semibold text-brand-navy">Journal des achats — dépenses & charges</p>
        </div>
        {depenses.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">Aucune dépense sur cette période.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Libellé</th>
                  <th className="px-4 py-2">Catégorie</th>
                  <th className="px-4 py-2 text-right">Montant HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {depenses.map(d => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 text-xs whitespace-nowrap">
                      {d.date.toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{d.libelle}</td>
                    <td className="px-4 py-2 text-slate-500 text-xs">{d.categorie}</td>
                    <td className="px-4 py-2 text-right font-semibold text-orange-700">{formatEuros(d.montant)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-500">Total charges</td>
                  <td className="px-4 py-2 text-right font-bold text-orange-700">{formatEuros(totalDep)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
