"use client";

import { useState, useTransition } from "react";
import { envoyerBulletinParEmail } from "@/lib/actions/rh";

export function EnvoiBulletinEmail({
  salarieId,
  bulletinId,
  emailParDefaut,
}: {
  salarieId: string;
  bulletinId: string;
  emailParDefaut: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(emailParDefaut ?? "");
  const [statut, setStatut] = useState<"idle" | "ok" | "erreur">("idle");
  const [erreur, setErreur] = useState<string | null>(null);

  function handleEnvoyer() {
    setStatut("idle");
    setErreur(null);
    startTransition(async () => {
      const res = await envoyerBulletinParEmail(salarieId, bulletinId, email);
      if (res.ok) {
        setStatut("ok");
      } else {
        setStatut("erreur");
        setErreur(res.error ?? "Erreur d'envoi.");
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        ✉ Envoyer par email
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email du salarié"
        className="w-48 rounded-md border border-slate-200 px-2 py-1 text-xs"
      />
      <button
        onClick={handleEnvoyer}
        disabled={isPending || !email}
        className="rounded-md bg-brand-navy px-3 py-1 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-60"
      >
        {isPending ? "Envoi…" : statut === "ok" ? "Envoyé ✓" : "Envoyer"}
      </button>
      <button onClick={() => setOpen(false)} className="text-xs text-slate-400 hover:text-slate-600">
        ✕
      </button>
      {statut === "erreur" && erreur && (
        <span className="text-xs text-red-500">{erreur}</span>
      )}
    </div>
  );
}
