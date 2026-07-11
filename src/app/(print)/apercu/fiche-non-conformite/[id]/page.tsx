import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

function graviteConfig(gravite: string) {
  switch (gravite) {
    case "CRITIQUE":
      return { bg: "bg-red-600", text: "text-white", label: "CRITIQUE" };
    case "MAJEURE":
      return { bg: "bg-orange-500", text: "text-white", label: "MAJEURE" };
    default:
      return { bg: "bg-yellow-400", text: "text-yellow-900", label: "MINEURE" };
  }
}

export default async function ApercuFicheNonConformitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fnc = await prisma.ficheNonConformite.findUnique({
    where: { id },
    include: {
      chantier: true,
      client: true,
      fournisseur: true,
    },
  });

  if (!fnc) notFound();

  const grav = graviteConfig(fnc.gravite);

  return (
    <>
      <PrintToolbar label={`Fiche NC — ${fnc.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-12 py-10 print:px-10 print:py-8">

          {/* En-tête SDA */}
          <div className="flex items-start justify-between border-b-[3px] border-[#1E2F6E] pb-5 mb-5">
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
              <p className="text-2xl font-black text-[#1E2F6E]">FICHE DE NON-CONFORMITÉ</p>
              <p className="mt-1 text-base font-bold text-slate-700">{fnc.numero}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                fnc.statut === "CLOTUREE" ? "bg-green-100 text-green-700" :
                fnc.statut === "EN_COURS" ? "bg-blue-100 text-blue-700" :
                "bg-red-100 text-red-700"
              }`}>
                {fnc.statut.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* Bandeau gravité */}
          <div className={`mb-5 rounded-xl ${grav.bg} ${grav.text} px-6 py-4 text-center`}>
            <p className="text-3xl font-black tracking-widest">GRAVITÉ : {grav.label}</p>
          </div>

          {/* Bloc constat 2 colonnes */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Type de NC</p>
                <p className="text-sm font-semibold text-slate-700">{fnc.typeNC.replace(/_/g, " ")}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Date constat</p>
                <p className="text-sm text-slate-700">{formatDate(fnc.dateConstat)}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Constatée par</p>
                <p className="text-sm text-slate-700">{fnc.constateePar ?? "—"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Chantier</p>
                <p className="text-sm font-semibold text-[#1E2F6E]">{fnc.chantier?.nom ?? "—"}</p>
                {fnc.chantier?.reference && <p className="text-xs text-slate-500">{fnc.chantier.reference}</p>}
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Client</p>
                <p className="text-sm text-slate-700">{fnc.client?.nom ?? "—"}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">Fournisseur</p>
                <p className="text-sm text-slate-700">{fnc.fournisseur?.nom ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Description détaillée */}
          {fnc.description && (
            <div className="mb-4 rounded-lg border border-[#29ABE2]/40 bg-[#29ABE2]/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#1E2F6E] mb-1">Description détaillée</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{fnc.description}</p>
            </div>
          )}

          {/* Cause identifiée */}
          {fnc.causeIdentifiee && (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Cause identifiée</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap">{fnc.causeIdentifiee}</p>
            </div>
          )}

          {/* Action corrective */}
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Action corrective</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Action</p>
                <p className="text-xs text-slate-700">{fnc.actionCorrective ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Responsable</p>
                <p className="text-xs font-medium text-slate-700">{fnc.responsableAction ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Échéance</p>
                <p className="text-xs text-slate-700">{formatDate(fnc.dateEcheance)}</p>
              </div>
            </div>
          </div>

          {/* Vérification */}
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Vérification</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Date</p>
                <p className="text-xs text-slate-700">{formatDate(fnc.dateVerification)}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Vérifié par</p>
                <p className="text-xs font-medium text-slate-700">{fnc.verifiePar ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Résultat</p>
                <p className="text-xs text-slate-700">{fnc.resultatVerification ?? "—"}</p>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mb-5 grid grid-cols-2 gap-6">
            {[
              { label: "Responsable qualité" },
              { label: "Direction" },
            ].map(({ label }) => (
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
