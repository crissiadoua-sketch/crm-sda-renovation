"use client";

import { useState, useTransition, useActionState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { FormuleForm } from "@/components/mutuelle/formule-form";
import { formatEuros } from "@/lib/format";
import {
  addFormuleMutuelle,
  updateFormuleMutuelle,
  deleteFormuleMutuelle,
  type FormuleState,
} from "@/lib/actions/mutuelle";
import type { ContratMutuelle, FormuleMutuelle } from "@/generated/prisma/client";

const NIVEAU_LABELS: Record<string, string> = {
  BASE: "Base",
  OPTION_1: "Option 1",
  OPTION_2: "Option 2",
  OPTION_3: "Option 3",
};

export function FormulePanel({
  contrat,
}: {
  contrat: ContratMutuelle & { formules: FormuleMutuelle[] };
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const addAction = addFormuleMutuelle.bind(null, contrat.id);

  function handleDelete(formuleId: string) {
    if (!confirm("Supprimer cette formule ? Les adhésions associées seront aussi supprimées.")) return;
    startTransition(() => {
      deleteFormuleMutuelle(formuleId, contrat.id);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold text-brand-navy">Formules de couverture</h3>
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-orange-dark"
        >
          <Plus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-brand-navy">Nouvelle formule</p>
            <button onClick={() => setShowAdd(false)}>
              <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
            </button>
          </div>
          <FormuleForm
            action={async (prev: FormuleState, fd: FormData) => {
              const result = await addAction(prev, fd);
              if (!result?.errors) setShowAdd(false);
              return result;
            }}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {contrat.formules.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Aucune formule configurée. Ajoutez au moins une formule de base.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {contrat.formules.map((f) => (
            <div key={f.id}>
              {editingId === f.id ? (
                <div className="rounded-lg border border-brand-blue/30 bg-blue-50/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-medium text-brand-navy">Modifier : {f.label}</p>
                    <button onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                    </button>
                  </div>
                  <FormuleForm
                    formule={f}
                    action={updateFormuleMutuelle.bind(null, f.id, contrat.id)}
                    onCancel={() => setEditingId(null)}
                  />
                </div>
              ) : (
                <div className="flex items-start justify-between rounded-lg border border-slate-200 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-xs font-medium text-brand-blue">
                        {NIVEAU_LABELS[f.niveau] ?? f.niveau}
                      </span>
                      <span className="font-medium text-brand-navy">{f.label}</span>
                    </div>
                    <div className="mt-1 flex gap-4 text-sm text-slate-600">
                      <span>Salarié : <strong>{formatEuros(f.cotisationSalarie)}</strong>/mois</span>
                      <span>Patron : <strong>{formatEuros(f.cotisationPatronale)}</strong>/mois</span>
                      <span className="text-slate-400">
                        Total : {formatEuros(f.cotisationSalarie + f.cotisationPatronale)}/mois
                      </span>
                    </div>
                    {f.garanties && (
                      <p className="mt-1 text-xs text-slate-500">{f.garanties}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(f.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-blue"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(f.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
        L'employeur doit financer au minimum <strong>50 %</strong> de la cotisation de la formule de base (art. L. 911-7 du Code de la sécurité sociale).
      </div>
    </div>
  );
}
