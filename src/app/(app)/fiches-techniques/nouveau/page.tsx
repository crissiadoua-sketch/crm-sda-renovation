export const dynamic = "force-dynamic";

import Link from "next/link";
import { createFicheTechnique } from "@/lib/actions/fiches-techniques";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { buttonClasses } from "@/components/ui/button";

const CATEGORIES = [
  { value: "PRODUIT", label: "Produit" },
  { value: "MATERIAU", label: "Matériau" },
  { value: "CONSOMMABLE", label: "Consommable" },
  { value: "EQUIPEMENT", label: "Équipement" },
];

const CORPS_ETAT_OPTIONS = [
  { value: "TER", label: "TER — Terrassement" },
  { value: "MAC", label: "MAC — Maçonnerie" },
  { value: "DAL", label: "DAL — Dallage" },
  { value: "COV", label: "COV — Carrelage/Revêtement" },
  { value: "RAV", label: "RAV — Ravalement" },
  { value: "PLA", label: "PLA — Plâtrerie" },
  { value: "MEN", label: "MEN — Menuiserie" },
  { value: "RSD", label: "RSD — Réseau sec (Électricité)" },
  { value: "RSS", label: "RSS — Réseau sec (Plomberie)" },
  { value: "PEI", label: "PEI — Peinture" },
  { value: "SER", label: "SER — Serrurerie" },
  { value: "AUTRE", label: "AUTRE — Autre" },
];

export default function NouvelleFicheTechniquePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/fiches-techniques" className="text-sm text-brand-blue hover:underline">
          ← Retour aux fiches techniques
        </Link>
        <h2 className="mt-2 text-xl font-bold text-brand-navy">Nouvelle fiche technique</h2>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createFicheTechnique} encType="multipart/form-data" className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Catégorie" htmlFor="categorie">
              <select
                id="categorie"
                name="categorie"
                defaultValue="PRODUIT"
                className={inputClasses}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Corps d'état" htmlFor="corpsEtat">
              <select
                id="corpsEtat"
                name="corpsEtat"
                defaultValue=""
                className={inputClasses}
              >
                <option value="" disabled>
                  Sélectionner…
                </option>
                {CORPS_ETAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Désignation *" htmlFor="designation">
            <input
              id="designation"
              name="designation"
              type="text"
              required
              placeholder="Ex. : Enduit de façade monocouche"
              className={inputClasses}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Marque" htmlFor="marque">
              <input
                id="marque"
                name="marque"
                type="text"
                placeholder="Ex. : Weber"
                className={inputClasses}
              />
            </Field>

            <Field label="Référence produit" htmlFor="reference">
              <input
                id="reference"
                name="reference"
                type="text"
                placeholder="Ex. : WEB-EF-2024"
                className={inputClasses}
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="description">
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Description détaillée du produit ou matériau…"
              className={inputClasses}
            />
          </Field>

          <Field label="Normes" htmlFor="normes">
            <input
              id="normes"
              name="normes"
              type="text"
              placeholder="Ex. : NF EN 13016, CE"
              className={inputClasses}
            />
          </Field>

          <Field label="Lien URL (fiche fabricant)" htmlFor="lienUrl">
            <input
              id="lienUrl"
              name="lienUrl"
              type="url"
              placeholder="https://…"
              className={inputClasses}
            />
          </Field>

          <Field label="Fiche PDF" htmlFor="fichierPdf">
            <input
              id="fichierPdf"
              name="fichierPdf"
              type="file"
              accept=".pdf"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-navy/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand-navy hover:file:bg-brand-navy/20"
            />
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Link href="/fiches-techniques" className={buttonClasses("secondary")}>
              Annuler
            </Link>
            <SubmitButton pendingLabel="Enregistrement…">Enregistrer la fiche</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
