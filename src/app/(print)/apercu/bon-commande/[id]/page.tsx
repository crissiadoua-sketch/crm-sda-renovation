import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { formatEuros, formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuBonCommandePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const bc = await prisma.bonCommande.findUnique({
    where: { id },
    include: {
      fournisseur: true,
      chantier: true,
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!bc) notFound();

  return (
    <>
      <PrintToolbar label={`Aperçu PDF — ${bc.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-12 py-10 print:px-10 print:py-8">

          {/* En-tête */}
          <div className="flex items-start justify-between border-b-2 border-[#1E2F6E] pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img src="/logo.png" alt="SDA Rénovation" className="h-10 w-auto object-contain" />
                <p className="text-xs text-slate-500">{COMPANY.activite}</p>
              </div>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                <p>{COMPANY.adresse} — {COMPANY.codePostal} {COMPANY.ville}</p>
                <p>{COMPANY.email} · {COMPANY.emailDirecteur} · {COMPANY.site}</p>
                <p>SIREN {COMPANY.siren}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#1E2F6E]">BON DE COMMANDE</p>
              <p className="mt-1 text-base font-semibold text-slate-700">{bc.numero}</p>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                <p>Date : {formatDate(bc.dateCreation)}</p>
              </div>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                bc.statut === "RECU" ? "bg-green-100 text-green-700" :
                bc.statut === "CONFIRME" ? "bg-blue-100 text-blue-700" :
                bc.statut === "ANNULE" ? "bg-red-100 text-red-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {bc.statut.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Fournisseur / chantier */}
          <div className="mb-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Fournisseur</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-[#1E2F6E]">{bc.fournisseur.nom}</p>
                {bc.fournisseur.adresse && <p className="text-xs text-slate-500 mt-0.5">{bc.fournisseur.adresse}</p>}
                {(bc.fournisseur.codePostal || bc.fournisseur.ville) && (
                  <p className="text-xs text-slate-500">{bc.fournisseur.codePostal} {bc.fournisseur.ville}</p>
                )}
                {bc.fournisseur.email && <p className="text-xs text-slate-500">{bc.fournisseur.email}</p>}
                {bc.fournisseur.telephone && <p className="text-xs text-slate-500">{bc.fournisseur.telephone}</p>}
              </div>
            </div>
            {bc.chantier && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Chantier destinataire</p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                  <p className="font-semibold text-[#1E2F6E]">{bc.chantier.nom}</p>
                  <p className="text-xs text-slate-500">{bc.chantier.reference}</p>
                  {bc.chantier.adresse && <p className="text-xs text-slate-500 mt-0.5">{bc.chantier.adresse}</p>}
                </div>
              </div>
            )}
          </div>

          {/* Lignes */}
          <div className="mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#1E2F6E] text-white">
                  <th className="px-3 py-2 text-left font-semibold text-xs">Désignation</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs w-14">Unité</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-16">Qté</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-24">P.U. HT</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-20">TVA</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-24">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {bc.lignes.map((ligne, i) => (
                  <tr key={ligne.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <td className="px-3 py-1.5 text-xs text-slate-700">{ligne.designation}</td>
                    <td className="px-3 py-1.5 text-xs text-center text-slate-500">{ligne.unite ?? "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-right text-slate-700">{ligne.quantite?.toFixed(2) ?? "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-right text-slate-700">{ligne.prixUnitaireHT != null ? formatEuros(ligne.prixUnitaireHT) : "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-right text-slate-500">{ligne.tauxTVA != null ? ligne.tauxTVA + "%" : "—"}</td>
                    <td className="px-3 py-1.5 text-xs text-right font-medium text-slate-700">{ligne.totalHT != null ? formatEuros(ligne.totalHT) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="flex justify-end mb-6">
            <div className="w-64">
              <div className="flex justify-between border-t border-slate-200 py-1.5 text-sm">
                <span className="text-slate-500">Total HT</span>
                <span className="font-medium">{formatEuros(bc.totalHT)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-slate-500">TVA</span>
                <span className="font-medium">{formatEuros(bc.totalTVA)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-[#1E2F6E] pt-2 mt-1">
                <span className="text-base font-bold text-[#1E2F6E]">TOTAL TTC</span>
                <span className="text-base font-bold text-[#1E2F6E]">{formatEuros(bc.totalTTC)}</span>
              </div>
            </div>
          </div>

          {bc.notes && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Notes / Conditions</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{bc.notes}</p>
            </div>
          )}

          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-[10px] text-slate-400">{COMPANY_LEGAL}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print { @page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      `}</style>
    </>
  );
}
