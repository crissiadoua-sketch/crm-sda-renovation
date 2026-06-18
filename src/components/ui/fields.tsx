export const inputClasses =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30";

export const selectClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30";

// Correcteur orthographe FR — à ajouter sur <input> et <textarea>
export const spellProps = {
  spellCheck: true,
  lang: "fr",
} as const;

export function Field({
  label,
  htmlFor,
  error,
  children,
  className = "",
  required,
}: {
  label: string;
  htmlFor?: string;
  error?: string | string[];
  children: React.ReactNode;
  className?: string;
  required?: boolean;
}) {
  const errorText = Array.isArray(error) ? error[0] : error;
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-brand-navy">
        {label}
        {required && <span className="ml-0.5 text-brand-orange-dark">*</span>}
      </label>
      {children}
      {errorText && <p className="mt-1 text-sm text-brand-orange-dark">{errorText}</p>}
    </div>
  );
}

// Alerte : document non rattaché à un dossier/affaire
export function AlertDossierManquant({ message }: { message?: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
      <span>{message ?? "Ce document n'est rattaché à aucun dossier / numéro d'affaire. Associez-le à un chantier pour maintenir la traçabilité."}</span>
    </div>
  );
}
