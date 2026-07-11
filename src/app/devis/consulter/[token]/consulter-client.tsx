"use client";

import { useState } from "react";
import { accepterDevisParClient, refuserDevisParClient } from "@/lib/actions/devis";

type State = "initial" | "accepte" | "refuse";

function eur(n: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);
}

export default function ConsulterClient({
  token,
  devisId,
  numero,
  chantierNom,
  objet,
  totalTTC,
  dateValidite,
  clientPrenom,
  dejaSigne,
  statutActuel,
}: {
  token: string;
  devisId: string;
  numero: string;
  chantierNom: string | null;
  objet: string | null;
  totalTTC: number | null;
  dateValidite: string | null;
  clientPrenom: string | null;
  dejaSigne: boolean;
  statutActuel: string;
}) {
  const [state, setState] = useState<State>(
    dejaSigne || statutActuel === "ACCEPTE" ? "accepte" : statutActuel === "REFUSE" ? "refuse" : "initial"
  );
  const [nom, setNom] = useState(clientPrenom ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRefuseConfirm, setShowRefuseConfirm] = useState(false);

  const apercuUrl = `/apercu/devis/${devisId}?descriptif=1`;

  async function handleAccepter() {
    if (!nom.trim()) { setError("Veuillez saisir votre nom et prénom."); return; }
    setPending(true);
    setError(null);
    try {
      const result = await accepterDevisParClient(token, nom.trim());
      if (result.ok) {
        setState("accepte");
      } else {
        setError(result.error ?? "Erreur lors de l'acceptation.");
      }
    } catch {
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setPending(false);
    }
  }

  async function handleRefuser() {
    setPending(true);
    setError(null);
    try {
      const result = await refuserDevisParClient(token);
      if (result.ok) {
        setState("refuse");
      } else {
        setError(result.error ?? "Erreur lors du refus.");
      }
    } catch {
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setPending(false);
      setShowRefuseConfirm(false);
    }
  }

  // ── État : Devis accepté ──────────────────────────────────────────────────
  if (state === "accepte") {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-8 text-center">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-emerald-700 font-bold text-xl mb-1">Devis accepté</p>
          <p className="text-emerald-600 text-sm">
            Merci pour votre confiance. SDA Rénovation vous contactera prochainement pour démarrer les travaux.
          </p>
        </div>

        {/* Carte devis */}
        <DevisCard numero={numero} chantierNom={chantierNom} objet={objet} totalTTC={totalTTC} dateValidite={dateValidite} />

        {/* Bouton PDF — disponible seulement après acceptation */}
        <a
          href={apercuUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2.5 w-full rounded-xl border-2 border-[#1E2F6E] bg-white text-[#1E2F6E] font-bold py-3.5 text-sm hover:bg-[#1E2F6E]/5 transition"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
          Télécharger le devis (PDF)
        </a>
        <p className="text-[11px] text-slate-400 text-center -mt-2">
          Dans la page qui s'ouvre, cliquez sur "Imprimer / Enregistrer en PDF"
        </p>
      </div>
    );
  }

  // ── État : Devis refusé ──────────────────────────────────────────────────
  if (state === "refuse") {
    return (
      <div className="flex flex-col gap-5">
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-6 py-8 text-center">
          <div className="text-5xl mb-3">❌</div>
          <p className="text-slate-700 font-bold text-xl mb-1">Devis refusé</p>
          <p className="text-slate-500 text-sm">
            Votre réponse a bien été transmise à SDA Rénovation. N'hésitez pas à nous contacter si vous souhaitez modifier les conditions.
          </p>
        </div>
        <DevisCard numero={numero} chantierNom={chantierNom} objet={objet} totalTTC={null} dateValidite={dateValidite} />
        <p className="text-center text-xs text-slate-400">
          Pour toute question :{" "}
          <a href="mailto:contact@sda-renovation.com" className="text-[#1E2F6E] underline">
            contact@sda-renovation.com
          </a>
        </p>
      </div>
    );
  }

  // ── État initial : choisir ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Carte devis */}
      <DevisCard numero={numero} chantierNom={chantierNom} objet={objet} totalTTC={totalTTC} dateValidite={dateValidite} />

      {/* Réponse */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-[#1E2F6E]/5 px-5 py-3 border-b border-slate-100">
          <p className="text-xs font-bold uppercase tracking-widest text-[#1E2F6E]">Votre réponse</p>
        </div>
        <div className="px-5 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              Nom et prénom <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              placeholder="Ex : Jean Dupont"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1E2F6E] focus:ring-2 focus:ring-[#1E2F6E]/10 outline-none transition"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          {/* Bouton Accepter */}
          <button
            type="button"
            onClick={handleAccepter}
            disabled={pending}
            className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3.5 text-sm hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-2"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            {pending && !showRefuseConfirm ? "Traitement…" : "Accepter le devis"}
          </button>

          {/* Bouton Refuser */}
          {!showRefuseConfirm ? (
            <button
              type="button"
              onClick={() => setShowRefuseConfirm(true)}
              disabled={pending}
              className="w-full rounded-xl border-2 border-red-300 text-red-600 bg-white font-semibold py-3 text-sm hover:bg-red-50 transition disabled:opacity-60"
            >
              Refuser le devis
            </button>
          ) : (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex flex-col gap-3">
              <p className="text-sm text-red-700 font-medium text-center">
                Confirmez-vous le refus de ce devis ?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowRefuseConfirm(false)}
                  disabled={pending}
                  className="flex-1 rounded-lg border border-slate-200 bg-white py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleRefuser}
                  disabled={pending}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700 transition disabled:opacity-60"
                >
                  {pending ? "Traitement…" : "Confirmer le refus"}
                </button>
              </div>
            </div>
          )}

          <p className="text-[10px] text-slate-400 text-center leading-relaxed">
            En acceptant ce devis, vous confirmez la commande des travaux décrits ci-dessus.
            Cette acceptation électronique a valeur contractuelle conformément à l'article 1367 du Code civil.
          </p>
        </div>
      </div>
    </div>
  );
}

function DevisCard({
  numero, chantierNom, objet, totalTTC, dateValidite,
}: {
  numero: string; chantierNom: string | null; objet: string | null;
  totalTTC: number | null; dateValidite: string | null;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-[#1E2F6E]/5 px-5 py-3 border-b border-slate-100">
        <p className="text-xs font-bold uppercase tracking-widest text-[#1E2F6E]">Récapitulatif</p>
      </div>
      <div className="px-5 py-4 flex flex-col gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Référence</p>
          <p className="font-black text-[#1E2F6E] text-lg font-mono">{numero}</p>
        </div>
        {chantierNom && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Chantier</p>
            <p className="font-semibold text-slate-700">{chantierNom}</p>
          </div>
        )}
        {objet && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Objet</p>
            <p className="text-slate-600 text-sm">{objet}</p>
          </div>
        )}
        {dateValidite && (
          <p className="text-xs text-red-500">
            Offre valable jusqu'au{" "}
            {new Intl.DateTimeFormat("fr-FR").format(new Date(dateValidite))}
          </p>
        )}
      </div>
      {totalTTC != null && totalTTC > 0 && (
        <div className="border-t border-slate-100 px-5 py-3 flex items-center justify-between bg-slate-50">
          <span className="text-sm text-slate-500">Total TTC</span>
          <span className="text-2xl font-black text-[#1E2F6E]">{eur(totalTTC)}</span>
        </div>
      )}
    </div>
  );
}
