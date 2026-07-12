export const dynamic = "force-dynamic";

import { FileSpreadsheet, FileText } from "lucide-react";
import { calculerBilan } from "@/lib/bilan-template";
import { formatEuros, formatDate } from "@/lib/format";
import { BilanForm } from "./bilan-form";

function LigneTable({ label, valeur, gras = false, badge }: { label: string; valeur: number; gras?: boolean; badge?: React.ReactNode }) {
  return (
    <tr className={gras ? "border-t border-slate-200 bg-slate-50" : ""}>
      <td className={`px-4 py-1.5 ${gras ? "font-semibold text-slate-700" : "text-slate-600"}`}>
        {label}
        {badge}
      </td>
      <td className={`px-4 py-1.5 text-right ${gras ? "font-bold text-brand-navy" : "text-slate-700"}`}>
        {formatEuros(valeur)}
      </td>
    </tr>
  );
}

export default async function BilanPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee: anneeParam } = await searchParams;
  const annee = parseInt(anneeParam ?? String(new Date().getFullYear()), 10);

  const data = await calculerBilan(annee);
  const now = new Date();
  const annees = Array.from({ length: 6 }, (_, i) => now.getFullYear() - i);
  const exportQuery = `annee=${annee}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Bilan</h2>
          <p className="mt-1 text-sm text-slate-500">
            Bilan Actif/Passif et compte de résultat — pré-rempli à partir du CA, des achats et des
            charges du CRM ; les autres lignes (immobilisations, capitaux propres, dettes...) sont à
            saisir manuellement, comme dans le modèle transmis par votre expert-comptable.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/comptabilite/bilan/export-excel?${exportQuery}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Excel
          </a>
          <a
            href={`/apercu/bilan?${exportQuery}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <FileText className="h-4 w-4 text-red-500" />
            PDF
          </a>
        </div>
      </div>

      <form method="get" className="flex items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Exercice</label>
          <select name="annee" defaultValue={annee} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {annees.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">
          Afficher
        </button>
      </form>

      {/* Synthèse */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-400 mb-1">Total Actif</p>
          <p className="text-xl font-bold text-brand-navy">{formatEuros(data.actif.totalActif)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-400 mb-1">Total Passif</p>
          <p className="text-xl font-bold text-brand-navy">{formatEuros(data.passif.totalPassif)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-400 mb-1">Résultat de l'exercice</p>
          <p className={`text-xl font-bold ${data.compteResultat.resultatNet >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {formatEuros(data.compteResultat.resultatNet)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-400 mb-1">Écart Actif − Passif</p>
          <p className={`text-xl font-bold ${Math.abs(data.equilibre) < 0.01 ? "text-emerald-700" : "text-amber-600"}`}>
            {formatEuros(data.equilibre)}
          </p>
          {Math.abs(data.equilibre) >= 0.01 && (
            <p className="text-xs text-amber-600 mt-0.5">Complétez les lignes manquantes pour équilibrer.</p>
          )}
        </div>
      </div>

      {/* Bilan Actif / Passif */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <p className="font-semibold text-brand-navy">Actif</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-50">
              <LigneTable label="Capital souscrit non appelé" valeur={data.actif.capitalSouscritNonAppele} />
              <LigneTable label="Immobilisations incorporelles (net)" valeur={data.actif.immobilise.incorporelles.net} />
              <LigneTable label="Immobilisations corporelles (net)" valeur={data.actif.immobilise.corporelles.net} />
              <LigneTable label="Immobilisations financières (net)" valeur={data.actif.immobilise.financieres.net} />
              <LigneTable label="Total Actif immobilisé" valeur={data.actif.immobilise.total} gras />
              {data.actif.circulant.lignes.map((l) => (
                <LigneTable
                  key={l.key}
                  label={l.label}
                  valeur={l.valeur}
                  badge={l.key === "disponibilites" && data.disponibilitesSource ? (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      Auto · Relevé du {formatDate(data.disponibilitesSource.dateImport)}{data.disponibilitesSource.banque ? ` · ${data.disponibilitesSource.banque}` : ""}
                    </span>
                  ) : undefined}
                />
              ))}
              <LigneTable label="Total Actif circulant" valeur={data.actif.circulant.total} gras />
              <LigneTable label="TOTAL ACTIF" valeur={data.actif.totalActif} gras />
            </tbody>
          </table>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <p className="font-semibold text-brand-navy">Passif</p>
          </div>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-50">
              {data.passif.capitauxPropres.lignes.map((l) => (
                <LigneTable key={l.key} label={l.label} valeur={l.valeur} />
              ))}
              <LigneTable label="Total Capitaux propres" valeur={data.passif.capitauxPropres.total} gras />
              <LigneTable label="Provisions pour risques et charges" valeur={data.passif.provisionsRisquesCharges} />
              {data.passif.dettes.lignes.map((l) => (
                <LigneTable key={l.key} label={l.label} valeur={l.valeur} />
              ))}
              <LigneTable label="Total Emprunts et dettes" valeur={data.passif.dettes.total} gras />
              <LigneTable label="TOTAL PASSIF" valeur={data.passif.totalPassif} gras />
            </tbody>
          </table>
        </div>
      </div>

      {/* Compte de résultat */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <p className="font-semibold text-brand-navy">Compte de résultat</p>
        </div>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-slate-50">
            {data.compteResultat.produitsExploitation.lignes.map((l) => (
              <LigneTable key={l.key} label={l.label} valeur={l.valeur} />
            ))}
            <LigneTable label="Total produits d'exploitation" valeur={data.compteResultat.produitsExploitation.total} gras />
            {data.compteResultat.chargesExploitation.lignes.map((l) => (
              <LigneTable key={l.key} label={l.label} valeur={l.valeur} />
            ))}
            <LigneTable label="Total charges d'exploitation" valeur={data.compteResultat.chargesExploitation.total} gras />
            <LigneTable label="Résultat d'exploitation" valeur={data.compteResultat.resultatExploitation} gras />
            <LigneTable label="Produits financiers" valeur={data.compteResultat.produitsFinanciers} />
            <LigneTable label="Charges financières" valeur={data.compteResultat.chargesFinancieres} />
            <LigneTable label="Résultat financier" valeur={data.compteResultat.resultatFinancier} gras />
            <LigneTable label="Résultat courant avant impôts" valeur={data.compteResultat.resultatCourantAvantImpots} gras />
            <LigneTable label="Produits exceptionnels" valeur={data.compteResultat.produitsExceptionnels} />
            <LigneTable label="Charges exceptionnelles" valeur={data.compteResultat.chargesExceptionnelles} />
            <LigneTable label="Résultat exceptionnel" valeur={data.compteResultat.resultatExceptionnel} gras />
            <LigneTable label="Participation des salariés" valeur={data.compteResultat.participationSalaries} />
            <LigneTable label="Impôts sur les bénéfices" valeur={data.compteResultat.impotsBenefices} />
            <LigneTable label="RÉSULTAT DE L'EXERCICE" valeur={data.compteResultat.resultatNet} gras />
          </tbody>
        </table>
      </div>

      {/* Saisie manuelle */}
      <div>
        <h3 className="mb-3 font-semibold text-brand-navy">Saisie manuelle des lignes du bilan</h3>
        <BilanForm annee={annee} defaultValues={data.bilan} creancesClientsAuto={data.creancesClientsAuto} />
      </div>
    </div>
  );
}
