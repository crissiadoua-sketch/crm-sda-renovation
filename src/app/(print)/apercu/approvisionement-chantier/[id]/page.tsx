import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuApprovisionementChantierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ac = await prisma.approvisionementChantier.findUnique({
    where: { id },
    include: {
      chantier: true,
      devis: true,
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!ac) notFound();

  // Grouper par lot
  const lots: Record<string, typeof ac.lignes> = {};
  for (const ligne of ac.lignes) {
    const lot = ligne.lot ?? "Sans lot";
    if (!lots[lot]) lots[lot] = [];
    lots[lot].push(ligne);
  }

  return (
    <>
      <PrintToolbar label={`Approvisionnement — ${ac.numero}`} />

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
              <p className="text-2xl font-black text-[#1E2F6E]">APPROVISIONNEMENT CHANTIER</p>
              <p className="mt-1 text-base font-bold text-slate-700">{ac.numero}</p>
              <p className="text-xs text-slate-500">Chantier : {ac.chantier?.nom ?? "—"}</p>
              <p className="text-xs text-slate-500">Devis : {ac.devis?.numero ?? "—"}</p>
              <p className="text-xs text-slate-500">Responsable : {ac.responsable ?? "—"}</p>
              <p className="text-xs text-slate-500">{formatDate(ac.date)}</p>
            </div>
          </div>

          {/* Tableau avec groupement par lot */}
          <div className="mb-5 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7941E] text-white text-[10px]">
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Matériaux</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">Rdmt/Conso</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-center font-semibold">U</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">Qté à réaliser</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-center font-semibold">U</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">Besoins matx.</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">Pertes %</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-center font-semibold">U</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-right font-semibold">Besoins après pertes</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">Conditionnements</th>
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold">À commander</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(lots).map(([lot, lignes]) => (
                  <>
                    {/* Ligne séparatrice lot */}
                    <tr key={`lot-${lot}`} className="bg-[#1E2F6E]/10">
                      <td
                        colSpan={11}
                        className="border border-slate-300 px-3 py-1.5 text-xs font-bold text-[#1E2F6E] tracking-wide"
                      >
                        Lot : {lot}
                      </td>
                    </tr>
                    {lignes.map((ligne, i) => (
                      <tr key={ligne.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                        <td className="border border-slate-200 px-2 py-1.5 text-slate-700 font-medium">{ligne.designation}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{ligne.rendementConso?.toFixed(3) ?? "—"}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">{ligne.uniteRendement ?? "—"}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-700">{ligne.qteARealiser?.toFixed(2) ?? "—"}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">{ligne.uniteQteARealiser ?? "—"}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-700">{ligne.besoinsMateriau?.toFixed(2) ?? "—"}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-500">{ligne.pertesPercent != null ? `${ligne.pertesPercent}%` : "—"}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">{ligne.unite ?? "—"}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold text-slate-700">{ligne.besoinsApresPertes?.toFixed(2) ?? "—"}</td>
                        <td className="border border-slate-200 px-2 py-1.5 text-slate-500">{ligne.conditionnement ?? "—"}</td>
                        <td className="border border-slate-200 px-2 py-1.5 font-bold text-[#1E2F6E]">{ligne.aCommander ?? "—"}</td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {ac.notes && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Notes</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{ac.notes}</p>
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
