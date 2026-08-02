import { COMPANY } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate, formatEuros } from "@/lib/format";
import { calculerBilan } from "@/lib/bilan-template";
import { PrintToolbar } from "./print-toolbar";
import { BILAN_CODES } from "@/lib/plan-comptable";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Ligne({ label, valeur, gras = false, code }: { label: string; valeur: number; gras?: boolean; code?: string }) {
  return (
    <tr style={{ breakInside: "avoid", pageBreakInside: "avoid" }} className={gras ? "bg-slate-50 font-bold" : ""}>
      <td className="border border-slate-200 px-2 py-1.5">
        {label}
        {code && !gras && (
          <span style={{ marginLeft: 5, fontSize: "0.75em", color: "#94a3b8", fontFamily: "monospace" }}>
            ({code})
          </span>
        )}
      </td>
      <td className="border border-slate-200 px-2 py-1.5 text-right">{formatEuros(valeur)}</td>
    </tr>
  );
}

export default async function ApercuBilanPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; codes?: string }>;
}) {
  const { annee: anneeParam, codes } = await searchParams;
  const annee = parseInt(anneeParam ?? String(new Date().getFullYear()), 10);
  const showCodes = codes === "1";
  const data = await calculerBilan(annee);
  const cr = data.compteResultat;
  const c = (key: string) => showCodes ? BILAN_CODES[key] : undefined;

  return (
    <>
      <PrintToolbar label={`Bilan — ${annee}`} showCodes={showCodes} />

      <div className="mx-auto my-8 w-full max-w-[297mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-7 print:py-4">
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
              <p className="text-2xl font-black text-[#1E2F6E]">BILAN</p>
              <p className="text-sm font-semibold text-slate-500">Exercice {annee}</p>
              <p className="text-xs text-slate-500">
                Du {formatDate(data.dateDebutExercice)} au {formatDate(data.dateFinExercice)}
              </p>
            </div>
          </div>

          {/* Synthèse */}
          <div className="mb-6 grid grid-cols-3 gap-3 text-xs">
            <div className="rounded border border-slate-200 px-3 py-2">
              <p className="text-slate-400">Total Actif</p>
              <p className="text-base font-bold text-[#1E2F6E]">{formatEuros(data.actif.totalActif)}</p>
            </div>
            <div className="rounded border border-slate-200 px-3 py-2">
              <p className="text-slate-400">Total Passif</p>
              <p className="text-base font-bold text-[#1E2F6E]">{formatEuros(data.passif.totalPassif)}</p>
            </div>
            <div className="rounded border border-slate-200 px-3 py-2">
              <p className="text-slate-400">Résultat de l'exercice</p>
              <p className="text-base font-bold text-[#1E2F6E]">{formatEuros(cr.resultatNet)}</p>
            </div>
          </div>

          {/* Actif / Passif côte à côte */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7941E] text-white text-[10px]">
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold" colSpan={2}>ACTIF</th>
                </tr>
              </thead>
              <tbody>
                <Ligne label="Capital souscrit non appelé" valeur={data.actif.capitalSouscritNonAppele} code={c("capitalSouscritNonAppele")} />
                <Ligne label="Immobilisations incorporelles (net)" valeur={data.actif.immobilise.incorporelles.net} code={showCodes ? "20x − 280x" : undefined} />
                <Ligne label="Immobilisations corporelles (net)" valeur={data.actif.immobilise.corporelles.net} code={showCodes ? "21x − 281x" : undefined} />
                <Ligne label="Immobilisations financières (net)" valeur={data.actif.immobilise.financieres.net} code={showCodes ? "26x, 27x − 296x, 297x" : undefined} />
                <Ligne label="Total Actif immobilisé" valeur={data.actif.immobilise.total} gras />
                {data.actif.circulant.lignes.map((l) => <Ligne key={l.key} label={l.label} valeur={l.valeur} code={c(l.key)} />)}
                <Ligne label="Total Actif circulant" valeur={data.actif.circulant.total} gras />
                <Ligne label="TOTAL ACTIF" valeur={data.actif.totalActif} gras />
              </tbody>
            </table>

            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7941E] text-white text-[10px]">
                  <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold" colSpan={2}>PASSIF</th>
                </tr>
              </thead>
              <tbody>
                {data.passif.capitauxPropres.lignes.map((l) => <Ligne key={l.key} label={l.label} valeur={l.valeur} code={c(l.key)} />)}
                <Ligne label="Total Capitaux propres" valeur={data.passif.capitauxPropres.total} gras />
                <Ligne label="Provisions pour risques et charges" valeur={data.passif.provisionsRisquesCharges} code={showCodes ? "15x" : undefined} />
                {data.passif.dettes.lignes.map((l) => <Ligne key={l.key} label={l.label} valeur={l.valeur} code={c(l.key)} />)}
                <Ligne label="Total Emprunts et dettes" valeur={data.passif.dettes.total} gras />
                <Ligne label="TOTAL PASSIF" valeur={data.passif.totalPassif} gras />
              </tbody>
            </table>
          </div>

          {/* Compte de résultat */}
          <p className="mb-2 text-sm font-bold text-[#1E2F6E]">Compte de résultat</p>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7941E] text-white text-[10px]">
                <th className="border border-[#29ABE2] px-2 py-1.5 text-left font-semibold" colSpan={2}>Poste</th>
              </tr>
            </thead>
            <tbody>
              {cr.produitsExploitation.lignes.map((l) => <Ligne key={l.key} label={l.label} valeur={l.valeur} code={c(l.key)} />)}
              <Ligne label="Total produits d'exploitation" valeur={cr.produitsExploitation.total} gras />
              {cr.chargesExploitation.lignes.map((l) => <Ligne key={l.key} label={l.label} valeur={l.valeur} code={c(l.key)} />)}
              <Ligne label="Total charges d'exploitation" valeur={cr.chargesExploitation.total} gras />
              <Ligne label="Résultat d'exploitation" valeur={cr.resultatExploitation} gras />
              <Ligne label="Produits financiers" valeur={cr.produitsFinanciers} code={showCodes ? "76x" : undefined} />
              <Ligne label="Charges financières" valeur={cr.chargesFinancieres} code={showCodes ? "66x" : undefined} />
              <Ligne label="Résultat financier" valeur={cr.resultatFinancier} gras />
              <Ligne label="Résultat courant avant impôts" valeur={cr.resultatCourantAvantImpots} gras />
              <Ligne label="Produits exceptionnels" valeur={cr.produitsExceptionnels} code={showCodes ? "77x" : undefined} />
              <Ligne label="Charges exceptionnelles" valeur={cr.chargesExceptionnelles} code={showCodes ? "67x" : undefined} />
              <Ligne label="Résultat exceptionnel" valeur={cr.resultatExceptionnel} gras />
              <Ligne label="Participation des salariés" valeur={cr.participationSalaries} code={showCodes ? "691" : undefined} />
              <Ligne label="Impôts sur les bénéfices" valeur={cr.impotsBenefices} code={showCodes ? "695" : undefined} />
              <Ligne label="RÉSULTAT DE L'EXERCICE" valeur={cr.resultatNet} gras />
            </tbody>
          </table>

          <p className="mt-6 text-[10px] text-slate-400">Édité le {formatDate(new Date())}</p>
        </div>
      </div>
    </>
  );
}
