export const dynamic = "force-dynamic";

import Link from "next/link";
import { createDtu } from "@/lib/actions/dtu";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { buttonClasses } from "@/components/ui/button";

const DOMAINE_OPTIONS = [
  { value: "TERRASSEMENT", label: "Terrassement & Fondations" },
  { value: "MACONNERIE", label: "Maçonnerie générale" },
  { value: "BETON", label: "Béton" },
  { value: "DALLAGE", label: "Dallage & Sol industriel" },
  { value: "CHAPE", label: "Chapes" },
  { value: "COUVERTURE", label: "Couverture & Zinguerie" },
  { value: "RAVALEMENT", label: "Ravalement & Façade" },
  { value: "PLATRERIE", label: "Plâtrerie" },
  { value: "MENUISERIE", label: "Menuiserie intérieure & extérieure" },
  { value: "AGENCEMENT", label: "Agencement" },
  { value: "REVETEMENT_SOL", label: "Revêtements de sol" },
  { value: "REVETEMENT_MURAL", label: "Revêtements muraux" },
  { value: "PEINTURE", label: "Peinture" },
  { value: "PLOMBERIE", label: "Plomberie, Sanitaire & CVC" },
  { value: "ELECTRICITE", label: "Électricité" },
  { value: "RENFORCEMENT_STRUCTUREL", label: "Renforcement structurel" },
  { value: "AUTRE", label: "Autres" },
];

const CORPS_ETAT_OPTIONS = [
  { value: "TER", label: "TER — Terrassement" },
  { value: "MAC", label: "MAC — Maçonnerie" },
  { value: "DAL", label: "DAL — Dallage" },
  { value: "COV", label: "COV — Carrelage / Revêtement" },
  { value: "RAV", label: "RAV — Ravalement" },
  { value: "PLA", label: "PLA — Plâtrerie" },
  { value: "MEN", label: "MEN — Menuiserie" },
  { value: "RSD", label: "RSD — Réseau (Élec. / Plomb.)" },
  { value: "RSS", label: "RSS — Couverture / Zinguerie" },
  { value: "PEI", label: "PEI — Peinture" },
  { value: "SER", label: "SER — Serrurerie / Acier" },
  { value: "AUTRE", label: "AUTRE — Autre" },
];

export default function NouveauDTUPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/dtu" className="text-sm text-brand-blue hover:underline">
          ← Retour à la bibliothèque DTU
        </Link>
        <h2 className="mt-2 text-xl font-bold text-brand-navy">Ajouter un DTU / norme</h2>
        <p className="mt-1 text-sm text-slate-500">
          Saisissez les informations de référence. L&apos;upload du PDF se fait depuis la fiche détail.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <form action={createDtu} className="flex flex-col gap-5">
          {/* Référence + Titre */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Référence *" htmlFor="reference">
              <input
                id="reference"
                name="reference"
                type="text"
                required
                placeholder="Ex. : DTU 20.1"
                className={inputClasses}
              />
            </Field>
            <Field label="Titre *" htmlFor="titre">
              <input
                id="titre"
                name="titre"
                type="text"
                required
                placeholder="Ex. : Ouvrages en maçonnerie de petits éléments"
                className={inputClasses}
              />
            </Field>
          </div>

          {/* Domaine + Corps d'état */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Domaine" htmlFor="domaine">
              <select id="domaine" name="domaine" defaultValue="AUTRE" className={inputClasses}>
                {DOMAINE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Corps d'état" htmlFor="corpsEtat">
              <select id="corpsEtat" name="corpsEtat" defaultValue="MAC" className={inputClasses}>
                {CORPS_ETAT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* Version + Norme NF */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Version / Date" htmlFor="version">
              <input
                id="version"
                name="version"
                type="text"
                placeholder="Ex. : Septembre 2008"
                className={inputClasses}
              />
            </Field>
            <Field label="Norme NF" htmlFor="normeNF">
              <input
                id="normeNF"
                name="normeNF"
                type="text"
                placeholder="Ex. : NF P10-202"
                className={inputClasses}
              />
            </Field>
          </div>

          {/* Description */}
          <Field label="Description" htmlFor="description">
            <textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Résumé du contenu et du domaine d'application de la norme…"
              className={inputClasses}
            />
          </Field>

          {/* Lien achat */}
          <Field label="Lien d'achat (AFNOR / CSTB)" htmlFor="lienAchat">
            <input
              id="lienAchat"
              name="lienAchat"
              type="url"
              placeholder="https://www.boutique.afnor.org"
              className={inputClasses}
            />
          </Field>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <Link href="/dtu" className={buttonClasses("secondary")}>
              Annuler
            </Link>
            <SubmitButton pendingLabel="Enregistrement…">Ajouter le DTU</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
