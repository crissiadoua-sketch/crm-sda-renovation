import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { formatEuros, formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";
import { CORPS_ETAT_LABELS, type CorpsEtatCode } from "@/lib/corps-etat";

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", ENVOYE: "Envoyé", SIGNE: "Signé",
  TERMINE: "Terminé", RESILIE: "Résilié", ANNULE: "Annulé",
};

export default async function ApercuContratSousTraitancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [contrat, parametres] = await Promise.all([
    prisma.contratSousTraitance.findUnique({
      where: { id },
      include: {
        sousTraitant: true,
        chantier: true,
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!contrat) notFound();

  const montantHT = contrat.montantHT ?? 0;
  const tauxTVA = contrat.tauxTVA ?? 10;
  const montantTVA = montantHT * (tauxTVA / 100);
  const montantTTC = montantHT + montantTVA;
  const lotLabel = contrat.lot ? CORPS_ETAT_LABELS[contrat.lot as CorpsEtatCode] ?? contrat.lot : null;

  return (
    <>
      <PrintToolbar label={`Contrat de sous-traitance — ${contrat.numero}`} />

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
                <p>{COMPANY.email} · {COMPANY.site}</p>
                <p>SIREN {COMPANY.siren} · TVA {COMPANY.tvaIntracommunautaire}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1E2F6E]">CONTRAT DE SOUS-TRAITANCE</p>
              <p className="mt-1 text-base font-bold text-slate-700">{contrat.numero}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${
                contrat.statut === "SIGNE" ? "bg-green-100 text-green-700" :
                contrat.statut === "ENVOYE" ? "bg-blue-100 text-blue-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {STATUT_LABELS[contrat.statut] ?? contrat.statut}
              </span>
            </div>
          </div>

          {/* Parties */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Donneur d&apos;ordre</p>
              <p className="text-sm font-bold text-[#1E2F6E]">{COMPANY.nom}</p>
              <p className="text-xs text-slate-500">{COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Sous-traitant</p>
              <p className="text-sm font-bold text-[#1E2F6E]">{contrat.sousTraitant.nom}</p>
              {contrat.sousTraitant.adresse && <p className="text-xs text-slate-500">{contrat.sousTraitant.adresse}</p>}
              {contrat.sousTraitant.email && <p className="text-xs text-slate-500">{contrat.sousTraitant.email}</p>}
            </div>
          </div>

          {/* Chantier */}
          <div className="mb-5 rounded-lg border border-[#29ABE2]/40 bg-[#29ABE2]/5 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#1E2F6E] mb-1">Chantier</p>
            <p className="text-sm font-semibold text-slate-700">{contrat.chantier.nom}</p>
            {contrat.chantier.adresse && <p className="text-xs text-slate-500">{contrat.chantier.adresse}</p>}
          </div>

          {contrat.clausesPersonnalisees ? (
            /* Clauses juridiques personnalisées — texte fourni par l'utilisateur, reproduit tel quel */
            <div className="mb-5">
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-700">
                {contrat.clausesPersonnalisees}
              </p>
            </div>
          ) : (
          <>
          {/* Préambule */}
          <p className="mb-5 text-xs text-slate-600 leading-relaxed">
            Entre <strong>{COMPANY.nom}</strong>, ci-après dénommé « le Donneur d&apos;ordre », d&apos;une part,
            et <strong>{contrat.sousTraitant.nom}</strong>, ci-après dénommé « le Sous-traitant », d&apos;autre part,
            il est convenu ce qui suit pour l&apos;exécution des travaux décrits au présent contrat,
            dans le respect de la loi n° 75-1334 du 31 décembre 1975 relative à la sous-traitance.
          </p>

          {/* Article 1 — Objet */}
          <div className="mb-3.5">
            <p className="text-[13px] font-bold text-[#1E2F6E] mb-1">Article 1 — Objet du contrat</p>
            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
              Le Donneur d&apos;ordre confie au Sous-traitant, qui accepte, l&apos;exécution des travaux suivants&nbsp;:
              {contrat.objet ? ` ${contrat.objet}` : " (à préciser)"}
              {lotLabel ? ` — Lot : ${lotLabel}.` : "."}
              {" "}Les travaux sont réalisés sur le chantier « {contrat.chantier.nom} »
              {contrat.chantier.adresse ? `, situé ${contrat.chantier.adresse}` : ""}.
            </p>
          </div>

          {/* Article 2 — Pièces contractuelles */}
          <div className="mb-3.5">
            <p className="text-[13px] font-bold text-[#1E2F6E] mb-1">Article 2 — Pièces contractuelles</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              Le présent contrat est constitué, par ordre de priorité décroissante, des pièces suivantes&nbsp;: les présentes conditions particulières,
              le devis et/ou descriptif des travaux accepté par les parties, les plans et documents techniques remis au Sous-traitant,
              et les conditions générales annexées au présent contrat.
            </p>
          </div>

          {/* Article 3 — Délai d'exécution */}
          <div className="mb-3.5">
            <p className="text-[13px] font-bold text-[#1E2F6E] mb-1">Article 3 — Délai d&apos;exécution</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              Les travaux devront être exécutés dans un délai de {contrat.delaiExecution ?? "—"},
              {" "}du {formatDate(contrat.dateDebut)} au {formatDate(contrat.dateFin)}.
              Le Sous-traitant s&apos;engage à respecter le planning général du chantier communiqué par le Donneur d&apos;ordre
              et à signaler sans délai toute difficulté susceptible d&apos;affecter ce calendrier.
            </p>
          </div>

          {/* Article 4 — Prix */}
          <div className="mb-3.5">
            <p className="text-[13px] font-bold text-[#1E2F6E] mb-1">Article 4 — Prix</p>
            <p className="text-xs text-slate-700 leading-relaxed mb-2">
              Les travaux décrits à l&apos;Article 1 sont confiés au Sous-traitant pour un montant forfaitaire de{" "}
              <strong>{formatEuros(montantHT)} HT</strong>, soit <strong>{formatEuros(montantTTC)} TTC</strong>{" "}
              (TVA au taux de {tauxTVA}%, soit {formatEuros(montantTVA)}). Ce prix est ferme et non révisable, sauf travaux supplémentaires
              expressément commandés par écrit par le Donneur d&apos;ordre et faisant l&apos;objet d&apos;un avenant.
            </p>
          </div>

          {/* Article 5 — Modalités de règlement et retenue de garantie */}
          <div className="mb-3.5">
            <p className="text-[13px] font-bold text-[#1E2F6E] mb-1">Article 5 — Modalités de règlement et retenue de garantie</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              Le règlement s&apos;effectuera selon les modalités suivantes&nbsp;: {contrat.modaliteReglement ?? "à réception de facture"}.
              {contrat.retenueGarantie ? (
                <> Une retenue de garantie de <strong>{contrat.retenueGarantie}%</strong> du montant TTC des travaux sera appliquée
                sur chaque règlement, conformément à la loi n° 71-584 du 16 juillet 1971, et restituée dans un délai d&apos;un an
                à compter de la réception des travaux, déduction faite, le cas échéant, des sommes restant dues par le Sous-traitant.</>
              ) : " Aucune retenue de garantie n'est appliquée au présent contrat."}
            </p>
          </div>

          {/* Article 6 — Pénalités de retard */}
          <div className="mb-3.5">
            <p className="text-[13px] font-bold text-[#1E2F6E] mb-1">Article 6 — Pénalités de retard</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              {contrat.penalitesRetard
                ? `En cas de retard imputable au Sous-traitant et non justifié par un cas de force majeure ou un fait du Donneur d'ordre, il sera appliqué une pénalité de ${contrat.penalitesRetard}, sans préjudice de tout dommage causé au Donneur d'ordre du fait de ce retard.`
                : "En cas de retard imputable au Sous-traitant et non justifié, le Donneur d'ordre se réserve le droit d'appliquer une pénalité proportionnée au préjudice subi, sans préjudice de toute autre voie de recours."}
            </p>
          </div>

          {/* Article 7 — Assurances et obligations réglementaires */}
          <div className="mb-3.5">
            <p className="text-[13px] font-bold text-[#1E2F6E] mb-1">Article 7 — Assurances et obligations réglementaires</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              Le Sous-traitant déclare être titulaire d&apos;une assurance de responsabilité civile professionnelle et, le cas échéant,
              d&apos;une assurance décennale couvrant les travaux objet du présent contrat
              {contrat.assuranceRC ? ` (${contrat.assuranceRC})` : ""}, et s&apos;engage à en justifier à première demande du Donneur d&apos;ordre.
              Il s&apos;engage également à respecter l&apos;ensemble des règles d&apos;hygiène, de sécurité et de protection de la santé applicables
              sur le chantier, ainsi que ses obligations sociales et fiscales (déclaration d&apos;activité, attestations de vigilance,
              lutte contre le travail dissimulé — art. L. 8222-1 du Code du travail).
            </p>
          </div>

          {/* Article 8 — Résiliation */}
          <div className="mb-3.5">
            <p className="text-[13px] font-bold text-[#1E2F6E] mb-1">Article 8 — Résiliation</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              En cas de manquement par l&apos;une des parties à l&apos;une de ses obligations contractuelles, non réparé dans un délai
              de quinze (15) jours après mise en demeure adressée par lettre recommandée avec accusé de réception restée sans effet,
              le présent contrat pourra être résilié de plein droit par la partie la plus diligente, sans préjudice de tous dommages
              et intérêts qui pourraient être réclamés à la partie défaillante.
            </p>
          </div>

          {/* Article 9 — Litiges */}
          <div className="mb-5">
            <p className="text-[13px] font-bold text-[#1E2F6E] mb-1">Article 9 — Litiges et juridiction compétente</p>
            <p className="text-xs text-slate-700 leading-relaxed">
              Le présent contrat est soumis au droit français. À défaut de résolution amiable, tout litige relatif à sa formation,
              son exécution ou son interprétation sera soumis à la juridiction compétente du siège social du Donneur d&apos;ordre.
            </p>
          </div>
          </>
          )}

          {/* Signatures */}
          <div className="mb-5 grid grid-cols-2 gap-6">
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Pour {COMPANY.nom}</p>
              <p className="text-[10px] text-slate-400 mb-6">Nom & qualité : ____________________________</p>
              <p className="text-[10px] text-slate-400 mb-1">Signature :</p>
              <div className="h-12 border-b border-dashed border-slate-300" />
              <p className="mt-1 text-[10px] text-slate-400">Date : ___________________</p>
            </div>
            <div className="rounded-lg border border-slate-200 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">Pour le sous-traitant</p>
              {contrat.signataireNom && contrat.dateSignature ? (
                <p className="text-xs text-emerald-600 font-medium">✅ Signé par {contrat.signataireNom} le {formatDate(contrat.dateSignature)}</p>
              ) : (
                <>
                  <p className="text-[10px] text-slate-400 mb-6">Nom & qualité : ____________________________</p>
                  <p className="text-[10px] text-slate-400 mb-1">Signature :</p>
                  <div className="h-12 border-b border-dashed border-slate-300" />
                  <p className="mt-1 text-[10px] text-slate-400">Date : ___________________</p>
                </>
              )}
            </div>
          </div>

          {/* Pied de page */}
          <div className="border-t border-slate-200 pt-4 text-center">
            <p className="text-[10px] text-slate-400">{COMPANY_LEGAL}</p>
          </div>
        </div>
      </div>

      {/* Annexe — Conditions générales */}
      {parametres?.conditionsDevis && (
        <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none print:break-before-page">
          <div className="px-12 py-10 print:px-10 print:py-8">
            <p className="mb-4 text-lg font-black text-[#1E2F6E]">ANNEXE — CONDITIONS GÉNÉRALES</p>
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">
              {parametres.conditionsDevis}
            </p>
          </div>
        </div>
      )}

      <style>{`@media print { @page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }`}</style>
    </>
  );
}
