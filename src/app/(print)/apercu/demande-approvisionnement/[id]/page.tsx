import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate, formatEuros } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

function urgenceBadge(urgence: string) {
  switch (urgence) {
    case "URGENTE":
      return "bg-red-100 text-red-700";
    case "HAUTE":
      return "bg-orange-100 text-orange-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export default async function ApercuDemandeApprovisionnementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const da = await prisma.demandeApprovisionnement.findUnique({
    where: { id },
    include: {
      chantier: true,
      client: true,
      fournisseur: true,
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!da) notFound();

  return (
    <>
      <PrintToolbar label={`Demande Appro — ${da.numero}`} />

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
              <p className="text-2xl font-black text-[#1E2F6E]">DEMANDE D&apos;APPROVISIONNEMENT</p>
              <p className="mt-1 text-base font-bold text-slate-700">{da.numero}</p>
              <p className="text-xs text-slate-500">{formatDate(da.dateCreation)}</p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${urgenceBadge(da.urgence)}`}>
                  Urgence : {da.urgence.replace(/_/g, " ")}
                </span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                  da.statut === "VALIDE" ? "bg-green-100 text-green-700" :
                  da.statut === "ENVOYE" ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {da.statut.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>

          {/* Bloc 2 colonnes */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Chantier / Service</p>
                <p className="text-sm font-semibold text-[#1E2F6E]">{da.chantier?.nom ?? da.service ?? "—"}</p>
                {da.chantier?.reference && <p className="text-xs text-slate-500">{da.chantier.reference}</p>}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Demandeur</p>
                <p className="text-sm text-slate-700">{da.demandeurNom ?? "—"}</p>
                {da.demandeurEmail && <p className="text-xs text-slate-500">{da.demandeurEmail}</p>}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Valideur</p>
                <p className="text-sm text-slate-700">{da.validateurNom ?? "—"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Fournisseur</p>
                <p className="text-sm font-semibold text-slate-700">{da.fournisseur?.nom ?? "—"}</p>
                {da.fournisseur?.telephone && <p className="text-xs text-slate-500">{da.fournisseur.telephone}</p>}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Date souhaitée</p>
                <p className="text-sm text-slate-700">{formatDate(da.dateSouhaitee)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Adresse livraison</p>
                <p className="text-sm text-slate-700">{da.adresseLivraison ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Tableau articles */}
          <div className="mb-5">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#FFA726] text-white">
                  <th className="px-2 py-1.5 text-left font-semibold w-6">#</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Désignation</th>
                  <th className="px-2 py-1.5 text-left font-semibold w-20">Référence</th>
                  <th className="px-2 py-1.5 text-right font-semibold w-12">Qté</th>
                  <th className="px-2 py-1.5 text-center font-semibold w-10">U</th>
                  <th className="px-2 py-1.5 text-right font-semibold w-20">PU HT</th>
                  <th className="px-2 py-1.5 text-right font-semibold w-14">TVA%</th>
                  <th className="px-2 py-1.5 text-right font-semibold w-20">Total HT</th>
                  <th className="px-2 py-1.5 text-left font-semibold">Justification</th>
                </tr>
              </thead>
              <tbody>
                {da.lignes.map((ligne, i) => (
                  <tr key={ligne.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <td className="px-2 py-1.5 text-center text-slate-400">{ligne.ordre}</td>
                    <td className="px-2 py-1.5 text-slate-700">{ligne.designation}</td>
                    <td className="px-2 py-1.5 text-slate-500">{ligne.reference ?? "—"}</td>
                    <td className="px-2 py-1.5 text-right text-slate-700">{ligne.quantite.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-center text-slate-500">{ligne.unite}</td>
                    <td className="px-2 py-1.5 text-right text-slate-700">{formatEuros(ligne.prixUnitaireHT)}</td>
                    <td className="px-2 py-1.5 text-right text-slate-500">{ligne.tauxTVA}%</td>
                    <td className="px-2 py-1.5 text-right font-medium text-slate-700">{formatEuros(ligne.totalHT)}</td>
                    <td className="px-2 py-1.5 text-slate-500">{ligne.justification ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="flex justify-end mb-5">
            <div className="w-64">
              <div className="flex justify-between border-t border-slate-200 py-1.5 text-sm">
                <span className="text-slate-500">Total HT</span>
                <span className="font-medium">{formatEuros(da.totalHT)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-slate-500">TVA</span>
                <span className="font-medium">{formatEuros(da.totalTVA)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-[#F7941E] pt-2 mt-1">
                <span className="text-base font-bold text-[#1E2F6E]">TOTAL TTC</span>
                <span className="text-base font-bold text-[#1E2F6E]">{formatEuros(da.totalTTC)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {da.notes && (
            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Notes</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{da.notes}</p>
            </div>
          )}

          {/* Signatures 3 colonnes */}
          <div className="mb-4 grid grid-cols-3 gap-4">
            {[
              { label: "Demandeur", nom: da.demandeurNom },
              { label: "Valideur", nom: da.validateurNom },
              { label: "Accusé réception fournisseur", nom: da.fournisseur?.nom },
            ].map(({ label, nom }) => (
              <div key={label} className="rounded-lg border border-slate-200 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
                <p className="text-xs text-slate-600 mb-5">{nom ?? "____________________________"}</p>
                <div className="h-10 border-b border-dashed border-slate-300" />
                <p className="mt-1 text-[10px] text-slate-400">Date : _______________</p>
              </div>
            ))}
          </div>

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
