"use client";

import { useState, useTransition } from "react";
import { Trash2, Pencil, Check, X, ArrowRightCircle } from "lucide-react";
import { formatEuros } from "@/lib/format";
import {
  supprimerDepensePrevisionnelle,
  modifierDepensePrevisionnelle,
  convertirDepensePrevisionnelle,
} from "@/lib/actions/depenses";

const CAT_OPTIONS = [
  { value: "MATERIAUX",      label: "Matériaux" },
  { value: "SOUS_TRAITANCE", label: "Sous-traitance" },
  { value: "MAIN_OEUVRE",    label: "Main d'œuvre" },
  { value: "TRANSPORT",      label: "Transport" },
  { value: "ADMINISTRATIF",  label: "Administratif" },
  { value: "AUTRE",          label: "Autre" },
];
const CAT_LABEL: Record<string, string> = Object.fromEntries(
  CAT_OPTIONS.map((o) => [o.value, o.label])
);

type Props = {
  id: string;
  libelle: string;
  montant: number;
  categorie: string;
  dateISO: string;
  chantier?: string | null;
  tiers?: string | null;
};

export function DepensePrevRow({
  id, libelle, montant, categorie, dateISO, chantier, tiers,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const editAction   = modifierDepensePrevisionnelle.bind(null, id);
  const deleteAction = supprimerDepensePrevisionnelle.bind(null, id);
  const convertAction = convertirDepensePrevisionnelle.bind(null, id);

  // ── Mode édition ──────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="border-l-4 border-brand-orange bg-orange-50/60 px-5 py-3">
        <form
          action={(fd) => {
            startTransition(async () => {
              await editAction(fd);
            });
          }}
          className="flex flex-wrap items-end gap-2"
        >
          {/* Libellé */}
          <div className="flex-1 min-w-52">
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Libellé</label>
            <input
              name="libelle"
              defaultValue={libelle}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>

          {/* Montant */}
          <div className="w-28">
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Montant HT (€)</label>
            <input
              name="montant"
              type="number"
              step="0.01"
              min="0"
              defaultValue={montant}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>

          {/* Date */}
          <div className="w-36">
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Date prévue</label>
            <input
              name="date"
              type="date"
              defaultValue={dateISO}
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
          </div>

          {/* Catégorie */}
          <div className="w-40">
            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Catégorie</label>
            <select
              name="categorie"
              defaultValue={categorie}
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            >
              {CAT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Boutons */}
          <div className="flex gap-1.5">
            <button
              type="submit"
              disabled={pending}
              className="flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-blue-dark transition disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              Enregistrer
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 transition"
            >
              <X className="h-3.5 w-3.5" />
              Annuler
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Mode lecture ──────────────────────────────────────────────────────────
  return (
    <div className="group flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-orange-50/30 transition-colors">
      <span className="text-lg">📋</span>

      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium text-slate-700">{libelle}</span>
        {(chantier || tiers) && (
          <p className="text-xs text-slate-400">
            {[chantier, tiers].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>

      {/* Badge catégorie */}
      <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
        {CAT_LABEL[categorie] ?? categorie}
      </span>

      {/* Montant */}
      <span className="shrink-0 font-bold text-red-600">-{formatEuros(montant)}</span>

      {/* Actions (visibles au hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Éditer */}
        <button
          type="button"
          onClick={() => setEditing(true)}
          title="Modifier"
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-blue transition-colors"
        >
          <Pencil className="h-4 w-4" />
        </button>

        {/* Convertir en réelle */}
        <form action={convertAction}>
          <button
            type="submit"
            title="Convertir en dépense réelle (payée)"
            className="rounded p-1 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
          >
            <ArrowRightCircle className="h-4 w-4" />
          </button>
        </form>

        {/* Supprimer */}
        <form action={deleteAction}>
          <button
            type="submit"
            title="Supprimer"
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
