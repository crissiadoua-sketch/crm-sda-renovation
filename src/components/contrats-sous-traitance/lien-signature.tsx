"use client";

import { useState } from "react";

export function LienSignatureContrat({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const lien = `${typeof window !== "undefined" ? window.location.origin : ""}/contrats/sign/${token}`;

  function copyLien() {
    navigator.clipboard.writeText(lien).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-slate-500">Lien de signature à envoyer au sous-traitant :</p>
      <div className="flex items-center gap-2">
        <div className="flex-1 rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 font-mono text-xs text-brand-blue truncate">
          {lien}
        </div>
        <button
          type="button"
          onClick={copyLien}
          className="shrink-0 rounded-lg bg-brand-navy px-3 py-2 text-xs font-semibold text-white hover:bg-brand-blue-dark transition"
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
      </div>
      <p className="text-xs text-slate-400">Page de signature publique — le sous-traitant peut signer sans compte.</p>
    </div>
  );
}
