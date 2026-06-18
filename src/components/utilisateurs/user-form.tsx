"use client";

import { useActionState, useEffect, useState } from "react";
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
  };
  isEdit?: boolean;
};

export function UserForm({ action, defaultValues, isEdit }: UserFormProps) {
  const [state, formAction] = useActionState(action, undefined);
  const [role, setRole] = useState(defaultValues?.role ?? "DIRIGEANT");

  const isRestricted = !isFullAccessRole(role);

  const defaultPerms =
    defaultValues?.permissions && defaultValues.permissions.length > 0
      ? defaultValues.permissions
      : getDefaultPermissions(role);

  const [checkedPerms, setCheckedPerms] = useState<Set<string>>(
    new Set(defaultPerms),
  );

  // Recalcule les permissions par défaut quand le rôle change
  useEffect(() => {
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
