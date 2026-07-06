"use client";

import { creerOrdreMission } from "@/lib/actions/ordres-mission";

type Props = {
  interimaires: { id: string; nom: string; prenom: string; corpsEtat: string; agence: string | null }[];
};

export function NouvelOmForm({ interimaires }: Props) {
  return (
    <form action={creerOrdreMission} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="type" value="INTERIMAIRE" />
      <select name="interimaireId" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
        <option value="">— Intérimaire —</option>
        {interimaires.map(i => (
          <option key={i.id} value={i.id}>
            {i.prenom} {i.nom}{i.agence ? ` (${i.agence})` : ""} — {i.corpsEtat}
          </option>
        ))}
      </select>
      <input name="titre" type="text" required placeholder="Objet de la mission"
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm min-w-48" />
      <input name="dateDebut" type="date" required
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <button type="submit"
        className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition">
        + Nouvel OM
      </button>
    </form>
  );
}
