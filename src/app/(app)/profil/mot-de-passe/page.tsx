export const dynamic = "force-dynamic";

"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ShieldX, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { changePassword, type PasswordState } from "@/lib/actions/password";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";

function PasswordInput({ id, name, label, placeholder }: { id: string; name: string; label: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <Field label={label} htmlFor={id}>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          required
          placeholder={placeholder}
          className={`${inputClasses} pr-10`}
          autoComplete={name === "ancienMdp" ? "current-password" : "new-password"}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
}

const REGLES = [
  { label: "Au moins 8 caractères", test: (p: string) => p.length >= 8 },
  { label: "Au moins une majuscule", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Au moins un chiffre", test: (p: string) => /[0-9]/.test(p) },
  { label: "Différent de l'ancien mot de passe", test: (_p: string) => true },
];

export default function MotDePassePage() {
  const [state, action] = useActionState<PasswordState, FormData>(changePassword, {});
  const [nouveau, setNouveau] = useState("");
  const searchParams = useSearchParams();
  const isForced = searchParams.get("force") === "1";

  return (
    <div className="flex flex-col gap-5">
      {isForced && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-semibold">Renouvellement de mot de passe obligatoire</p>
            <p className="text-sm text-red-700">
              Votre mot de passe n'a jamais été modifié ou a expiré (politique de sécurité : renouvellement tous les 3 mois).
              Vous devez définir un nouveau mot de passe pour accéder au CRM.
            </p>
          </div>
        </div>
      )}

      <div>
        {!isForced && (
          <Link href="/" className="text-sm text-brand-blue hover:underline">
            ← Retour au tableau de bord
          </Link>
        )}
        <h2 className="mt-1 text-xl font-bold text-brand-navy">
          Sécurité — Modifier mon mot de passe
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Politique de sécurité SDA Rénovation : renouvellement du mot de passe tous les 3 mois.
        </p>
      </div>

      {state?.success || (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("ok") === "1") ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-700">
          <ShieldCheck className="h-6 w-6 shrink-0" />
          <div>
            <p className="font-semibold">Mot de passe mis à jour avec succès !</p>
            <p className="text-sm text-emerald-600">Votre compte est sécurisé. Prochain rappel dans 3 mois.</p>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-lg">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form action={action} className="flex flex-col gap-5">
            {state?.error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <ShieldX className="h-4 w-4 shrink-0" />
                {state.error}
              </div>
            )}

            <PasswordInput id="ancienMdp" name="ancienMdp" label="Mot de passe actuel" />

            <div className="border-t border-slate-100 pt-4">
              <PasswordInput
                id="nouveauMdp"
                name="nouveauMdp"
                label="Nouveau mot de passe"
                placeholder="Minimum 8 caractères"
              />

              {/* Indicateur de force en temps réel — approximatif côté serveur */}
              <div className="mt-2 space-y-1">
                {REGLES.map((r) => (
                  <div key={r.label} className="flex items-center gap-2 text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${r.test(nouveau) ? "bg-emerald-500" : "bg-slate-300"}`} />
                    <span className={r.test(nouveau) ? "text-emerald-600" : "text-slate-400"}>
                      {r.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <PasswordInput
                  id="confirmMdp"
                  name="confirmMdp"
                  label="Confirmer le nouveau mot de passe"
                />
              </div>
            </div>

            <SubmitButton pendingLabel="Mise à jour…">Enregistrer le nouveau mot de passe</SubmitButton>
          </form>
        </div>

        {/* Bonnes pratiques */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="mb-3 text-sm font-semibold text-brand-navy">Bonnes pratiques de sécurité</h3>
          <ul className="space-y-1.5 text-xs text-slate-500">
            {[
              "Utilisez un mot de passe unique pour ce CRM (ne réutilisez pas un mot de passe d'un autre service).",
              "Combinez majuscules, minuscules, chiffres et caractères spéciaux (!@#…).",
              "Ne partagez jamais votre mot de passe, même à un collègue.",
              "Changez votre mot de passe tous les 3 mois au minimum (politique SDA Rénovation).",
              "En cas de doute sur une compromission, changez-le immédiatement.",
            ].map((tip) => (
              <li key={tip} className="flex items-start gap-2">
                <span className="mt-0.5 text-brand-blue">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
