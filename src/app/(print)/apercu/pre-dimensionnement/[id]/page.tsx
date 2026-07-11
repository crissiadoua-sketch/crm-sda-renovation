import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";
import {
  TYPE_ELEMENT_LABELS,
  MATERIAU_LABELS,
  DOCUMENT_TYPE_LABELS,
  USAGE_DALLAGE_LABELS,
  PORTANCE_SOL_LABELS,
  FINITION_BETON_LABELS,
  MATERIAU_MARGELLE_LABELS,
} from "@/lib/calcul-structurel/pre-dimensionnement";

export default async function ApercuPreDimensionnementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pdim = await prisma.preDimensionnement.findUnique({
    where: { id },
    include: { chantier: true, documents: { orderBy: { createdAt: "desc" } } },
  });
  if (!pdim) notFound();

  return (
    <>
      <PrintToolbar label={`Pré-dimensionnement — ${pdim.numero}`} />

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
              <p className="text-2xl font-black text-[#1E2F6E]">NOTE DE PRÉ-DIMENSIONNEMENT</p>
              <p className="mt-1 text-base font-bold text-slate-700">{pdim.numero}</p>
              <p className="text-xs text-slate-500">Chantier : {pdim.chantier?.nom ?? "—"}</p>
              <p className="text-xs text-slate-500">Date : {formatDate(pdim.createdAt)}</p>
            </div>
          </div>

          {/* Bandeau brouillon / non validé — obligatoire */}
          <div className="mb-5 rounded-lg border-2 border-red-400 bg-red-50 px-4 py-3">
            <p className="text-sm font-black uppercase tracking-wide text-red-700">⚠ Document brouillon — non validé</p>
            <p className="mt-1 text-xs text-red-700">
              Estimation de pré-dimensionnement par ratios forfaitaires usuels. Ce document n&apos;acquiert de valeur
              contractuelle ou réglementaire qu&apos;après contre-vérification et contre-signature par un ingénieur
              structure indépendant, qualifié et non impliqué dans son établissement. Ne pas utiliser pour le dépôt
              d&apos;un permis de construire, l&apos;exécution de travaux, ou toute justification de sécurité des
              occupants en l&apos;état.
            </p>
          </div>

          {/* Infos générales */}
          <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-[#1E2F6E]/20 bg-[#1E2F6E]/5 px-5 py-3 text-xs text-slate-600 sm:grid-cols-4">
            <p><span className="font-semibold">Élément :</span> {TYPE_ELEMENT_LABELS[pdim.typeElement as keyof typeof TYPE_ELEMENT_LABELS] ?? pdim.typeElement}</p>
            <p><span className="font-semibold">Matériau :</span> {MATERIAU_LABELS[pdim.materiau as keyof typeof MATERIAU_LABELS] ?? pdim.materiau}</p>
            <p><span className="font-semibold">Responsable :</span> {pdim.responsable ?? "—"}</p>
            <p><span className="font-semibold">Titre :</span> {pdim.titre ?? "—"}</p>
            {pdim.usageDallage && (
              <p><span className="font-semibold">Usage :</span> {USAGE_DALLAGE_LABELS[pdim.usageDallage as keyof typeof USAGE_DALLAGE_LABELS] ?? pdim.usageDallage}</p>
            )}
            {pdim.portanceSol && (
              <p><span className="font-semibold">Sol support :</span> {PORTANCE_SOL_LABELS[pdim.portanceSol as keyof typeof PORTANCE_SOL_LABELS] ?? pdim.portanceSol}</p>
            )}
            {pdim.surface != null && (
              <p><span className="font-semibold">Surface :</span> {pdim.surface} m²</p>
            )}
            {pdim.materiauMargelle && (
              <p><span className="font-semibold">Matériau margelle :</span> {MATERIAU_MARGELLE_LABELS[pdim.materiauMargelle as keyof typeof MATERIAU_MARGELLE_LABELS] ?? pdim.materiauMargelle}</p>
            )}
            {pdim.largeurMargelle != null && (
              <p><span className="font-semibold">Largeur margelle :</span> {pdim.largeurMargelle} cm</p>
            )}
            {pdim.lineaireM != null && (
              <p><span className="font-semibold">Pourtour du bassin :</span> {pdim.lineaireM} m</p>
            )}
            {pdim.finitionBeton && (
              <p><span className="font-semibold">Finition :</span> {FINITION_BETON_LABELS[pdim.finitionBeton as keyof typeof FINITION_BETON_LABELS] ?? pdim.finitionBeton}</p>
            )}
          </div>

          {/* Résultat */}
          <div className="mb-5 rounded-xl border-2 border-[#1E2F6E] overflow-hidden">
            <div className="bg-gradient-to-r from-[#1976D2] to-[#1B3F94] px-4 py-2">
              <p className="text-sm font-black text-white uppercase tracking-wide">Résultat du pré-dimensionnement</p>
            </div>
            <div className="px-4 py-4">
              <p className="text-3xl font-black text-[#1E2F6E]">{pdim.resultatLabel}</p>
              <p className="mt-2 text-xs text-slate-600">{pdim.formule}</p>
            </div>
          </div>

          {/* Hypothèses */}
          {pdim.hypotheses && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1E2F6E]">Hypothèses retenues</p>
              <ul className="list-inside list-disc text-xs text-slate-700 space-y-0.5">
                {pdim.hypotheses.split("\n").map((h, i) => <li key={i}>{h}</li>)}
              </ul>
            </div>
          )}

          {pdim.notes && (
            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Notes</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{pdim.notes}</p>
            </div>
          )}

          {/* Documents joints */}
          {pdim.documents.length > 0 && (
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1E2F6E]">Documents joints</p>
              <ul className="text-xs text-slate-700 space-y-0.5">
                {pdim.documents.map((doc) => (
                  <li key={doc.id}>
                    <span className="font-semibold">{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} :</span> {doc.nom}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rapport d'extraction IA */}
          {pdim.documents.some((doc) => doc.analyseIA) && (
            <div className="mb-5 print:break-inside-avoid">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#1E2F6E]">
                Rapport d&apos;extraction automatique par IA (lecture à vérifier)
              </p>
              <div className="space-y-3">
                {pdim.documents.filter((doc) => doc.analyseIA).map((doc) => (
                  <div key={doc.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold text-slate-700">
                      {DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type} — {doc.nom}
                      {doc.analyseIADate ? ` (analysé le ${formatDate(doc.analyseIADate)})` : ""}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{doc.analyseIA}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Encadré contre-signature ingénieur */}
          <div className="mb-5 rounded-xl border-2 border-slate-300 print:break-inside-avoid">
            <div className="bg-slate-100 px-4 py-2">
              <p className="text-xs font-black uppercase tracking-wide text-slate-600">
                Contre-vérification et visa de l&apos;ingénieur structure indépendant
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 px-4 py-4 text-xs text-slate-600">
              <p>Nom, qualification : ……………………………………………………</p>
              <p>N° d&apos;ordre / inscription : ……………………………………</p>
              <p>Date de contre-vérification : ……………………………</p>
              <p>Signature : ……………………………………………………………</p>
            </div>
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
