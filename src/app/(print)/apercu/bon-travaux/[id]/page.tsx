import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuBonTravauxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const bt = await prisma.bonTravaux.findUnique({
    where: { id },
    include: {
      chantier: true,
      client: true,
      equipe: true,
      taches: { orderBy: { ordre: "asc" } },
    },
  });

  if (!bt) notFound();

  const isHaute = bt.priorite === "HAUTE" || bt.priorite === "URGENTE";

  return (
    <>
      <PrintToolbar label={`Bon de Travaux — ${bt.numero}`} />

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
              <p className="text-2xl font-black text-[#1E2F6E]">BON DE TRAVAUX</p>
              <p className="mt-1 text-base font-bold text-slate-700">{bt.numero}</p>
              <div className="mt-2 flex items-center justify-end gap-2">
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                  bt.priorite === "URGENTE" ? "bg-red-100 text-red-700" :
                  bt.priorite === "HAUTE" ? "bg-orange-100 text-orange-700" :
                  bt.priorite === "FAIBLE" ? "bg-slate-100 text-slate-500" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  Priorité : {bt.priorite.replace(/_/g, " ")}
                </span>
                <span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${
                  bt.statut === "TERMINE" ? "bg-green-100 text-green-700" :
                  bt.statut === "EN_COURS" ? "bg-blue-100 text-blue-700" :
                  "bg-slate-100 text-slate-600"
                }`}>
                  {bt.statut.replace(/_/g, " ")}
                </span>
              </div>
            </div>
          </div>

          {/* Bandeau priorité haute */}
          {isHaute && (
            <div className={`mb-5 rounded-xl px-6 py-3 text-center ${bt.priorite === "URGENTE" ? "bg-red-600 text-white" : "bg-orange-500 text-white"}`}>
              <p className="text-xl font-black tracking-widest">
                ⚠ INTERVENTION {bt.priorite} — TRAITEMENT IMMÉDIAT REQUIS
              </p>
            </div>
          )}

          {/* Bloc info 2 colonnes */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Titre</p>
                <p className="text-sm font-semibold text-[#1E2F6E]">{bt.titre}</p>
              </div>
              {bt.description && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Description</p>
                  <p className="text-xs text-slate-700">{bt.description}</p>
                </div>
              )}
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Chantier</p>
                <p className="text-sm font-semibold text-slate-700">{bt.chantier?.nom ?? "—"}</p>
                {bt.chantier?.reference && <p className="text-xs text-slate-500">{bt.chantier.reference}</p>}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Corps d'état / Lieu</p>
                <p className="text-sm text-slate-700">
                  {bt.corpsEtat ?? "—"}
                  {bt.lieu && ` — ${bt.lieu}`}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Chef d'équipe</p>
                <p className="text-sm font-semibold text-slate-700">{bt.chefEquipe ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Dates</p>
                <p className="text-sm text-slate-700">
                  {formatDate(bt.dateDebut)} → {formatDate(bt.dateFin)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Heures</p>
                <p className="text-sm text-slate-700">
                  {bt.heureDebut ?? "—"} → {bt.heureFin ?? "—"}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Statut</p>
                <p className="text-sm text-slate-700">{bt.statut.replace(/_/g, " ")}</p>
              </div>
            </div>
          </div>

          {/* Tableau équipe */}
          {bt.equipe.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Équipe</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1B3F94] text-white">
                    <th className="px-2 py-1.5 text-left font-semibold">Nom</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Prénom</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Rôle</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Qualification</th>
                  </tr>
                </thead>
                <tbody>
                  {bt.equipe.map((e, i) => (
                    <tr key={e.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="px-2 py-1.5 font-medium text-slate-700">{e.nom}</td>
                      <td className="px-2 py-1.5 text-slate-600">{e.prenom ?? "—"}</td>
                      <td className="px-2 py-1.5 text-slate-500">{e.role ?? "—"}</td>
                      <td className="px-2 py-1.5 text-slate-500">{e.qualif ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tableau tâches */}
          {bt.taches.length > 0 && (
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Tâches à réaliser</p>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#1B3F94] text-white">
                    <th className="px-2 py-1.5 text-left font-semibold w-6">#</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Description</th>
                    <th className="px-2 py-1.5 text-right font-semibold w-14">Qté</th>
                    <th className="px-2 py-1.5 text-center font-semibold w-10">U</th>
                    <th className="px-2 py-1.5 text-right font-semibold w-18">Durée est.</th>
                    <th className="px-2 py-1.5 text-center font-semibold w-20">Statut</th>
                    <th className="px-2 py-1.5 text-left font-semibold">Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {bt.taches.map((t, i) => (
                    <tr key={t.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="px-2 py-1.5 text-center text-slate-400">{t.ordre}</td>
                      <td className="px-2 py-1.5 text-slate-700">{t.description}</td>
                      <td className="px-2 py-1.5 text-right text-slate-600">{t.quantite?.toFixed(2) ?? "—"}</td>
                      <td className="px-2 py-1.5 text-center text-slate-500">{t.unite ?? "—"}</td>
                      <td className="px-2 py-1.5 text-right text-slate-600">{t.dureeEstimee != null ? `${t.dureeEstimee} h` : "—"}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                          t.statut === "TERMINE" ? "bg-green-100 text-green-700" :
                          t.statut === "EN_COURS" ? "bg-blue-100 text-blue-700" :
                          "bg-slate-100 text-slate-600"
                        }`}>
                          {t.statut.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-500">{t.observations ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Observations générales */}
          {bt.observations && (
            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Observations générales</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{bt.observations}</p>
            </div>
          )}

          {/* Signatures 2 colonnes */}
          <div className="mb-4 grid grid-cols-2 gap-6">
            {[
              { label: "Chef d'équipe", nom: bt.chefEquipe },
              { label: "Responsable travaux" },
            ].map(({ label, nom }) => (
              <div key={label} className="rounded-lg border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
                <p className="text-xs text-slate-600 mb-5">{nom ?? "____________________________"}</p>
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
