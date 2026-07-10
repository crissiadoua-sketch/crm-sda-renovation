"use client";

import { useActionState, useState } from "react";
import { Mail, X, Send, CheckCircle, AlertCircle } from "lucide-react";

type EmailAction = (prev: unknown, formData: FormData) => Promise<{ ok: boolean; error?: string }>;

interface EnvoyerEmailModalProps {
  action: EmailAction;
  defaultTo?: string;
  documentLabel?: string;
  buttonVariant?: "default" | "small";
}

export function EnvoyerEmailModal({
  action,
  defaultTo = "",
  documentLabel = "document",
  buttonVariant = "default",
}: EnvoyerEmailModalProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(action, null);

  function handleClose() {
    setOpen(false);
  }

  const buttonCls =
    buttonVariant === "small"
      ? "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-brand-blue/40 hover:bg-brand-blue/5 hover:text-brand-blue"
      : "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-brand-blue/40 hover:bg-brand-blue/5 hover:text-brand-blue";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonCls}>
        <Mail className="h-4 w-4" />
        Envoyer par email
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl">
            {/* En-tête */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand-blue" />
                <h3 className="font-semibold text-brand-navy">
                  Envoyer {documentLabel} par email
                </h3>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Résultat succès */}
            {state?.ok && (
              <div className="px-5 py-4">
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <CheckCircle className="h-12 w-12 text-emerald-500" />
                  <p className="font-semibold text-emerald-700">Email envoyé avec succès !</p>
                  <p className="text-sm text-slate-500">
                    Le {documentLabel} a été transmis à l&apos;adresse indiquée.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="mt-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Fermer
                  </button>
                </div>
              </div>
            )}

            {/* Formulaire (caché en cas de succès) */}
            {!state?.ok && (
              <form action={formAction} className="flex flex-col gap-4 px-5 py-4">
                {/* Erreur */}
                {state?.error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{state.error}</span>
                  </div>
                )}

                {/* Destinataire */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Destinataire <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="to"
                    defaultValue={defaultTo}
                    required
                    placeholder="email@exemple.fr"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                {/* Message personnalisé */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Message personnalisé{" "}
                    <span className="font-normal text-slate-400">(optionnel)</span>
                  </label>
                  <textarea
                    name="message"
                    rows={3}
                    placeholder="Ajoutez un message personnalisé qui apparaîtra dans l'email…"
                    className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue"
                  />
                </div>

                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                  <p className="text-xs text-slate-400">
                    Envoyé depuis <span className="font-medium">contact@sda-renovation.com</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isPending}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50"
                    >
                      <Send className="h-3.5 w-3.5" />
                      {isPending ? "Envoi…" : "Envoyer"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
