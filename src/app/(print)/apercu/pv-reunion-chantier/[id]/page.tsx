import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuPVReunionChantierPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pv = await prisma.pVReunionChantier.findUnique({
    where: { id },
    include: {
      chantier: true,
      client: true,
      participants: true,
      points: { orderBy: { ordre: "asc" } },
      actions: { orderBy: { ordre: "asc" } },
    },
  });

  if (!pv) notFound();

  return (
    <>
      <PrintToolbar label={`PV Réunion Chantier — ${pv.numero}`} />

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
              <p className="text-2xl font-black text-[#1E2F6E]">PROCÈS-VERBAL</p>
              <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide">de réunion de chantier</p>
              <p className="mt-1 text-base font-bold text-slate-700">{pv.numero}</p>
              <p className="text-xs text-slate-500 mt-0.5">{pv.typeReunion.replace(/_/g, " ")}</p>
              <p className="text-xs text-slate-500">{formatDate(pv.dateReunion)}</p>
            </div>
          </div>

          {/* Bloc info */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Chantier</p>
              <p className="text-sm font-semibold text-[#1E2F6E]">{pv.chantier?.nom ?? "—"}</p>
              {pv.chantier?.reference && <p className="text-xs text-slate-500">{pv.chantier.reference}</p>}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Client</p>
              <p className="text-sm text-slate-700">{pv.client?.nom ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Lieu</p>
              <p className="text-sm text-slate-700">{pv.lieuReunion ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Heures</p>
              <p className="text-sm text-slate-700">
                {pv.heureDebut ?? "—"} → {pv.heureFin ?? "—"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Animateur</p>
              <p className="text-sm text-slate-700">{pv.animateur ?? "—"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Rédacteur</p>
              <p className="text-sm text-slate-700">{pv.redacteur ?? "—"}</p>
            </div>
          </div>

          {/* Participants */}
          {pv.participants.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Participants</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1976D2] to-[#1B3F94] text-white">
                    <th className="px-2 py-1.5 text-left font-semibold">Nom</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Société</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Fonction</th>
                    <th className="px-2 py-1.5 text-center font-semibold w-16">Présent</th>
                  </tr>
                </thead>
                <tbody>
                  {pv.participants.map((p, i) => (
                    <tr key={p.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="px-2 py-1.5 text-slate-700">{p.nom}</td>
                      <td className="px-2 py-1.5 text-slate-500">{p.societe ?? "—"}</td>
                      <td className="px-2 py-1.5 text-slate-500">{p.fonction ?? "—"}</td>
                      <td className="px-2 py-1.5 text-center font-bold">
                        <span className={p.present ? "text-green-600" : "text-red-500"}>
                          {p.present ? "✓" : "✗"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Points traités */}
          {pv.points.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Points traités</p>
              <div className="space-y-2">
                {pv.points.map((point, i) => (
                  <div key={point.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <p className="text-xs font-semibold text-[#1E2F6E]">
                      {i + 1}. {point.titre}
                    </p>
                    {point.contenu && (
                      <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{point.contenu}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {pv.actions.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Actions à mener</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-gradient-to-r from-[#1976D2] to-[#1B3F94] text-white">
                    <th className="px-2 py-1.5 text-left font-semibold w-6">#</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                    <th className="px-2 py-1.5 text-left font-semibold w-28">Responsable</th>
                    <th className="px-2 py-1.5 text-center font-semibold w-24">Échéance</th>
                    <th className="px-2 py-1.5 text-center font-semibold w-20">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {pv.actions.map((action, i) => (
                    <tr key={action.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="px-2 py-1.5 text-center text-slate-400">{action.ordre}</td>
                      <td className="px-2 py-1.5 text-slate-700">{action.description}</td>
                      <td className="px-2 py-1.5 text-slate-600">{action.responsable ?? "—"}</td>
                      <td className="px-2 py-1.5 text-center text-slate-500">{formatDate(action.echeance)}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          action.statut === "CLOTUREE" ? "bg-green-100 text-green-700" :
                          action.statut === "EN_COURS" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {action.statut.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Prochaine réunion */}
          {(pv.prochaineDateReunion || pv.prochaineLieu) && (
            <div className="mb-4 rounded-lg border border-[#F7941E]/40 bg-[#F7941E]/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1E2F6E] mb-1">Prochaine réunion</p>
              <p className="text-xs text-slate-700">
                {formatDate(pv.prochaineDateReunion)}
                {pv.prochaineLieu && ` — ${pv.prochaineLieu}`}
              </p>
            </div>
          )}

          {/* Signatures */}
          <div className="mb-4 grid grid-cols-2 gap-6">
            {[
              { label: "Animateur", nom: pv.animateur },
              { label: "Rédacteur", nom: pv.redacteur },
            ].map(({ label, nom }) => (
              <div key={label} className="rounded-lg border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
                <p className="text-xs text-slate-600 mb-5">{nom ?? "____________________________"}</p>
                <div className="h-12 border-b border-dashed border-slate-300" />
                <p className="mt-1 text-[10px] text-slate-400">Date : ___________________</p>
              </div>
            ))}
          </div>

          {/* Mention légale */}
          <div className="mb-4 rounded-lg border border-[#F7941E]/30 bg-[#F7941E]/5 px-4 py-2 text-center">
            <p className="text-xs font-semibold text-[#F7941E]">
              Ce PV fait foi en cas de litige. À contresigner et retourner sous 8 jours ouvrés.
            </p>
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
