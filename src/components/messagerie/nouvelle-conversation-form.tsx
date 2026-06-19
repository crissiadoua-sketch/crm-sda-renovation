"use client";

import { useState, useTransition } from "react";
import { createConversation } from "@/lib/actions/messagerie";

type Props = {
  allUsers: { id: string; name: string; role: string }[];
};

export function NouvelleConversationForm({ allUsers }: Props) {
  const [type, setType] = useState<"DIRECT" | "GROUPE">("DIRECT");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    const participantIds = formData.getAll("participantIds");
    if (participantIds.length === 0) {
      setError("Sélectionnez au moins un participant pour démarrer la conversation.");
      return;
    }
    setError(null);
    startTransition(() => {
      createConversation(formData);
    });
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      {/* Type */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</label>
        <div className="flex gap-2">
          {(["DIRECT", "GROUPE"] as const).map(t => (
            <label key={t} className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="type"
                value={t}
                checked={type === t}
                onChange={() => setType(t)}
                className="accent-brand-blue"
              />
              <span className="text-sm text-slate-700">{t === "DIRECT" ? "Message direct" : "Groupe"}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Nom du groupe (optionnel) */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Nom du groupe <span className="font-normal text-slate-400">(optionnel)</span>
        </label>
        <input
          type="text"
          name="nom"
          placeholder="ex. Chantier Toulouse, Équipe commerciale…"
          spellCheck
          lang="fr"
          className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
        />
      </div>

      {/* Participants */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Participants
        </label>
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto rounded-lg border border-slate-200 p-2">
          {allUsers.map(u => (
            <label key={u.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
              <input
                type={type === "DIRECT" ? "radio" : "checkbox"}
                name="participantIds"
                value={u.id}
                onChange={() => setError(null)}
                className="accent-brand-blue"
              />
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-blue/10 text-xs font-bold text-brand-blue">
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{u.name}</p>
                <p className="text-[10px] text-slate-400">{u.role}</p>
              </div>
            </label>
          ))}
          {allUsers.length === 0 && (
            <p className="py-3 text-center text-xs text-slate-400">Aucun autre utilisateur</p>
          )}
        </div>
      </div>

      {/* Suppression auto */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Suppression automatique
        </label>
        <select
          name="suppressionAuto"
          defaultValue="JAMAIS"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-brand-blue focus:outline-none"
        >
          <option value="JAMAIS">Jamais (conservation permanente)</option>
          <option value="7_JOURS">Après 7 jours</option>
          <option value="30_JOURS">Après 30 jours</option>
          <option value="90_JOURS">Après 90 jours</option>
        </select>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-xl bg-brand-blue py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark disabled:opacity-60"
      >
        {isPending ? "Création…" : "Démarrer la conversation →"}
      </button>
    </form>
  );
}
