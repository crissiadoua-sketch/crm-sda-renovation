"use client";

import { useState } from "react";

interface Props {
  devisId: string;
  devisNumero: string;
  signatureToken: string | null;
  signature: { nomSignataire: string; dateSignature: string } | null;
  genererLien: () => Promise<string>;
}

export function SignatureSection({
  devisId: _devisId,
  devisNumero,
  signatureToken: initialToken,
  signature,
  genererLien,
}: Props) {
  const [token, setToken] = useState<string | null>(initialToken);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  const lien = token ? `${typeof window !== "undefined" ? window.location.origin : ""}/devis/sign/${token}` : null;

  async function handleGenerer() {
    setPending(true);
    try {
      const newToken = await genererLien();
      setToken(newToken);
    } finally {
      setPending(false);
    }
  }

  function copyLien() {
    if (!lien) return;
    navigator.clipboard.writeText(lien).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 font-semibold text-brand-navy flex items-center gap-2">
        <span className="text-lg">✍️</span> Signature électronique
      </h3>

      {signature ? (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4">
          <p className="text-emerald-700 font-bold">✅ Devis signé</p>
          <p className="text-emerald-600 text-sm mt-1">
            Signé par <span className="font-semibold">{signature.nomSignataire}</span>
            {" "}le{" "}
            {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeStyle: "short" }).format(
              new Date(signature.dateSignature)
            )}
          </p>
        </div>
      ) : token ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-600">
            Envoyez ce lien à votre client pour qu'il signe le devis <span className="font-mono font-semibold">{devisNumero}</span> sans avoir besoin d'un compte :
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-xs text-brand-blue truncate">
              {lien ?? `/devis/sign/${token}`}
            </div>
            <button
              type="button"
              onClick={copyLien}
              className="shrink-0 rounded-lg bg-brand-navy px-3 py-2 text-xs font-semibold text-white hover:bg-brand-blue-dark transition"
            >
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
          <p className="text-xs text-slate-400">
            Le statut passera automatiquement à "Accepté" une fois signé.
            Ce lien est unique et sécurisé — il ne peut être utilisé qu'une seule fois.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-slate-500">
            Générez un lien unique à envoyer à votre client. Il pourra signer le devis directement en ligne,
            sans compte nécessaire.
          </p>
          <button
            type="button"
            onClick={handleGenerer}
            disabled={pending}
            className="self-start rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark transition disabled:opacity-60"
          >
            {pending ? "Génération…" : "Générer le lien de signature"}
          </button>
        </div>
      )}
    </div>
  );
}
