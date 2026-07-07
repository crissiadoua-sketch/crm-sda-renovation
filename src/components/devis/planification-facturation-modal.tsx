"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, Receipt, ChevronRight } from "lucide-react";
import { formatEuros } from "@/lib/format";
import { creerTranchesFacturation } from "@/lib/actions/devis";

type TypeFacture = "ACOMPTE" | "SITUATION" | "SOLDE" | "STANDARD";

const TYPE_LABELS: Record<TypeFacture, string> = {
  ACOMPTE: "Acompte",
  SITUATION: "Situation",
  SOLDE: "Solde",
  STANDARD: "Standard",
};

const TYPE_COLORS: Record<TypeFacture, string> = {
  ACOMPTE: "bg-blue-100 text-blue-700 border-blue-200",
  SITUATION: "bg-orange-100 text-orange-700 border-orange-200",
  SOLDE: "bg-green-100 text-green-700 border-green-200",
  STANDARD: "bg-slate-100 text-slate-600 border-slate-200",
};

type Tranche = {
  key: number;
  type: TypeFacture;
  libelle: string;
  pourcentage: string;
};

const PRESETS = [
  {
    label: "30 % / 40 % / 30 %",
    desc: "Acompte · Situation · Solde",
    tranches: [
      { type: "ACOMPTE" as TypeFacture, pourcentage: 30 },
      { type: "SITUATION" as TypeFacture, pourcentage: 40 },
      { type: "SOLDE" as TypeFacture, pourcentage: 30 },
    ],
  },
  {
    label: "30 % / 70 %",
    desc: "Acompte · Solde",
    tranches: [
      { type: "ACOMPTE" as TypeFacture, pourcentage: 30 },
      { type: "SOLDE" as TypeFacture, pourcentage: 70 },
    ],
  },
  {
    label: "50 % / 50 %",
    desc: "Acompte · Solde",
    tranches: [
      { type: "ACOMPTE" as TypeFacture, pourcentage: 50 },
      { type: "SOLDE" as TypeFacture, pourcentage: 50 },
    ],
  },
  {
    label: "100 %",
    desc: "Facture unique",
    tranches: [{ type: "STANDARD" as TypeFacture, pourcentage: 100 }],
  },
];

let keyCounter = 0;
function makeKey() {
  keyCounter += 1;
  return keyCounter;
}

function defaultLibelle(type: TypeFacture, index: number, devisNumero: string): string {
  switch (type) {
    case "ACOMPTE":
      return `Acompte sur travaux — ${devisNumero}`;
    case "SITUATION":
      return `Situation n°${index} sur travaux — ${devisNumero}`;
    case "SOLDE":
      return `Solde sur travaux — ${devisNumero}`;
    default:
      return `Travaux — ${devisNumero}`;
  }
}

export function PlanificationFacturationModal({
  devisId,
  devisNumero,
  totalHT,
  totalTTC,
  montantDéjàFacturéHT,
}: {
  devisId: string;
  devisNumero: string;
  totalHT: number;
  totalTTC: number;
  montantDéjàFacturéHT: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const déjàFacturéPct = totalHT > 0 ? (montantDéjàFacturéHT / totalHT) * 100 : 0;
  const totalPct = tranches.reduce((s, t) => s + (parseFloat(t.pourcentage) || 0), 0);
  const resteDisponible = Math.max(0, 100 - déjàFacturéPct - totalPct);
  const totalPctFinal = déjàFacturéPct + totalPct;
  const dépassement = totalPctFinal > 100.01;

  function applyPreset(preset: typeof PRESETS[0]) {
    let situationIdx = 1;
    setTranches(
      preset.tranches.map((t) => {
        const idx = t.type === "SITUATION" ? situationIdx++ : 0;
        return {
          key: makeKey(),
          type: t.type,
          libelle: defaultLibelle(t.type, idx, devisNumero),
          pourcentage: String(t.pourcentage),
        };
      }),
    );
    setError(null);
  }

  function addTranche() {
    const type: TypeFacture = "SITUATION";
    const idx = tranches.filter((t) => t.type === "SITUATION").length + 1;
    setTranches((cur) => [
      ...cur,
      {
        key: makeKey(),
        type,
        libelle: defaultLibelle(type, idx, devisNumero),
        pourcentage: String(Math.max(0, Math.round(resteDisponible))),
      },
    ]);
  }

  function updateTranche(key: number, patch: Partial<Omit<Tranche, "key">>) {
    setTranches((cur) =>
      cur.map((t) => {
        if (t.key !== key) return t;
        const updated = { ...t, ...patch };
        if (patch.type) {
          const idx = cur.filter((x) => x.key !== key && x.type === patch.type).length + 1;
          updated.libelle = defaultLibelle(patch.type, idx, devisNumero);
        }
        return updated;
      }),
    );
  }

  function removeTranche(key: number) {
    setTranches((cur) => cur.filter((t) => t.key !== key));
  }

  function handleSubmit() {
    if (tranches.length === 0) { setError("Ajoutez au moins une tranche."); return; }
    if (dépassement) { setError("Le total dépasse 100 % du devis."); return; }

    const payload = tranches.map((t) => ({
      type: t.type,
      libelle: t.libelle,
      pourcentage: parseFloat(t.pourcentage) || 0,
    }));

    setLoading(true);
    setError(null);
    startTransition(async () => {
      try {
        const result = await creerTranchesFacturation(devisId, payload);
        if (result.error) {
          setError(result.error);
          setLoading(false);
        } else {
          setOpen(false);
          router.refresh();
        }
      } catch {
        setError("Erreur lors de la création des factures.");
        setLoading(false);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setTranches([]); setError(null); }}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-blue-dark transition"
      >
        <Receipt className="h-4 w-4" />
        Planifier la facturation
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-2xl flex-col gap-5 rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* En-tête */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">Planifier la facturation</h2>
                <p className="text-sm text-slate-500">
                  Devis {devisNumero} —{" "}
                  <span className="font-semibold">{formatEuros(totalHT)} HT</span> /{" "}
                  <span className="font-semibold">{formatEuros(totalTTC)} TTC</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Presets */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Modèles rapides
              </p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-left hover:border-brand-blue/40 hover:bg-slate-50 transition"
                  >
                    <p className="text-xs font-semibold text-slate-700">{preset.label}</p>
                    <p className="text-[10px] text-slate-400">{preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Barre de progression globale */}
            <div>
              <div className="mb-1 flex justify-between text-xs text-slate-500">
                <span>Total planifié</span>
                <span className={dépassement ? "font-bold text-red-600" : totalPctFinal >= 99.9 ? "font-bold text-green-600" : "font-semibold text-slate-700"}>
                  {totalPctFinal.toFixed(1)} %
                </span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {déjàFacturéPct > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-green-400 opacity-60"
                    style={{ width: `${Math.min(100, déjàFacturéPct)}%` }}
                    title={`Déjà facturé : ${déjàFacturéPct.toFixed(1)} %`}
                  />
                )}
                <div
                  className={`absolute inset-y-0 rounded-full transition-all ${dépassement ? "bg-red-500" : "bg-brand-blue"}`}
                  style={{ left: `${Math.min(100, déjàFacturéPct)}%`, width: `${Math.min(100 - déjàFacturéPct, totalPct)}%` }}
                />
              </div>
              {montantDéjàFacturéHT > 0 && (
                <p className="mt-1 text-[10px] text-slate-400">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-400 opacity-60 mr-1" />
                  Déjà facturé : {déjàFacturéPct.toFixed(1)} % ({formatEuros(montantDéjàFacturéHT)} HT)
                </p>
              )}
            </div>

            {/* Liste des tranches */}
            <div className="flex flex-col gap-2">
              {tranches.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                  Choisissez un modèle rapide ou ajoutez une tranche manuellement.
                </p>
              )}
              {tranches.map((tranche, idx) => {
                const pct = parseFloat(tranche.pourcentage) || 0;
                const montantHT = Math.round(totalHT * (pct / 100) * 100) / 100;
                const montantTTC = Math.round(totalTTC * (pct / 100) * 100) / 100;

                return (
                  <div
                    key={tranche.key}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}</span>
                      {/* Type */}
                      <select
                        value={tranche.type}
                        onChange={(e) => updateTranche(tranche.key, { type: e.target.value as TypeFacture })}
                        className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${TYPE_COLORS[tranche.type]}`}
                      >
                        {(Object.keys(TYPE_LABELS) as TypeFacture[]).map((t) => (
                          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                        ))}
                      </select>
                      {/* Pourcentage */}
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          max="100"
                          value={tranche.pourcentage}
                          onChange={(e) => updateTranche(tranche.key, { pourcentage: e.target.value })}
                          className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-semibold"
                        />
                        <span className="text-sm text-slate-500">%</span>
                      </div>
                      {/* Montant calculé */}
                      <div className="flex-1 text-right">
                        <span className="font-mono text-sm font-semibold text-slate-700">
                          {formatEuros(montantHT)} HT
                        </span>
                        <span className="ml-1 text-xs text-slate-400">
                          / {formatEuros(montantTTC)} TTC
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeTranche(tranche.key)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    {/* Libellé */}
                    <div className="flex items-center gap-2 pl-6">
                      <ChevronRight className="h-3 w-3 text-slate-300 shrink-0" />
                      <input
                        type="text"
                        value={tranche.libelle}
                        onChange={(e) => updateTranche(tranche.key, { libelle: e.target.value })}
                        placeholder="Libellé de la facture"
                        className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 placeholder:text-slate-300"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Ajouter une tranche */}
            <button
              type="button"
              onClick={addTranche}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-brand-blue/40 hover:text-brand-blue transition"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une tranche
            </button>

            {/* Erreur */}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading || tranches.length === 0 || dépassement}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-50 transition"
              >
                <Receipt className="h-4 w-4" />
                {loading
                  ? "Création en cours…"
                  : `Créer ${tranches.length} facture${tranches.length > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
