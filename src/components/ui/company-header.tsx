import { COMPANY } from "@/lib/company";

interface CompanyHeaderProps {
  /** N° d'affaire / chantier (obligatoire pour la traçabilité BTP) */
  affaire?: string | null;
  /** Référence du document (devis, facture, bon de commande…) */
  refDocument?: string | null;
  /** Type de document affiché (ex. "Devis", "Facture", "Bon de commande") */
  typeDocument?: string;
  /** Afficher un avertissement si pas de N° affaire */
  warnIfNoAffaire?: boolean;
}

export function CompanyHeader({
  affaire,
  refDocument,
  typeDocument,
  warnIfNoAffaire = true,
}: CompanyHeaderProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Bandeau SDA */}
      <div className="flex items-center gap-4 bg-gradient-to-r from-brand-navy to-brand-blue px-5 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white font-bold text-lg select-none">
          S
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white">{COMPANY.nom}</p>
          <p className="text-xs text-white/70">
            SIREN {COMPANY.siren} · {COMPANY.ville} {COMPANY.codePostal} · {COMPANY.email} · {COMPANY.emailDirecteur}
          </p>
        </div>
        {typeDocument && (
          <div className="rounded-lg bg-white/10 px-3 py-1.5">
            <span className="text-sm font-semibold text-white">{typeDocument}</span>
            {refDocument && (
              <p className="text-xs text-white/70">{refDocument}</p>
            )}
          </div>
        )}
      </div>

      {/* N° Affaire + infos légales */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-2">
        <div className="flex items-center gap-3">
          {affaire ? (
            <span className="rounded-full bg-brand-blue/10 px-3 py-0.5 text-xs font-semibold text-brand-navy">
              📁 Affaire / dossier : {affaire}
            </span>
          ) : warnIfNoAffaire ? (
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-semibold text-amber-700">
              ⚠ Sans N° d'affaire — rattachez ce document à un dossier
            </span>
          ) : null}
        </div>
        <span className="text-[10px] text-slate-400">
          {COMPANY.activite} · APE {COMPANY.codeAPE} · TVA {COMPANY.tvaIntracommunautaire}
        </span>
      </div>
    </div>
  );
}
