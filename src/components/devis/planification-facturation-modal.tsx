"use client";

import { useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, Receipt, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
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
  // Mode incrémental : % de cette tranche (ex : 20%)
  // Mode cumulatif  : % cumulé atteint en fin de cette tranche (ex : 70%)
  valeur: string;
};

const PRESETS_INCR = [
  {
    label: "30 % / 40 % / 30 %",
    desc: "Acompte · Situation · Solde",
    tranches: [
      { type: "ACOMPTE" as TypeFacture, pct: 30 },
      { type: "SITUATION" as TypeFacture, pct: 40 },
      { type: "SOLDE" as TypeFacture, pct: 30 },
    ],
  },
  {
    label: "30 % / 30 % / 40 %",
    desc: "Acompte · Situation · Solde",
    tranches: [
      { type: "ACOMPTE" as TypeFacture, pct: 30 },
      { type: "SITUATION" as TypeFacture, pct: 30 },
      { type: "SOLDE" as TypeFacture, pct: 40 },
    ],
  },
  {
    label: "30 % / 70 %",
    desc: "Acompte · Solde",
    tranches: [
      { type: "ACOMPTE" as TypeFacture, pct: 30 },
      { type: "SOLDE" as TypeFacture, pct: 70 },
    ],
  },
  {
    label: "100 %",
    desc: "Facture unique",
    tranches: [{ type: "STANDARD" as TypeFacture, pct: 100 }],
  },
];

// Presets en mode cumulatif : valeur = % cumulé atteint à la fin de chaque tranche
const PRESETS_CUMUL = [
  {
    label: "30 / 70 / 100 %",
    desc: "Acompte · Situation 70% · Solde",
    tranches: [
      { type: "ACOMPTE" as TypeFacture, pct: 30 },
      { type: "SITUATION" as TypeFacture, pct: 70 },
      { type: "SOLDE" as TypeFacture, pct: 100 },
    ],
  },
  {
    label: "30 / 60 / 80 / 100 %",
    desc: "Acompte · Sit. 1 · Sit. 2 · Solde",
    tranches: [
      { type: "ACOMPTE" as TypeFacture, pct: 30 },
      { type: "SITUATION" as TypeFacture, pct: 60 },
      { type: "SITUATION" as TypeFacture, pct: 80 },
      { type: "SOLDE" as TypeFacture, pct: 100 },
    ],
  },
  {
    label: "30 / 50 / 70 / 90 / 100 %",
    desc: "Acompte · 3 situations · Solde",
    tranches: [
      { type: "ACOMPTE" as TypeFacture, pct: 30 },
      { type: "SITUATION" as TypeFacture, pct: 50 },
      { type: "SITUATION" as TypeFacture, pct: 70 },
      { type: "SITUATION" as TypeFacture, pct: 90 },
      { type: "SOLDE" as TypeFacture, pct: 100 },
    ],
  },
  {
    label: "100 %",
    desc: "Facture unique",
    tranches: [{ type: "STANDARD" as TypeFacture, pct: 100 }],
  },
];

let keyCounter = 0;
function makeKey() { keyCounter += 1; return keyCounter; }

// Pourcentage cumulé précédant la tranche i (= déjà facturé + toutes les tranches précédentes)
function cumuléAvant(tranches: Tranche[], idx: number, déjàPct: number, mode: "incr" | "cumul"): number {
  if (mode === "cumul") {
    // En mode cumulatif, le précédent est la valeur cumulée de la tranche d'avant
    if (idx === 0) return déjàPct;
    return parseFloat(tranches[idx - 1].valeur) || 0;
  }
  // En mode incrémental : somme des pourcentages précédents + déjà facturé
  let acc = déjàPct;
  for (let i = 0; i < idx; i++) acc += parseFloat(tranches[i].valeur) || 0;
  return acc;
}

// Net incrémental pour la tranche i
function netIncr(tranches: Tranche[], idx: number, déjàPct: number, mode: "incr" | "cumul"): number {
  if (mode === "incr") return parseFloat(tranches[idx].valeur) || 0;
  const cumulé = parseFloat(tranches[idx].valeur) || 0;
  const avant = cumuléAvant(tranches, idx, déjàPct, mode);
  return Math.max(0, cumulé - avant);
}

// % cumulé atteint en fin de tranche i
function cumuléAprès(tranches: Tranche[], idx: number, déjàPct: number, mode: "incr" | "cumul"): number {
  if (mode === "cumul") return parseFloat(tranches[idx].valeur) || 0;
  return cumuléAvant(tranches, idx, déjàPct, mode) + (parseFloat(tranches[idx].valeur) || 0);
}

function defaultLibelle(
  type: TypeFacture,
  situationIdx: number,
  devisNumero: string,
  modeCumulatif: boolean,
  pctCumulé?: number,
  pctNet?: number,
): string {
  switch (type) {
    case "ACOMPTE":
      return `Acompte sur travaux — ${devisNumero}`;
    case "SITUATION":
      if (modeCumulatif && pctCumulé !== undefined && pctNet !== undefined) {
        return `Situation n°${situationIdx} — avancement ${pctCumulé.toFixed(0)}% cumulé (net ${pctNet.toFixed(0)}%) — ${devisNumero}`;
      }
      return `Situation n°${situationIdx} sur travaux — ${devisNumero}`;
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
  const [mode, setMode] = useState<"incr" | "cumul">("incr");
  const [tranches, setTranches] = useState<Tranche[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const déjàFacturéPct = totalHT > 0 ? (montantDéjàFacturéHT / totalHT) * 100 : 0;

  // Total cumulé final (en fin de dernière tranche)
  const totalCumuléFinal =
    tranches.length === 0
      ? déjàFacturéPct
      : cumuléAprès(tranches, tranches.length - 1, déjàFacturéPct, mode);

  const dépassement = totalCumuléFinal > 100.01;

  function buildTranche(type: TypeFacture, valeur: number, idx: number, mode: "incr" | "cumul"): Tranche {
    const net = mode === "cumul" ? valeur - (idx === 0 ? 0 : 0) : valeur; // approximation, recalculated
    return {
      key: makeKey(),
      type,
      libelle: defaultLibelle(type, idx + 1, devisNumero, mode === "cumul"),
      valeur: String(valeur),
    };
  }

  function applyPreset(presets: typeof PRESETS_INCR, newMode: "incr" | "cumul") {
    // find which preset list to use based on current newMode
    const list = newMode === "cumul" ? PRESETS_CUMUL : PRESETS_INCR;
    // Not applicable here — used directly
    void list;
  }

  function applyPresetRows(rows: Array<{ type: TypeFacture; pct: number }>, newMode: "incr" | "cumul") {
    let sitIdx = 1;
    const newTranches = rows.map((r, i) => {
      const isNextSit = r.type === "SITUATION";
      const si = isNextSit ? sitIdx++ : 0;
      const pctCumulé = newMode === "cumul" ? r.pct : undefined;
      const pctNet = newMode === "cumul" ? (i === 0 ? r.pct : r.pct - rows[i - 1].pct) : r.pct;
      return {
        key: makeKey(),
        type: r.type,
        libelle: defaultLibelle(r.type, si, devisNumero, newMode === "cumul", pctCumulé, pctNet),
        valeur: String(r.pct),
      };
    });
    setTranches(newTranches);
    setMode(newMode);
    setError(null);
  }

  function toggleMode() {
    const newMode: "incr" | "cumul" = mode === "incr" ? "cumul" : "incr";
    // Convert existing tranches
    if (tranches.length > 0) {
      setTranches((cur) =>
        cur.map((t, i) => {
          let newVal: number;
          if (newMode === "cumul") {
            // incr → cumul: valeur = cumuléAprès
            newVal = cumuléAprès(cur, i, déjàFacturéPct, "incr");
          } else {
            // cumul → incr: valeur = netIncr
            newVal = netIncr(cur, i, déjàFacturéPct, "cumul");
          }
          return { ...t, valeur: String(Math.round(newVal * 10) / 10) };
        }),
      );
    }
    setMode(newMode);
    setError(null);
  }

  function addTranche() {
    const idx = tranches.length;
    const lastCumulé = tranches.length > 0
      ? cumuléAprès(tranches, tranches.length - 1, déjàFacturéPct, mode)
      : déjàFacturéPct;
    const reste = Math.max(0, Math.round((100 - lastCumulé) * 10) / 10);
    const defaultVal = mode === "cumul"
      ? Math.min(100, lastCumulé + reste)
      : reste;
    const sitIdx = tranches.filter((t) => t.type === "SITUATION").length + 1;
    setTranches((cur) => [
      ...cur,
      {
        key: makeKey(),
        type: "SITUATION",
        libelle: defaultLibelle("SITUATION", sitIdx, devisNumero, mode === "cumul"),
        valeur: String(defaultVal),
      },
    ]);
  }

  function updateTranche(key: number, patch: Partial<Omit<Tranche, "key">>) {
    setTranches((cur) => {
      const idx = cur.findIndex((t) => t.key === key);
      return cur.map((t, i) => {
        if (t.key !== key) return t;
        const updated = { ...t, ...patch };
        // Auto-update libelle when type changes
        if (patch.type && !patch.libelle) {
          const sitIdx = cur.filter((x, j) => j < i && x.type === "SITUATION").length + 1;
          const avant = cumuléAvant(cur, i, déjàFacturéPct, mode);
          const cumulé = mode === "cumul" ? parseFloat(updated.valeur) || 0 : avant + (parseFloat(updated.valeur) || 0);
          const net = mode === "cumul" ? Math.max(0, cumulé - avant) : parseFloat(updated.valeur) || 0;
          updated.libelle = defaultLibelle(patch.type, sitIdx, devisNumero, mode === "cumul", cumulé, net);
        }
        return updated;
      });
    });
  }

  function removeTranche(key: number) {
    setTranches((cur) => cur.filter((t) => t.key !== key));
  }

  function handleSubmit() {
    if (tranches.length === 0) { setError("Ajoutez au moins une tranche."); return; }
    if (dépassement) { setError("Le total dépasse 100 % du devis."); return; }

    // Validate cumulative mode: each cumulé must be > previous
    if (mode === "cumul") {
      for (let i = 0; i < tranches.length; i++) {
        const net = netIncr(tranches, i, déjàFacturéPct, "cumul");
        if (net < 0.01) {
          setError(`Tranche ${i + 1} : le % cumulé doit être supérieur au précédent.`);
          return;
        }
      }
    }

    const payload = tranches.map((t, i) => ({
      type: t.type,
      libelle: t.libelle,
      pourcentage: Math.round(netIncr(tranches, i, déjàFacturéPct, mode) * 100) / 100,
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

  const presets = mode === "cumul" ? PRESETS_CUMUL : PRESETS_INCR;

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setTranches([]); setMode("incr"); setError(null); }}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-blue-dark transition"
      >
        <Receipt className="h-4 w-4" />
        Planifier la facturation
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="flex w-full max-w-2xl flex-col gap-5 rounded-2xl bg-white p-6 shadow-2xl max-h-[92vh] overflow-y-auto">

            {/* En-tête */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">Planifier la facturation</h2>
                <p className="text-sm text-slate-500">
                  {devisNumero} —{" "}
                  <span className="font-semibold">{formatEuros(totalHT)} HT</span> /{" "}
                  <span className="font-semibold">{formatEuros(totalTTC)} TTC</span>
                </p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Toggle mode */}
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  {mode === "incr" ? "Mode incrémental" : "Mode situations cumulatives (BTP)"}
                </p>
                <p className="text-xs text-slate-500">
                  {mode === "incr"
                    ? "Saisir le % de chaque tranche (ex : 30%, puis 40%, puis 30%)"
                    : "Saisir le % d'avancement atteint (ex : 30%, 70%, 100%) — le net est calculé automatiquement"}
                </p>
              </div>
              <button
                type="button"
                onClick={toggleMode}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mode === "cumul"
                    ? "bg-brand-navy text-white"
                    : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                }`}
              >
                {mode === "cumul"
                  ? <ToggleRight className="h-4 w-4" />
                  : <ToggleLeft className="h-4 w-4" />}
                {mode === "cumul" ? "Cumulatif activé" : "Activer le mode cumulatif"}
              </button>
            </div>

            {/* Presets */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Modèles rapides
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPresetRows(preset.tranches, mode)}
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
                <span>Avancement cumulé total</span>
                <span className={
                  dépassement ? "font-bold text-red-600"
                    : totalCumuléFinal >= 99.9 ? "font-bold text-green-600"
                    : "font-semibold text-slate-700"
                }>
                  {totalCumuléFinal.toFixed(1)} % — {formatEuros(totalHT * totalCumuléFinal / 100)} HT
                </span>
              </div>
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-slate-100">
                {/* Déjà facturé */}
                {déjàFacturéPct > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-green-400 opacity-70"
                    style={{ width: `${Math.min(100, déjàFacturéPct)}%` }}
                    title={`Déjà facturé : ${déjàFacturéPct.toFixed(1)}%`}
                  />
                )}
                {/* Nouvelles tranches */}
                <div
                  className={`absolute inset-y-0 rounded-full transition-all ${
                    dépassement ? "bg-red-500" : "bg-brand-blue"
                  }`}
                  style={{
                    left: `${Math.min(100, déjàFacturéPct)}%`,
                    width: `${Math.min(100 - déjàFacturéPct, Math.max(0, totalCumuléFinal - déjàFacturéPct))}%`,
                  }}
                />
              </div>
              <div className="mt-1 flex gap-4 text-[10px] text-slate-400">
                {montantDéjàFacturéHT > 0 && (
                  <span>
                    <span className="inline-block h-2 w-2 rounded-full bg-green-400 opacity-70 mr-1" />
                    Déjà facturé : {déjàFacturéPct.toFixed(1)}% ({formatEuros(montantDéjàFacturéHT)} HT)
                  </span>
                )}
                {tranches.length > 0 && (
                  <span>
                    <span className="inline-block h-2 w-2 rounded-full bg-brand-blue mr-1" />
                    À créer : {(totalCumuléFinal - déjàFacturéPct).toFixed(1)}%
                    ({formatEuros(totalHT * (totalCumuléFinal - déjàFacturéPct) / 100)} HT)
                  </span>
                )}
              </div>
            </div>

            {/* En-têtes de colonnes */}
            {tranches.length > 0 && (
              <div className={`grid text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-1 ${
                mode === "cumul" ? "grid-cols-[1.5rem_7rem_5rem_5rem_1fr_1.5rem]" : "grid-cols-[1.5rem_7rem_5rem_1fr_1.5rem]"
              } gap-2`}>
                <span />
                <span>Type</span>
                {mode === "cumul" && <span className="text-center">% cumulé</span>}
                <span className={mode === "cumul" ? "text-right" : "text-center"}>
                  {mode === "cumul" ? "Net €" : "% tranche"}
                </span>
                <span>Libellé</span>
                <span />
              </div>
            )}

            {/* Liste des tranches */}
            <div className="flex flex-col gap-2">
              {tranches.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
                  Choisissez un modèle ou ajoutez une tranche.
                </p>
              )}

              {tranches.map((tranche, idx) => {
                const net = netIncr(tranches, idx, déjàFacturéPct, mode);
                const cumAprès = cumuléAprès(tranches, idx, déjàFacturéPct, mode);
                const cumAvant = cumuléAvant(tranches, idx, déjàFacturéPct, mode);
                const montantNetHT = Math.round(totalHT * (net / 100) * 100) / 100;
                const montantNetTTC = Math.round(totalTTC * (net / 100) * 100) / 100;
                const montantCumHT = Math.round(totalHT * (cumAprès / 100) * 100) / 100;
                const netNegatif = mode === "cumul" && net < 0;

                return (
                  <div
                    key={tranche.key}
                    className={`flex flex-col gap-2 rounded-xl border p-3 ${
                      netNegatif ? "border-red-200 bg-red-50/40" : "border-slate-200 bg-slate-50/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 w-4 shrink-0">{idx + 1}</span>

                      {/* Type */}
                      <select
                        value={tranche.type}
                        onChange={(e) => updateTranche(tranche.key, { type: e.target.value as TypeFacture })}
                        className={`rounded-md border px-2 py-1.5 text-xs font-semibold shrink-0 ${TYPE_COLORS[tranche.type]}`}
                      >
                        {(Object.keys(TYPE_LABELS) as TypeFacture[]).map((t) => (
                          <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                        ))}
                      </select>

                      {mode === "cumul" ? (
                        /* Mode cumulatif : saisie du % cumulé atteint */
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex flex-col items-center">
                            <span className="text-[9px] text-slate-400 mb-0.5">% cumulé</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                min={cumAvant + 0.5}
                                max="100"
                                value={tranche.valeur}
                                onChange={(e) => updateTranche(tranche.key, { valeur: e.target.value })}
                                className={`w-16 rounded-md border bg-white px-2 py-1.5 text-center text-sm font-semibold ${
                                  netNegatif ? "border-red-300 text-red-600" : "border-slate-200"
                                }`}
                              />
                              <span className="text-sm text-slate-500">%</span>
                            </div>
                          </div>
                          {/* Flèche et net */}
                          <div className="flex flex-col items-start ml-1">
                            <span className="text-[9px] text-slate-400 mb-0.5">net à facturer</span>
                            <div className={`rounded-md border px-2 py-1.5 text-xs font-semibold ${
                              netNegatif
                                ? "border-red-200 bg-red-50 text-red-600"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}>
                              {net >= 0 ? "+" : ""}{net.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Mode incrémental : saisie du % de la tranche */
                        <div className="flex items-center gap-1 shrink-0">
                          <input
                            type="number"
                            step="0.5"
                            min="0.1"
                            max="100"
                            value={tranche.valeur}
                            onChange={(e) => updateTranche(tranche.key, { valeur: e.target.value })}
                            className="w-16 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-center text-sm font-semibold"
                          />
                          <span className="text-sm text-slate-500">%</span>
                        </div>
                      )}

                      {/* Montants */}
                      <div className="flex-1 text-right">
                        <span className="font-mono text-sm font-semibold text-slate-700">
                          {formatEuros(montantNetHT)} HT
                        </span>
                        <span className="ml-1 text-xs text-slate-400">
                          / {formatEuros(montantNetTTC)} TTC
                        </span>
                        {mode === "cumul" && (
                          <p className="text-[10px] text-slate-400">
                            cumulé : {formatEuros(montantCumHT)} HT ({cumAprès.toFixed(1)}%)
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => removeTranche(tranche.key)}
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition shrink-0"
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

                    {/* Explication cumulative */}
                    {mode === "cumul" && net > 0 && (
                      <div className="ml-6 rounded-md bg-amber-50 border border-amber-100 px-3 py-1.5 text-[11px] text-amber-700">
                        Avancement {cumAvant.toFixed(1)}% → {cumAprès.toFixed(1)}% — déduction des factures précédentes
                        ({formatEuros(totalHT * cumAvant / 100)} HT) → <strong>net : {formatEuros(montantNetHT)} HT</strong>
                      </div>
                    )}
                    {netNegatif && (
                      <p className="ml-6 text-xs text-red-600">
                        ⚠ Le % cumulé doit être supérieur à celui de la tranche précédente ({cumAvant.toFixed(1)}%).
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Ajouter */}
            <button
              type="button"
              onClick={addTranche}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-500 hover:border-brand-blue/40 hover:text-brand-blue transition"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter une tranche
            </button>

            {/* Récap global */}
            {tranches.length > 0 && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>Total des nouvelles factures</span>
                  <span className="font-mono">
                    {formatEuros(tranches.reduce((s, t, i) => s + Math.round(totalHT * (netIncr(tranches, i, déjàFacturéPct, mode) / 100) * 100) / 100, 0))} HT
                  </span>
                </div>
                <div className="flex justify-between mt-0.5 text-slate-500">
                  <span>Soit {(totalCumuléFinal - déjàFacturéPct).toFixed(1)}% du devis</span>
                  <span className="font-mono">
                    {formatEuros(tranches.reduce((s, t, i) => s + Math.round(totalTTC * (netIncr(tranches, i, déjàFacturéPct, mode) / 100) * 100) / 100, 0))} TTC
                  </span>
                </div>
                {100 - totalCumuléFinal > 0.1 && (
                  <p className="mt-1 text-amber-600">
                    Reste à facturer ultérieurement : {(100 - totalCumuléFinal).toFixed(1)}%
                    ({formatEuros(totalHT * (100 - totalCumuléFinal) / 100)} HT)
                  </p>
                )}
              </div>
            )}

            {/* Erreur */}
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
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
