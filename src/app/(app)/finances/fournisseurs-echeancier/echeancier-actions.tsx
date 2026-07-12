"use client";

import { useState, useTransition } from "react";
import { enregistrerPaiementFournisseur, supprimerFactureFournisseur } from "@/lib/actions/factures-fournisseur";
import { formatEuros } from "@/lib/format";

interface Props {
  factureId: string;
  restedu: number;
  fournisseurNom: string;
  numero: string;
}

export function EcheancierActions({ factureId, restedu, fournisseurNom, numero }: Props) {
  const [showPayer, setShowPayer] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (showPayer) {
    return (
      <form
        action={(fd) => {
          fd.set("factureId", factureId);
          startTransition(() => {
            enregistrerPaiementFournisseur(fd).then(() => setShowPayer(false));
          });
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="factureId" value={factureId} />
        <input
          type="number"
          name="montant"
          step="0.01"
          min="0.01"
          max={restedu}
          defaultValue={restedu.toFixed(2)}
          required
          className="w-28 rounded border border-slate-200 px-2 py-1 text-xs"
          placeholder="Montant"
        />
        <input
          type="date"
          name="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="rounded border border-slate-200 px-2 py-1 text-xs"
        />
        <select name="methode" className="rounded border border-slate-200 px-2 py-1 text-xs">
          <option value="VIREMENT">Virement</option>
          <option value="CHEQUE">Chèque</option>
          <option value="CB">CB</option>
          <option value="ESPECES">Espèces</option>
        </select>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {isPending ? "…" : "✓"}
        </button>
        <button
          type="button"
          onClick={() => setShowPayer(false)}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {restedu > 0 && (
        <button
          onClick={() => setShowPayer(true)}
          className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-200"
        >
          Payer
        </button>
      )}
      <form
        action={supprimerFactureFournisseur.bind(null, factureId)}
        onSubmit={(e) => {
          if (!confirm(`Supprimer la facture ${numero} de ${fournisseurNom} ?`)) e.preventDefault();
        }}
      >
        <button type="submit" className="text-xs text-slate-300 hover:text-red-500">
          ✕
        </button>
      </form>
    </div>
  );
}
