"use client";

import { useTransition } from "react";
import { updateEmplacementStock, updateGammeStock } from "@/lib/actions/stock";

const EMPLACEMENTS = [
  { value: "DEPOT",    label: "Dépôt",    short: "D", color: "bg-brand-navy/10 text-brand-navy border-brand-navy/30 hover:bg-brand-navy/20" },
  { value: "BUREAU",   label: "Bureau",   short: "B", color: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200" },
  { value: "CHANTIER", label: "Chantier", short: "C", color: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200" },
];

const GAMMES = [
  { value: "",    label: "—",   color: "bg-slate-100 text-slate-400 border-slate-200" },
  { value: "ECO", label: "ECO", color: "bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200" },
  { value: "OPT", label: "OPT", color: "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200" },
  { value: "COM", label: "COM", color: "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200" },
];

export function EmplacementSwitcher({
  id,
  current,
}: {
  id: string;
  current: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-0.5">
      {EMPLACEMENTS.map((e) => {
        const isActive = current === e.value;
        return (
          <button
            key={e.value}
            type="button"
            disabled={pending || isActive}
            onClick={() => startTransition(() => updateEmplacementStock(id, e.value))}
            title={e.label}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${
              isActive
                ? `${e.color} opacity-100 ring-1 ring-current`
                : `${e.color} opacity-60`
            } disabled:cursor-default`}
          >
            {e.short}
          </button>
        );
      })}
    </div>
  );
}

export function GammeSwitcher({
  id,
  current,
}: {
  id: string;
  current: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const val = current ?? "";

  return (
    <div className="flex items-center gap-0.5">
      {GAMMES.map((g) => {
        const isActive = val === g.value;
        return (
          <button
            key={g.value}
            type="button"
            disabled={pending || isActive}
            onClick={() => startTransition(() => updateGammeStock(id, g.value))}
            title={g.label === "—" ? "Non classé" : g.label}
            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold transition ${
              isActive
                ? `${g.color} opacity-100 ring-1 ring-current`
                : `${g.color} opacity-50`
            } disabled:cursor-default`}
          >
            {g.label}
          </button>
        );
      })}
    </div>
  );
}
