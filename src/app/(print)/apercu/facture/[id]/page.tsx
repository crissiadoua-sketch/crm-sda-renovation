import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

const typeLabels: Record<string, string> = {
  STANDARD: "FACTURE", ACOMPTE: "FACTURE D'ACOMPTE", SITUATION: "FACTURE DE SITUATION",
  SOLDE: "FACTURE DE SOLDE", AVOIR: "AVOIR",
};

export default async function ApercuFacturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [facture, parametres] = await Promise.all([
    prisma.facture.findUnique({
      where: { id },
      include: {
        chantier: true,
        client: true,
        lignes: { orderBy: { ordre: "asc" } },
        paiements: { orderBy: { date: "asc" } },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!facture) notFound();

  const resteAPayer = facture.totalTTC - facture.montantPaye;

  return (
    <>
      <PrintToolbar label={`Aperçu PDF — ${facture.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-12 py-10 print:px-8 print:py-3">

          {/* En-tête */}
          <div className="flex items-start justify-between border-b-2 border-[#F7941E] pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img src="/logo.png" alt="SDA Rénovation" className="h-10 w-auto object-contain" />
                <p className="text-xs text-slate-500">{COMPANY.activite}</p>
              </div>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                <p>{COMPANY.adresse} — {COMPANY.codePostal} {COMPANY.ville}</p>
                <p><EmailsDocument /> · {COMPANY.site}</p>
                <p>SIREN {COMPANY.siren} · TVA {COMPANY.tvaIntracommunautaire}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#1E2F6E]">{typeLabels[facture.type] ?? "FACTURE"}</p>
              <p className="mt-1 text-base font-semibold text-slate-700">{facture.numero}</p>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                <p>Date d&apos;émission : {formatDate(facture.dateEmission)}</p>
                {facture.dateEcheance && <p>Échéance : {formatDate(facture.dateEcheance)}</p>}
              </div>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                facture.statut === "PAYEE" ? "bg-green-100 text-green-700" :
                facture.statut === "EN_RETARD" ? "bg-red-100 text-red-700" :
                facture.statut === "ENVOYEE" ? "bg-blue-100 text-blue-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {facture.statut.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Bloc client / chantier */}
          <div className="mb-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Facturé à</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-[#1E2F6E]">{clientDisplayName(facture.client)}</p>
                {facture.client.reference && <p className="text-xs text-slate-500">{facture.client.reference}</p>}
                {facture.client.adresse && <p className="text-xs text-slate-500 mt-0.5">{facture.client.adresse}</p>}
                {(facture.client.codePostal || facture.client.ville) && (
                  <p className="text-xs text-slate-500">{facture.client.codePostal} {facture.client.ville}</p>
                )}
                {facture.client.email && <p className="text-xs text-slate-500">{facture.client.email}</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Chantier</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-[#1E2F6E]">{facture.chantier.nom}</p>
                <p className="text-xs text-slate-500">{facture.chantier.reference}</p>
                {facture.chantier.adresse && <p className="text-xs text-slate-500 mt-0.5">{facture.chantier.adresse}</p>}
              </div>
            </div>
          </div>

          {/* Lignes */}
          <div className="mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#FFA726] text-white">
                  <th className="px-3 py-2 text-left font-semibold text-xs w-16">Code</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Désignation</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs w-14">Unité</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-16">Qté</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-24">P.U. HT</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-24">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {facture.lignes.map((ligne, i) => {
                  if (ligne.type === "CHAPITRE") {
                    return (
                      <tr key={ligne.id} className="bg-[#FFA726]/8" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                        <td colSpan={6} className="px-3 py-2 font-bold text-[#1E2F6E] text-sm border-t-2 border-[#F7941E]/50">{ligne.designation}</td>
                      </tr>
                    );
                  }
                  if (ligne.type === "SOUS_CHAPITRE") {
                    return (
                      <tr key={ligne.id} className="bg-slate-50" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                        <td colSpan={6} className="px-3 py-1.5 font-semibold text-slate-700 text-xs pl-6 border-t border-slate-200">{ligne.designation}</td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={ligne.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="px-3 py-1.5 text-xs text-slate-400 pl-8">{ligne.codeArticle ?? "—"}</td>
                      <td className="px-3 py-1.5 text-xs text-slate-700 pl-8">{ligne.designation}</td>
                      <td className="px-3 py-1.5 text-xs text-center text-slate-500">{ligne.unite ?? "—"}</td>
                      <td className="px-3 py-1.5 text-xs text-right text-slate-700">{ligne.quantite?.toFixed(2) ?? "—"}</td>
                      <td className="px-3 py-1.5 text-xs text-right text-slate-700">{ligne.prixUnitaireHT != null ? formatEuros(ligne.prixUnitaireHT) : "—"}</td>
                      <td className="px-3 py-1.5 text-xs text-right font-medium text-slate-700">{ligne.totalHT != null ? formatEuros(ligne.totalHT) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totaux */}
          <div className="flex justify-end mb-6">
            <div className="w-72">
              <div className="flex justify-between border-t border-slate-200 py-1.5 text-sm">
                <span className="text-slate-500">Total HT</span>
                <span className="font-medium">{formatEuros(facture.totalHT)}</span>
              </div>
              <div className="flex justify-between py-1.5 text-sm">
                <span className="text-slate-500">TVA</span>
                <span className="font-medium">{formatEuros(facture.totalTVA)}</span>
              </div>
              <div className="flex justify-between border-t-2 border-[#F7941E] pt-2 mt-1">
                <span className="text-base font-bold text-[#1E2F6E]">TOTAL TTC</span>
                <span className="text-base font-bold text-[#1E2F6E]">{formatEuros(facture.totalTTC)}</span>
              </div>
              {facture.montantPaye > 0 && (
                <>
                  <div className="flex justify-between py-1.5 text-sm mt-2 text-green-700">
                    <span>Déjà réglé</span>
                    <span className="font-medium">− {formatEuros(facture.montantPaye)}</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-[#1E2F6E]">
                    <span>Reste à payer</span>
                    <span>{formatEuros(resteAPayer)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mentions */}
          {facture.mentionsLibres && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Mentions</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{facture.mentionsLibres}</p>
            </div>
          )}

          {/* Pied de page */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-[10px] text-slate-400">{COMPANY_LEGAL}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Paiement par virement bancaire · Tout retard de paiement entraîne des pénalités de 3× le taux légal (Art. L441-6 du Code de commerce)
            </p>
          </div>
        </div>
      </div>

      {/* Annexe — Conditions de règlement */}
      {parametres?.conditionsFacture && (
        <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none print:break-before-page">
          <div className="px-12 py-10 print:px-8 print:py-3">
            <p className="mb-4 text-lg font-black text-[#1E2F6E]">ANNEXE — CONDITIONS DE RÈGLEMENT</p>
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">
              {parametres.conditionsFacture}
            </p>
          </div>
        </div>
      )}

    </>
  );
}
