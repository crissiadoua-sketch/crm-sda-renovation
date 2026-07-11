"use client";

import { useActionState, useState, useEffect } from "react";
import { login } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, undefined);
  const [loginMode, setLoginMode] = useState<"email" | "name">("email");
  const [rememberMe, setRememberMe] = useState(false);
  const [emailValue, setEmailValue] = useState("contact@sda-renovation.com");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("sda_crm_email");
    if (saved) {
      setEmailValue(saved);
      setRememberMe(true);
    }
  }, []);

  function handleSubmit() {
    if (loginMode === "email") {
      if (rememberMe) {
        localStorage.setItem("sda_crm_email", emailValue);
      } else {
        localStorage.removeItem("sda_crm_email");
      }
    }
  }

  const inputCls =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30";

  return (
    <form action={formAction} onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Toggle mode */}
      <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setLoginMode("email")}
          className={`flex-1 rounded-md px-3 py-1.5 transition ${
            loginMode === "email"
              ? "bg-white text-brand-blue shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Adresse e-mail
        </button>
        <button
          type="button"
          onClick={() => setLoginMode("name")}
          className={`flex-1 rounded-md px-3 py-1.5 transition ${
            loginMode === "name"
              ? "bg-white text-brand-blue shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          Prénom &amp; Nom
        </button>
      </div>

      {/* Email mode */}
      {loginMode === "email" && (
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-brand-navy">
            Adresse e-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={emailValue}
            onChange={(e) => setEmailValue(e.target.value)}
            className={inputCls}
          />
          {state?.errors?.email && (
            <p className="mt-1 text-sm text-brand-orange-dark">{state.errors.email[0]}</p>
          )}
        </div>
      )}

      {/* Name mode */}
      {loginMode === "name" && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="prenom" className="mb-1 block text-sm font-medium text-brand-navy">
              Prénom
            </label>
            <input
              id="prenom"
              name="prenom"
              type="text"
              autoComplete="given-name"
              required
              placeholder="Jean"
              className={inputCls}
            />
          </div>
          <div className="flex-1">
            <label htmlFor="nom" className="mb-1 block text-sm font-medium text-brand-navy">
              Nom
            </label>
            <input
              id="nom"
              name="nom"
              type="text"
              autoComplete="family-name"
              required
              placeholder="Dupont"
              className={inputCls}
            />
          </div>
        </div>
      )}

      {/* Mot de passe */}
      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-brand-navy">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={inputCls}
        />
        {state?.errors?.password && (
          <p className="mt-1 text-sm text-brand-orange-dark">{state.errors.password[0]}</p>
        )}
      </div>

      {/* Se souvenir — uniquement mode email, après hydratation */}
      {loginMode === "email" && mounted && (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 -mt-1">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="rounded border-slate-300 accent-brand-blue"
          />
          Se souvenir de cette adresse
        </label>
      )}

      {state?.errors?.global && (
        <p className="rounded-lg bg-brand-orange-dark/10 px-3 py-2 text-sm text-brand-orange-dark">
          {state.errors.global[0]}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-lg bg-gradient-to-r from-brand-blue to-brand-blue-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Connexion…" : "Se connecter"}
      </button>
    </form>
  );
}
