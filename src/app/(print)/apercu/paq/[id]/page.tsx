import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuPAQPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const paq = await prisma.planAssuranceQualite.findUnique({
    where: { id },
    include: {
      chantier: true,
      client: true,
      fiches: {
        select: { id: true, numero: true, statut: true, ouvrage: true, lot: true },
        orderBy: { numero: "asc" },
      },
    },
  });

  if (!paq) notFound();

  return (
    <>
      <PrintToolbar label={`PAQ — ${paq.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-12 py-10 print:px-7 print:py-4">

          {/* En-tête SDA */}
          <div className="flex items-start justify-between border-b-[3px] border-[#F7941E] pb-5 mb-5">
            <div className="flex items-center gap-3 mb-2">
              <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain" />
              <p className="text-xs font-semibold text-[#F7941E] uppercase tracking-wide">{COMPANY.activite}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1E2F6E]">PLAN D&apos;ASSURANCE QUALITÉ</p>
              <p className="mt-1 text-base font-bold text-slate-700">{paq.numero}</p>
              <p className="mt-0.5 text-sm text-slate-500">Version {paq.version}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                paq.statut === "EN_VIGUEUR" ? "bg-green-100 text-green-700" :
                paq.statut === "ARCHIVE" ? "bg-gray-200 text-gray-500" :
                "bg-slate-100 text-slate-600"
              }`}>
                {paq.statut.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Identification */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Chantier</p>
                <p className="text-sm font-semibold text-[#1E2F6E]">{paq.chantier?.nom ?? "—"}</p>
                {paq.chantier?.adresse && <p className="text-xs text-slate-500">{paq.chantier.adresse}</p>}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Client</p>
                <p className="text-sm text-slate-700">{paq.client?.nom ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Objet du marché</p>
                <p className="text-sm text-slate-700">{paq.objetMarche ?? "—"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Délai d&apos;exécution</p>
                <p className="text-sm text-slate-700">{paq.delaiExecution ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Date émission</p>
                <p className="text-sm text-slate-700">{formatDate(paq.dateEmission)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Date révision</p>
                <p className="text-sm text-slate-700">{formatDate(paq.dateRevision)}</p>
              </div>
            </div>
          </div>

          {/* Intervenants */}
          {paq.listeIntervenants && (
            <div className="mb-4 rounded-lg border border-[#F7941E]/50 bg-[#FFA726]/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1E2F6E] mb-2">Liste des intervenants</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{paq.listeIntervenants}</p>
            </div>
          )}

          {/* Procédures qualité */}
          {paq.proceduresQualite && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Procédures qualité</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{paq.proceduresQualite}</p>
            </div>
          )}

          {/* Plan de contrôle */}
          {paq.planControle && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Plan de contrôle</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{paq.planControle}</p>
            </div>
          )}

          {/* Enregistrements */}
          {paq.enregistrements && (
            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Enregistrements qualité</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{paq.enregistrements}</p>
            </div>
          )}

          {/* Fiches associées */}
          {paq.fiches.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Fiches d&apos;autocontrôle associées ({paq.fiches.length})
              </p>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Numéro</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Lot</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Ouvrage</th>
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paq.fiches.map((f) => (
                    <tr key={f.id}>
                      <td className="px-3 py-1.5 font-mono text-[#1E2F6E]">{f.numero}</td>
                      <td className="px-3 py-1.5 text-slate-600">{f.lot ?? "—"}</td>
                      <td className="px-3 py-1.5 text-slate-600">{f.ouvrage ?? "—"}</td>
                      <td className="px-3 py-1.5 text-slate-600">{f.statut.replace(/_/g, " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Signatures */}
          <div className="mb-5 grid grid-cols-2 gap-6">
            {[
              { label: "Rédacteur", nom: paq.redacteurNom },
              { label: "Approbateur", nom: paq.approbateurNom },
            ].map(({ label, nom }) => (
              <div key={label} className="rounded-lg border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
                <p className="text-sm font-medium text-slate-700 mb-4">{nom ?? "____________________________"}</p>
                <p className="text-[10px] text-slate-400 mb-1">Signature :</p>
                <div className="h-12 border-b border-dashed border-slate-300" />
                <p className="mt-1 text-[10px] text-slate-400">Date : ___________________</p>
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
