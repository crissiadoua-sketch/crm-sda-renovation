import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { TamponSDA } from "@/components/tampon-sda";
import SignaturePad from "./signature-pad";

export const dynamic = "force-dynamic";

function eur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const devis = await prisma.devis.findUnique({
    where: { signatureToken: token },
    include: {
      chantier: { select: { nom: true, adresse: true, codePostal: true, ville: true } },
      client: { select: { nom: true, prenom: true, raisonSociale: true, email: true, telephone: true } },
      signature: { select: { nomSignataire: true, dateSignature: true } },
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!devis) notFound();

  const clientNom = devis.client?.raisonSociale ?? `${devis.client?.prenom ?? ""} ${devis.client?.nom ?? ""}`.trim();
  const dejaSigne = !!devis.signature;

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
            <p className="text-white/60 text-[10px]">Signature électronique de devis</p>
          </div>
        </div>
        <span className="text-white/60 text-xs font-mono hidden sm:block">{devis.numero}</span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10 flex flex-col gap-6">

        {/* Titre */}
        <div className="text-center">
          <h1 className="text-2xl font-black text-[#1E2F6E]">Signature de devis</h1>
          <p className="text-[#F7941E] font-semibold mt-1">{devis.numero}</p>
          {devis.objet && <p className="text-slate-500 text-sm mt-1">{devis.objet}</p>}
        </div>

        {/* Déjà signé */}
        {dejaSigne && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-5 text-center">
            <p className="text-3xl mb-2">✅</p>
            <p className="text-emerald-700 font-bold text-lg">Devis signé</p>
            <p className="text-emerald-600 text-sm mt-1">
              Signé par <span className="font-semibold">{devis.signature!.nomSignataire}</span>{" "}
              le{" "}
              {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(
                new Date(devis.signature!.dateSignature)
              )}
            </p>
          </div>
        )}

        {/* Récap devis */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-[#1E2F6E]/5 px-5 py-3 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-widest text-[#1E2F6E]">Récapitulatif</p>
          </div>
          <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Client</p>
              <p className="font-semibold text-slate-700">{clientNom || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Chantier</p>
              <p className="font-semibold text-slate-700">{devis.chantier?.nom ?? "—"}</p>
              {devis.chantier?.adresse && (
                <p className="text-xs text-slate-400">
                  {devis.chantier.adresse} {devis.chantier.codePostal} {devis.chantier.ville}
                </p>
              )}
            </div>
            {devis.delaiExecution && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Délai</p>
                <p className="text-slate-600">{devis.delaiExecution}</p>
              </div>
            )}
            {devis.modaliteReglement && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Règlement</p>
                <p className="text-slate-600">{devis.modaliteReglement}</p>
              </div>
            )}
          </div>
          {/* Totaux */}
          {devis.totalTTC != null && devis.totalTTC > 0 && (
            <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50">
              <span className="text-sm text-slate-500">Total TTC</span>
              <span className="text-xl font-black text-[#1E2F6E]">{eur(devis.totalTTC)}</span>
            </div>
          )}
        </div>

        {/* Lignes (aperçu) */}
        {devis.lignes.length > 0 && (
          <details className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <summary className="flex items-center justify-between px-5 py-3 cursor-pointer bg-[#1E2F6E]/5 border-b border-slate-100 hover:bg-[#1E2F6E]/10 transition">
              <p className="text-xs font-bold uppercase tracking-widest text-[#1E2F6E]">
                Détail du métré ({devis.lignes.filter((l) => l.type === "LIGNE").length} postes)
              </p>
              <span className="text-slate-400 text-xs">Voir ▾</span>
            </summary>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-3 py-2 text-left font-semibold text-slate-500">Désignation</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-500">Qté</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-500">PU HT</th>
                    <th className="px-3 py-2 text-right font-semibold text-slate-500">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {devis.lignes.map((l) => (
                    <tr
                      key={l.id}
                      className={
                        l.type === "CHAPITRE"
                          ? "bg-[#1E2F6E]/5 font-bold text-[#1E2F6E]"
                          : l.type === "SOUS_CHAPITRE"
                          ? "bg-slate-50/60 font-semibold text-slate-600 italic"
                          : ""
                      }
                    >
                      <td className="px-3 py-1.5" style={{ paddingLeft: l.type === "LIGNE" ? 24 : l.type === "SOUS_CHAPITRE" ? 16 : 12 }}>
                        {l.designation}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-500">
                        {l.quantite != null ? `${l.quantite} ${l.unite ?? ""}` : ""}
                      </td>
                      <td className="px-3 py-1.5 text-right text-slate-500">
                        {l.prixUnitaireHT != null ? eur(l.prixUnitaireHT) : ""}
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold">
                        {l.totalHT != null ? eur(l.totalHT) : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        {/* Mentions légales */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs text-amber-700 leading-relaxed">
          <p className="font-bold mb-1">Conditions</p>
          <p>
            En signant ce devis, vous acceptez les conditions générales de vente de SDA Rénovation et
            confirmez la commande des travaux décrits ci-dessus. Ce devis est valable{" "}
            {devis.dateValidite
              ? `jusqu'au ${new Intl.DateTimeFormat("fr-FR").format(new Date(devis.dateValidite))}`
              : "3 mois à compter de sa date d'émission"}
            . Conformément à l'article 1367 du Code civil, cette signature électronique a la même valeur
            qu'une signature manuscrite.
          </p>
          {devis.modaliteReglement && (
            <p className="mt-1">Modalités de règlement : {devis.modaliteReglement}.</p>
          )}
        </div>

        {/* Zone de signature */}
        {!dejaSigne && (
          <SignaturePad token={token} devisNumero={devis.numero} />
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
