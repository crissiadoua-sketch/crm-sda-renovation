import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

function resultatSymbol(resultat: string) {
  switch (resultat) {
    case "CONFORME": return "✓";
    case "NON_CONFORME": return "✗";
    case "SANS_OBJET": return "SO";
    default: return "—";
  }
}

function resultatBg(resultat: string) {
  switch (resultat) {
    case "CONFORME": return "bg-green-50";
    case "NON_CONFORME": return "bg-red-50";
    default: return "";
  }
}

function globalStatutLabel(statut: string) {
  switch (statut) {
    case "CONFORME": return { label: "CONFORME", cls: "bg-green-500 text-white" };
    case "NON_CONFORME": return { label: "NON CONFORME", cls: "bg-red-500 text-white" };
    case "AVEC_RESERVES": return { label: "AVEC RÉSERVES", cls: "bg-orange-400 text-white" };
    default: return { label: "EN COURS", cls: "bg-slate-300 text-slate-700" };
  }
}

export default async function ApercuFicheAutocontrolePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fac = await prisma.ficheAutocontrole.findUnique({
    where: { id },
    include: {
      chantier: true,
      client: true,
      paq: { select: { numero: true } },
      points: { orderBy: { ordre: "asc" } },
    },
  });

  if (!fac) notFound();

  const statutInfo = globalStatutLabel(fac.statut);

  return (
    <>
      <PrintToolbar label={`Fiche autocontrôle — ${fac.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-12 py-10 print:px-8 print:py-3">

          {/* En-tête SDA */}
          <div className="flex items-start justify-between border-b-[3px] border-[#F7941E] pb-5 mb-5">
            <div className="flex items-center gap-3 mb-2">
              <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain" />
              <p className="text-xs font-semibold text-[#F7941E] uppercase tracking-wide">{COMPANY.activite}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1E2F6E]">FICHE D&apos;AUTOCONTRÔLE</p>
              <p className="mt-1 text-base font-bold text-slate-700">{fac.numero}</p>
              {fac.lot && <p className="text-sm text-slate-500">Lot : {fac.lot}</p>}
              {fac.ouvrage && <p className="text-sm text-slate-600 font-medium">{fac.ouvrage}</p>}
            </div>
          </div>

          {/* Infos contrôleur */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Chantier</p>
              <p className="text-sm font-semibold text-[#1E2F6E]">{fac.chantier?.nom ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Contrôleur</p>
              <p className="text-sm text-slate-700">{fac.controleurNom ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Date de contrôle</p>
              <p className="text-sm text-slate-700">{formatDate(fac.dateControle)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Entreprise</p>
              <p className="text-sm text-slate-700">{fac.entreprise ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Localisation</p>
              <p className="text-sm text-slate-700">{fac.localisation ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">PAQ de référence</p>
              <p className="text-sm font-mono text-[#1E2F6E]">{fac.paq?.numero ?? "—"}</p>
            </div>
          </div>

          {/* Tableau des points */}
          {fac.points.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Points de contrôle</p>
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[#FFA726] text-white">
                    <th className="px-3 py-2 text-left font-semibold w-6">#</th>
                    <th className="px-3 py-2 text-left font-semibold">Critère</th>
                    <th className="px-3 py-2 text-left font-semibold w-28">Exigence</th>
                    <th className="px-3 py-2 text-center font-semibold w-12">Résultat</th>
                    <th className="px-3 py-2 text-left font-semibold">Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fac.points.map((p) => (
                    <tr key={p.id} className={resultatBg(p.resultat)} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="px-3 py-1.5 text-slate-400 font-bold">{p.ordre}</td>
                      <td className="px-3 py-1.5 text-slate-700">{p.critere}</td>
                      <td className="px-3 py-1.5 text-slate-600">{p.exigence ?? "—"}</td>
                      <td className={`px-3 py-1.5 text-center font-bold text-sm ${
                        p.resultat === "CONFORME" ? "text-green-600" :
                        p.resultat === "NON_CONFORME" ? "text-red-600" :
                        "text-slate-400"
                      }`}>
                        {resultatSymbol(p.resultat)}
                      </td>
                      <td className="px-3 py-1.5 text-slate-600">{p.observations ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Résultat global */}
          <div className={`mb-5 rounded-xl px-6 py-4 text-center ${statutInfo.cls}`}>
            <p className="text-xl font-black tracking-widest">RÉSULTAT GLOBAL : {statutInfo.label}</p>
          </div>

          {/* Observations générales */}
          {fac.observations && (
            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Observations générales</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{fac.observations}</p>
            </div>
          )}

          {/* Signature */}
          <div className="mb-5 rounded-lg border border-slate-200 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Contrôleur — Signature</p>
            <p className="text-sm font-medium text-slate-700 mb-4">{fac.controleurNom ?? "____________________________"}</p>
            <p className="text-[10px] text-slate-400 mb-1">Signature :</p>
            <div className="h-12 border-b border-dashed border-slate-300" />
            <p className="mt-1 text-[10px] text-slate-400">Date : ___________________</p>
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
