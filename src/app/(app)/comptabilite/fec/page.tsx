import Link from "next/link";
import { ChevronRight, Download, FileText, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { FecDownloadButton } from "./fec-download-button";

export default async function FecPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee: anneeParam } = await searchParams;
  const annee = parseInt(anneeParam ?? "") || new Date().getFullYear() - 1;
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* En-tête */}
      <div>
        <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
          <Link href="/comptabilite" className="hover:text-brand-blue">Comptabilité</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-slate-600">Export FEC</span>
        </nav>
        <h2 className="text-xl font-bold text-brand-navy">Export FEC</h2>
        <p className="mt-1 text-sm text-slate-500">
          Fichier des Écritures Comptables — norme NF Z B2-049
        </p>
      </div>

      {/* Info légale */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Obligation légale (CGI art. 54 ter)</p>
            <p className="mt-1 text-xs text-blue-700">
              Toute entreprise soumise à l'IS tenant une comptabilité informatisée doit pouvoir
              présenter le FEC lors d'un contrôle fiscal. Le fichier doit être remis à l'administration
              dans les 15 jours suivant la demande.
            </p>
          </div>
        </div>
      </div>

      {/* Ce que contient le FEC */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-brand-navy mb-3">Contenu du FEC généré</h3>
        <ul className="flex flex-col gap-2">
          {[
            { label: "Journal Ventes (VE)", desc: "Toutes les factures émises — 411 / 706 / TVA 44571", ok: true },
            { label: "Journal Achats (AC)", desc: "Bons de commande confirmés — 601 / TVA 44566 / 401", ok: true },
            { label: "Opérations Diverses (OD)", desc: "Dépenses réelles — 606 / 401", ok: true },
            { label: "Journal Salaires (SA)", desc: "Bulletins de paie validés — 641 / 645 / 421 / 431", ok: true },
          ].map(({ label, desc, ok }) => (
            <li key={label} className="flex items-start gap-3 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-slate-700">{label}</span>
                <span className="text-slate-400 ml-2 text-xs">{desc}</span>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <p>
            Le FEC généré est une base simplifiée. Il ne contient pas les journaux de banque,
            les opérations de clôture, ni les écritures d'inventaire. Faites valider par votre
            expert-comptable avant de le remettre à l'administration.
          </p>
        </div>
      </div>

      {/* Sélecteur année */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-brand-navy mb-4">Télécharger le FEC</h3>

        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-slate-600">Exercice :</span>
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            {years.map((y) => (
              <Link
                key={y}
                href={`?annee=${y}`}
                className={`px-4 py-2 text-sm font-medium transition ${
                  y === annee ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200">
          <FileText className="h-8 w-8 text-brand-blue shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-slate-700">FEC_{annee}_SDA_Renovation.txt</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Format TSV · UTF-8 · Conforme NF Z B2-049 · Exercice {annee}
            </p>
          </div>
          <FecDownloadButton annee={annee} />
        </div>
      </div>

      {/* Liens */}
      <div className="flex gap-3">
        <Link href="/comptabilite/bilan" className="text-sm text-brand-blue hover:underline flex items-center gap-1">
          ← Bilan comptable
        </Link>
        <Link href="/comptabilite/rapprochement" className="text-sm text-brand-blue hover:underline flex items-center gap-1">
          Rapprochement bancaire →
        </Link>
      </div>
    </div>
  );
}
