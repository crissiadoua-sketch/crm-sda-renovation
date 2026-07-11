import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

type AvisCode = "VISA_SANS_OBS" | "VISA_AVEC_OBS" | "SUSPENDU" | null;

function avisLabel(avis: AvisCode) {
  switch (avis) {
    case "VISA_SANS_OBS":
      return { label: "VISA SANS OBSERVATION", color: "text-green-700" };
    case "VISA_AVEC_OBS":
      return { label: "VISA AVEC OBSERVATION", color: "text-orange-700" };
    case "SUSPENDU":
      return { label: "SUSPENDU", color: "text-red-700" };
    default:
      return { label: "En attente", color: "text-slate-400" };
  }
}

export default async function ApercuAgrementProduitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fap = await prisma.ficheAgrementProduit.findUnique({
    where: { id },
    include: {
      chantier: true,
      devis: true,
    },
  });

  if (!fap) notFound();

  const avisMO = avisLabel(fap.avisMO as AvisCode);
  const avisMOE = avisLabel(fap.avisMOE as AvisCode);
  const avisBC = avisLabel(fap.avisBC as AvisCode);

  return (
    <>
      <PrintToolbar label={`Agrément Produit — ${fap.numero}`} />

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
              <p className="text-2xl font-black text-[#1E2F6E]">FICHE D&apos;AGRÉMENT PRODUIT</p>
              <p className="mt-1 text-base font-bold text-slate-700">{fap.numero}</p>
              <p className="text-xs text-slate-500">Modèle : {fap.modele}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                fap.statut === "VISA_SANS_OBS" ? "bg-green-100 text-green-700" :
                fap.statut === "VISA_AVEC_OBS" ? "bg-orange-100 text-orange-700" :
                fap.statut === "SUSPENDU" ? "bg-red-100 text-red-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {fap.statut.replace(/_/g, " ")}
              </span>
            </div>
          </div>

          {/* En-tête opération */}
          <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Identification de l'opération</p>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Opération</p>
                <p className="font-medium text-slate-700">{fap.operation ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Lot</p>
                <p className="font-medium text-slate-700">{fap.lot ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Zone / Niveau</p>
                <p className="font-medium text-slate-700">
                  {fap.zone ?? "—"} / {fap.niveau ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Chantier</p>
                <p className="font-medium text-[#1E2F6E]">{fap.chantier?.nom ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Émetteur</p>
                <p className="font-medium text-slate-700">{fap.emetteurNom ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Date</p>
                <p className="font-medium text-slate-700">{formatDate(fap.emetteurDate)}</p>
              </div>
            </div>
          </div>

          {/* Section Produit proposé */}
          <div className="mb-5 rounded-lg border-2 border-[#1E2F6E] px-4 py-3">
            <p className="text-xs font-black uppercase tracking-wide text-[#1E2F6E] mb-3">Produit proposé</p>
            <div className="grid grid-cols-2 gap-3 text-xs mb-3">
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Marque</p>
                <p className="font-semibold text-slate-700">{fap.marque ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Type / Modèle</p>
                <p className="font-semibold text-slate-700">{fap.typeModele ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Description / Coloris</p>
                <p className="text-slate-700">{fap.descriptionColoris ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 mb-0.5">Localisation</p>
                <p className="text-slate-700">{fap.localisation ?? "—"}</p>
              </div>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">Documentation jointe</p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "ficheTechnique", label: "Fiche technique", val: fap.ficheTechnique },
                { key: "avisCSTB", label: "Avis CSTB", val: fap.avisCSTB },
                { key: "fds", label: "FDS", val: fap.fds },
                { key: "pvFeu", label: "PV Feu", val: fap.pvFeu },
                { key: "pvAcoustique", label: "PV Acoustique", val: fap.pvAcoustique },
                { key: "documentationJointe", label: "Documentation jointe", val: fap.documentationJointe },
              ].map(({ key, label, val }) => (
                <span key={key} className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${val ? "bg-green-50 text-green-700 border-green-200" : "bg-slate-50 text-slate-400 border-slate-200"}`}>
                  {val ? "✓" : "○"} {label}
                </span>
              ))}
            </div>
            {fap.autresDocuments && (
              <p className="mt-2 text-xs text-slate-600">Autres : {fap.autresDocuments}</p>
            )}
          </div>

          {/* Cadre Avis 3 colonnes */}
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-wide text-[#1E2F6E] mb-2">Avis</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  titre: "Maître d'ouvrage",
                  avisInfo: avisMO,
                  observations: fap.observationsMO,
                  nom: fap.nomMO,
                  prenom: fap.prenomMO,
                  date: fap.dateMO,
                },
                {
                  titre: "Maître d'œuvre",
                  avisInfo: avisMOE,
                  observations: fap.observationsMOE,
                  nom: fap.nomMOE,
                  prenom: fap.prenomMOE,
                  date: fap.dateMOE,
                },
                {
                  titre: "Bureau de contrôle",
                  avisInfo: avisBC,
                  observations: fap.observationsBC,
                  nom: fap.nomBC,
                  prenom: fap.prenomBC,
                  date: fap.dateBC,
                },
              ].map(({ titre, avisInfo, observations, nom, prenom, date }) => (
                <div key={titre} className="rounded-lg border-2 border-slate-200 px-3 py-3">
                  <p className="text-xs font-bold text-[#1E2F6E] mb-2 border-b border-slate-100 pb-1">{titre}</p>
                  <p className={`text-xs font-semibold mb-1 ${avisInfo.color}`}>
                    ✓ {avisInfo.label}
                  </p>
                  {observations && (
                    <p className="text-[10px] text-slate-500 mb-2">{observations}</p>
                  )}
                  <p className="text-[10px] text-slate-400">Nom : {nom ?? "________________"}</p>
                  <p className="text-[10px] text-slate-400">Prénom : {prenom ?? "________________"}</p>
                  <div className="mt-2 h-8 border-b border-dashed border-slate-300" />
                  <p className="mt-1 text-[10px] text-slate-400">Signature</p>
                  <p className="text-[10px] text-slate-400">Date : {date ? formatDate(date) : "___________"}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Mention délai */}
          <div className="mb-4 rounded-lg border border-[#29ABE2]/30 bg-[#29ABE2]/5 px-4 py-2 text-center">
            <p className="text-xs text-slate-600 italic">
              À défaut de réponse sous 15 jours, ce produit sera mis en œuvre sur le chantier.
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
