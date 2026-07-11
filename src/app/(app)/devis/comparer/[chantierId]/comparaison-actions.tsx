"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatEuros, formatDate } from "@/lib/format";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { Sparkles, Copy, Check, AlertCircle, Loader2 } from "lucide-react";

type Variante = {
  id: string;
  numero: string;
  dateCreation: string;
  objet: string | null;
  typeLabel?: { label: string; color: string };
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  chapitres: { designation: string; montant: number }[];
};

type EmailAction = (prev: unknown, formData: FormData) => Promise<{ ok: boolean; error?: string }>;

type Props = {
  variantes: Variante[];
  chantierId: string;
  tokenExistant?: string | null;
  clientEmail: string;
  retenirAction: (id: string, chantierId: string) => Promise<void>;
  supprimerAction: (id: string, chantierId: string) => Promise<void>;
  envoyerAction: (chantierId: string, ids: string[]) => Promise<void>;
  genererLienAction: (chantierId: string) => Promise<string>;
  genererSyntheseAction: (chantierId: string) => Promise<{ synthese: string } | { error: string }>;
  emailDevisActions: Record<string, EmailAction>;
};

export function ComparaisonActions({
  variantes,
  chantierId,
  tokenExistant,
  clientEmail,
  retenirAction,
  supprimerAction,
  envoyerAction,
  genererLienAction,
  genererSyntheseAction,
  emailDevisActions,
}: Props) {
  const [selected, setSelected] = useState<Set<string>>(new Set(variantes.map((v) => v.id)));
  const [sending, setSending] = useState(false);
  const [lienToken, setLienToken] = useState<string | null>(tokenExistant ?? null);
  const [copiedLien, setCopiedLien] = useState(false);

  // Synthèse IA
  const [syntheseIA, setSyntheseIA] = useState<string | null>(null);
  const [syntheseError, setSyntheseError] = useState<string | null>(null);
  const [generatingIA, setGeneratingIA] = useState(false);
  const [copiedSynthese, setCopiedSynthese] = useState(false);

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

  async function handleGenererSynthese() {
    setGeneratingIA(true);
    setSyntheseError(null);
    const result = await genererSyntheseAction(chantierId);
    setGeneratingIA(false);
    if ("error" in result) {
      setSyntheseError(result.error);
    } else {
      setSyntheseIA(result.synthese);
    }
  }

  function copierSynthese() {
    if (!syntheseIA) return;
    navigator.clipboard.writeText(syntheseIA).then(() => {
      setCopiedSynthese(true);
      setTimeout(() => setCopiedSynthese(false), 2500);
    });
  }

  const lienClient = lienToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/selection-variante/${lienToken}`
    : null;

  function copierLien() {
    if (!lienClient) return;
    navigator.clipboard.writeText(lienClient).then(() => {
      setCopiedLien(true);
      setTimeout(() => setCopiedLien(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Synthèse analytique IA ─────────────────────────────────────────── */}
      <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-bold text-violet-800">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Synthèse analytique IA — Email client
            </p>
            <p className="mt-0.5 text-xs text-slate-500 max-w-lg">
              L'IA analyse chaque offre sur 5 axes (technique, budget, esthétique, délais, attentes client) et rédige un email d'orientation à destination de votre client.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenererSynthese}
            disabled={generatingIA}
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition disabled:opacity-60 shrink-0"
          >
            {generatingIA ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Analyse en cours…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {syntheseIA ? "Régénérer la synthèse" : "Générer la synthèse IA"}
              </>
            )}
          </button>
        </div>

        {/* Erreur IA */}
        {syntheseError && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 mb-3">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{syntheseError}</span>
          </div>
        )}

        {/* Synthèse générée */}
        {syntheseIA && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <textarea
                value={syntheseIA}
                onChange={(e) => setSyntheseIA(e.target.value)}
                rows={16}
                className="w-full rounded-lg border border-violet-200 bg-white px-4 py-3 text-sm text-slate-700 leading-relaxed focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400 resize-y font-[system-ui]"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={copierSynthese}
                className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 transition"
              >
                {copiedSynthese ? (
                  <><Check className="h-4 w-4" /> Copié !</>
                ) : (
                  <><Copy className="h-4 w-4" /> Copier la synthèse</>
                )}
              </button>
              <span className="text-xs text-slate-400">
                Collez ce texte dans le corps d'un email ou dans le champ "Message personnalisé" des boutons d'envoi ci-dessous.
              </span>
            </div>

            {/* Boutons d'envoi direct par variante avec synthèse pré-remplie */}
            {variantes.length > 0 && (
              <div className="border-t border-violet-100 pt-3">
                <p className="mb-2 text-xs font-semibold text-violet-700 uppercase tracking-wider">
                  Envoyer avec cette synthèse pré-remplie :
                </p>
                <div className="flex flex-wrap gap-2">
                  {variantes.map((v) => {
                    const action = emailDevisActions[v.id];
                    if (!action) return null;
                    return (
                      <EnvoyerEmailModal
                        key={`${v.id}-${syntheseIA.slice(0, 20)}`}
                        action={action}
                        defaultTo={clientEmail}
                        documentLabel={`le devis ${v.numero}`}
                        defaultSubject={`Votre projet — Offre ${v.objet ?? v.numero} — SDA Rénovation`}
                        defaultMessage={syntheseIA}
                        vueOptions={[
                          { value: "client", label: "Vue client", description: "Email épuré + lien consultation", icon: "📋" },
                          { value: "commerciale", label: "Vue commerciale", description: "Détail lignes + montants + signature", icon: "📄" },
                          { value: "synthese", label: "Vue synthèse", description: "Totaux HT/TVA/TTC + signature", icon: "💰" },
                        ]}
                        buttonVariant="small"
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Lien de sélection client ───────────────────────────────────────── */}
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
              {copiedLien ? "✓ Copié !" : "Copier le lien"}
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

      {/* ── Envoyer groupé ────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-[#29ABE2]/30 bg-[#29ABE2]/5 p-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <p className="text-sm font-semibold text-brand-navy">Marquer comme envoyé</p>
          <span className="text-xs text-slate-500">Sélectionnez les variantes :</span>
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
            {sending ? "Mise à jour…" : `✉ Marquer envoyé${selected.size > 1 ? ` (${selected.size} variantes)` : ""}`}
          </button>
          {selected.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {[...selected].map((id) => {
                const v = variantes.find((x) => x.id === id);
                if (!v) return null;
                return (
                  <div key={id} className="flex gap-2">
                    <a
                      href={`/apercu/devis/${id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      📄 {v.numero}
                    </a>
                    <a
                      href={`/apercu/devis/${id}?descriptif=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                    >
                      📄 Descriptif
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Cartes par variante ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {variantes.map((v) => {
          const emailAction = emailDevisActions[v.id];
          return (
            <div key={v.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-brand-navy">{v.numero}</p>
                  {v.typeLabel && (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold whitespace-nowrap ${v.typeLabel.color}`}>
                      {v.typeLabel.label}
                    </span>
                  )}
                </div>
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
                  📄 Aperçu PDF complet
                </a>
                <a
                  href={`/apercu/devis/${v.id}?descriptif=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  📄 Descriptif + totaux
                </a>
                {emailAction && (
                  <EnvoyerEmailModal
                    key={`card-${v.id}-${syntheseIA?.slice(0, 20) ?? ""}`}
                    action={emailAction}
                    defaultTo={clientEmail}
                    documentLabel={`le devis ${v.numero}`}
                    defaultSubject={`Votre projet — Offre ${v.objet ?? v.numero} — SDA Rénovation`}
                    defaultMessage={syntheseIA ?? undefined}
                    vueOptions={[
                      { value: "client", label: "Vue client", description: "Email épuré + lien consultation", icon: "📋" },
                      { value: "commerciale", label: "Vue commerciale", description: "Détail lignes + montants + signature", icon: "📄" },
                      { value: "synthese", label: "Vue synthèse", description: "Totaux HT/TVA/TTC + signature", icon: "💰" },
                    ]}
                  />
                )}
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
          );
        })}
      </div>

      <p className="text-xs text-slate-400">
        <strong>Retenir</strong> passe les autres variantes en statut Expiré (consultables mais non modifiables). ·{" "}
        <strong>Marquer envoyé</strong> passe les variantes sélectionnées en statut Envoyé.
      </p>
    </div>
  );
}
