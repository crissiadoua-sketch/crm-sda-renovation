"use client";

import { useActionState, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Field, inputClasses, selectClasses, spellProps, AlertDossierManquant } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { urlFichier } from "@/lib/format";
import type { DepenseState } from "@/lib/actions/depenses";
import type { Chantier, Fournisseur } from "@/generated/prisma/client";

type Action = (prevState: DepenseState, formData: FormData) => Promise<DepenseState>;

export const CATEGORIES_DEPENSE = [
  // Charges variables (liées à l'activité)
  { value: "MATERIAUX",    label: "Matériaux & fournitures",    groupe: "Charges variables" },
  { value: "SOUS_TRAITANCE", label: "Sous-traitance",           groupe: "Charges variables" },
  { value: "MAIN_OEUVRE",  label: "Main-d'œuvre externe",       groupe: "Charges variables" },
  { value: "TRANSPORT",    label: "Transport / carburant",       groupe: "Charges variables" },
  // Charges fixes (structure)
  { value: "LOYER",        label: "Loyer & charges locatives",  groupe: "Charges fixes" },
  { value: "ASSURANCE",    label: "Assurances (décennale, RC, flotte…)", groupe: "Charges fixes" },
  { value: "ADMINISTRATIF",label: "Administratif (expert-comptable, logiciels…)", groupe: "Charges fixes" },
  { value: "IMPOT_TAXE",  label: "Impôts & taxes (CFE, CVAE…)", groupe: "Charges fixes" },
  // Hors exploitation
  { value: "AMORTISSEMENT", label: "Amortissements (véhicules, matériels)", groupe: "Hors exploitation" },
  { value: "INVESTISSEMENT", label: "Investissements (achat matériel durable)", groupe: "Hors exploitation" },
  // Autre
  { value: "AUTRE",        label: "Autre / Divers",             groupe: "Autre" },
] as const;

interface DepenseFormProps {
  action: Action;
  chantiers: Pick<Chantier, "id" | "nom" | "reference">[];
  fournisseurs: Pick<Fournisseur, "id" | "nom">[];
  defaultValues?: {
    libelle?: string;
    montant?: number;
    date?: string;
    categorie?: string;
    chantierId?: string | null;
    fournisseurId?: string | null;
    notes?: string | null;
    factureUrl?: string | null;
    factureNom?: string | null;
  };
  submitLabel?: string;
}

export function DepenseForm({
  action,
  chantiers,
  fournisseurs,
  defaultValues,
  submitLabel = "Enregistrer la dépense",
}: DepenseFormProps) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};

  // Regrouper les catégories
  const groupes = ["Charges variables", "Charges fixes", "Hors exploitation", "Autre"] as const;

  const chantierId = defaultValues?.chantierId;

  // Import de la facture d'achat — upload immédiat vers le stockage, l'URL
  // résultante est portée par un champ caché et n'est persistée en base qu'au
  // moment où le formulaire (création OU modification) est soumis.
  const [factureUrl, setFactureUrl] = useState(defaultValues?.factureUrl ?? "");
  const [factureNom, setFactureNom] = useState(defaultValues?.factureNom ?? "");
  const [uploadingFacture, setUploadingFacture] = useState(false);
  const [factureError, setFactureError] = useState("");
  const factureInputRef = useRef<HTMLInputElement>(null);

  const handleFactureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFactureError("");
    setUploadingFacture(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/depenses/upload-facture", { method: "POST", body: formData });
    setUploadingFacture(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null) as { error?: string } | null;
      setFactureError(data?.error ?? "Échec de l'import de la facture.");
      return;
    }
    const data = await res.json() as { url: string; nom: string };
    setFactureUrl(data.url);
    setFactureNom(data.nom);
  };

  const handleRemoveFacture = () => {
    if (factureInputRef.current) factureInputRef.current.value = "";
    setFactureUrl("");
    setFactureNom("");
  };

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {state?.message && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
          ✅ {state.message}
        </div>
      )}
      {!chantierId && <AlertDossierManquant />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Libellé */}
        <Field label="Libellé / description" htmlFor="libelle" error={errors.libelle} className="sm:col-span-2" required>
          <input
            id="libelle"
            name="libelle"
            defaultValue={defaultValues?.libelle ?? ""}
            placeholder="ex. Achat ciment, Loyer bureau juin, Assurance décennale…"
            required
            className={inputClasses}
            {...spellProps}
          />
        </Field>

        {/* Montant */}
        <Field label="Montant (€ TTC ou HT)" htmlFor="montant" error={errors.montant}>
          <input
            id="montant"
            name="montant"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultValues?.montant ?? ""}
            placeholder="0,00"
            required
            className={inputClasses}
          />
        </Field>

        {/* Date */}
        <Field label="Date" htmlFor="date" error={errors.date}>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={
              defaultValues?.date ??
              new Date().toISOString().slice(0, 10)
            }
            required
            className={inputClasses}
          />
        </Field>

        {/* Catégorie */}
        <Field label="Catégorie" htmlFor="categorie" error={errors.categorie} className="sm:col-span-2">
          <select
            id="categorie"
            name="categorie"
            defaultValue={defaultValues?.categorie ?? "AUTRE"}
            className={selectClasses}
          >
            {groupes.map((groupe) => {
              const cats = CATEGORIES_DEPENSE.filter((c) => c.groupe === groupe);
              return (
                <optgroup key={groupe} label={`── ${groupe} ──`}>
                  {cats.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          <p className="mt-1 text-xs text-slate-400">
            La catégorie détermine où la dépense apparaît dans le Compte de résultat (P&L).
          </p>
        </Field>

        {/* Chantier */}
        <Field label="Chantier lié (optionnel)" htmlFor="chantierId" error={errors.chantierId}>
          <select
            id="chantierId"
            name="chantierId"
            defaultValue={defaultValues?.chantierId ?? ""}
            className={selectClasses}
          >
            <option value="">— Aucun chantier —</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.reference} · {c.nom}
              </option>
            ))}
          </select>
        </Field>

        {/* Fournisseur */}
        <Field label="Fournisseur (optionnel)" htmlFor="fournisseurId" error={errors.fournisseurId}>
          <select
            id="fournisseurId"
            name="fournisseurId"
            defaultValue={defaultValues?.fournisseurId ?? ""}
            className={selectClasses}
          >
            <option value="">— Aucun fournisseur —</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom}
              </option>
            ))}
          </select>
        </Field>

        {/* Notes */}
        <Field label="Notes internes" htmlFor="notes" error={errors.notes} className="sm:col-span-2">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={defaultValues?.notes ?? ""}
            placeholder="Référence facture fournisseur, commentaire…"
            className={inputClasses}
            {...spellProps}
          />
        </Field>

        {/* Facture d'achat */}
        <Field label="Facture d'achat (optionnel)" htmlFor="facture-input" className="sm:col-span-2">
          <input type="hidden" name="factureUrl" value={factureUrl} />
          <input type="hidden" name="factureNom" value={factureNom} />
          <div className="flex flex-wrap items-center gap-3">
            {factureUrl ? (
              <a
                href={urlFichier(factureUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:border-brand-blue/40"
              >
                <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                {factureNom || "Facture jointe"}
              </a>
            ) : (
              <button
                type="button"
                onClick={() => factureInputRef.current?.click()}
                disabled={uploadingFacture}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {uploadingFacture ? "Envoi…" : "Importer la facture"}
              </button>
            )}
            {factureUrl && (
              <button
                type="button"
                onClick={handleRemoveFacture}
                title="Retirer la facture"
                className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-red-50 hover:text-red-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <input
              ref={factureInputRef}
              id="facture-input"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={handleFactureChange}
              className="hidden"
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">PDF, JPEG, PNG ou WEBP — 15 Mo max.</p>
          {factureError && <p className="mt-1 text-xs text-red-500">{factureError}</p>}
        </Field>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
