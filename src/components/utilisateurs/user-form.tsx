"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  ALL_ROLES,
  ROLE_LABELS,
  PERMISSION_GROUPS,
  PERMISSION_LABELS,
  isFullAccessRole,
  getDefaultPermissions,
} from "@/lib/permissions";
import type { UserState } from "@/lib/actions/utilisateurs";

type UserFormProps = {
  action: (prev: UserState, data: FormData) => Promise<UserState>;
  defaultValues?: {
    name?: string;
    email?: string;
    role?: string;
    permissions?: string[];
    telephone?: string | null;
    titre?: string | null;
    societe?: string | null;
    adresse?: string | null;
  };
  isEdit?: boolean;
};

function SignaturePreview({
  name, email, titre, telephone, societe, adresse, role,
}: {
  name: string; email: string; titre: string; telephone: string;
  societe: string; adresse: string; role: string;
}) {
  const isExterne = role === "EXPERT_COMPTABLE";
  const adresseLines = adresse.split("\n").filter(Boolean);

  if (isExterne) {
    return (
      <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, marginTop: 4 }}>
        {name && <p style={{ margin: 0, fontSize: 13, fontWeight: "bold", color: "#1e293b" }}>{name}</p>}
        {titre && <p style={{ margin: "2px 0 0", fontSize: 12, color: "#475569" }}>{titre}</p>}
        {societe && <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 600, color: "#1e293b" }}>{societe}</p>}
        {adresseLines.map((l, i) => (
          <p key={i} style={{ margin: "2px 0 0", fontSize: 12, color: "#475569" }}>{l}</p>
        ))}
        {telephone && <p style={{ margin: "6px 0 0", fontSize: 12, color: "#1e293b" }}>Tél : {telephone}</p>}
        {email && <p style={{ margin: "3px 0 0", fontSize: 12, color: "#1e293b", textDecoration: "underline" }}>{email}</p>}
        <img src="/logo-oec.jpg" alt="Ordre des Experts-Comptables" style={{ marginTop: 12, width: 160, display: "block" }} />
      </div>
    );
  }

  return (
    <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 14, marginTop: 4 }}>
      <table cellPadding={0} cellSpacing={0} style={{ width: "100%" }}>
        <tbody>
          <tr>
            <td style={{ width: 80, paddingRight: 14, verticalAlign: "middle" }}>
              <img src="/logo.png" alt="SDA Rénovation" style={{ width: 72, display: "block" }} />
            </td>
            <td style={{ width: 1, background: "#e2e8f0" }}>&nbsp;</td>
            <td style={{ paddingLeft: 14, verticalAlign: "top" }}>
              {name && <p style={{ margin: 0, fontSize: 13, fontWeight: "bold", color: "#1E2F6E" }}>{name}</p>}
              {titre && <p style={{ margin: "1px 0 0", fontSize: 12, color: "#1E2F6E" }}>{titre}</p>}
              <p style={{ margin: "1px 0 0", fontSize: 12, color: "#1E2F6E" }}>SDA Rénovation</p>
              {telephone && <p style={{ margin: "8px 0 0", fontSize: 12, color: "#1e293b" }}>{telephone}</p>}
              {email && <p style={{ margin: "3px 0 0", fontSize: 12, color: "#1e293b", textDecoration: "underline" }}>{email}</p>}
              <p style={{ margin: "3px 0 0", fontSize: 11, color: "#64748b" }}>
                Z.I du Casque 23 bis rue Aristide Berges, 31270 Cugnaux
              </p>
              <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                <span style={{ display: "inline-block", width: 24, height: 24, background: "#1e1e1e", borderRadius: "50%", textAlign: "center", lineHeight: "24px", color: "#fff", fontSize: 12, fontWeight: "bold" }}>f</span>
                <span style={{ display: "inline-block", width: 24, height: 24, background: "#1e1e1e", borderRadius: "50%", textAlign: "center", lineHeight: "24px", color: "#fff", fontSize: 10, fontWeight: "bold" }}>in</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export function UserForm({ action, defaultValues, isEdit }: UserFormProps) {
  const [state, formAction] = useActionState(action, undefined);
  const [role, setRole] = useState(defaultValues?.role ?? "DIRIGEANT");

  // Champs signature pour l'aperçu live
  const [sigName, setSigName] = useState(defaultValues?.name ?? "");
  const [sigEmail, setSigEmail] = useState(defaultValues?.email ?? "");
  const [sigTitre, setSigTitre] = useState(defaultValues?.titre ?? "");
  const [sigTel, setSigTel] = useState(defaultValues?.telephone ?? "");
  const [sigSociete, setSigSociete] = useState(defaultValues?.societe ?? "");
  const [sigAdresse, setSigAdresse] = useState(defaultValues?.adresse ?? "");

  const isRestricted = !isFullAccessRole(role);

  const defaultPerms =
    defaultValues?.permissions && defaultValues.permissions.length > 0
      ? defaultValues.permissions
      : getDefaultPermissions(role);

  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(
    new Set(defaultPerms),
  );

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (!isFullAccessRole(role)) {
      setCheckedPerms(new Set(getDefaultPermissions(role)));
    } else {
      setCheckedPerms(new Set());
    }
  }, [role]);

  const togglePerm = (route: string) => {
    setCheckedPerms((prev) => {
      const next = new Set(prev);
      if (next.has(route)) {
        next.delete(route);
      } else {
        next.add(route);
      }
      return next;
    });
  };

  const err = state?.errors as Record<string, string[]> | undefined;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.message && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">{state.message}</p>
      )}

      {/* Identité */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Identité et connexion</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Nom complet" error={err?.name?.[0]}>
            <input
              name="name"
              type="text"
              defaultValue={defaultValues?.name}
              className={inputClasses}
              placeholder="Prénom Nom"
              required
              onChange={(e) => setSigName(e.target.value)}
            />
          </Field>
          <Field label="Adresse e-mail (identifiant)" error={err?.email?.[0]}>
            <input
              name="email"
              type="email"
              defaultValue={defaultValues?.email}
              className={inputClasses}
              placeholder="prenom.nom@exemple.fr"
              required
              onChange={(e) => setSigEmail(e.target.value)}
            />
          </Field>
          <Field
            label={isEdit ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}
            error={err?.password?.[0]}
          >
            <input
              name="password"
              type="password"
              className={inputClasses}
              placeholder={isEdit ? "••••••••" : "8 caractères minimum"}
              minLength={isEdit ? undefined : 8}
              required={!isEdit}
              autoComplete="new-password"
            />
          </Field>
          <Field label="Profil / Rôle" error={err?.role?.[0]}>
            <select
              name="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputClasses}
            >
              {ALL_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Signature email */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Signature email</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Titre / Fonction" error={err?.titre?.[0]}>
              <input
                name="titre"
                type="text"
                defaultValue={defaultValues?.titre ?? ""}
                className={inputClasses}
                placeholder="ex. Conducteur de travaux, Commercial…"
                onChange={(e) => setSigTitre(e.target.value)}
              />
            </Field>
            <Field label="Téléphone" error={err?.telephone?.[0]}>
              <input
                name="telephone"
                type="tel"
                defaultValue={defaultValues?.telephone ?? ""}
                className={inputClasses}
                placeholder="06 XX XX XX XX"
                onChange={(e) => setSigTel(e.target.value)}
              />
            </Field>
            <Field label="Cabinet / Société" error={err?.societe?.[0]}>
              <input
                name="societe"
                type="text"
                defaultValue={defaultValues?.societe ?? ""}
                className={inputClasses}
                placeholder="ex. SEGEC AUDIT"
                onChange={(e) => setSigSociete(e.target.value)}
              />
            </Field>
            <Field label="Adresse professionnelle" error={err?.adresse?.[0]}>
              <textarea
                name="adresse"
                defaultValue={defaultValues?.adresse ?? ""}
                className={inputClasses}
                rows={2}
                placeholder={"101, bd de Suisse\n31200 TOULOUSE"}
                onChange={(e) => setSigAdresse(e.target.value)}
              />
            </Field>
          </div>

          {/* Aperçu signature */}
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Aperçu de la signature</p>
            <SignaturePreview
              name={sigName}
              email={sigEmail}
              titre={sigTitre}
              telephone={sigTel}
              societe={sigSociete}
              adresse={sigAdresse}
              role={role}
            />
          </div>
        </div>
      </div>

      {/* Permissions — uniquement pour les rôles restreints */}
      {isRestricted && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
          <h3 className="mb-1 font-semibold text-amber-800">Droits d'accès</h3>
          <p className="mb-4 text-sm text-amber-700">
            Cochez les sections auxquelles ce profil aura accès. Les sections non cochées seront inaccessibles.
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PERMISSION_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-600">
                  {group.label}
                </p>
                <div className="flex flex-col gap-1.5">
                  {group.routes.map((route) => (
                    <label
                      key={route}
                      className="flex cursor-pointer items-center gap-2 text-sm text-amber-900"
                    >
                      <input
                        type="checkbox"
                        name="perm"
                        value={route}
                        checked={checkedPerms.has(route)}
                        onChange={() => togglePerm(route)}
                        className="h-4 w-4 rounded border-amber-300 text-brand-orange focus:ring-brand-orange"
                      />
                      {PERMISSION_LABELS[route] ?? route}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!isRestricted && (
        <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-5 py-4">
          <p className="text-sm text-brand-blue-dark">
            <strong>{ROLE_LABELS[role]}</strong> a accès à l'intégralité du CRM, y compris la gestion des utilisateurs,
            les ressources humaines et les paramètres.
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <SubmitButton>{isEdit ? "Enregistrer les modifications" : "Créer le compte"}</SubmitButton>
      </div>
    </form>
  );
}
