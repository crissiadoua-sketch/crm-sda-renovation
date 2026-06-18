"use client";

import { useActionState, useState, useRef } from "react";
import { Camera, FileUp, X, FileText, ScanLine } from "lucide-react";
import { Field, inputClasses } from "@/components/ui/fields";
import { SubmitButton } from "@/components/ui/submit-button";
import { toDateInputValue } from "@/lib/format";
import type { NoteState } from "@/lib/actions/notes-de-frais";
import type { NoteDeFrais, Chantier } from "@/generated/prisma/client";

type Action = (prevState: NoteState, formData: FormData) => Promise<NoteState>;

const categories = [
  { value: "REPAS", label: "🍽️ Repas" },
  { value: "DEPLACEMENT", label: "🚗 Déplacement" },
  { value: "CARBURANT", label: "⛽ Carburant" },
  { value: "MATERIEL", label: "🔧 Matériel" },
  { value: "HEBERGEMENT", label: "🏨 Hébergement" },
  { value: "SOUS_TRAITANCE", label: "👷 Sous-traitance" },
  { value: "AUTRE", label: "📦 Autre" },
];

const statuts = [
  { value: "EN_ATTENTE", label: "En attente" },
  { value: "VALIDEE", label: "Validée" },
  { value: "REMBOURSEE", label: "Remboursée" },
];

export function NoteForm({
  note,
  chantiers,
  action,
}: {
  note?: NoteDeFrais;
  chantiers: Chantier[];
  action: Action;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const errors = state?.errors ?? {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(note?.justificatif ?? null);
  const [isPdf, setIsPdf] = useState(note?.justificatif?.endsWith(".pdf") ?? false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type === "application/pdf") {
      setPreview(null);
      setIsPdf(true);
    } else {
      setIsPdf(false);
      const url = URL.createObjectURL(file);
      setPreview(url);
    }
  }

  function clearFile() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPreview(note?.justificatif ?? null);
    setIsPdf(note?.justificatif?.endsWith(".pdf") ?? false);
  }

  return (
    <form action={formAction} className="flex flex-col gap-5" encType="multipart/form-data">
      {state?.message && (
        <div className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">✅ {state.message}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Date" htmlFor="date" error={errors.date}>
          <input
            id="date"
            name="date"
            type="date"
            defaultValue={toDateInputValue(note?.date) || toDateInputValue(new Date())}
            required
            className={inputClasses}
          />
        </Field>

        <Field label="Montant HT (€)" htmlFor="montant" error={errors.montant}>
          <input
            id="montant"
            name="montant"
            type="number"
            step="0.01"
            min="0"
            defaultValue={note?.montant ?? ""}
            placeholder="0.00"
            required
            className={inputClasses}
          />
        </Field>

        <Field label="TVA (%)" htmlFor="tva" error={errors.tva}>
          <input
            id="tva"
            name="tva"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue={note?.tva ?? ""}
            placeholder="20"
            className={inputClasses}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Catégorie" htmlFor="categorie" error={errors.categorie}>
          <select id="categorie" name="categorie" defaultValue={note?.categorie ?? "AUTRE"} className={inputClasses}>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Statut" htmlFor="statut" error={errors.statut}>
          <select id="statut" name="statut" defaultValue={note?.statut ?? "EN_ATTENTE"} className={inputClasses}>
            {statuts.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Fournisseur / Enseigne" htmlFor="fournisseur" error={errors.fournisseur}>
        <input
          id="fournisseur"
          name="fournisseur"
          defaultValue={note?.fournisseur ?? ""}
          placeholder="Ex. Total, Leroy Merlin, Bistrot du coin…"
          className={inputClasses}
        />
      </Field>

      <Field label="Description / Motif" htmlFor="description" error={errors.description}>
        <textarea
          id="description"
          name="description"
          defaultValue={note?.description ?? ""}
          rows={3}
          placeholder="Ex. Déjeuner de chantier avec les sous-traitants"
          className={inputClasses}
        />
      </Field>

      <Field label="Chantier associé (optionnel)" htmlFor="chantierId" error={errors.chantierId}>
        <select id="chantierId" name="chantierId" defaultValue={note?.chantierId ?? ""} className={inputClasses}>
          <option value="">— Aucun chantier —</option>
          {chantiers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.reference} — {c.nom}
            </option>
          ))}
        </select>
      </Field>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-orange/10">
            <ScanLine className="h-5 w-5 text-brand-orange-dark" />
          </div>
          <div>
            <h3 className="font-semibold text-brand-navy">Justificatif</h3>
            <p className="text-sm text-slate-500">Photo du ticket, facture PDF ou image JPEG / PNG.</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {(preview || isPdf) && (
            <div className="relative w-full max-w-sm">
              {isPdf ? (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <FileText className="h-10 w-10 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Document PDF</p>
                    {note?.justificatif && (
                      <a
                        href={note.justificatif}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-blue hover:underline"
                      >
                        Ouvrir le fichier
                      </a>
                    )}
                  </div>
                </div>
              ) : preview ? (
                <img
                  src={preview}
                  alt="Aperçu du justificatif"
                  className="max-h-64 w-full rounded-lg border border-slate-200 object-contain"
                />
              ) : null}
              <button
                type="button"
                onClick={clearFile}
                className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow hover:bg-red-50"
                title="Retirer le fichier"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                if (!fileInputRef.current) return;
                fileInputRef.current.removeAttribute("capture");
                fileInputRef.current.setAttribute("accept", "image/*,application/pdf");
                fileInputRef.current.click();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FileUp className="h-4 w-4" />
              Importer un fichier
            </button>

            <button
              type="button"
              onClick={() => {
                if (!fileInputRef.current) return;
                fileInputRef.current.setAttribute("capture", "environment");
                fileInputRef.current.setAttribute("accept", "image/*");
                fileInputRef.current.click();
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-brand-orange/40 bg-brand-orange/5 px-4 py-2 text-sm font-semibold text-brand-orange-dark transition hover:bg-brand-orange/10"
            >
              <Camera className="h-4 w-4" />
              Prendre une photo
            </button>
          </div>

          <input
            ref={fileInputRef}
            id="justificatif"
            name="justificatif"
            type="file"
            accept="image/*,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          <p className="text-xs text-slate-400">
            Formats acceptés : JPEG, PNG, HEIC, PDF · Taille max recommandée : 10 Mo
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="Enregistrement…">{note ? "Mettre à jour" : "Créer la note de frais"}</SubmitButton>
      </div>
    </form>
  );
}
