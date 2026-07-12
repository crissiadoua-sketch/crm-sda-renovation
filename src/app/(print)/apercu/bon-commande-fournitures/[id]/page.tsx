import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate, formatEuros } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

const STATUT_LABELS: Record<string,string> = {
  BROUILLON:  "Brouillon",   EN_ATTENTE: "En attente de validation",
  VALIDE:     "Validé",      ENVOYE:     "Envoyé",
  RECU:       "Reçu ✓",     ANNULE:     "Annulé",
};

const TYPE_LABELS: Record<string,string> = {
  BUREAU: "Bureau", ENTREPOT: "Entrepôt", MIXTE: "Bureau & Entrepôt",
};

const SERVICE_LABELS: Record<string,string> = {
  ADMINISTRATION: "Administration", DIRECTION: "Direction",
  PRODUCTION: "Production / Exploitation", COMMERCIAL: "Commercial", AUTRE: "Autre",
};

const CAT_LABELS: Record<string,string> = {
  PAPETERIE: "Papeterie", INFORMATIQUE: "Informatique & Télécoms",
  MOBILIER: "Mobilier", HYGIENE: "Hygiène & Entretien",
  CONSOMMABLES: "Consommables imprimante", EPI: "EPI & Sécurité",
  OUTILLAGE: "Outillage", STOCKAGE: "Stockage & Rayonnage",
  EMBALLAGE: "Emballage & Expédition", AUTRE: "Autre",
};

export default async function ApercuBcFournituresPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const bcf = await prisma.bonCommandeFournitures.findUnique({
    where: { id },
    include: {
      fournisseur: true,
      lignes: { orderBy: { ordre: "asc" } },
    },
  });

  if (!bcf) notFound();

  // Grouper par catégorie
  const byCategorie: Record<string, typeof bcf.lignes> = {};
  for (const l of bcf.lignes) {
    if (!byCategorie[l.categorie]) byCategorie[l.categorie] = [];
    byCategorie[l.categorie].push(l);
  }

  const tvaGroups: Record<number, number> = {};
  for (const l of bcf.lignes) {
    tvaGroups[l.tauxTVA] = (tvaGroups[l.tauxTVA] ?? 0) + l.totalHT * l.tauxTVA / 100;
  }

  return (
    <>
      <PrintToolbar label={`BC Fournitures ${bcf.numero}`} />

      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-8 print:py-3">

          {/* ── En-tête ──────────────────────────────────────────────────────── */}
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
              <p className="text-2xl font-black text-[#1E2F6E] uppercase tracking-tight">Bon de Commande</p>
              <p className="text-sm font-bold text-[#F7941E] uppercase tracking-wide mt-0.5">
                Fournitures {TYPE_LABELS[bcf.type] ?? bcf.type}
              </p>
              <p className="mt-1 font-bold font-mono text-lg text-slate-700">{bcf.numero}</p>
              <p className="text-xs text-slate-500 mt-1">Date : {formatDate(bcf.dateCommande)}</p>
              {bcf.dateSouhaitee && (
                <p className="text-xs text-slate-700 font-semibold">
                  Livraison souhaitée : {formatDate(bcf.dateSouhaitee)}
                </p>
              )}
              <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-bold ${
                bcf.statut === "VALIDE" || bcf.statut === "ENVOYE" ? "bg-blue-100 text-blue-700" :
                bcf.statut === "RECU" ? "bg-green-100 text-green-700" :
                bcf.statut === "EN_ATTENTE" ? "bg-amber-100 text-amber-700" :
                bcf.statut === "ANNULE" ? "bg-red-100 text-red-700" :
                "bg-slate-100 text-slate-600"
              }`}>
                {STATUT_LABELS[bcf.statut] ?? bcf.statut}
              </span>
            </div>
          </div>

          {/* ── Identification ────────────────────────────────────────────────── */}
          <div className="mb-5 grid grid-cols-2 gap-4">
            {/* Fournisseur */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Fournisseur</p>
              <div className="rounded-lg border border-[#1E2F6E]/20 bg-[#1E2F6E]/5 px-3 py-2.5 text-sm">
                <p className="font-bold text-[#1E2F6E]">{bcf.fournisseur.nom}</p>
                {bcf.fournisseur.adresse && <p className="text-xs text-slate-500">{bcf.fournisseur.adresse}</p>}
                {(bcf.fournisseur.codePostal || bcf.fournisseur.ville) && (
                  <p className="text-xs text-slate-500">{bcf.fournisseur.codePostal} {bcf.fournisseur.ville}</p>
                )}
                {bcf.fournisseur.siret && <p className="text-xs text-slate-400 mt-0.5">SIRET {bcf.fournisseur.siret}</p>}
                {bcf.fournisseur.telephone && <p className="text-xs text-slate-500 mt-0.5">Tél. {bcf.fournisseur.telephone}</p>}
                {bcf.fournisseur.email && <p className="text-xs text-slate-500">{bcf.fournisseur.email}</p>}
              </div>
            </div>

            {/* Demandeur / livraison */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Commande interne</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm space-y-1">
                <Row label="Service" value={SERVICE_LABELS[bcf.service] ?? bcf.service} />
                {bcf.demandeurNom   && <Row label="Demandeur"  value={bcf.demandeurNom} />}
                {bcf.validateurNom  && <Row label="Validé par" value={bcf.validateurNom} />}
                {bcf.refBudget      && <Row label="Réf. budget" value={bcf.refBudget} />}
                {bcf.adresseLivraison && <Row label="Livraison" value={bcf.adresseLivraison} />}
                {bcf.modeReglement  && <Row label="Règlement" value={bcf.modeReglement} />}
              </div>
            </div>
          </div>

          {/* ── Lignes par catégorie ─────────────────────────────────────────── */}
          <div className="mb-5">
            {Object.entries(byCategorie).map(([cat, catLignes]) => (
              <div key={cat} className="mb-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-px flex-1 bg-[#1E2F6E]/10"></div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[#1E2F6E] px-2">
                    {CAT_LABELS[cat] ?? cat}
                  </p>
                  <div className="h-px flex-1 bg-[#1E2F6E]/10"></div>
                </div>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1E2F6E]/10 text-[#1E2F6E] text-[10px] font-semibold uppercase tracking-wider">
                      <th className="px-2 py-1.5 text-left w-6">#</th>
                      <th className="px-2 py-1.5 text-left">Désignation</th>
                      <th className="px-2 py-1.5 text-left w-24">Réf. four.</th>
                      <th className="px-2 py-1.5 text-right w-12">Qté</th>
                      <th className="px-2 py-1.5 text-left w-10">U.</th>
                      <th className="px-2 py-1.5 text-right w-20">P.U. HT</th>
                      <th className="px-2 py-1.5 text-center w-12">TVA</th>
                      <th className="px-2 py-1.5 text-right w-20">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catLignes.map((l, i) => (
                      <tr key={l.id} className={`border-b border-slate-100 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                        <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                        <td className="px-2 py-1.5 font-medium text-slate-700">{l.designation}</td>
                        <td className="px-2 py-1.5 font-mono text-slate-400">{l.reference ?? "—"}</td>
                        <td className="px-2 py-1.5 text-right font-bold">{l.quantite}</td>
                        <td className="px-2 py-1.5 text-slate-500">{l.unite}</td>
                        <td className="px-2 py-1.5 text-right text-slate-600">{formatEuros(l.prixUnitaireHT)}</td>
                        <td className="px-2 py-1.5 text-center text-slate-400">{l.tauxTVA}%</td>
                        <td className="px-2 py-1.5 text-right font-bold text-[#1E2F6E]">{formatEuros(l.totalHT)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          {/* ── Totaux ────────────────────────────────────────────────────────── */}
          <div className="mb-5 flex justify-end">
            <div className="w-64 rounded-lg border border-slate-200 overflow-hidden">
              <div className="divide-y divide-slate-100">
                <div className="flex justify-between px-4 py-2 text-sm">
                  <span className="text-slate-500">Total HT</span>
                  <span className="font-semibold">{formatEuros(bcf.totalHT)}</span>
                </div>
                {Object.entries(tvaGroups).map(([taux, montant]) => (
                  <div key={taux} className="flex justify-between px-4 py-1.5 text-xs">
                    <span className="text-slate-400">TVA {taux}%</span>
                    <span className="text-slate-500">{formatEuros(montant)}</span>
                  </div>
                ))}
                <div className="flex justify-between px-4 py-1.5 text-xs">
                  <span className="text-slate-500">Total TVA</span>
                  <span className="font-semibold">{formatEuros(bcf.totalTVA)}</span>
                </div>
                <div className="flex justify-between px-4 py-3 bg-[#1E2F6E]">
                  <span className="font-black text-white">TOTAL TTC</span>
                  <span className="font-black text-white text-base">{formatEuros(bcf.totalTTC)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Notes ────────────────────────────────────────────────────────── */}
          {bcf.notes && (
            <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Notes / Conditions</p>
              <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">{bcf.notes}</p>
            </div>
          )}

          {/* ── Signatures ───────────────────────────────────────────────────── */}
          <div className="mb-5 rounded-lg border border-slate-200 overflow-hidden">
            <div className="grid grid-cols-3 divide-x divide-slate-200">
              <div className="px-3 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Demandeur</p>
                <p className="text-xs font-medium text-slate-700">{bcf.demandeurNom ?? "___________________"}</p>
                <p className="text-[10px] text-slate-400">{SERVICE_LABELS[bcf.service]}</p>
                <div className="mt-5 border-t border-dashed border-slate-300 pt-2">
                  <p className="text-[9px] text-slate-400">Signature :</p>
                  <div className="h-10"></div>
                </div>
              </div>
              <div className="px-3 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Valideur</p>
                <p className="text-xs font-medium text-slate-700">{bcf.validateurNom ?? "___________________"}</p>
                <p className="text-[10px] text-slate-400">Responsable</p>
                <div className="mt-5 border-t border-dashed border-slate-300 pt-2">
                  <p className="text-[9px] text-slate-400">Visa / Cachet :</p>
                  <div className="h-10"></div>
                </div>
              </div>
              <div className="px-3 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Accusé réception</p>
                <p className="text-xs font-medium text-[#1E2F6E]">{bcf.fournisseur.nom}</p>
                <div className="mt-5 border-t border-dashed border-slate-300 pt-2">
                  <p className="text-[9px] text-slate-400">Tampon / Signature fournisseur :</p>
                  <div className="h-10"></div>
                  <p className="text-[9px] text-slate-400 mt-1">Le ___ / ___ / ______</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Pied de page ─────────────────────────────────────────────────── */}
          <div className="border-t border-slate-200 pt-4 text-center">
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2 items-baseline">
      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide w-20 shrink-0">{label}</span>
      <span className="text-xs text-slate-700 font-medium">{value}</span>
    </div>
  );
}
