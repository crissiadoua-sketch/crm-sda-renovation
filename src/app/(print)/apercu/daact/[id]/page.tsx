import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuDAACTPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const daact = await prisma.dAACT.findUnique({
    where: { id },
    include: {
      chantier: true,
      client: true,
    },
  });

  if (!daact) notFound();

  return (
    <>
      <PrintToolbar label={`DAACT — ${daact.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-12 py-10 print:px-10 print:py-8">

          {/* En-tête SDA */}
          <div className="flex items-start justify-between border-b-[3px] border-[#F7941E] pb-5 mb-5">
            <div className="flex items-center gap-3 mb-2">
              <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain" />
              <p className="text-xs font-semibold text-[#F7941E] uppercase tracking-wide">{COMPANY.activite}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-[#1E2F6E] leading-tight">DÉCLARATION D&apos;ACHÈVEMENT</p>
              <p className="text-lg font-black text-[#1E2F6E] leading-tight">ET DE CONFORMITÉ DES TRAVAUX</p>
              <p className="mt-1 text-base font-bold text-slate-700">{daact.numero}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                daact.statut === "ACCEPTE" ? "bg-green-100 text-green-700" :
                daact.statut === "AVEC_RESERVES" ? "bg-orange-100 text-orange-700" :
                daact.statut === "SOUMIS" ? "bg-blue-100 text-blue-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {daact.statut.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Chantier */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1E2F6E] mb-2">Identification du chantier</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Adresse des travaux</p>
                <p className="text-sm text-slate-700">{daact.adresseChantier ?? daact.chantier?.adresse ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Nature des travaux</p>
                <p className="text-sm text-slate-700">{daact.natureTravaux ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Maître d&apos;ouvrage</p>
                <p className="text-sm font-semibold text-[#1E2F6E]">{daact.client?.nom ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Référence chantier</p>
                <p className="text-sm text-slate-700">{daact.chantier?.nom ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Déclarant */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1E2F6E] mb-2">Déclarant</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Nom</p>
                <p className="text-sm font-semibold text-slate-700">{daact.nomDeclarant ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Qualité</p>
                <p className="text-sm text-slate-700">{daact.qualiteDeclarant ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Grande case de conformité */}
          <div className={`mb-5 rounded-2xl border-4 px-8 py-6 text-center ${
            daact.conformePC
              ? "border-green-400 bg-green-50"
              : "border-red-400 bg-red-50"
          }`}>
            <p className={`text-3xl font-black tracking-wider ${
              daact.conformePC ? "text-green-700" : "text-red-700"
            }`}>
              {daact.conformePC
                ? "✓ CONFORME AU PERMIS DE CONSTRUIRE"
                : "✗ NON CONFORME — AVEC RÉSERVES"}
            </p>
            {!daact.conformePC && (
              <p className="mt-2 text-sm text-red-600">
                Des réserves ont été formulées par le Maître d&apos;ouvrage
              </p>
            )}
          </div>

          {/* Réserves */}
          {!daact.conformePC && daact.reservesMO && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">
                Réserves du Maître d&apos;ouvrage
              </p>
              <p className="text-xs text-red-700 whitespace-pre-wrap">{daact.reservesMO}</p>
            </div>
          )}

          {/* Dates */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Date d&apos;achèvement</p>
              <p className="text-sm text-slate-700">{formatDate(daact.dateAchevement)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Date de dépôt</p>
              <p className="text-sm text-slate-700">{formatDate(daact.dateDepot)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Date de réponse MO</p>
              <p className="text-sm text-slate-700">{formatDate(daact.dateReponse)}</p>
            </div>
          </div>

          {/* Signatures */}
          <div className="mb-5 grid grid-cols-2 gap-6">
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Déclarant</p>
              <p className="text-sm font-medium text-slate-700 mb-4">
                {daact.nomDeclarant ?? "____________________________"}
              </p>
              <p className="text-[10px] text-slate-400 mb-1">Signature :</p>
              <div className="h-12 border-b border-dashed border-slate-300" />
              <p className="mt-1 text-[10px] text-slate-400">Date : ___________________</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Maître d&apos;ouvrage</p>
              <p className="text-sm font-medium text-slate-700 mb-4">
                {daact.client?.nom ?? "____________________________"}
              </p>
              <p className="text-[10px] text-slate-400 mb-1">Signature :</p>
              <div className="h-12 border-b border-dashed border-slate-300" />
              <p className="mt-1 text-[10px] text-slate-400">Date : ___________________</p>
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
