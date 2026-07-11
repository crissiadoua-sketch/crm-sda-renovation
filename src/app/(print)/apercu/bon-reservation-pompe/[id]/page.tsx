import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", ENVOYE: "Envoyé", CONFIRME: "Confirmé", ANNULE: "Annulé",
};

export default async function ApercuBonReservationPompePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const brp = await prisma.bonReservationPompe.findUnique({
    where: { id },
    include: {
      fournisseur: true,
      chantier:    { select: { nom: true, adresse: true, reference: true } },
      client:      { select: { raisonSociale: true, nom: true, telephone: true, adresse: true, codePostal: true, ville: true } },
    },
  });

  if (!brp) notFound();

  const prixHT  = brp.prixHT ?? 0;
  const tauxTVA = (brp.tauxTVA ?? 20) / 100;
  const tva     = prixHT * tauxTVA;
  const ttc     = prixHT + tva;
  const fmt     = (n: number) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  const clientLabel    = brp.client?.raisonSociale ?? brp.client?.nom;
  const chantierLabel  = brp.nomChantier ?? brp.chantier?.nom;
  const adresseLabel   = brp.adresseChantier ?? brp.chantier?.adresse;

  return (
    <>
      <PrintToolbar label={`Réservation Pompe ${brp.numero} — Aperçu PDF`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-9 print:py-7">

          {/* ── En-tête SDA ──────────────────────────────────────────────────── */}
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
              <p className="text-2xl font-black text-[#1E2F6E] uppercase tracking-tight">Réservation de Pompe</p>
              <p className="text-sm font-semibold text-[#F7941E] mt-0.5 uppercase tracking-wide">Béton</p>
              <p className="mt-1 text-lg font-bold text-slate-700 font-mono">{brp.numero}</p>
              <p className="text-xs text-slate-500 mt-1">Date : {formatDate(brp.createdAt)}</p>
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
                brp.statut === "CONFIRME" ? "bg-blue-100 text-blue-700" :
                brp.statut === "ANNULE"   ? "bg-red-100 text-red-700" :
                brp.statut === "ENVOYE"   ? "bg-amber-100 text-amber-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {STATUT_LABELS[brp.statut] ?? brp.statut}
              </span>
            </div>
          </div>

          {/* ── Identités ────────────────────────────────────────────────────── */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            {/* Donneur d'ordre */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Donneur d'ordre</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-bold text-[#1E2F6E]">{COMPANY.nom}</p>
                <p className="text-xs text-slate-500">{COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville}</p>
                <p className="text-xs text-slate-500">{COMPANY.email}</p>
                {clientLabel && (
                  <>
                    <p className="mt-2 text-[10px] font-semibold uppercase text-slate-400">Pour le client</p>
                    <p className="font-medium text-slate-700">{clientLabel}</p>
                    {brp.client?.telephone && <p className="text-xs text-slate-500">{brp.client.telephone}</p>}
                  </>
                )}
              </div>
            </div>

            {/* Société de pompage */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Société de pompage</p>
              <div className="rounded-lg border border-[#1E2F6E]/30 bg-[#1E2F6E]/5 px-3 py-2.5 text-sm">
                <p className="font-bold text-[#1E2F6E]">{brp.fournisseur.nom}</p>
                {brp.fournisseur.adresse && (
                  <p className="text-xs text-slate-500">{brp.fournisseur.adresse}</p>
                )}
                {(brp.fournisseur.codePostal || brp.fournisseur.ville) && (
                  <p className="text-xs text-slate-500">
                    {brp.fournisseur.codePostal} {brp.fournisseur.ville}
                  </p>
                )}
                {brp.fournisseur.telephone && (
                  <p className="text-xs text-slate-500 mt-1">Tél. {brp.fournisseur.telephone}</p>
                )}
                {brp.fournisseur.email && (
                  <p className="text-xs text-slate-500">{brp.fournisseur.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Chantier ─────────────────────────────────────────────────────── */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Chantier</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm">
                <p className="font-bold text-[#1E2F6E]">{chantierLabel ?? "—"}</p>
                {adresseLabel && <p className="text-xs text-slate-500 mt-0.5">{adresseLabel}</p>}
                {brp.contactTelephone && (
                  <p className="text-xs text-slate-500 mt-1">
                    📞 Contact : <span className="font-medium">{brp.contactTelephone}</span>
                  </p>
                )}
                {brp.centraleBeton && (
                  <p className="text-xs text-slate-500 mt-1">
                    🏭 Centrale : <span className="font-medium">{brp.centraleBeton}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Planning */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Planning d'intervention</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm space-y-1.5">
                <PlanRow label="Date" value={brp.dateReservation ? formatDate(brp.dateReservation) : "—"} />
                <PlanRow label="Heure arrivée pompe" value={brp.heureArriveePompe ?? "—"} bold />
                <PlanRow label="Heure début pompage" value={brp.heureDebutPompage ?? "—"} bold />
                <PlanRow label="Heure fin pompage"   value={brp.heureFinPompage ?? "—"} />
                <div className="border-t border-slate-200 pt-1.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Cubage prévu</span>
                    <span className="text-xl font-black text-[#1E2F6E]">
                      {brp.cubagePrévu != null ? `${brp.cubagePrévu} m³` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Type de pompe ────────────────────────────────────────────────── */}
          <div className="mb-5">
            <div className="rounded-t-lg bg-gradient-to-r from-[#1976D2] to-[#1B3F94] px-4 py-2 flex items-center gap-2">
              <span className="text-white font-bold text-xs uppercase tracking-widest">Type de pompe</span>
            </div>
            <div className="rounded-b-lg border border-[#1E2F6E]/20 overflow-hidden">

              {brp.typePompe && (
                <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 w-28">Modèle</span>
                  <span className="text-sm font-bold text-[#1E2F6E]">{brp.typePompe}</span>
                </div>
              )}

              <div className="grid grid-cols-3 divide-x divide-slate-100">
                {/* Avec flèche */}
                <div className={`px-4 py-3 ${brp.avecFleche ? "bg-[#1E2F6E]/5" : "bg-white"}`}>
                  <p className={`text-xs font-bold mb-1 ${brp.avecFleche ? "text-[#1E2F6E]" : "text-slate-300"}`}>
                    {brp.avecFleche ? "✓" : "—"} Flèche
                  </p>
                  <p className={`text-2xl font-black ${brp.avecFleche ? "text-[#1E2F6E]" : "text-slate-200"}`}>
                    {brp.avecFleche && brp.flecheMetres ? `${brp.flecheMetres} m` : "—"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">longueur de flèche</p>
                </div>

                {/* Sans flèche */}
                <div className={`px-4 py-3 ${brp.sansFleche ? "bg-[#1E2F6E]/5" : "bg-white"}`}>
                  <p className={`text-xs font-bold mb-1 ${brp.sansFleche ? "text-[#1E2F6E]" : "text-slate-300"}`}>
                    {brp.sansFleche ? "✓" : "—"} Sans flèche
                  </p>
                  <p className={`text-2xl font-black ${brp.sansFleche ? "text-[#1E2F6E]" : "text-slate-200"}`}>
                    {brp.sansFleche && brp.tuyauterieMetres ? `${brp.tuyauterieMetres} m` : "—"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">tuyauterie</p>
                </div>

                {/* Tuyauterie supplémentaire */}
                <div className={`px-4 py-3 ${brp.tuyauterieSupp ? "bg-amber-50" : "bg-white"}`}>
                  <p className={`text-xs font-bold mb-1 ${brp.tuyauterieSupp ? "text-amber-700" : "text-slate-300"}`}>
                    {brp.tuyauterieSupp ? "✓" : "—"} Tuya. Supp.
                  </p>
                  <p className={`text-2xl font-black ${brp.tuyauterieSupp ? "text-amber-700" : "text-slate-200"}`}>
                    {brp.tuyauterieSupp && brp.tuyauterieSupplementaire ? `${brp.tuyauterieSupplementaire} m` : "—"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">supplémentaire</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Prix et conditions ───────────────────────────────────────────── */}
          <div className="mb-5 rounded-lg border border-[#1E2F6E]/20 overflow-hidden">
            <div className="bg-gradient-to-r from-[#1976D2] to-[#1B3F94] px-4 py-2">
              <span className="text-white font-bold text-xs uppercase tracking-widest">
                Prix et conditions de paiement
              </span>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-100">
              <div className="px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Mode de règlement
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  {brp.modeReglement ?? "Comptant"}
                </p>
                {brp.conditions && (
                  <p className="text-xs text-slate-500 mt-2 italic">{brp.conditions}</p>
                )}
              </div>
              <div className="px-4 py-4">
                {prixHT > 0 ? (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Prix</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">HT</span>
                      <span className="font-medium">{fmt(prixHT)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">TVA {brp.tauxTVA ?? 20} %</span>
                      <span className="font-medium">{fmt(tva)}</span>
                    </div>
                    <div className="flex justify-between border-t-2 border-[#F7941E] pt-1.5 mt-1">
                      <span className="font-bold text-[#1E2F6E]">PRIX TTC</span>
                      <span className="font-black text-[#1E2F6E] text-lg">{fmt(ttc)}</span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Prix</p>
                    <p className="text-2xl font-black text-[#1E2F6E]">À définir</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Signatures ───────────────────────────────────────────────────── */}
          <div className="mb-5 rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-200">
              <div className="px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Donneur d'ordre — {COMPANY.nom}
                </p>
                <p className="text-xs text-slate-500 mb-4">
                  {chantierLabel && `Chantier : ${chantierLabel}`}
                </p>
                <div className="border-t border-dashed border-slate-300 pt-3">
                  <p className="text-[10px] text-slate-400 mb-1">Signature :</p>
                  <div className="h-12"></div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {COMPANY.ville}, le _____ / _____ / _______
                  </p>
                </div>
              </div>
              <div className="px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Confirmation — {brp.fournisseur.nom}
                </p>
                <p className="text-xs text-slate-500 mb-4">Accusé de réception de la réservation</p>
                <div className="border-t border-dashed border-slate-300 pt-3">
                  <p className="text-[10px] text-slate-400 mb-1">Signature / Tampon :</p>
                  <div className="h-12"></div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Le _____ / _____ / _______
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Pied de page ─────────────────────────────────────────────────── */}
          <div className="border-t border-slate-200 pt-4 text-center space-y-1">
            <p className="text-[10px] text-slate-400">
              Ce document vaut bon de réservation. Il est à retourner signé par le prestataire de pompage.
              En l'absence de confirmation dans les 24h, veuillez relancer le prestataire.
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

function PlanRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 shrink-0">{label}</span>
      <span className={`text-sm text-right ${bold ? "font-bold text-[#1E2F6E]" : "text-slate-600"}`}>{value}</span>
    </div>
  );
}
