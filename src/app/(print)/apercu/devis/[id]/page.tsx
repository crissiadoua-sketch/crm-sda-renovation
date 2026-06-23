import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";
import { PageDeGarde } from "./page-de-garde";
import { TamponSDAprint } from "@/components/tampon-sda";

export default async function ApercuDevisPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [devis, parametres] = await Promise.all([
    prisma.devis.findUnique({
      where: { id },
      include: {
        chantier: true,
        client: true,
        lignes: { orderBy: { ordre: "asc" } },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!devis) notFound();

  const lignes = devis.lignes;
  const chapitres = lignes.filter(l => l.type === "CHAPITRE");
  const hasTVAReduite = lignes.some(l => l.tauxTVA && l.tauxTVA < 10);

  return (
    <>
      <PrintToolbar label={`Aperçu PDF — ${devis.numero} · ${devis.statut}`} />

      <PageDeGarde devis={devis} />

      {/* Document A4 */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-12 py-10 print:px-10 print:py-8">

          {/* En-tête SDA Rénovation */}
          <div className="flex items-start justify-between border-b-2 border-[#1E2F6E] pb-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <img src="/logo.png" alt="SDA Rénovation" className="h-10 w-auto object-contain" />
                <p className="text-xs text-slate-500">{COMPANY.activite}</p>
              </div>
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                <p>{COMPANY.adresse} — {COMPANY.codePostal} {COMPANY.ville}</p>
                <p>{COMPANY.email} · {COMPANY.site}</p>
                <p>SIREN {COMPANY.siren} · TVA {COMPANY.tvaIntracommunautaire}</p>
              </div>
            </div>

            <div className="text-right">
              <p className="text-2xl font-bold text-[#1E2F6E]">DEVIS</p>
              <p className="mt-1 text-base font-semibold text-slate-700">{devis.numero}</p>
              {devis.version > 1 && (
                <p className="text-xs text-slate-400">Version {devis.version}</p>
              )}
              <div className="mt-2 text-xs text-slate-500 space-y-0.5">
                <p>Date : {formatDate(devis.dateCreation)}</p>
                {devis.dateValidite && <p>Valable jusqu&apos;au : {formatDate(devis.dateValidite)}</p>}
              </div>
              {devis.statut !== "BROUILLON" && (
                <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                  devis.statut === "ACCEPTE" ? "bg-green-100 text-green-700" :
                  devis.statut === "REFUSE"  ? "bg-red-100 text-red-700" :
                  devis.statut === "ENVOYE"  ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {devis.statut === "ACCEPTE" ? "✓ Accepté" :
                   devis.statut === "REFUSE"  ? "✗ Refusé" :
                   devis.statut === "ENVOYE"  ? "Envoyé" : devis.statut}
                </span>
              )}
            </div>
          </div>

          {/* Bloc Chantier / Client */}
          <div className="mb-6 grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Chantier</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-[#1E2F6E]">{devis.chantier.nom}</p>
                <p className="text-xs text-slate-500">{devis.chantier.reference}</p>
                {devis.chantier.adresse && <p className="text-xs text-slate-500 mt-1">{devis.chantier.adresse}{devis.chantier.codePostal ? ", " + devis.chantier.codePostal : ""}{devis.chantier.ville ? " " + devis.chantier.ville : ""}</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Client / Maître d&apos;ouvrage</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="font-semibold text-[#1E2F6E]">{clientDisplayName(devis.client)}</p>
                {devis.client.reference && <p className="text-xs text-slate-500">{devis.client.reference}</p>}
                {devis.client.adresse && <p className="text-xs text-slate-500 mt-0.5">{devis.client.adresse}</p>}
                {(devis.client.codePostal || devis.client.ville) && (
                  <p className="text-xs text-slate-500">{devis.client.codePostal} {devis.client.ville}</p>
                )}
                {devis.client.email && <p className="text-xs text-slate-500">{devis.client.email}</p>}
                {devis.client.telephone && <p className="text-xs text-slate-500">{devis.client.telephone}</p>}
              </div>
            </div>
          </div>

          {/* Infos DCE / objet */}
          {(devis.objet || devis.referenceMarche || devis.lot || devis.maitreOeuvre || devis.delaiExecution || devis.modaliteReglement) && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
                {devis.objet && (
                  <div className="col-span-2">
                    <span className="font-semibold text-slate-500">Objet : </span>
                    <span className="text-slate-700">{devis.objet}</span>
                  </div>
                )}
                {devis.referenceMarche && (
                  <div><span className="font-semibold text-slate-500">Réf. marché : </span><span className="text-slate-700">{devis.referenceMarche}</span></div>
                )}
                {devis.lot && (
                  <div><span className="font-semibold text-slate-500">Lot / corps d&apos;état : </span><span className="text-slate-700">{devis.lot}</span></div>
                )}
                {devis.maitreOeuvre && (
                  <div><span className="font-semibold text-slate-500">Maître d&apos;œuvre : </span><span className="text-slate-700">{devis.maitreOeuvre}</span></div>
                )}
                {devis.delaiExecution && (
                  <div><span className="font-semibold text-slate-500">Délai d&apos;exécution : </span><span className="text-slate-700">{devis.delaiExecution}</span></div>
                )}
                {devis.modaliteReglement && (
                  <div className="col-span-2"><span className="font-semibold text-slate-500">Modalités de règlement : </span><span className="text-slate-700">{devis.modaliteReglement}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Tableau des lignes */}
          <div className="mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[#1E2F6E] text-white">
                  <th className="px-3 py-2 text-left font-semibold text-xs w-16">Code</th>
                  <th className="px-3 py-2 text-left font-semibold text-xs">Désignation</th>
                  <th className="px-3 py-2 text-center font-semibold text-xs w-14">Unité</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-16">Qté</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-24">P.U. HT</th>
                  <th className="px-3 py-2 text-right font-semibold text-xs w-24">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map((ligne, i) => {
                  const cr = (ligne as typeof ligne & { clausesReserves?: string | null }).clausesReserves;
                  let clauses: string[] = [];
                  try { if (cr) clauses = JSON.parse(cr) as string[]; } catch { /* noop */ }

                  if (ligne.type === "CHAPITRE") {
                    return (
                      <React.Fragment key={ligne.id}>
                        <tr className="bg-[#29ABE2]/10">
                          <td colSpan={6} className="px-3 py-2 font-bold text-[#1E2F6E] text-sm border-t-2 border-[#29ABE2]/40 whitespace-pre-wrap">
                            {ligne.designation}
                          </td>
                        </tr>
                        {clauses.length > 0 && (
                          <tr className="bg-red-50/30">
                            <td colSpan={6} className="px-3 py-2 pl-6">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-red-600 mb-1">Clauses et Réserves :</p>
                              <ul className="space-y-0.5">
                                {clauses.map((c, ci) => (
                                  <li key={ci} className="flex items-start gap-1.5 text-[10px] italic text-red-600">
                                    <span className="mt-0.5">•</span><span>{c}</span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }
                  if (ligne.type === "CLAUSE_RESERVE") {
                    return (
                      <tr key={ligne.id} className="bg-red-50/60">
                        <td colSpan={6} className="px-3 py-2 pl-6 border-t border-red-100">
                          <p className="text-[9px] font-bold uppercase tracking-widest text-red-600 mb-0.5">Clause / réserve</p>
                          <p className="text-xs italic text-red-700 whitespace-pre-wrap">{ligne.designation}</p>
                        </td>
                      </tr>
                    );
                  }
                  if (ligne.type === "SOUS_CHAPITRE") {
                    return (
                      <React.Fragment key={ligne.id}>
                        <tr className="bg-slate-50">
                          <td colSpan={6} className="px-3 py-1.5 font-semibold text-slate-700 text-xs pl-6 border-t border-slate-200 whitespace-pre-wrap">
                            {ligne.designation}
                          </td>
                        </tr>
                        {clauses.length > 0 && (
                          <tr className="bg-red-50/30">
                            <td colSpan={6} className="px-3 py-1.5 pl-8">
                              <p className="text-[9px] font-bold uppercase tracking-widest text-red-600 mb-1">Clauses et Réserves :</p>
                              <ul className="space-y-0.5">
                                {clauses.map((c, ci) => (
                                  <li key={ci} className="flex items-start gap-1.5 text-[10px] italic text-red-600">
                                    <span className="mt-0.5">•</span><span>{c}</span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  }
                  // LIGNE normale
                  return (
                    <React.Fragment key={ligne.id}>
                      <tr className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"}>
                        <td className="px-3 py-1.5 text-xs text-slate-400 pl-8">{ligne.codeArticle ?? "—"}</td>
                        <td className="px-3 py-1.5 text-xs text-slate-700 pl-8 whitespace-pre-wrap">{ligne.designation}</td>
                        <td className="px-3 py-1.5 text-xs text-center text-slate-500">{ligne.unite ?? "—"}</td>
                        <td className="px-3 py-1.5 text-xs text-right text-slate-700">{ligne.quantite?.toFixed(2) ?? "—"}</td>
                        <td className="px-3 py-1.5 text-xs text-right text-slate-700">{ligne.prixUnitaireHT != null ? formatEuros(ligne.prixUnitaireHT) : "—"}</td>
                        <td className="px-3 py-1.5 text-xs text-right font-medium text-slate-700">{ligne.totalHT != null ? formatEuros(ligne.totalHT) : "—"}</td>
                      </tr>
                      {clauses.length > 0 && (
                        <tr className="bg-red-50/30">
                          <td colSpan={6} className="px-3 py-1.5 pl-10">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-red-600 mb-1">Clauses et Réserves :</p>
                            <ul className="space-y-0.5">
                              {clauses.map((c, ci) => (
                                <li key={ci} className="flex items-start gap-1.5 text-[10px] italic text-red-600">
                                  <span className="mt-0.5">•</span><span>{c}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Récapitulatif totaux */}
          <div className="flex justify-end mb-6">
            <div className="w-72">
              <div className="flex justify-between border-t border-slate-200 py-1.5 text-sm">
                <span className="text-slate-500">Total HT</span>
                <span className="font-medium">{formatEuros(devis.totalHT)}</span>
              </div>
              {hasTVAReduite ? (
                <>
                  <div className="flex justify-between py-1.5 text-sm">
                    <span className="text-slate-500">TVA 5,5% (réduite)</span>
                    <span className="font-medium text-slate-700">—</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-sm">
                    <span className="text-slate-500">TVA 10% (intermédiaire)</span>
                    <span className="font-medium text-slate-700">—</span>
                  </div>
                  <div className="flex justify-between py-1.5 text-sm">
                    <span className="text-slate-500">TVA 20% (normale)</span>
                    <span className="font-medium text-slate-700">—</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between py-1.5 text-sm">
                  <span className="text-slate-500">TVA</span>
                  <span className="font-medium">{formatEuros(devis.totalTVA)}</span>
                </div>
              )}
              <div className="flex justify-between border-t-2 border-[#1E2F6E] pt-2 mt-1">
                <span className="text-base font-bold text-[#1E2F6E]">TOTAL TTC</span>
                <span className="text-base font-bold text-[#1E2F6E]">{formatEuros(devis.totalTTC)}</span>
              </div>
            </div>
          </div>

          {/* Mentions libres */}
          {devis.mentionsLibres && (
            <div className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold text-slate-500 mb-1">Mentions</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{devis.mentionsLibres}</p>
            </div>
          )}

          {/* Bon pour accord */}
          <div className="mb-8 rounded-lg border-2 border-[#1E2F6E]/20 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-[#1E2F6E] mb-3">Bon pour accord</p>
            <p className="text-xs text-slate-500 mb-6">
              En signant ce devis, le client accepte les conditions générales de vente et autorise {COMPANY.nom} à réaliser les travaux décrits ci-dessus.
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs text-slate-400 mb-1">Fait à :</p>
                <div className="h-px w-full bg-slate-300 mt-8" />
                <p className="text-xs text-slate-400 mt-1">Lieu et date</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-1">Signature du client (précédée de la mention « Bon pour accord ») :</p>
                <div className="h-16 w-full rounded border border-dashed border-slate-300 bg-white" />
              </div>
            </div>
          </div>

          {/* Pied de page légal */}
          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-end justify-between gap-4">
              <div className="flex-1">
                <p className="text-[10px] text-slate-400">{COMPANY_LEGAL}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Assurance décennale : {COMPANY.assuranceDecennale} · RC Pro : {COMPANY.assureurRC}
                </p>
              </div>
              <TamponSDAprint />
            </div>
          </div>
        </div>
      </div>

      {/* Annexe — Conditions générales */}
      {parametres?.conditionsDevis && (
        <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none print:break-before-page">
          <div className="px-12 py-10 print:px-10 print:py-8">
            <p className="mb-4 text-lg font-black text-[#1E2F6E]">ANNEXE — CONDITIONS GÉNÉRALES</p>
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">
              {parametres.conditionsDevis}
            </p>
          </div>
        </div>
      )}

      {/* CSS print */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0 0 14mm 0;
            @bottom-center {
              content: "Page " counter(page) " / " counter(pages);
              font-size: 9px;
              color: #94a3b8;
            }
          }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
