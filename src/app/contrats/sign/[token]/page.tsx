import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { TamponSDA } from "@/components/tampon-sda";
import SignaturePad from "./signature-pad";

export const dynamic = "force-dynamic";

function eur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export default async function ContratSignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const contrat = await prisma.contratSousTraitance.findUnique({
    where: { signatureToken: token },
    include: {
      sousTraitant: { select: { nom: true, email: true, telephone: true } },
      chantier: { select: { nom: true, adresse: true, codePostal: true, ville: true } },
    },
  });

  if (!contrat) notFound();

  const dejaSigne = !!contrat.dateSignature;
  const montantTTC = contrat.montantHT && contrat.tauxTVA ? contrat.montantHT * (1 + contrat.tauxTVA / 100) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Bandeau SDA */}
      <div className="bg-[#1E2F6E] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#F7941E] to-[#E6471D] flex items-center justify-center">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">SDA Rénovation</p>
            <p className="text-white/60 text-[10px]">Signature électronique de contrat de sous-traitance</p>
          </div>
        </div>
        <span className="text-white/60 text-xs font-mono hidden sm:block">{contrat.numero}</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">

        {/* Titre */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-[#1E2F6E]">Signature de contrat de sous-traitance</h1>
          <p className="text-[#F7941E] font-semibold mt-1">{contrat.numero}</p>
          {contrat.objet && <p className="text-slate-500 text-sm mt-1">{contrat.objet}</p>}
        </div>

        {/* Déjà signé */}
        {dejaSigne && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-5 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-emerald-700 font-bold text-lg">Contrat signé</p>
            <p className="text-emerald-600 text-sm mt-1">
              Signé par <span className="font-semibold">{contrat.signataireNom}</span>{" "}
              le{" "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(
                new Date(contrat.dateSignature!)
              )}
            </p>
          </div>
        )}

        {/* Récap contrat */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-[#1E2F6E]/5 px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-[#1E2F6E]">Récapitulatif</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Sous-traitant</p>
              <p className="font-semibold text-slate-700">{contrat.sousTraitant.nom}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Chantier</p>
              <p className="font-semibold text-slate-700">{contrat.chantier.nom}</p>
              {contrat.chantier.adresse && (
                <p className="text-xs text-slate-400">
                  {contrat.chantier.adresse} {contrat.chantier.codePostal} {contrat.chantier.ville}
                </p>
              )}
            </div>
            {contrat.lot && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Lot</p>
                <p className="text-slate-600">{contrat.lot}</p>
              </div>
            )}
            {contrat.delaiExecution && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Délai d&apos;exécution</p>
                <p className="text-slate-600">{contrat.delaiExecution}</p>
              </div>
            )}
            {contrat.retenueGarantie != null && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Retenue de garantie</p>
                <p className="text-slate-600">{contrat.retenueGarantie} %</p>
              </div>
            )}
            {contrat.modaliteReglement && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Règlement</p>
                <p className="text-slate-600">{contrat.modaliteReglement}</p>
              </div>
            )}
          </div>
          {/* Total */}
          {montantTTC != null && (
            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50">
              <span className="text-sm text-slate-500">Montant TTC</span>
              <span className="text-xl font-black text-[#1E2F6E]">{eur(montantTTC)}</span>
            </div>
          )}
        </div>

        {/* Mentions légales */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs text-amber-700 leading-relaxed">
          <p className="font-bold mb-1">Conditions</p>
          <p>
            En signant ce contrat, vous acceptez les clauses juridiques et conditions d&apos;exécution décrites
            ci-dessus en qualité de sous-traitant. Conformément à l&apos;article 1367 du Code civil, cette
            signature électronique a la même valeur qu&apos;une signature manuscrite.
          </p>
          {contrat.penalitesRetard && (
            <p className="mt-1">Pénalités de retard : {contrat.penalitesRetard}.</p>
          )}
          {contrat.assuranceRC && (
            <p className="mt-1">Assurance RC : {contrat.assuranceRC}.</p>
          )}
        </div>

        {/* Zone de signature */}
        {!dejaSigne && (
          <SignaturePad token={token} contratNumero={contrat.numero} />
        )}

        {/* Tampon SDA */}
        <div className="flex justify-center pt-2">
          <TamponSDA />
        </div>

        {/* Pied de page */}
        <p className="text-center text-[11px] text-slate-400">
          {COMPANY.nom} · {COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville} ·{" "}
          SIRET {COMPANY.siret} · TVA {COMPANY.tvaIntracommunautaire}
        </p>
      </div>
    </div>
  );
}
