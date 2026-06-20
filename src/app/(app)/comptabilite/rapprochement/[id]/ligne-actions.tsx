"use client";

export function LigneActions({
  ligneId,
  type,
  candidats,
  suggestionId,
  confiance,
  validerAction,
}: {
  ligneId: string;
  type: "PAIEMENT" | "DEPENSE";
  candidats: { id: string; label: string }[];
  suggestionId?: string;
  confiance?: "EXACTE" | "PROBABLE";
  validerAction: (formData: FormData) => void | Promise<void>;
}) {
  if (candidats.length === 0) {
    return <span className="text-xs text-slate-400">Aucun {type === "PAIEMENT" ? "paiement" : "dépense"} disponible à proposer</span>;
  }

  return (
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
        <option value="">— Choisir {type === "PAIEMENT" ? "un paiement" : "une dépense"} —</option>
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
  );
}
