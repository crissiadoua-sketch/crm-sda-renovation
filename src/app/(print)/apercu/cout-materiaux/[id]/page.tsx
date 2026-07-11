import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { formatDate, formatEuros } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuCoutMateriauxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const cmr = await prisma.coutMateriauxRenduChantier.findUnique({
    where: { id },
    include: {
      chantier: true,
      devis: true,
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!cmr) notFound();

  // Coût moyen pondéré
  const total = cmr.lignes.reduce((sum, l) => sum + (l.prixRevientRenduChantier ?? 0), 0);
  const avg = cmr.lignes.length > 0 ? total / cmr.lignes.length : 0;

  return (
    <>
      <PrintToolbar label={`Coût Matériaux — ${cmr.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[297mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-8 print:py-6">

          {/* En-tête SDA */}
          <div className="flex items-start justify-between border-b-[3px] border-[#1E2F6E] pb-5 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain" />
                <p className="text-xs font-semibold text-[#F7941E] uppercase tracking-wide">{COMPANY.activite}</p>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5 ml-1">
                <p>{COMPANY.adresse} — {COMPANY.codePostal} {COMPANY.ville}</p>
                <p>{COMPANY.email} · {COMPANY.emailDirecteur} · {COMPANY.site}</p>
                <p>SIREN {COMPANY.siren} · TVA {COMPANY.tvaIntracommunautaire}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1E2F6E]">COÛT DES MATÉRIAUX</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">rendus chantier</p>
              <p className="mt-1 text-base font-bold text-slate-700">{cmr.numero}</p>
              <p className="text-xs text-slate-500">Chantier : {cmr.chantier?.nom ?? "—"}</p>
              <p className="text-xs text-slate-500">Devis : {cmr.devis?.numero ?? "—"}</p>
              <p className="text-xs text-slate-500">Responsable : {cmr.responsable ?? "—"}</p>
              <p className="text-xs text-slate-500">{formatDate(cmr.date)}</p>
            </div>
          </div>

          {/* Tableau bi-niveau */}
          <div className="mb-5 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                {/* Ligne 1 : groupes */}
                <tr className="bg-[#1E2F6E] text-white text-[10px]">
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold" rowSpan={2}>Réf</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold" rowSpan={2}>Désignation Matériaux</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-center font-semibold" rowSpan={2}>U</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold" rowSpan={2}>Prix d&apos;achat HT</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-center font-semibold" colSpan={3}>TRANSPORT</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-center font-semibold" colSpan={3}>DÉCHARGEMENT</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-center font-semibold" rowSpan={2}>Pertes %</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-center font-semibold" rowSpan={2}>
                    Prix de revient HT<br/>rendus chantier<br/>(3+6+9)×(1+Pertes)
                  </th>
                </tr>
                {/* Ligne 2 : sous-colonnes */}
                <tr className="bg-[#29ABE2]/80 text-white text-[10px]">
                  <th className="border border-[#29ABE2] px-2 py-1 text-center font-medium">km</th>
                  <th className="border border-[#29ABE2] px-2 py-1 text-center font-medium">PU</th>
                  <th className="border border-[#29ABE2] px-2 py-1 text-center font-medium">PU×km</th>
                  <th className="border border-[#29ABE2] px-2 py-1 text-center font-medium">h</th>
                  <th className="border border-[#29ABE2] px-2 py-1 text-center font-medium">DH</th>
                  <th className="border border-[#29ABE2] px-2 py-1 text-center font-medium">h×DH</th>
                </tr>
              </thead>
              <tbody>
                {cmr.lignes.map((ligne, i) => (
                  <tr key={ligne.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <td className="border border-slate-200 px-2 py-1.5 text-slate-500">{ligne.reference ?? "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-slate-700 font-medium">{ligne.designation}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">{ligne.unite ?? "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-700">{formatEuros(ligne.prixAchatHT)}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{ligne.transportKm?.toFixed(1) ?? "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{ligne.transportPU != null ? formatEuros(ligne.transportPU) : "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{ligne.transportTotal != null ? formatEuros(ligne.transportTotal) : "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{ligne.dechargementH?.toFixed(2) ?? "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{ligne.dechargementDH != null ? formatEuros(ligne.dechargementDH) : "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{ligne.dechargementTotal != null ? formatEuros(ligne.dechargementTotal) : "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-500">{ligne.pertesPercent != null ? `${ligne.pertesPercent}%` : "—"}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right font-bold text-[#1E2F6E]">
                      {ligne.prixRevientRenduChantier != null ? formatEuros(ligne.prixRevientRenduChantier) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#1E2F6E] text-white font-bold">
                  <td className="border border-[#29ABE2] px-2 py-2 text-xs" colSpan={11}>Coût moyen pondéré (moyenne)</td>
                  <td className="border border-[#29ABE2] px-2 py-2 text-right text-sm">{formatEuros(avg)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {cmr.notes && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Notes</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{cmr.notes}</p>
            </div>
          )}

          {/* Pied de page */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-[10px] text-slate-400">{COMPANY_LEGAL}</p>
          </div>
        </div>
      </div>

      <style>{`@media print { @page { size: A4 landscape; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </>
  );
}
