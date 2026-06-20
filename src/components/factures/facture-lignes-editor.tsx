"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { sauvegarderLignesFacture } from "@/lib/actions/factures";
import { formatEuros } from "@/lib/format";

type Ligne = {
  key: string;
  type: "CHAPITRE" | "LIGNE";
  codeArticle: string;
  designation: string;
  unite: string;
  quantite: string;
  prixUnitaireHT: string;
  tauxTVA: string;
};

let keyCounter = 0;
function newKey() {
  keyCounter += 1;
  return `new-${keyCounter}`;
}

function toLigne(l: {
  id: string; type: string; codeArticle: string | null; designation: string;
  unite: string | null; quantite: number | null; prixUnitaireHT: number | null; tauxTVA: number | null;
}): Ligne {
  return {
    key: l.id,
    type: l.type === "CHAPITRE" || l.type === "SOUS_CHAPITRE" ? "CHAPITRE" : "LIGNE",
    codeArticle: l.codeArticle ?? "",
    designation: l.designation,
    unite: l.unite ?? "",
    quantite: l.quantite != null ? String(l.quantite) : "",
    prixUnitaireHT: l.prixUnitaireHT != null ? String(l.prixUnitaireHT) : "",
    tauxTVA: l.tauxTVA != null ? String(l.tauxTVA) : "20",
  };
}

export function FactureLignesEditor({
  factureId,
  lignesInitiales,
}: {
  factureId: string;
  lignesInitiales: {
    id: string; type: string; codeArticle: string | null; designation: string;
    unite: string | null; quantite: number | null; prixUnitaireHT: number | null; tauxTVA: number | null;
  }[];
}) {
  const [lignes, setLignes] = useState<Ligne[]>(
    lignesInitiales.length > 0 ? lignesInitiales.map(toLigne) : []
  );
  const [isPending, startTransition] = useTransition();

  function addLigne(type: "CHAPITRE" | "LIGNE") {
    setLignes((prev) => [
      ...prev,
      { key: newKey(), type, codeArticle: "", designation: "", unite: "u", quantite: "1", prixUnitaireHT: "", tauxTVA: "20" },
    ]);
  }

  function removeLigne(key: string) {
    setLignes((prev) => prev.filter((l) => l.key !== key));
  }

  function updateLigne(key: string, field: keyof Ligne, value: string) {
    setLignes((prev) => prev.map((l) => (l.key === key ? { ...l, [field]: value } : l)));
  }

  function calcTotal(l: Ligne) {
    if (l.type !== "LIGNE") return null;
    const qte = parseFloat(l.quantite) || 0;
    const pu = parseFloat(l.prixUnitaireHT) || 0;
    return qte * pu;
  }

  const totalHT = lignes.reduce((sum, l) => sum + (calcTotal(l) ?? 0), 0);

  function handleSave() {
    startTransition(() => {
      sauvegarderLignesFacture(
        factureId,
        lignes.map((l, idx) => ({
          ordre: idx + 1,
          type: l.type,
          codeArticle: l.codeArticle || null,
          designation: l.designation,
          unite: l.unite || null,
          quantite: l.quantite !== "" ? parseFloat(l.quantite) : null,
          prixUnitaireHT: l.prixUnitaireHT !== "" ? parseFloat(l.prixUnitaireHT) : null,
          tauxTVA: l.tauxTVA !== "" ? parseFloat(l.tauxTVA) : null,
        }))
      );
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
        <h3 className="font-semibold text-brand-navy">Lignes de facturation</h3>
        <div className="flex gap-2">
          <button type="button" onClick={() => addLigne("CHAPITRE")}
            className="text-xs font-medium text-slate-500 hover:text-brand-navy">
            + Chapitre
          </button>
          <button type="button" onClick={() => addLigne("LIGNE")}
            className="flex items-center gap-1 text-xs font-medium text-brand-blue hover:text-brand-navy">
            <Plus className="h-3.5 w-3.5" /> Ligne
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-3 py-2">Désignation</th>
              <th className="px-3 py-2 w-20">Unité</th>
              <th className="px-3 py-2 w-20 text-right">Qté</th>
              <th className="px-3 py-2 w-28 text-right">PU HT</th>
              <th className="px-3 py-2 w-20 text-right">TVA %</th>
              <th className="px-3 py-2 w-28 text-right">Total HT</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lignes.map((l) =>
              l.type === "CHAPITRE" ? (
                <tr key={l.key} className="bg-slate-50">
                  <td colSpan={6} className="px-3 py-1.5">
                    <input
                      value={l.designation}
                      onChange={(e) => updateLigne(l.key, "designation", e.target.value)}
                      placeholder="Titre du chapitre"
                      className="w-full bg-transparent text-xs font-bold uppercase tracking-wide text-brand-navy outline-none"
                    />
                  </td>
                  <td className="px-2">
                    <button type="button" onClick={() => removeLigne(l.key)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ) : (
                <tr key={l.key} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5">
                    <input value={l.designation} onChange={(e) => updateLigne(l.key, "designation", e.target.value)}
                      placeholder="Désignation" className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input value={l.unite} onChange={(e) => updateLigne(l.key, "unite", e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" value={l.quantite} onChange={(e) => updateLigne(l.key, "quantite", e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" step="0.01" value={l.prixUnitaireHT} onChange={(e) => updateLigne(l.key, "prixUnitaireHT", e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right" />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" step="0.1" value={l.tauxTVA} onChange={(e) => updateLigne(l.key, "tauxTVA", e.target.value)}
                      className="w-full border border-slate-200 rounded px-2 py-1 text-sm text-right" />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium text-slate-700">
                    {formatEuros(calcTotal(l) ?? 0)}
                  </td>
                  <td className="px-2">
                    <button type="button" onClick={() => removeLigne(l.key)} className="text-red-400 hover:text-red-600">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              )
            )}
            {lignes.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-400">
                  Aucune ligne. Cliquez sur « + Ligne » pour commencer.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold text-sm">
            <tr>
              <td colSpan={5} className="px-3 py-3 text-right text-slate-500">Total HT</td>
              <td className="px-3 py-3 text-right text-brand-navy">{formatEuros(totalHT)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="flex justify-end border-t border-slate-100 px-5 py-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          {isPending ? "Enregistrement…" : "Enregistrer les lignes"}
        </button>
      </div>
    </div>
  );
}
