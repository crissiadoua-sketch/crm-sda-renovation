"use client";

import { useState, useActionState } from "react";
import { ClipboardX, CheckCircle2, Info } from "lucide-react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { toDateInputValue } from "@/lib/format";
import type { EtatReservesState } from "@/lib/actions/etats-reserves";
import type { EtatReserves, Chantier, Client } from "@/generated/prisma/client";

type Action = (prevState: EtatReservesState, formData: FormData) => Promise<EtatReservesState>;

export function EtatReservesForm({
  etat,
  chantiers,
  clients,
  action,
}: {
  etat?: EtatReserves;
  chantiers: Chantier[];
  clients: Client[];
  action: Action;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  const [chantierId, setChantierId] = useState<string>(etat?.chantierId ?? "");
  const [clientId, setClientId] = useState<string>(etat?.clientId ?? "");

  // ── Pré-remplissage depuis chantier ──────────────────────────────────────
  const handleChantierChange = (newId: string) => {
    setChantierId(newId);
    if (!newId) return;
    const ch = chantiers.find((c) => c.id === newId);
    if (!ch) return;
    setClientId((prev) => prev || ch.clientId || "");
  };

  const isLeve = etat?.statut === "LEVE";

  return (
    <form action={formAction} className="flex flex-col gap-6">
      {state?.message && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">✅ {state.message}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Date du document" htmlFor="dateDocument" error={errors.dateDocument}>
          <input
            id="dateDocument"
            name="dateDocument"
            type="date"
            defaultValue={toDateInputValue(etat?.dateDocument) || toDateInputValue(new Date())}
            required
            className={inputClasses}
          />
        </Field>
        <Field label="Statut" htmlFor="statut" error={errors.statut}>
          <select id="statut" name="statut" defaultValue={etat?.statut ?? "EN_COURS"} className={inputClasses}>
            <option value="EN_COURS">En cours</option>
            <option value="SIGNE">Signé</option>
            <option value="LEVE">Levée de réserves constatée</option>
          </select>
        </Field>
        <Field label="Nombre d'exemplaires" htmlFor="nombreExemplaires" error={errors.nombreExemplaires}>
          <input
            id="nombreExemplaires"
            name="nombreExemplaires"
            type="number"
            min="1"
            defaultValue={etat?.nombreExemplaires ?? 2}
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Chantier associé" htmlFor="chantierId" error={errors.chantierId}>
          <select
            id="chantierId"
            name="chantierId"
            value={chantierId}
            onChange={(e) => handleChantierChange(e.target.value)}
            className={inputClasses}
          >
            <option value="">— Sélectionner un chantier —</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.reference} — {c.nom}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Client (maître d'ouvrage)" htmlFor="clientId" error={errors.clientId}>
          <select
            id="clientId"
            name="clientId"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            className={inputClasses}
          >
            <option value="">— Sélectionner un client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.type === "ENTREPRISE" ? c.raisonSociale ?? c.nom : `${c.prenom ?? ""} ${c.nom}`.trim()}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rounded-xl border border-red-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50">
            <ClipboardX className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy">État des réserves</h3>
            <p className="text-sm text-slate-500">
              Malfaçons, omissions et imperfections constatées lors de la réception des travaux.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Field label="Nature des réserves" htmlFor="natureReserves" error={errors.natureReserves}>
            <textarea
              id="natureReserves"
              name="natureReserves"
              defaultValue={etat?.natureReserves ?? ""}
              rows={6}
              placeholder="Décrivez précisément chaque réserve constatée…"
              className={inputClasses}
            />
          </Field>
          <Field label="Travaux à exécuter" htmlFor="travauxAExecuter" error={errors.travauxAExecuter}>
            <textarea
              id="travauxAExecuter"
              name="travauxAExecuter"
              defaultValue={etat?.travauxAExecuter ?? ""}
              rows={6}
              placeholder="Détaillez les travaux de reprise à réaliser…"
              className={inputClasses}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Délai global d'exécution des travaux de reprise"
              htmlFor="delaiExecution"
              error={errors.delaiExecution}
            >
              <input
                id="delaiExecution"
                name="delaiExecution"
                defaultValue={etat?.delaiExecution ?? ""}
                placeholder="Ex. 15 jours, 4 semaines…"
                className={inputClasses}
              />
            </Field>
            <Field label="Fait à" htmlFor="lieuSignature" error={errors.lieuSignature}>
              <input
                id="lieuSignature"
                name="lieuSignature"
                defaultValue={etat?.lieuSignature ?? ""}
                placeholder="Ex. Cugnaux"
                className={inputClasses}
              />
            </Field>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border p-5 shadow-sm ${isLeve ? "border-green-200 bg-green-50/30" : "border-slate-200 bg-white"}`}>
        <div className="mb-4 flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${isLeve ? "bg-green-100" : "bg-slate-100"}`}>
            <CheckCircle2 className={`h-5 w-5 ${isLeve ? "text-green-600" : "text-slate-400"}`} />
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy">Constat de levée de réserves</h3>
            <p className="text-sm text-slate-500">
              À remplir une fois que l&apos;entreprise a remédié à toutes les réserves.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Lieu du constat" htmlFor="lieuLevee" error={errors.lieuLevee}>
            <input
              id="lieuLevee"
              name="lieuLevee"
              defaultValue={etat?.lieuLevee ?? ""}
              placeholder="Ex. Cugnaux"
              className={inputClasses}
            />
          </Field>
          <Field label="Date du constat de levée" htmlFor="dateLevee" error={errors.dateLevee}>
            <input
              id="dateLevee"
              name="dateLevee"
              type="date"
              defaultValue={toDateInputValue(etat?.dateLevee)}
              className={inputClasses}
            />
          </Field>
        </div>

        {!isLeve && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
            <Info className="h-4 w-4 shrink-0" />
            Passez le statut à &ldquo;Levée de réserves constatée&rdquo; une fois que toutes les réserves ont été levées.
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">
          {etat ? "Mettre à jour" : "Créer l'état des réserves"}
        </SubmitButton>
      </div>
    </form>
  );
}
