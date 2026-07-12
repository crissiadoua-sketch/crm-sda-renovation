"use client";

export function LigneActions({
  ligneId,
  type,
  candidats,
  suggestionId,
  confiance,
  validerAction,
  factures,
  rapprochementerFactureAction,
  facturesFournisseur,
  rapprochementerFactureFournisseurAction,
}: {
  ligneId: string;
  type: "PAIEMENT" | "DEPENSE";
  candidats: { id: string; label: string }[];
  suggestionId?: string;
  confiance?: "EXACTE" | "PROBABLE";
  validerAction: (formData: FormData) => void | Promise<void>;
  factures?: { id: string; label: string }[];
  rapprochementerFactureAction?: (formData: FormData) => void | Promise<void>;
  facturesFournisseur?: { id: string; label: string }[];
  rapprochementerFactureFournisseurAction?: (formData: FormData) => void | Promise<void>;
}) {
  const hasCandidats = candidats.length > 0;
  const hasFactures = type === "PAIEMENT" && factures && factures.length > 0;
  const hasFacturesFournisseur = type === "DEPENSE" && facturesFournisseur && facturesFournisseur.length > 0;

  if (!hasCandidats && !hasFactures && !hasFacturesFournisseur) {
    return <span className="text-xs text-slate-400">Aucun {type === "PAIEMENT" ? "paiement" : "dépense"} disponible</span>;
  }

  return (
    <div className="flex flex-col gap-2">
      {hasCandidats && (
        <form action={validerAction} className="flex items-center gap-2">
          {suggestionId && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                confiance === "EXACTE" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
              title={confiance === "EXACTE" ? "Montant et date très proches" : "Montant identique, date plus éloignée"}
            >
              {confiance === "EXACTE" ? "Suggestion forte" : "Suggestion"}
            </span>
          )}
          <select
            name="cibleId"
            defaultValue={suggestionId ?? ""}
            className="max-w-xs rounded-md border border-slate-200 px-2 py-1 text-xs"
            key={ligneId}
          >
            <option value="">— {type === "PAIEMENT" ? "Paiement enregistré" : "Dépense"} —</option>
            {candidats.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-brand-navy px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-blue-dark"
          >
            Valider
          </button>
        </form>
      )}

      {hasFactures && rapprochementerFactureAction && (
        <form action={rapprochementerFactureAction} className="flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
            Facture client
          </span>
          <select
            name="factureId"
            className="max-w-xs rounded-md border border-blue-200 px-2 py-1 text-xs"
          >
            <option value="">— Lier à une facture —</option>
            {factures!.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700"
          >
            Créer paiement
          </button>
        </form>
      )}

      {hasFacturesFournisseur && rapprochementerFactureFournisseurAction && (
        <form action={rapprochementerFactureFournisseurAction} className="flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
            Fact. fournisseur
          </span>
          <select
            name="factureId"
            className="max-w-xs rounded-md border border-orange-200 px-2 py-1 text-xs"
          >
            <option value="">— Lier à une facture fournisseur —</option>
            {facturesFournisseur!.map((f) => (
              <option key={f.id} value={f.id}>{f.label}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-brand-orange px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-orange-dark"
          >
            Régler facture
          </button>
        </form>
      )}
    </div>
  );
}
