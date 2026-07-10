"use client";

import { useState, useTransition } from "react";
import { Mail, Phone, FileText, Send, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { ajouterRelance } from "@/lib/actions/relance-facture";

type Relance = { id: string; type: string; date: Date; notes: string | null };

export function ImpayeActions({
  factureId,
  clientEmail,
  clientTel,
  relances,
  typeLabels,
}: {
  factureId: string;
  clientEmail: string;
  clientTel: string;
  relances: Relance[];
  typeLabels: Record<string, string>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [type, setType] = useState<"EMAIL" | "COURRIER" | "TELEPHONE" | "LR">("EMAIL");
  const [notes, setNotes] = useState("");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleRelance() {
    startTransition(async () => {
      await ajouterRelance({
        factureId,
        type,
        date: new Date().toISOString(),
        notes: notes.trim() || undefined,
      });
      setNotes("");
      setShowForm(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {/* Raccourcis contact */}
      {clientTel && (
        <a href={`tel:${clientTel}`}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">
          <Phone className="h-3 w-3" /> {clientTel}
        </a>
      )}
      {clientEmail && (
        <a href={`mailto:${clientEmail}?subject=Relance%20facture%20impayée`}
          className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition">
          <Mail className="h-3 w-3" /> Email
        </a>
      )}

      {/* Bouton ajouter relance */}
      <button
        type="button"
        onClick={() => setShowForm((v) => !v)}
        className="flex items-center gap-1 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-2.5 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue/10 transition"
      >
        <Plus className="h-3 w-3" />
        {saved ? "✓ Relance enregistrée" : "Enregistrer une relance"}
      </button>

      {/* Historique */}
      {relances.length > 0 && (
        <button
          type="button"
          onClick={() => setShowHistory((v) => !v)}
          className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 transition"
        >
          {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {relances.length} relance{relances.length > 1 ? "s" : ""}
        </button>
      )}

      {/* Formulaire relance */}
      {showForm && (
        <div className="w-full mt-2 rounded-lg border border-brand-blue/20 bg-brand-blue/5 p-3 flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as typeof type)}
              className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue"
            >
              {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-48">
            <label className="text-xs font-medium text-slate-600 block mb-1">Notes (optionnel)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex : Promesse de paiement sous 5 jours"
              className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand-blue"
            />
          </div>
          <button
            type="button"
            onClick={handleRelance}
            disabled={pending}
            className="flex items-center gap-1 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-navy disabled:opacity-50 transition"
          >
            <Send className="h-3 w-3" />
            {pending ? "…" : "Enregistrer"}
          </button>
          <button type="button" onClick={() => setShowForm(false)} className="text-xs text-slate-400 hover:text-slate-600">Annuler</button>
        </div>
      )}

      {/* Historique des relances */}
      {showHistory && relances.length > 0 && (
        <div className="w-full mt-1">
          <div className="rounded-lg border border-slate-100 bg-slate-50 divide-y divide-slate-100">
            {relances.map((r) => (
              <div key={r.id} className="px-3 py-2 flex items-center gap-2 text-xs text-slate-600">
                <span className="font-medium">{typeLabels[r.type] ?? r.type}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-400">{new Date(r.date).toLocaleDateString("fr-FR")}</span>
                {r.notes && <><span className="text-slate-400">·</span><span className="italic">{r.notes}</span></>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
