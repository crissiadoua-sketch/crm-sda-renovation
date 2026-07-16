import { COMPANY } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate, formatEuros } from "@/lib/format";
import { donneesComptables } from "@/lib/comptabilite-filtre";
import { PrintToolbar } from "./print-toolbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApercuComptabilitePage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>;
}) {
  const { annee, mois } = await searchParams;
  const {
    year, month, debut, fin,
    factures, depenses, bonsCommande,
    caHT, caTTC, totalDep, totalAchHT, margeBruteHT,
  } = await donneesComptables(annee, mois);

  const periodeLabel = month
    ? debut.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })
    : String(year);

  return (
    <>
      <PrintToolbar label={`Bilan comptable — ${periodeLabel}`} />

      <div className="mx-auto my-8 w-full max-w-[297mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-7 print:py-4">
          {/* En-tête SDA */}
          <div className="flex items-start justify-between border-b-[3px] border-[#F7941E] pb-5 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain" />
                <p className="text-xs font-semibold text-[#F7941E] uppercase tracking-wide">{COMPANY.activite}</p>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5 ml-1">
                <p>{COMPANY.adresse} — {COMPANY.codePostal} {COMPANY.ville}</p>
                <p><EmailsDocument /> · {COMPANY.site}</p>
                <p>SIREN {COMPANY.siren} · TVA {COMPANY.tvaIntracommunautaire}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1E2F6E]">SYNTHÈSE COMPTABLE</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide capitalize">{periodeLabel}</p>
              <p className="text-xs text-slate-500">
                Du {formatDate(debut)} au {formatDate(fin)}
              </p>
            </div>
          </div>

          {/* KPIs */}
          <div className="mb-6 grid grid-cols-4 gap-3 text-xs">
            {[
              { label: "CA HT facturé", value: caHT, sub: `TTC : ${formatEuros(caTTC)}` },
              { label: "Achats HT (BC)", value: totalAchHT, sub: `${bonsCommande.length} BC` },
              { label: "Charges / dép.", value: totalDep, sub: `${depenses.length} lignes` },
              { label: "Marge brute HT", value: margeBruteHT, sub: "" },
            ].map((k) => (
              <div key={k.label} className="rounded border border-slate-200 px-3 py-2">
                <p className="text-slate-400">{k.label}</p>
                <p className="text-base font-bold text-[#1E2F6E]">{formatEuros(k.value)}</p>
                {k.sub && <p className="text-slate-400">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* Journal des ventes */}
          <p className="mb-2 text-sm font-bold text-[#1E2F6E]">Journal des ventes — {factures.length} facture{factures.length !== 1 ? "s" : ""}</p>
          <table className="mb-6 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7941E] text-white text-[10px]">
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Date</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Numéro</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Client</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Statut</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">HT</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">TVA</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">TTC</th>
              </tr>
            </thead>
            <tbody>
              {factures.map((f) => (
                <tr key={f.id} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                  <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">{f.createdAt.toLocaleDateString("fr-FR")}</td>
                  <td className="border border-slate-200 px-2 py-1.5 font-mono">{f.numero}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{f.client.raisonSociale}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{f.statut}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right">{formatEuros(f.totalHT)}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right">{formatEuros(f.totalTVA)}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold">{formatEuros(f.totalTTC)}</td>
                </tr>
              ))}
              {factures.length === 0 && (
                <tr><td colSpan={7} className="border border-slate-200 px-2 py-4 text-center text-slate-400">Aucune facture sur cette période.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                <td colSpan={4} className="border border-slate-200 px-2 py-1.5 text-right">Total</td>
                <td className="border border-slate-200 px-2 py-1.5 text-right">{formatEuros(caHT)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-right">{formatEuros(caTTC - caHT)}</td>
                <td className="border border-slate-200 px-2 py-1.5 text-right">{formatEuros(caTTC)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Journal des achats */}
          <p className="mb-2 text-sm font-bold text-[#1E2F6E]">Journal des achats — dépenses &amp; charges</p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7941E] text-white text-[10px]">
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Date</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Libellé</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Catégorie</th>
                <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">Montant HT</th>
              </tr>
            </thead>
            <tbody>
              {depenses.map((d) => (
                <tr key={d.id} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                  <td className="border border-slate-200 px-2 py-1.5 whitespace-nowrap">{d.date.toLocaleDateString("fr-FR")}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{d.libelle}</td>
                  <td className="border border-slate-200 px-2 py-1.5">{d.categorie}</td>
                  <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold">{formatEuros(d.montant)}</td>
                </tr>
              ))}
              {depenses.length === 0 && (
                <tr><td colSpan={4} className="border border-slate-200 px-2 py-4 text-center text-slate-400">Aucune dépense sur cette période.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 font-bold">
                <td colSpan={3} className="border border-slate-200 px-2 py-1.5 text-right">Total charges</td>
                <td className="border border-slate-200 px-2 py-1.5 text-right">{formatEuros(totalDep)}</td>
              </tr>
            </tfoot>
          </table>

          <p className="mt-6 text-[10px] text-slate-400">Édité le {formatDate(new Date())}</p>
        </div>
      </div>
    </>
  );
}
