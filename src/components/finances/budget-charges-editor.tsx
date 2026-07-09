"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { saveBudgetCharges, type BudgetLigne } from "@/lib/actions/budget-charges";
import { formatEuros } from "@/lib/format";

const CATEGORIES_FIXES = [
  { value: "SALAIRES", label: "Salaires & charges sociales" },
  { value: "LOYER", label: "Loyer & charges locatives" },
  { value: "ASSURANCE", label: "Assurances" },
  { value: "ADMINISTRATIF", label: "Frais administratifs" },
  { value: "IMPOT_TAXE", label: "Impôts & taxes" },
  { value: "AMORTISSEMENT", label: "Amortissements" },
  { value: "INVESTISSEMENT", label: "Investissements" },
  { value: "AUTRE", label: "Autres charges fixes" },
];

const CATEGORIES_VARIABLES = [
  { value: "MATERIAUX", label: "Achats matériaux" },
  { value: "SOUS_TRAITANCE", label: "Sous-traitance" },
  { value: "TRANSPORT", label: "Transport & déplacement" },
  { value: "MAIN_OEUVRE", label: "Main-d'œuvre directe" },
  { value: "INTERIM", label: "Intérimaires" },
  { value: "AUTRE", label: "Autres charges variables" },
];

type Row = BudgetLigne & { key: string };

let keyCounter = 0;
function newKey() { return `row-${++keyCounter}`; }

function toRow(l: BudgetLigne): Row {
  return { ...l, key: l.id ?? newKey() };
}

function emptyRow(type: "FIXE" | "VARIABLE"): Row {
  return {
    key: newKey(),
    label: "",
    categorie: type === "FIXE" ? "LOYER" : "MATERIAUX",
    type,
    montantAnnuel: 0,
  };
}

export function BudgetChargesEditor({
  annee,
  lignes,
}: {
  annee: number;
  lignes: BudgetLigne[];
}) {
  const [rows, setRows] = useState<Row[]>(() => lignes.map(toRow));
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const fixes = rows.filter((r) => r.type === "FIXE");
  const variables = rows.filter((r) => r.type === "VARIABLE");

  function update(key: string, patch: Partial<Row>) {
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setSaved(false);
  }

  function addRow(type: "FIXE" | "VARIABLE") {
    setRows((cur) => [...cur, emptyRow(type)]);
    setSaved(false);
  }

  function removeRow(key: string) {
    setRows((cur) => cur.filter((r) => r.key !== key));
    setSaved(false);
  }

  function handleSave() {
    startTransition(async () => {
      await saveBudgetCharges(annee, rows.filter((r) => r.label.trim() !== ""));
      setSaved(true);
    });
  }

  const totalFixes = fixes.reduce((s, r) => s + (r.montantAnnuel || 0), 0);
  const totalVariables = variables.reduce((s, r) => s + (r.montantAnnuel || 0), 0);

  return (
    <div className="flex flex-col gap-8">
      {/* Bouton save flottant */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Saisissez vos budgets annuels — ils serviront à calculer le seuil de rentabilité.
        </p>
        <button
          onClick={handleSave}
          disabled={pending}
          className="flex items-center gap-2 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-60 transition"
        >
          <Save className="h-4 w-4" />
          {pending ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
        </button>
      </div>

      {/* ── CHARGES FIXES ─────────────────────────────────────── */}
      <Section
        title="Charges fixes"
        subtitle="Loyer, assurances, salaires permanents, amortissements… (indépendantes du CA)"
        color="blue"
        rows={fixes}
        categories={CATEGORIES_FIXES}
        total={totalFixes}
        type="FIXE"
        onUpdate={update}
        onRemove={removeRow}
        onAdd={() => addRow("FIXE")}
      />

      {/* ── CHARGES VARIABLES ─────────────────────────────────── */}
      <Section
        title="Charges variables"
        subtitle="Matériaux, sous-traitance, transport, intérimaires… (varient avec l'activité)"
        color="orange"
        rows={variables}
        categories={CATEGORIES_VARIABLES}
        total={totalVariables}
        type="VARIABLE"
        onUpdate={update}
        onRemove={removeRow}
        onAdd={() => addRow("VARIABLE")}
      />
    </div>
  );
}

function Section({
  title,
  subtitle,
  color,
  rows,
  categories,
  total,
  type,
  onUpdate,
  onRemove,
  onAdd,
}: {
  title: string;
  subtitle: string;
  color: "blue" | "orange";
  rows: Row[];
  categories: { value: string; label: string }[];
  total: number;
  type: "FIXE" | "VARIABLE";
  onUpdate: (key: string, patch: Partial<Row>) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
}) {
  const accent = color === "blue" ? "bg-brand-blue/10 border-brand-blue/20 text-brand-blue" : "bg-brand-orange/10 border-brand-orange/20 text-brand-orange";
  const headerBg = color === "blue" ? "bg-brand-navy" : "bg-brand-orange";

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className={`${headerBg} px-5 py-3 flex items-center justify-between`}>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="text-xs text-white/70">{subtitle}</p>
        </div>
        <span className="text-lg font-bold text-white">{formatEuros(total)} / an</span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <th className="px-4 py-2.5 text-left w-72">Libellé</th>
            <th className="px-4 py-2.5 text-left w-52">Catégorie</th>
            <th className="px-4 py-2.5 text-right w-40">Budget annuel HT</th>
            <th className="px-4 py-2.5 text-right w-36">/ mois</th>
            <th className="w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {rows.length === 0 && (
            <tr>
              <td colSpan={5} className="px-4 py-6 text-center text-sm text-slate-400 italic">
                Aucune charge — cliquez sur « Ajouter » pour commencer
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-slate-50/60">
              <td className="px-4 py-2">
                <input
                  value={row.label}
                  onChange={(e) => onUpdate(row.key, { label: e.target.value })}
                  placeholder="Ex : Loyer bureau principal"
                  className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </td>
              <td className="px-4 py-2">
                <select
                  value={row.categorie}
                  onChange={(e) => onUpdate(row.key, { categorie: e.target.value })}
                  className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-2">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.montantAnnuel || ""}
                  onChange={(e) => onUpdate(row.key, { montantAnnuel: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full rounded-md border border-slate-200 px-2.5 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </td>
              <td className="px-4 py-2 text-right text-sm text-slate-500">
                {formatEuros((row.montantAnnuel || 0) / 12)}
              </td>
              <td className="px-4 py-2 text-center">
                <button
                  type="button"
                  onClick={() => onRemove(row.key)}
                  className="text-slate-300 hover:text-red-500 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-slate-100 bg-slate-50/50">
            <td colSpan={5} className="px-4 py-2.5">
              <button
                type="button"
                onClick={onAdd}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${accent}`}
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter une charge {type === "FIXE" ? "fixe" : "variable"}
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
