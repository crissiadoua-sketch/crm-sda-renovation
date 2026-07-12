import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApercuEtatReservesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [etat, parametres] = await Promise.all([
    prisma.etatReserves.findUnique({
      where: { id },
      include: { chantier: { select: { nom: true, reference: true } }, client: true },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!etat) notFound();

  const villeSociete = [parametres?.codePostal, parametres?.ville].filter(Boolean).join(" ");
  const clientNom = etat.client
    ? etat.client.type === "ENTREPRISE"
      ? etat.client.raisonSociale ?? etat.client.nom
      : `${etat.client.prenom ?? ""} ${etat.client.nom}`.trim()
    : null;

  const STATUT_LABELS: Record<string, string> = { EN_COURS: "En cours", SIGNE: "Signé", LEVE: "Réserves levées" };

  return (
    <>
      <PrintToolbar label={`État des réserves — ${etat.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-7 print:py-4 text-sm">

          {/* En-tête */}
          <div className="flex items-start justify-between border-b-[3px] border-[#F7941E] pb-5 mb-6">
            <div>
              <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain mb-2" />
              <div className="text-xs text-slate-500 space-y-0.5">
                <p>{parametres?.adresse ?? COMPANY.adresse} — {villeSociete || `${COMPANY.codePostal} ${COMPANY.ville}`}</p>
                <p>{parametres?.telephone ?? COMPANY.telephone} · {parametres?.email ?? COMPANY.email}</p>
                {parametres?.siret && <p>Siren : {parametres.siret} · TVA : {parametres.tvaIntracom}</p>}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-[#1E2F6E]">ÉTAT DES RÉSERVES</p>
              <p className="mt-1 font-mono font-semibold text-slate-600">{etat.numero}</p>
              <p className="text-xs text-slate-500">{STATUT_LABELS[etat.statut] ?? etat.statut}</p>
              {etat.chantier && (
                <p className="mt-1 text-xs text-slate-500">{etat.chantier.reference} — {etat.chantier.nom}</p>
              )}
            </div>
          </div>

          {/* Nature des réserves */}
          <div className="mb-5">
            <p className="mb-2 font-semibold text-slate-700">Nature des réserves :</p>
            <div className="min-h-24 whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              {etat.natureReserves || <span className="italic text-slate-300">Non renseigné</span>}
            </div>
          </div>

          {/* Travaux à exécuter */}
          <div className="mb-5">
            <p className="mb-2 font-semibold text-slate-700">Travaux à exécuter :</p>
            <div className="min-h-24 whitespace-pre-wrap rounded border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
              {etat.travauxAExecuter || <span className="italic text-slate-300">Non renseigné</span>}
            </div>
          </div>

          {/* Délai */}
          {etat.delaiExecution && (
            <p className="mb-4 text-slate-600">
              L&apos;entreprise et le maître d&apos;ouvrage conviennent que les travaux nécessités par les
              réserves ci-dessus seront exécutés dans un délai global de{" "}
              <strong>{etat.delaiExecution}</strong> à compter de ce jour.
            </p>
          )}

          {/* Fait à / exemplaires */}
          <div className="mb-6 text-slate-600">
            <p>Fait à <strong>{etat.lieuSignature || "……………………"}</strong> le <strong>{formatDate(etat.dateDocument)}</strong></p>
            <p>En {etat.nombreExemplaires} exemplaires, dont un est remis à chacune des parties.</p>
          </div>

          {/* Signatures */}
          <div className="mb-10 grid grid-cols-3 gap-6">
            {["Signature de l'entreprise", "Signature du maître d'ouvrage", "Signature Locataire"].map((label) => (
              <div key={label}>
                <p className="mb-12 font-medium text-slate-600">{label} :</p>
                <div className="border-b border-slate-300" />
              </div>
            ))}
          </div>

          {/* Constat de levée */}
          {(etat.statut === "SIGNE" || etat.statut === "LEVE") && (
            <>
              <hr className="my-8 border-slate-200" />
              <p className="mb-4 text-center text-base font-bold uppercase tracking-wider text-[#1E2F6E]">
                Constat de levée de réserves
              </p>
              <p className="mb-4 text-slate-600">
                Le maître d&apos;ouvrage{clientNom ? ` ${clientNom}` : ""} lève les réserves, après avoir constaté
                que l&apos;entreprise exécutante a valablement remédié aux malfaçons, omissions et imperfections
                ci-dessus énoncées.
              </p>
              {etat.dateLevee && (
                <div className="mb-6 text-slate-600">
                  <p>Fait à <strong>{etat.lieuLevee || "……………………"}</strong> le <strong>{formatDate(etat.dateLevee)}</strong></p>
                  <p>En {etat.nombreExemplaires} exemplaires, dont un est remis à chacune des parties.</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-6">
                {["Signature de l'entreprise", "Signature du maître d'ouvrage", "Signature Locataire"].map((label) => (
                  <div key={label}>
                    <p className="mb-12 font-medium text-slate-600">{label} :</p>
                    <div className="border-b border-slate-300" />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pied de page */}
          <div className="mt-8 border-t border-slate-100 pt-4 text-center text-[10px] text-slate-400">
            <p>{parametres?.adresse ?? COMPANY.adresse} · {villeSociete || `${COMPANY.codePostal} ${COMPANY.ville}`} · {parametres?.telephone ?? COMPANY.telephone}</p>
            {parametres?.siret && <p>Siren : {parametres.siret} · TVA : {parametres.tvaIntracom}</p>}
          </div>
        </div>
      </div>
    </>
  );
}
