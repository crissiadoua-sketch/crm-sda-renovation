import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE:    "Envoyé",
  CONFIRME:  "Confirmé",
  LIVRE:     "Livré",
  ANNULE:    "Annulé",
};

export default async function ApercuBonCommandeBetonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const bcb = await prisma.bonCommandeBeton.findUnique({
    where: { id },
    include: {
      fournisseur: true,
      chantier:    { select: { nom: true, adresse: true, reference: true } },
      livraisons:  { orderBy: { ordre: "asc" } },
    },
  });

  if (!bcb) notFound();

  const montantTotal = bcb.qteTotale * (bcb.prixM3 ?? 0);
  const tva20 = montantTotal * 0.2;
  const totalTTC = montantTotal + tva20;
  const totalLivraisons = bcb.livraisons.reduce((s, l) => s + l.quantiteM3, 0);

  return (
    <>
      <PrintToolbar label={`BC Béton ${bcb.numero} — Aperçu PDF`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-9 print:py-7">

          {/* ── En-tête société ──────────────────────────────────────────────── */}
          <div className="flex items-start justify-between border-b-[3px] border-[#F7941E] pb-5 mb-5">
            <div>
              {/* Logo SDA */}
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
              <p className="text-2xl font-black text-[#1E2F6E] uppercase tracking-tight">Bon de Commande</p>
              <p className="text-base font-bold text-[#F7941E] mt-0.5">BÉTON — NF EN 206 / CN</p>
              <p className="mt-1 text-lg font-bold text-slate-700 font-mono">{bcb.numero}</p>
              <p className="text-xs text-slate-500 mt-1">
                Date : {formatDate(bcb.createdAt)}
              </p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
                bcb.statut === "CONFIRME" ? "bg-blue-100 text-blue-700" :
                bcb.statut === "LIVRE"    ? "bg-green-100 text-green-700" :
                bcb.statut === "ANNULE"   ? "bg-red-100 text-red-700" :
                bcb.statut === "ENVOYE"   ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {STATUT_LABELS[bcb.statut] ?? bcb.statut}
              </span>
            </div>
          </div>

          {/* ── Centrale béton + Chantier ────────────────────────────────────── */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Centrale à béton</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="font-bold text-[#1E2F6E] text-sm">{bcb.fournisseur.nom}</p>
                {bcb.fournisseur.adresse && (
                  <p className="text-xs text-slate-500 mt-0.5">{bcb.fournisseur.adresse}</p>
                )}
                {(bcb.fournisseur.codePostal || bcb.fournisseur.ville) && (
                  <p className="text-xs text-slate-500">
                    {bcb.fournisseur.codePostal} {bcb.fournisseur.ville}
                  </p>
                )}
                {bcb.fournisseur.telephone && (
                  <p className="text-xs text-slate-500 mt-0.5">Tél. {bcb.fournisseur.telephone}</p>
                )}
                {bcb.fournisseur.email && (
                  <p className="text-xs text-slate-500">{bcb.fournisseur.email}</p>
                )}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Chantier destinataire</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="font-bold text-[#1E2F6E] text-sm">
                  {bcb.nomChantier ?? bcb.chantier?.nom ?? "—"}
                </p>
                {bcb.adresseChantier && (
                  <p className="text-xs text-slate-500 mt-0.5">{bcb.adresseChantier}</p>
                )}
                {!bcb.adresseChantier && bcb.chantier?.adresse && (
                  <p className="text-xs text-slate-500 mt-0.5">{bcb.chantier.adresse}</p>
                )}
                {bcb.refAnalytique && (
                  <p className="text-xs text-slate-400 mt-0.5">Réf. : {bcb.refAnalytique}</p>
                )}
                {bcb.modeReglement && (
                  <p className="text-xs text-slate-500 mt-0.5">Règlement : {bcb.modeReglement}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Spécifications béton NF EN 206 ──────────────────────────────── */}
          <div className="mb-5">
            <div className="rounded-t-lg bg-[#FFA726] px-4 py-2 flex items-center gap-2">
              <span className="text-white font-bold text-xs uppercase tracking-widest">
                Spécifications du béton — NF EN 206 / CN
              </span>
            </div>
            <div className="rounded-b-lg border border-[#1E2F6E]/20 overflow-hidden">

              {/* Désignation normalisée en bandeau */}
              {(bcb.classeResistance || bcb.classeExposition || bcb.consistance) && (
                <div className="bg-[#1E2F6E]/5 border-b border-[#1E2F6E]/20 px-4 py-2 flex flex-wrap items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Désignation :</span>
                  <span className="font-mono text-sm font-bold text-[#1E2F6E]">
                    {[
                      bcb.classeResistance,
                      bcb.classeExposition,
                      bcb.consistance,
                      bcb.dmax != null ? `D${bcb.dmax}` : null,
                      bcb.chlorures,
                    ].filter(Boolean).join(" / ")}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 divide-x divide-[#1E2F6E]/10">
                {/* Colonne gauche */}
                <div className="divide-y divide-slate-100">
                  <SpecRow label="Classe de résistance" value={bcb.classeResistance} />
                  <SpecRow label="Classe d'exposition" value={bcb.classeExposition} />
                  <SpecRow label="Consistance" value={bcb.consistance} />
                  <SpecRow label="Affaissement cible"
                    value={bcb.affaissement != null ? `${bcb.affaissement} mm` : null} />
                  <SpecRow label="Dmax granulats"
                    value={bcb.dmax != null ? `${bcb.dmax} mm` : null} />
                </div>
                {/* Colonne droite */}
                <div className="divide-y divide-slate-100">
                  <SpecRow label="Type de ciment" value={bcb.typeCiment} />
                  <SpecRow label="Rapport E/C max"
                    value={bcb.rapportEauCiment != null ? bcb.rapportEauCiment.toString() : null} />
                  <SpecRow label="Teneur min. ciment"
                    value={bcb.teneurCimentMin != null ? `${bcb.teneurCimentMin} kg/m³` : null} />
                  <SpecRow label="Adjuvant(s)" value={bcb.adjuvant} />
                  <SpecRow label="Teneur chlorures" value={bcb.chlorures} />
                </div>
              </div>

              {/* Options techniques */}
              <div className="border-t border-[#1E2F6E]/10 px-4 py-2.5 flex flex-wrap gap-4">
                <OptionTag active={bcb.betonPompe} label="Béton pompé" />
                <OptionTag active={bcb.essaisBeton} label="Essais béton (NF EN 206 §8)" />
                <OptionTag active={bcb.modeMiseEnOeuvre !== null} label={`Mise en œuvre : ${bcb.modeMiseEnOeuvre ?? "—"}`} neutral />
              </div>

              {/* Alerte NA.7.5 */}
              <div className={`border-t px-4 py-2.5 ${
                bcb.ajoutEau
                  ? "border-red-200 bg-red-50"
                  : "border-amber-200 bg-amber-50"
              }`}>
                {bcb.ajoutEau ? (
                  <p className="text-xs text-red-700 font-medium">
                    ⚠ <strong>Ajout d'eau autorisé</strong> sur ce chantier avec dérogation expresse (NA.7.5).
                    L'ajout d'eau doit rester dans les limites du rapport E/C de référence de la formulation.
                  </p>
                ) : (
                  <p className="text-xs text-amber-800">
                    <strong>NF EN 206/CN — NA.7.5 :</strong> Tout ajout d'eau sur le chantier après livraison
                    est <strong>INTERDIT</strong>, sauf s'il est inclus dans la formulation de référence et
                    n'en dépasse pas le rapport E/C. Mention rendue obligatoire par la norme française.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Commande ────────────────────────────────────────────────────── */}
          <div className="mb-5">
            <div className="rounded-t-lg bg-[#FFA726] px-4 py-2">
              <span className="text-white font-bold text-xs uppercase tracking-widest">Commande</span>
            </div>
            <div className="rounded-b-lg border border-[#1E2F6E]/20 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-2 text-left">Désignation</th>
                    <th className="px-4 py-2 text-center">Unité</th>
                    <th className="px-4 py-2 text-right">Quantité</th>
                    <th className="px-4 py-2 text-right">P.U. HT</th>
                    <th className="px-4 py-2 text-right">Montant HT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-slate-700">
                      Béton prêt à l'emploi{" "}
                      {bcb.classeResistance && (
                        <span className="font-bold text-[#1E2F6E]">{bcb.classeResistance}</span>
                      )}
                      {bcb.classeExposition && (
                        <span className="text-slate-500 text-xs ml-1">/{bcb.classeExposition}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">m³</td>
                    <td className="px-4 py-3 text-right font-bold text-[#1E2F6E] text-base">
                      {bcb.qteTotale.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {bcb.prixM3 != null
                        ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(bcb.prixM3)
                        : "À définir"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-[#1E2F6E]">
                      {bcb.prixM3 != null
                        ? new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(montantTotal)
                        : "—"}
                    </td>
                  </tr>
                  {bcb.betonPompe && (
                    <tr className="bg-slate-50/50">
                      <td className="px-4 py-2 text-xs text-slate-500" colSpan={2}>Pompage béton (prestation incluse)</td>
                      <td colSpan={3} className="px-4 py-2 text-right text-xs text-slate-400">Inclus</td>
                    </tr>
                  )}
                  {bcb.essaisBeton && (
                    <tr className="bg-slate-50/50">
                      <td className="px-4 py-2 text-xs text-slate-500" colSpan={2}>Essais de contrôle béton (NF EN 206 §8)</td>
                      <td colSpan={3} className="px-4 py-2 text-right text-xs text-slate-400">Inclus</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {bcb.prixM3 != null && (
                <div className="border-t border-slate-200 px-4 py-3">
                  <div className="ml-auto w-56 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Montant HT</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(montantTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">TVA 20 %</span>
                      <span className="font-medium">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(tva20)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t-2 border-[#F7941E] pt-1.5 mt-1">
                      <span className="font-bold text-[#1E2F6E]">TOTAL TTC</span>
                      <span className="font-bold text-[#1E2F6E]">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(totalTTC)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Planning de livraison ────────────────────────────────────────── */}
          {(bcb.dateLivraison != null || bcb.livraisons.length > 0) && (
            <div className="mb-5">
              <div className="rounded-t-lg bg-[#FFA726] px-4 py-2">
                <span className="text-white font-bold text-xs uppercase tracking-widest">Planning de livraison</span>
              </div>
              <div className="rounded-b-lg border border-[#1E2F6E]/20 overflow-hidden">

                {/* Livraison principale */}
                {bcb.dateLivraison != null && bcb.livraisons.length === 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y divide-slate-100 text-sm">
                    <PlanCell label="Date" value={formatDate(bcb.dateLivraison)} />
                    <PlanCell label="Heure début" value={bcb.heureDebut ?? "—"} />
                    <PlanCell label="Heure fin" value={bcb.heureFin ?? "—"} />
                    <PlanCell label="Cadence" value={bcb.cadenceM3h != null ? `${bcb.cadenceM3h} m³/h` : "—"} />
                  </div>
                )}

                {/* Tableau des rotations */}
                {bcb.livraisons.length > 0 && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        <th className="px-3 py-2 text-left">#</th>
                        <th className="px-3 py-2 text-left">Date</th>
                        <th className="px-3 py-2 text-right">m³</th>
                        <th className="px-3 py-2 text-left">Début</th>
                        <th className="px-3 py-2 text-left">Fin</th>
                        <th className="px-3 py-2 text-right">Cadence m³/h</th>
                        <th className="px-3 py-2 text-left">Observations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bcb.livraisons.map((l, i) => (
                        <tr key={l.id} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/40"} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                          <td className="px-3 py-2 font-mono text-slate-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium">{formatDate(l.dateLivraison)}</td>
                          <td className="px-3 py-2 text-right font-bold text-[#1E2F6E]">{l.quantiteM3.toFixed(1)}</td>
                          <td className="px-3 py-2 text-slate-500">{l.heureDebut ?? "—"}</td>
                          <td className="px-3 py-2 text-slate-500">{l.heureFin ?? "—"}</td>
                          <td className="px-3 py-2 text-right text-slate-500">
                            {l.cadenceM3h != null ? `${l.cadenceM3h}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-slate-400 italic">{l.observations ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t-2 border-[#F7941E]/20 bg-slate-50">
                      <tr>
                        <td colSpan={2} className="px-3 py-2 font-bold text-xs text-slate-600">Total</td>
                        <td className="px-3 py-2 text-right font-black text-[#1E2F6E] text-sm">
                          {totalLivraisons.toFixed(1)} m³
                        </td>
                        <td colSpan={4}></td>
                      </tr>
                    </tfoot>
                  </table>
                )}

                {bcb.observations && (
                  <div className="border-t border-slate-100 px-4 py-2.5 text-xs text-slate-600">
                    <span className="font-semibold text-slate-400 mr-1">Observations :</span>
                    {bcb.observations}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Signatures ──────────────────────────────────────────────────── */}
          <div className="mb-5 rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-200">
              <div className="px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Donneur d'ordre
                </p>
                <p className="text-sm font-bold text-[#1E2F6E]">{COMPANY.nom}</p>
                <p className="text-xs text-slate-500 mt-0.5">{COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville}</p>
                <div className="mt-6 border-t border-dashed border-slate-300 pt-3">
                  <p className="text-[10px] text-slate-400">Signature / Cachet :</p>
                  <div className="h-12"></div>
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Accusé de réception — Centrale
                </p>
                <p className="text-sm font-bold text-[#1E2F6E]">{bcb.fournisseur.nom}</p>
                <p className="text-xs text-slate-400 mt-0.5">Date de confirmation :</p>
                <div className="mt-6 border-t border-dashed border-slate-300 pt-3">
                  <p className="text-[10px] text-slate-400">Signature / Tampon :</p>
                  <div className="h-12"></div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Pied de page ────────────────────────────────────────────────── */}
          <div className="border-t border-slate-200 pt-4 space-y-1 text-center">
            <p className="text-[9px] text-slate-400 leading-relaxed">
              Ce bon de commande est établi conformément à la norme NF EN 206/CN (Béton — Spécification, performances, production et conformité).
              L'article NA.7.5 de l'annexe nationale française interdit tout ajout d'eau sur chantier, sauf mention expresse dans ce document.
            </p>
            <p className="text-[9px] text-slate-400">{COMPANY_LEGAL}</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function SpecRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-center px-3 py-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 w-36 shrink-0">{label}</span>
      <span className="text-xs font-medium text-slate-700 text-right">{value ?? "—"}</span>
    </div>
  );
}

function PlanCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-slate-700">{value}</p>
    </div>
  );
}

function OptionTag({ active, label, neutral = false }: { active: boolean; label: string; neutral?: boolean }) {
  if (neutral) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-medium text-slate-500">
        {label}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
      active ? "bg-[#1E2F6E]/10 text-[#1E2F6E]" : "bg-slate-100 text-slate-400 line-through"
    }`}>
      {active ? "✓" : "—"} {label}
    </span>
  );
}
