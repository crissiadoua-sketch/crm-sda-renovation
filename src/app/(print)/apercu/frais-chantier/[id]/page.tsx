import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate, formatEuros } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuFraisChantierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fc = await prisma.fraisChantier.findUnique({
    where: { id },
    include: {
      chantier: true,
      devis: true,
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!fc) notFound();

  // Regroupement par catégorie
  const parCategorie: Record<string, { totalHT: number; totalTTC: number; count: number }> = {};
  for (const ligne of fc.lignes) {
    if (!parCategorie[ligne.categorie]) {
      parCategorie[ligne.categorie] = { totalHT: 0, totalTTC: 0, count: 0 };
    }
    parCategorie[ligne.categorie].totalHT += ligne.montantHT;
    parCategorie[ligne.categorie].totalTTC += ligne.montantTTC;
    parCategorie[ligne.categorie].count += 1;
  }

  return (
    <>
      <PrintToolbar label={`Frais Chantier — ${fc.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-12 py-10 print:px-10 print:py-8">

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
              <p className="text-2xl font-black text-[#1E2F6E]">SUIVI DES FRAIS DE CHANTIER</p>
              <p className="mt-1 text-base font-bold text-slate-700">{fc.numero}</p>
              {fc.periode && <p className="text-xs text-slate-500">Période : {fc.periode}</p>}
            </div>
          </div>

          {/* Bloc info */}
          <div className="mb-5 grid grid-cols-4 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Chantier</p>
              <p className="text-sm font-semibold text-[#1E2F6E]">{fc.chantier?.nom ?? "—"}</p>
              {fc.chantier?.reference && <p className="text-xs text-slate-500">{fc.chantier.reference}</p>}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Devis</p>
              <p className="text-sm text-slate-700">{fc.devis?.numero ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Période</p>
              <p className="text-sm text-slate-700">{fc.periode ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Responsable</p>
              <p className="text-sm text-slate-700">{fc.responsable ?? "—"}</p>
            </div>
          </div>

          {/* Tableau principal */}
          <div className="mb-5">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#1B3F94] text-white">
                  <th className="px-2 py-1.5 text-left font-semibold">Catégorie</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Désignation</th>
                  <th className="px-2 py-1.5 text-left font-semibold w-24">Fournisseur</th>
                  <th className="px-2 py-1.5 text-center font-semibold w-20">Date</th>
                  <th className="px-2 py-1.5 text-right font-semibold w-20">Montant HT</th>
                  <th className="px-2 py-1.5 text-right font-semibold w-14">TVA%</th>
                  <th className="px-2 py-1.5 text-right font-semibold w-20">Montant TTC</th>
                  <th className="px-2 py-1.5 text-left font-semibold w-20">Réf. facture</th>
                </tr>
              </thead>
              <tbody>
                {fc.lignes.map((ligne, i) => (
                  <tr key={ligne.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <td className="px-2 py-1.5 text-slate-500 text-[10px]">{ligne.categorie.replace(/_/g, " ")}</td>
                    <td className="px-2 py-1.5 text-slate-700">{ligne.designation}</td>
                    <td className="px-2 py-1.5 text-slate-500">{ligne.fournisseur ?? "—"}</td>
                    <td className="px-2 py-1.5 text-center text-slate-500">{formatDate(ligne.date)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-700">{formatEuros(ligne.montantHT)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-500">{ligne.tauxTVA}%</td>
                    <td className="px-2 py-1.5 text-right font-medium text-slate-700">{formatEuros(ligne.montantTTC)}</td>
                    <td className="px-2 py-1.5 text-slate-500">{ligne.refFacture ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Récapitulatif par catégorie */}
          <div className="mb-5 grid grid-cols-2 gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Récapitulatif par catégorie</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="px-2 py-1.5 text-left font-semibold text-slate-600">Catégorie</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-slate-600">HT</th>
                    <th className="px-2 py-1.5 text-right font-semibold text-slate-600">TTC</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(parCategorie).map(([cat, totaux], i) => (
                    <tr key={cat} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="px-2 py-1.5 text-slate-700">{cat.replace(/_/g, " ")}</td>
                      <td className="px-2 py-1.5 text-right text-slate-600">{formatEuros(totaux.totalHT)}</td>
                      <td className="px-2 py-1.5 text-right text-slate-600">{formatEuros(totaux.totalTTC)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totaux */}
            <div className="flex items-end justify-end">
              <div className="w-56">
                <div className="flex justify-between border-t border-slate-200 py-1.5 text-sm">
                  <span className="text-slate-500">Total HT</span>
                  <span className="font-medium">{formatEuros(fc.totalHT)}</span>
                </div>
                <div className="flex justify-between py-1.5 text-sm">
                  <span className="text-slate-500">TVA</span>
                  <span className="font-medium">{formatEuros(fc.totalTVA)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-[#F7941E] pt-2 mt-1">
                  <span className="text-base font-bold text-[#1E2F6E]">TOTAL TTC</span>
                  <span className="text-base font-bold text-[#1E2F6E]">{formatEuros(fc.totalTTC)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {fc.notes && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Notes</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{fc.notes}</p>
            </div>
          )}

          {/* Pied de page */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-[10px] text-slate-400">{COMPANY_LEGAL}</p>
          </div>
        </div>
      </div>

      <style>{`@media print { @page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </>
  );
}
