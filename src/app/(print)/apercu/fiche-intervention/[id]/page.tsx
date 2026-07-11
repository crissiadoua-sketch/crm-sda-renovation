import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

const METEO_EMOJI: Record<string, string> = {
  BEAU: "☀️",
  NUAGEUX: "⛅",
  PLUVIEUX: "🌧️",
  VENTEUX: "💨",
  NEIGE: "❄️",
};

export default async function ApercuFicheInterventionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fi = await prisma.ficheIntervention.findUnique({
    where: { id },
    include: {
      chantier: true,
      client: true,
      equipiers: true,
      travaux: { orderBy: { ordre: "asc" } },
    },
  });

  if (!fi) notFound();

  const totalHeures = fi.equipiers.reduce((sum, e) => {
    if (e.heureDebut && e.heureFin) {
      const [hd, md] = e.heureDebut.split(":").map(Number);
      const [hf, mf] = e.heureFin.split(":").map(Number);
      const diff = (hf * 60 + mf) - (hd * 60 + md);
      if (diff > 0) return sum + diff / 60;
    }
    return sum;
  }, 0);

  return (
    <>
      <PrintToolbar label={`Fiche d'intervention — ${fi.numero}`} />

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
              <p className="text-2xl font-black text-[#1E2F6E]">FICHE D&apos;INTERVENTION</p>
              <p className="mt-1 text-base font-bold text-slate-700">{fi.numero}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                fi.statut === "SIGNE" ? "bg-green-100 text-green-700" :
                fi.statut === "VALIDE" ? "bg-blue-100 text-blue-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {fi.statut}
              </span>
            </div>
          </div>

          {/* Bloc identification 2 colonnes */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Date d&apos;intervention</p>
                <p className="text-sm text-slate-700">{formatDate(fi.dateIntervention)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Horaires</p>
                <p className="text-sm text-slate-700">{fi.heureDebut ?? "—"} → {fi.heureFin ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Responsable</p>
                <p className="text-sm text-slate-700">{fi.responsable ?? "—"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Chantier</p>
                <p className="text-sm font-semibold text-[#1E2F6E]">{fi.chantier?.nom ?? "—"}</p>
                {fi.chantier?.adresse && <p className="text-xs text-slate-500">{fi.chantier.adresse} {fi.chantier.ville}</p>}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Client</p>
                <p className="text-sm text-slate-700">{fi.client?.nom ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Météo</p>
                <p className="text-sm text-slate-700">
                  {fi.meteo ? `${METEO_EMOJI[fi.meteo] ?? ""} ${fi.meteo}` : "—"}
                  {fi.tempC != null ? ` · ${fi.tempC}°C` : ""}
                </p>
              </div>
            </div>
          </div>

          {/* Équipe */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1E2F6E] mb-2">
              Équipe sur site {totalHeures > 0 && <span className="text-slate-400 font-normal">— total {totalHeures.toFixed(1)} h</span>}
            </p>
            {fi.equipiers.length > 0 ? (
              <table className="w-full text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="text-left py-1.5 px-2 border-b border-slate-200">Nom</th>
                    <th className="text-left py-1.5 px-2 border-b border-slate-200">Prénom</th>
                    <th className="text-left py-1.5 px-2 border-b border-slate-200">Rôle</th>
                    <th className="text-left py-1.5 px-2 border-b border-slate-200">Début</th>
                    <th className="text-left py-1.5 px-2 border-b border-slate-200">Fin</th>
                  </tr>
                </thead>
                <tbody>
                  {fi.equipiers.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="py-1.5 px-2">{e.nom}</td>
                      <td className="py-1.5 px-2">{e.prenom ?? "—"}</td>
                      <td className="py-1.5 px-2">{e.role ?? "—"}</td>
                      <td className="py-1.5 px-2">{e.heureDebut ?? "—"}</td>
                      <td className="py-1.5 px-2">{e.heureFin ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-400">Aucun équipier renseigné.</p>
            )}
          </div>

          {/* Travaux réalisés */}
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#1E2F6E] mb-2">Travaux réalisés</p>
            {fi.travaux.length > 0 ? (
              <table className="w-full text-xs border border-slate-200">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                    <th className="text-left py-1.5 px-2 border-b border-slate-200 w-8">#</th>
                    <th className="text-left py-1.5 px-2 border-b border-slate-200">Description</th>
                    <th className="text-left py-1.5 px-2 border-b border-slate-200">Quantité</th>
                    <th className="text-left py-1.5 px-2 border-b border-slate-200">Avancement</th>
                  </tr>
                </thead>
                <tbody>
                  {fi.travaux.map((t) => (
                    <tr key={t.id} className="border-b border-slate-100" style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="py-1.5 px-2 text-slate-400">{t.ordre}</td>
                      <td className="py-1.5 px-2">{t.description}</td>
                      <td className="py-1.5 px-2">{t.quantite != null ? `${t.quantite} ${t.unite ?? ""}` : "—"}</td>
                      <td className="py-1.5 px-2 font-semibold text-[#1E2F6E]">{t.avancementPct != null ? `${t.avancementPct}%` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-400">Aucun travail renseigné.</p>
            )}
          </div>

          {/* Matériels utilisés */}
          {fi.materielsUtilises && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Matériels utilisés</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{fi.materielsUtilises}</p>
            </div>
          )}

          {/* Incidents */}
          {fi.incidents && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-600 mb-1">Incidents / Sécurité</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{fi.incidents}</p>
            </div>
          )}

          {/* Observations */}
          {fi.observations && (
            <div className="mb-5 rounded-lg border border-[#29ABE2]/40 bg-[#29ABE2]/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1E2F6E] mb-1">Observations générales</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{fi.observations}</p>
            </div>
          )}

          {/* Signature */}
          <div className="mb-5 grid grid-cols-2 gap-6">
            {["Responsable chantier", "Client / Donneur d'ordre"].map((label) => (
              <div key={label} className="rounded-lg border border-slate-200 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</p>
                <p className="text-[10px] text-slate-400 mb-6">Nom & Prénom : ____________________________</p>
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
