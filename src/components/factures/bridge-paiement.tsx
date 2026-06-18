"use client";

import { useState, useTransition } from "react";
import {
  CreditCard, Copy, CheckCircle2, RefreshCw, X, ExternalLink, Loader2,
} from "lucide-react";
import {
  genererLienPaiement,
  verifierStatutPaiement,
  annulerLienPaiement,
} from "@/lib/actions/bridge";

interface BridgePaiementProps {
  factureId:        string;
  factureNumero:    string;
  resteDu:          number;
  lienPaiement:     string | null;
  bridgeLinkStatut: string | null;
}

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:   { label: "En attente",  color: "text-amber-600 bg-amber-50 border-amber-200" },
  COMPLETED: { label: "Payé ✓",     color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  EXPIRED:   { label: "Expiré",     color: "text-slate-500 bg-slate-50 border-slate-200" },
  CANCELLED: { label: "Annulé",     color: "text-red-500 bg-red-50 border-red-200" },
};

export function BridgePaiement({
  factureId,
  factureNumero,
  resteDu,
  lienPaiement: initialLien,
  bridgeLinkStatut: initialStatut,
}: BridgePaiementProps) {
  const [lien,    setLien]    = useState(initialLien);
  const [statut,  setStatut]  = useState(initialStatut);
  const [copie,   setCopie]   = useState(false);
  const [erreur,  setErreur]  = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleGenerer = () => {
    setErreur(null);
    startTransition(async () => {
      const res = await genererLienPaiement(factureId);
      if (res.ok && res.lienUrl) {
        setLien(res.lienUrl);
        setStatut("PENDING");
      } else {
        setErreur(res.error ?? "Erreur lors de la création du lien");
      }
    });
  };

  const handleVerifier = () => {
    setErreur(null);
    startTransition(async () => {
      const res = await verifierStatutPaiement(factureId);
      if (res.ok && res.statut) {
        setStatut(res.statut);
        if (res.statut === "COMPLETED") {
          window.location.reload();
        }
      } else {
        setErreur(res.error ?? "Erreur lors de la vérification");
      }
    });
  };

  const handleAnnuler = () => {
    if (!confirm("Annuler ce lien de paiement ?")) return;
    startTransition(async () => {
      const res = await annulerLienPaiement(factureId);
      if (res.ok) {
        setLien(null);
        setStatut(null);
      } else {
        setErreur(res.error ?? "Erreur lors de l'annulation");
      }
    });
  };

  const handleCopier = async () => {
    if (!lien) return;
    await navigator.clipboard.writeText(lien);
    setCopie(true);
    setTimeout(() => setCopie(false), 2000);
  };

  const statutConfig = statut ? STATUT_CONFIG[statut] : null;
  const peutGenerer  = resteDu > 0 && (!statut || statut === "EXPIRED" || statut === "CANCELLED");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1E2F6E]">
            <CreditCard className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy text-sm">Paiement en ligne</h3>
            <p className="text-[11px] text-slate-400">Bridge by Bankin</p>
          </div>
        </div>
        {statutConfig && (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statutConfig.color}`}>
            {statutConfig.label}
          </span>
        )}
      </div>

      {erreur && (
        <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-600">
          {erreur}
        </div>
      )}

      {/* Lien existant PENDING */}
      {lien && statut === "PENDING" && (
        <div className="mb-4 flex flex-col gap-2">
          <p className="text-xs text-slate-500">Lien de paiement actif — partagez-le à votre client :</p>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2">
            <a
              href={lien}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 truncate text-xs text-brand-blue hover:underline font-mono"
            >
              {lien}
            </a>
            <a href={lien} target="_blank" rel="noopener noreferrer" className="shrink-0">
              <ExternalLink className="h-3.5 w-3.5 text-slate-400 hover:text-brand-blue" />
            </a>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopier}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-navy px-3 py-2 text-xs font-semibold text-white hover:bg-brand-blue transition-colors"
            >
              {copie ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Copié !</>
              ) : (
                <><Copy className="h-3.5 w-3.5" /> Copier le lien</>
              )}
            </button>
            <button
              onClick={handleVerifier}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:border-slate-300 transition-colors"
            >
              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Vérifier
            </button>
            <button
              onClick={handleAnnuler}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg border border-red-200 px-2 py-2 text-xs text-red-400 hover:bg-red-50 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Email prérempli */}
          <a
            href={`mailto:?subject=${encodeURIComponent(`Paiement facture ${factureNumero}`)}&body=${encodeURIComponent(`Bonjour,\n\nVous pouvez régler votre facture ${factureNumero} (${resteDu.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })}) en ligne via le lien sécurisé suivant :\n\n${lien}\n\nCordialement,\nSDA Rénovation`)}`}
            className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:border-brand-orange/50 hover:text-brand-orange transition-colors"
          >
            ✉ Envoyer par email
          </a>
        </div>
      )}

      {/* Statut COMPLETED */}
      {statut === "COMPLETED" && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">
          ✅ Paiement reçu — la facture a été mise à jour automatiquement.
        </div>
      )}

      {/* Statut EXPIRED / CANCELLED ou pas encore de lien */}
      {peutGenerer && (
        <div className="flex flex-col gap-2">
          {(statut === "EXPIRED" || statut === "CANCELLED") && (
            <p className="text-xs text-slate-500">
              {statut === "EXPIRED" ? "Le lien précédent a expiré." : "Le lien a été annulé."} Générez-en un nouveau :
            </p>
          )}
          <button
            onClick={handleGenerer}
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1E2F6E] px-4 py-3 text-sm font-semibold text-white hover:bg-[#29ABE2] transition-colors disabled:opacity-60"
          >
            {isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Création en cours…</>
            ) : (
              <><CreditCard className="h-4 w-4" /> Générer un lien de paiement</>
            )}
          </button>
          <p className="text-center text-[10px] text-slate-400">
            Montant : {resteDu.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })} · Via Bridge by Bankin
          </p>
        </div>
      )}

      {/* Facture entièrement payée sans Bridge */}
      {resteDu <= 0 && statut !== "COMPLETED" && (
        <p className="text-sm text-emerald-600 font-medium text-center">
          ✅ Facture intégralement réglée
        </p>
      )}
    </div>
  );
}
