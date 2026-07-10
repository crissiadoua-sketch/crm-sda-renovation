"use client";

import { useTransition } from "react";
import { updateFactureStatut } from "@/lib/actions/factures";

const STATUTS = [
  { value: "BROUILLON",       label: "Brouillon",         cls: "bg-slate-100 text-slate-600   border-slate-300" },
  { value: "ENVOYEE",         label: "Envoyée",           cls: "bg-blue-100  text-blue-700    border-blue-300"  },
  { value: "PAYEE_PARTIELLE", label: "Paiement partiel",  cls: "bg-orange-100 text-orange-700 border-orange-300" },
  { value: "PAYEE",           label: "Payée",             cls: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { value: "EN_RETARD",       label: "En retard",         cls: "bg-red-100   text-red-700     border-red-300"   },
  { value: "ANNULEE",         label: "Annulée",           cls: "bg-slate-100 text-slate-400   border-slate-300" },
];

export function FactureStatutSelect({ id, statut }: { id: string; statut: string }) {
  const [isPending, startTransition] = useTransition();
  const current = STATUTS.find((s) => s.value === statut) ?? STATUTS[0];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatut = e.target.value;
    const action = updateFactureStatut.bind(null, id);
    const fd = new FormData();
    fd.set("statut", newStatut);
    startTransition(() => action(fd));
  };

  return (
    <select
      value={statut}
      onChange={handleChange}
      disabled={isPending}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition hover:opacity-80 disabled:opacity-50 ${current.cls}`}
    >
      {STATUTS.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
