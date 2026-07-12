import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuRapportHebdoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const rapport = await prisma.rapportHebdomadaire.findUnique({
    where: { id },
    include: {
      chantier: true,
      client: true,
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!rapport) notFound();

  const avancement = rapport.avancementGlobal ?? 0;

  return (
    <>
      <PrintToolbar label={`Rapport Hebdomadaire — ${rapport.numero}`} />

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
              <p className="text-2xl font-black text-[#1E2F6E]">RAPPORT HEBDOMADAIRE</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">de chantier</p>
              <p className="mt-1 text-base font-bold text-slate-700">{rapport.numero}</p>
              <p className="text-sm text-slate-600 mt-0.5">
                Semaine {rapport.semaine} / {rapport.annee}
              </p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                rapport.statut === "VALIDE" ? "bg-green-100 text-green-700" :
                rapport.statut === "ENVOYE" ? "bg-blue-100 text-blue-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {rapport.statut.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Bloc informations */}
          <div className="mb-5 grid grid-cols-3 gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Chantier</p>
              <p className="text-sm font-semibold text-[#1E2F6E]">{rapport.chantier?.nom ?? "—"}</p>
              {rapport.chantier?.reference && <p className="text-xs text-slate-500">{rapport.chantier.reference}</p>}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Responsable</p>
              <p className="text-sm font-semibold text-slate-700">{rapport.responsable ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Météo semaine</p>
              <p className="text-sm font-semibold text-slate-700">{rapport.meteoSemaine ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Période</p>
              <p className="text-sm text-slate-700">
                {formatDate(rapport.dateDebut)} → {formatDate(rapport.dateFin)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Heures totales</p>
              <p className="text-sm font-semibold text-slate-700">{rapport.heuresTotales != null ? `${rapport.heuresTotales} h` : "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Client</p>
              <p className="text-sm text-slate-700">{rapport.client?.nom ?? "—"}</p>
            </div>
          </div>

          {/* Barre avancement global */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avancement global</p>
              <p className="text-sm font-bold text-[#1E2F6E]">{avancement.toFixed(0)} %</p>
            </div>
            <div className="h-5 w-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#29ABE2] to-[#1E2F6E] transition-all"
                style={{ width: `${Math.min(avancement, 100)}%` }}
              />
            </div>
          </div>

          {/* Tableau des tâches */}
          {rapport.lignes.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Tâches de la semaine</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FFA726] text-white">
                    <th className="px-2 py-1.5 text-left font-semibold w-6">#</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Tâche</th>
                    <th className="px-2 py-1.5 text-center font-semibold w-16">Début %</th>
                    <th className="px-2 py-1.5 text-center font-semibold w-16">Fin %</th>
                    <th className="px-2 py-1.5 text-center font-semibold w-24">Progression</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {rapport.lignes.map((ligne, i) => {
                    const debut = ligne.avancementDebut ?? 0;
                    const fin = ligne.avancementFin ?? 0;
                    const progression = fin - debut;
                    return (
                      <tr key={ligne.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                        <td className="px-2 py-1.5 text-center text-slate-400">{i + 1}</td>
                        <td className="px-2 py-1.5 text-slate-700">{ligne.tache}</td>
                        <td className="px-2 py-1.5 text-center text-slate-600">{debut}%</td>
                        <td className="px-2 py-1.5 text-center text-slate-600">{fin}%</td>
                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                              <div
                                className="h-full rounded-full bg-[#29ABE2]"
                                style={{ width: `${Math.min(fin, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${progression > 0 ? "text-green-600" : "text-slate-400"}`}>
                              {progression > 0 ? `+${progression}%` : "—"}
                            </span>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-slate-500">{ligne.commentaire ?? "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Travaux effectués */}
          {rapport.travauxEffectues && (
            <div className="mb-4 rounded-lg border border-[#F7941E]/40 bg-[#FFA726]/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1E2F6E] mb-1">Travaux effectués</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{rapport.travauxEffectues}</p>
            </div>
          )}

          {/* Problèmes rencontrés */}
          {rapport.problemes && (
            <div className="mb-4 rounded-lg border border-[#F7941E]/40 bg-[#FFA726]/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#F7941E] mb-1">Problèmes rencontrés</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{rapport.problemes}</p>
            </div>
          )}

          {/* Actions à suivre */}
          {rapport.actionsASuivre && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Actions à suivre</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{rapport.actionsASuivre}</p>
            </div>
          )}

          {/* Prévisions semaine suivante */}
          {rapport.previsionsSemaineSuivante && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Prévisions semaine suivante</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{rapport.previsionsSemaineSuivante}</p>
            </div>
          )}

          {/* Notes */}
          {rapport.notes && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Notes</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{rapport.notes}</p>
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
