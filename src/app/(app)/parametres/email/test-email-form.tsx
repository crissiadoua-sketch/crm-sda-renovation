"use client";

import { useActionState } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import { testerConfigurationEmail } from "@/lib/actions/email-documents";

export function TestEmailForm({ defaultTo, disabled }: { defaultTo: string; disabled: boolean }) {
  const [state, formAction, isPending] = useActionState(testerConfigurationEmail, null);

  if (state?.ok) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
        <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
        Email de test envoyé avec succès. Vérifiez votre boîte de réception.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <input
        type="email"
        name="to"
        defaultValue={defaultTo}
        required
        placeholder="votre@email.fr"
        disabled={disabled}
        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
      />
      <button
        type="submit"
        disabled={disabled || isPending}
        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:cursor-not-allowed disabled:opacity-50 shrink-0"
      >
        <Send className="h-3.5 w-3.5" />
        {isPending ? "Envoi…" : "Envoyer un email de test"}
      </button>
      {state?.error && (
        <p className="flex items-center gap-1.5 text-sm text-red-600 sm:col-span-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}
    </form>
  );
}
