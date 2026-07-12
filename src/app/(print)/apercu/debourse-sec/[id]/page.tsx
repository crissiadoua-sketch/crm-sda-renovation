import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate, formatEuros } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuDebourseSecPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const eds = await prisma.etudeDebourse.findUnique({
    where: { id },
    include: {
      chantier: true,
      devis: true,
      postes: {
        orderBy: { ordre: "asc" },
        include: {
          elements: { orderBy: { ordre: "asc" } },
          ouvrage: true,
        },
      },
    },
  });

  if (!eds) notFound();

  const pvht = eds.totalDSHT * eds.coeffK;

  return (
    <>
      <PrintToolbar label={`Déboursés Secs — ${eds.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-12 py-10 print:px-8 print:py-3">

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
              <p className="text-2xl font-black text-[#1E2F6E]">ÉTUDE DES DÉBOURSÉS SECS</p>
              <p className="mt-1 text-base font-bold text-slate-700">{eds.numero}</p>
              <p className="text-xs text-slate-500">Chantier : {eds.chantier?.nom ?? "—"}</p>
              <p className="text-xs text-slate-500">Devis : {eds.devis?.numero ?? "—"}</p>
            </div>
          </div>

          {/* Infos + Coeff K */}
          <div className="mb-5 flex items-center justify-between rounded-lg border border-[#1E2F6E]/20 bg-[#1E2F6E]/5 px-5 py-3">
            <div className="text-xs text-slate-600 space-y-0.5">
              <p><span className="font-semibold">Responsable :</span> {eds.responsable ?? "—"}</p>
              <p><span className="font-semibold">Date :</span> {formatDate(eds.date)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Coefficient K</p>
              <p className="text-4xl font-black text-[#1E2F6E]">{eds.coeffK.toFixed(2)}</p>
            </div>
          </div>

          {/* Postes */}
          {eds.postes.map((poste) => (
            <div key={poste.id} className="mb-5">
              {/* Titre du poste */}
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-[#1E2F6E] px-3 py-2">
                <span className="text-xs font-bold text-white">
                  Poste {poste.ordre} — {poste.designation}
                </span>
                {poste.codeOuvrage && (
                  <span className="ml-auto text-[10px] text-[#29ABE2]">{poste.codeOuvrage}</span>
                )}
              </div>

              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100 text-slate-600">
                    <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold">Désignation</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-center font-semibold w-10">U</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-right font-semibold w-16">Qté</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-right font-semibold w-18">P.U.</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-right font-semibold w-20">Matériaux</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-right font-semibold w-20">Matériel</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-right font-semibold w-20">M.O.</th>
                  </tr>
                </thead>
                <tbody>
                  {poste.elements.map((el, i) => (
                    <tr key={el.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="border border-slate-200 px-2 py-1.5 text-slate-700">{el.designation}</td>
                      <td className="border border-slate-200 px-2 py-1.5 text-center text-slate-500">{el.unite ?? "—"}</td>
                      <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-700">{el.quantite.toFixed(2)}</td>
                      <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-700">{formatEuros(el.prixUnitaire)}</td>
                      <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{el.montantMateriaux > 0 ? formatEuros(el.montantMateriaux) : "—"}</td>
                      <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{el.montantMateriel > 0 ? formatEuros(el.montantMateriel) : "—"}</td>
                      <td className="border border-slate-200 px-2 py-1.5 text-right text-slate-600">{el.montantMO > 0 ? formatEuros(el.montantMO) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#FFA726]/8 font-semibold text-[#1E2F6E]">
                    <td className="border border-slate-200 px-2 py-1.5 text-xs" colSpan={4}>
                      Sous-Total DS par poste — Total DS d&apos;un {poste.unite ?? "unité"} de {poste.designation}
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right">{formatEuros(poste.totalMateriauxHT)}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right">{formatEuros(poste.totalMaterielHT)}</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right">{formatEuros(poste.totalMOHT)}</td>
                  </tr>
                  <tr className="bg-[#1E2F6E]/10 font-bold text-[#1E2F6E]">
                    <td className="border border-slate-200 px-2 py-1.5 text-xs" colSpan={4}>
                      TOTAL DS du poste
                    </td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right text-sm" colSpan={3}>
                      {formatEuros(poste.totalDSPoste)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}

          {/* Récapitulatif final */}
          <div className="mb-5 rounded-xl border-2 border-[#1E2F6E] overflow-hidden">
            <div className="bg-[#FFA726] px-4 py-2">
              <p className="text-sm font-black text-white uppercase tracking-wide">Récapitulatif général</p>
            </div>
            <div className="px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Matériaux</span>
                <span className="font-semibold text-slate-700">{formatEuros(eds.totalMateriauxHT)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Matériel / Consommation</span>
                <span className="font-semibold text-slate-700">{formatEuros(eds.totalMaterielHT)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Total Main d&apos;œuvre</span>
                <span className="font-semibold text-slate-700">{formatEuros(eds.totalMOHT)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold text-[#1E2F6E]">
                <span>Total DS (Déboursé Sec)</span>
                <span>{formatEuros(eds.totalDSHT)}</span>
              </div>
              <div className="flex justify-between rounded-lg bg-[#FFA726]/10 px-3 py-2 mt-1">
                <span className="text-base font-black text-[#F7941E]">PVHT = DS × K ({eds.coeffK.toFixed(2)})</span>
                <span className="text-base font-black text-[#F7941E]">{formatEuros(pvht)}</span>
              </div>
            </div>
          </div>

          {eds.notes && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Notes</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{eds.notes}</p>
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
