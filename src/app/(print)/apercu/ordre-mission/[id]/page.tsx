import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApercuOrdreMissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [om, parametres] = await Promise.all([
    prisma.ordreMission.findUnique({
      where: { id },
      include: {
        sousTraitant: { select: { nom: true, email: true, telephone: true, specialite: true, adresse: true } },
        interimaire:  { select: { nom: true, prenom: true, telephone: true, corpsEtat: true, agence: true, qualification: true } },
        chantier:     { select: { nom: true, reference: true, adresse: true } },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!om) notFound();

  const villeSociete = [parametres?.codePostal, parametres?.ville].filter(Boolean).join(" ");
  const STATUT_LABELS: Record<string, string> = {
    BROUILLON: "Brouillon", ENVOYE: "Envoyé", EN_COURS: "En cours", TERMINE: "Terminé", ANNULE: "Annulé",
  };

  return (
    <>
      <PrintToolbar label={`Ordre de mission — ${om.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-7 print:py-4 text-sm">

          {/* En-tête */}
          <div className="flex items-start justify-between border-b-[3px] border-[#F7941E] pb-5 mb-6">
            <div>
              <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain mb-2" />
              <div className="text-xs text-slate-500 space-y-0.5">
                <p>{parametres?.adresse ?? COMPANY.adresse} — {villeSociete || `${COMPANY.codePostal} ${COMPANY.ville}`}</p>
                <p>{parametres?.telephone ?? COMPANY.telephone} · {parametres?.email ?? COMPANY.email}{parametres?.emailPersonnalise ? ` · ${parametres.emailPersonnalise}` : ""}</p>
                {parametres?.siret && <p>Siren : {parametres.siret} · TVA : {parametres.tvaIntracom}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1E2F6E]">ORDRE DE MISSION</p>
              <p className="mt-1 font-mono font-semibold text-slate-600">{om.numero}</p>
              <p className="text-xs text-slate-500">{STATUT_LABELS[om.statut] ?? om.statut}</p>
            </div>
          </div>

          {/* Parties */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Donneur d'ordre</p>
              <p className="font-semibold text-brand-navy">{parametres?.nomEntreprise ?? COMPANY.nom}</p>
              <p className="text-xs text-slate-500">{parametres?.adresse ?? COMPANY.adresse}</p>
              <p className="text-xs text-slate-500">{villeSociete || `${COMPANY.codePostal} ${COMPANY.ville}`}</p>
              {parametres?.siret && <p className="text-xs text-slate-500">Siren : {parametres.siret}</p>}
            </div>
            <div className="rounded border border-slate-200 bg-slate-50 p-4">
              {om.interimaire ? (
                <>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Intérimaire</p>
                  <p className="font-semibold text-brand-navy">{om.interimaire.prenom} {om.interimaire.nom}</p>
                  {om.interimaire.corpsEtat && <p className="text-xs text-[#F7941E]">{om.interimaire.corpsEtat} — {om.interimaire.qualification}</p>}
                  {om.interimaire.agence && <p className="text-xs font-medium text-slate-600">Agence : {om.interimaire.agence}</p>}
                  {om.interimaire.telephone && <p className="text-xs text-slate-500">{om.interimaire.telephone}</p>}
                  {om.interimaire.telephone && <p className="text-xs text-slate-500">{om.interimaire.telephone}</p>}
                </>
              ) : om.sousTraitant ? (
                <>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Sous-traitant</p>
                  <p className="font-semibold text-brand-navy">{om.sousTraitant.nom}</p>
                  {om.sousTraitant.specialite && <p className="text-xs text-[#F7941E]">{om.sousTraitant.specialite}</p>}
                  {om.sousTraitant.adresse && <p className="text-xs text-slate-500">{om.sousTraitant.adresse}</p>}
                  {om.sousTraitant.email && <p className="text-xs text-slate-500">{om.sousTraitant.email}</p>}
                  {om.sousTraitant.telephone && <p className="text-xs text-slate-500">{om.sousTraitant.telephone}</p>}
                </>
              ) : null}
            </div>
          </div>

          {/* Détails mission */}
          <div className="mb-5 rounded border border-slate-200 p-4">
            <p className="mb-3 font-semibold text-brand-navy">Détails de la mission</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-0.5">Titre</span>
                <span className="font-medium text-slate-700">{om.titre}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-0.5">Lieu</span>
                <span className="text-slate-600">{om.lieu || "—"}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-0.5">Date de début</span>
                <span className="text-slate-700">{formatDate(om.dateDebut)}</span>
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-0.5">Date de fin</span>
                <span className="text-slate-700">{om.dateFin ? formatDate(om.dateFin) : "—"}</span>
              </div>
              {om.chantier && (
                <div className="col-span-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-0.5">Chantier</span>
                  <span className="text-slate-700">{om.chantier.reference} — {om.chantier.nom}</span>
                  {om.chantier.adresse && <span className="text-slate-500"> · {om.chantier.adresse}</span>}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {om.description && (
            <div className="mb-5">
              <p className="mb-2 font-semibold text-slate-700">Description de la mission :</p>
              <div className="min-h-20 whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                {om.description}
              </div>
            </div>
          )}

          {/* Signatures */}
          <div className="mt-8 mb-6">
            <p className="mb-2 font-semibold text-slate-700">
              Fait à <span className="font-normal text-slate-500">……………………</span> le{" "}
              <strong>{formatDate(om.dateDebut)}</strong>
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            {[
              `Le donneur d'ordre\n${parametres?.nomEntreprise ?? COMPANY.nom}`,
              om.interimaire
                ? `L'intérimaire\n${om.interimaire.prenom} ${om.interimaire.nom}${om.interimaire.agence ? `\n${om.interimaire.agence}` : ""}`
                : `L'intervenant\n${om.sousTraitant?.nom ?? "—"}`,
            ].map((label) => (
              <div key={label}>
                <p className="mb-16 text-sm font-medium text-slate-600 whitespace-pre-line">{label}</p>
                <div className="border-b border-slate-300" />
                <p className="mt-1 text-xs text-slate-400">Signature</p>
              </div>
            ))}
          </div>

          {/* Pied */}
          <div className="mt-8 border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400">
            <p>{parametres?.adresse ?? COMPANY.adresse} · {villeSociete || `${COMPANY.codePostal} ${COMPANY.ville}`} · {parametres?.telephone ?? COMPANY.telephone}</p>
            {parametres?.siret && <p>Siren : {parametres.siret} · TVA : {parametres.tvaIntracom}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
