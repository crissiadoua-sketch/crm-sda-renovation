"use client";

import { useActionState, useState } from "react";
import { Mail, X, Send, CheckCircle, AlertCircle, Maximize2, Minimize2, ChevronDown } from "lucide-react";

type EmailAction = (prev: unknown, formData: FormData) => Promise<{ ok: boolean; error?: string }>;

export type VueOption = {
  value: string;
  label: string;
  description: string;
  icon?: string;
};

interface EnvoyerEmailModalProps {
  action: EmailAction;
  defaultTo?: string;
  documentLabel?: string;
  buttonVariant?: "default" | "small";
  vueOptions?: VueOption[];
  defaultVue?: string;
  defaultSubject?: string;
  defaultMessage?: string;
}

export function EnvoyerEmailModal({
  action,
  defaultTo = "",
  documentLabel = "document",
  buttonVariant = "default",
  vueOptions,
  defaultVue,
  defaultSubject = "",
  defaultMessage = "",
}: EnvoyerEmailModalProps) {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [state, formAction, isPending] = useActionState(action, null);
  const [selectedVue, setSelectedVue] = useState(defaultVue ?? vueOptions?.[0]?.value ?? "client");

  function handleClose() {
    setOpen(false);
    setFullscreen(false);
    setShowCcBcc(false);
  }

  const inputCls = "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";
  const buttonCls =
    "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-brand-blue/40 hover:bg-brand-blue/5 hover:text-brand-blue";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonCls}>
        <Mail className="h-4 w-4" />
        Envoyer par email
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`relative w-full rounded-xl bg-white shadow-2xl flex flex-col transition-all ${fullscreen ? "max-w-3xl h-[92vh]" : "max-w-lg max-h-[90vh]"}`}>

            {/* En-tête */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 shrink-0">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-brand-blue" />
                <h3 className="font-semibold text-brand-navy">
                  Envoyer {documentLabel} par email
                </h3>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFullscreen(!fullscreen)}
                  title={fullscreen ? "Réduire" : "Plein écran"}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Résultat succès */}
            {state?.ok && (
              <div className="px-5 py-4 flex-1 overflow-y-auto">
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

            {/* Formulaire */}
            {!state?.ok && (
              <form action={formAction} className="flex flex-col overflow-hidden flex-1">
              <div className="flex flex-col gap-4 px-5 py-4 overflow-y-auto flex-1">

                {/* Erreur */}
                {state?.error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <span>{state.error}</span>
                      {state.error.includes("SMTP_HOST") && (
                        <p className="mt-1 text-xs text-red-600">
                          → Configurez les variables <code className="rounded bg-red-100 px-1">SMTP_USER</code> et <code className="rounded bg-red-100 px-1">SMTP_PASS</code> dans le fichier <code className="rounded bg-red-100 px-1">.env</code>, puis redémarrez le serveur.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Sélecteur de vue */}
                {vueOptions && vueOptions.length > 1 && (
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Vue à envoyer
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {vueOptions.map((opt) => (
                        <label
                          key={opt.value}
                          className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border-2 p-3 transition-colors ${
                            selectedVue === opt.value
                              ? "border-brand-blue bg-brand-blue/5"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="vue"
                            value={opt.value}
                            checked={selectedVue === opt.value}
                            onChange={() => setSelectedVue(opt.value)}
                            className="sr-only"
                          />
                          <span className="flex items-center gap-1.5">
                            {opt.icon && <span className="text-base">{opt.icon}</span>}
                            <span className={`text-sm font-semibold ${selectedVue === opt.value ? "text-brand-blue" : "text-slate-700"}`}>
                              {opt.label}
                            </span>
                          </span>
                          <span className="text-xs text-slate-500 leading-tight">{opt.description}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Champ caché si une seule vue */}
                {(!vueOptions || vueOptions.length <= 1) && vueOptions?.[0] && (
                  <input type="hidden" name="vue" value={vueOptions[0].value} />
                )}

                {/* Objet */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Objet
                  </label>
                  <input
                    type="text"
                    name="subject"
                    defaultValue={defaultSubject}
                    placeholder="Objet de l'email…"
                    className={inputCls}
                  />
                </div>

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
                    className={inputCls}
                  />
                </div>

                {/* CC / BCC toggle */}
                <button
                  type="button"
                  onClick={() => setShowCcBcc(!showCcBcc)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-brand-blue transition -mt-2"
                >
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showCcBcc ? "rotate-180" : ""}`} />
                  {showCcBcc ? "Masquer" : "Ajouter"} Cc / Cci
                </button>

                {showCcBcc && (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        En copie (Cc)
                        <span className="ml-1 text-xs font-normal text-slate-400">— séparez plusieurs adresses par une virgule</span>
                      </label>
                      <input
                        type="text"
                        name="cc"
                        placeholder="copie@exemple.fr, autre@exemple.fr"
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        En copie masquée (Cci / Bcc)
                        <span className="ml-1 text-xs font-normal text-slate-400">— destinataire invisible pour les autres</span>
                      </label>
                      <input
                        type="text"
                        name="bcc"
                        placeholder="masque@exemple.fr"
                        className={inputCls}
                      />
                    </div>
                  </>
                )}

                {/* Message personnalisé */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Message personnalisé{" "}
                    <span className="font-normal text-slate-400">(optionnel)</span>
                  </label>
                  <textarea
                    key={defaultMessage}
                    name="message"
                    rows={defaultMessage ? (fullscreen ? 14 : 8) : (fullscreen ? 6 : 3)}
                    defaultValue={defaultMessage}
                    placeholder="Ajoutez un message personnalisé qui apparaîtra dans l'email…"
                    className={`${inputCls} resize-y`}
                  />
                </div>

                </div>{/* fin du div scrollable */}

                {/* Footer fixe — toujours visible */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 shrink-0">
                  <p className="text-xs text-slate-400">
                    Envoyé depuis votre adresse{" "}
                    <span className="font-medium">@sda-renovation.com</span>
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
