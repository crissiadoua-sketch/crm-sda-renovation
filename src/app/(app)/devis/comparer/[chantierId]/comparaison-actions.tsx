"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatEuros, formatDate } from "@/lib/format";

type Variante = {
  id: string;
  numero: string;
  dateCreation: string;
  objet: string | null;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  chapitres: { designation: string; montant: number }[];
};

type Props = {
  variantes: Variante[];
  chantierId: string;
  tokenExistant?: string | null;
  retenirAction: (id: string, chantierId: string) => Promise<void>;
  supprimerAction: (id: string, chantierId: string) => Promise<void>;
  envoyerAction: (chantierId: string, ids: string[]) => Promise<void>;
  genererLienAction: (chantierId: string) => Promise<string>;
};

export function ComparaisonActions({ variantes, chantierId, tokenExistant, retenirAction, supprimerAction, envoyerAction, genererLienAction }: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(variantes.map((v) => v.id)));
  const [sending, setSending] = useState(false);
  const [lienToken, setLienToken] = useState<string | null>(tokenExistant ?? null);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleEnvoyer() {
    if (selected.size === 0) return;
    setSending(true);
    await envoyerAction(chantierId, [...selected]);
    setSending(false);
  }

  function handleGenererLien() {
    startTransition(async () => {
      const token = await genererLienAction(chantierId);
      setLienToken(token);
    });
  }

  const lienClient = lienToken ? `${typeof window !== "undefined" ? window.location.origin : ""}/selection-variante/${lienToken}` : null;

  function copierLien() {
    if (!lienClient) return;
    navigator.clipboard.writeText(lienClient).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Lien de sélection client */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
        <p className="text-sm font-semibold text-emerald-800 mb-1">🔗 Lien de sélection client</p>
        <p className="text-xs text-slate-500 mb-3">
          Envoyez ce lien à votre client. Il pourra comparer les variantes et valider celle qui lui convient — la variante retenue passe automatiquement en statut Accepté.
        </p>
        {lienClient ? (
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              readOnly
              value={lienClient}
              className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-600 focus:outline-none"
            />
            <button
              type="button"
              onClick={copierLien}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition whitespace-nowrap"
            >
              {copied ? "✓ Copié !" : "Copier le lien"}
            </button>
            <button
              type="button"
              onClick={handleGenererLien}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50 transition whitespace-nowrap"
            >
              Regénérer
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenererLien}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Générer le lien client
          </button>
        )}
      </div>

      {/* Sélection + envoi groupé */}
      <div className="rounded-xl border border-[#29ABE2]/30 bg-[#29ABE2]/5 p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <p className="text-sm font-semibold text-brand-navy">Envoyer les variantes au client</p>
          <span className="text-xs text-slate-500">Sélectionnez les variantes à envoyer :</span>
          <button
            type="button"
            onClick={() => setSelected(new Set(variantes.map((v) => v.id)))}
            className="text-xs text-brand-blue hover:underline"
          >
            Tout sélectionner
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="text-xs text-slate-400 hover:underline"
          >
            Tout désélectionner
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {variantes.map((v) => (
            <label
              key={v.id}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${
                selected.has(v.id)
                  ? "border-[#29ABE2] bg-white font-semibold text-brand-navy shadow-sm"
                  : "border-slate-200 bg-white/60 text-slate-400"
              }`}
            >
              <input
                type="checkbox"
                checked={selected.has(v.id)}
                onChange={() => toggle(v.id)}
                className="h-3.5 w-3.5 rounded accent-[#29ABE2]"
              />
              <span>{v.numero}</span>
              <span className="font-normal">{formatEuros(v.totalTTC)}</span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <button
            type="button"
            disabled={selected.size === 0 || sending}
            onClick={handleEnvoyer}
            className="rounded-lg bg-[#29ABE2] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1E9AC8] transition disabled:opacity-40"
          >
            {sending ? "Envoi en cours…" : `✉ Marquer comme envoyé${selected.size > 1 ? ` (${selected.size} variantes)` : ""}`}
          </button>
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {[...selected].map((id) => {
                const v = variantes.find((x) => x.id === id);
                if (!v) return null;
                return (
                  <a
                    key={id}
                    href={`/apercu/devis/${id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    📄 PDF {v.numero}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cartes par variante */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {variantes.map((v) => (
          <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
            <div>
              <p className="font-bold text-brand-navy">{v.numero}</p>
              <p className="text-xs text-slate-400">{formatDate(new Date(v.dateCreation))}</p>
              <p className="mt-1 text-lg font-bold text-[#1E2F6E]">{formatEuros(v.totalTTC)} TTC</p>
              <p className="text-xs text-slate-500">{formatEuros(v.totalHT)} HT + {formatEuros(v.totalTVA)} TVA</p>
              {v.objet && <p className="text-xs text-slate-500 mt-0.5 italic">{v.objet}</p>}
            </div>
            <div className="flex flex-col gap-2 mt-auto">
              <Link
                href={`/devis/${v.id}`}
                className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Voir le détail →
              </Link>
              <a
                href={`/apercu/devis/${v.id}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                📄 Aperçu PDF
              </a>
              <form action={retenirAction.bind(null, v.id, chantierId)}>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                >
                  ✓ Retenir + archiver les autres
                </button>
              </form>
              <form action={supprimerAction.bind(null, v.id, chantierId)}>
                <button
                  type="submit"
                  onClick={(e) => { if (!confirm(`Supprimer définitivement ${v.numero} ?`)) e.preventDefault(); }}
                  className="w-full rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                >
                  🗑 Supprimer
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        <strong>Retenir</strong> passe les autres variantes en statut Expiré (consultables mais non modifiables). ·{" "}
        <strong>Envoyer</strong> passe les variantes sélectionnées en statut Envoyé et génère un PDF par variante.
      </p>
    </div>
  );
}
