import { COMPANY } from "@/lib/company";

export default async function ConfirmationSelectionPage({
  searchParams,
}: {
  searchParams: Promise<{ numero?: string; chantier?: string }>;
}) {
  const { numero, chantier } = await searchParams;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="mx-auto max-w-lg text-center">
        {/* Logo */}
        <img src="/logo.png" alt="SDA Rénovation" className="h-14 mx-auto mb-8 object-contain" />

        {/* Icône succès */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Message */}
        <h1 className="text-2xl font-bold text-[#1E2F6E] mb-3">
          Merci pour votre choix !
        </h1>

        <div className="rounded-2xl bg-white border border-slate-200 shadow-sm p-6 mb-6 text-left">
          <p className="text-slate-600 text-sm mb-3">Votre sélection a bien été enregistrée :</p>
          {numero && (
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Devis retenu</span>
              <span className="font-bold text-[#1E2F6E] font-mono">{numero}</span>
            </div>
          )}
          {chantier && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Projet</span>
              <span className="font-medium text-slate-700">{chantier}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500 mb-2">
          Notre équipe va prendre contact avec vous prochainement pour confirmer les prochaines étapes.
        </p>
        <p className="text-sm text-slate-500">
          Pour toute question, contactez-nous au{" "}
          <a href={`tel:${COMPANY.telephone}`} className="font-medium text-[#1E2F6E] hover:underline">
            {COMPANY.telephone}
          </a>{" "}
          ou par email à{" "}
          <a href={`mailto:${COMPANY.email}`} className="font-medium text-[#1E2F6E] hover:underline">
            {COMPANY.email}
          </a>.
        </p>

        {/* Pied */}
        <div className="mt-10 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            {COMPANY.nom} · {COMPANY.adresse} · {COMPANY.codePostal} {COMPANY.ville}
          </p>
        </div>
      </div>
    </div>
  );
}
