export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { updateFicheTechnique, deleteFicheTechnique } from "@/lib/actions/fiches-techniques";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { urlFichier } from "@/lib/format";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerFicheTechniqueParEmail } from "@/lib/actions/email-documents";

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

export default async function FicheTechniqueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const fiche = await prisma.ficheTechnique.findUnique({ where: { id } });
  if (!fiche) notFound();

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/fiches-techniques" className="text-sm text-brand-blue hover:underline">
            ← Retour aux fiches techniques
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{fiche.designation}</h2>
            <Badge tone="gray">{fiche.corpsEtat}</Badge>
            {!fiche.actif && <Badge tone="red">Inactif</Badge>}
          </div>
          {(fiche.marque || fiche.reference) && (
            <p className="mt-1 text-sm text-slate-500">
              {fiche.marque}
              {fiche.marque && fiche.reference && " · "}
              {fiche.reference && <span className="font-mono text-xs">{fiche.reference}</span>}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <EnvoyerEmailModal
            action={envoyerFicheTechniqueParEmail.bind(null, fiche.id)}
            defaultTo=""
            documentLabel={`Fiche technique ${fiche.designation}`}
          />
          {fiche.fichierPdf && (
            <a
              href={urlFichier(fiche.fichierPdf)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-brand-blue hover:bg-slate-50 transition"
            >
              <FileText className="h-4 w-4" />
              Voir le PDF
            </a>
          )}
          <DeleteButton
            action={deleteFicheTechnique.bind(null, fiche.id)}
            confirmMessage={`Supprimer la fiche "${fiche.designation}" ? Cette action est irréversible.`}
          >
            Supprimer
          </DeleteButton>
        </div>
      </div>

      {/* Edit form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Modifier la fiche</h3>
        <form
          action={updateFicheTechnique.bind(null, fiche.id)}
          encType="multipart/form-data"
          className="flex flex-col gap-5"
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Catégorie" htmlFor="categorie">
              <select
                id="categorie"
                name="categorie"
                defaultValue={fiche.categorie}
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
                defaultValue={fiche.corpsEtat}
                className={inputClasses}
              >
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
              defaultValue={fiche.designation}
              className={inputClasses}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field label="Marque" htmlFor="marque">
              <input
                id="marque"
                name="marque"
                type="text"
                defaultValue={fiche.marque ?? ""}
                className={inputClasses}
              />
            </Field>

            <Field label="Référence produit" htmlFor="reference">
              <input
                id="reference"
                name="reference"
                type="text"
                defaultValue={fiche.reference ?? ""}
                className={inputClasses}
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="description">
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={fiche.description ?? ""}
              className={inputClasses}
            />
          </Field>

          <Field label="Normes" htmlFor="normes">
            <input
              id="normes"
              name="normes"
              type="text"
              defaultValue={fiche.normes ?? ""}
              placeholder="Ex. : NF EN 13016, CE"
              className={inputClasses}
            />
          </Field>

          <Field label="Lien URL (fiche fabricant)" htmlFor="lienUrl">
            <input
              id="lienUrl"
              name="lienUrl"
              type="url"
              defaultValue={fiche.lienUrl ?? ""}
              placeholder="https://…"
              className={inputClasses}
            />
          </Field>

          <Field label="Fiche PDF" htmlFor="fichierPdf">
            {fiche.fichierPdf && (
              <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
                <FileText className="h-4 w-4 text-brand-blue" />
                <a
                  href={urlFichier(fiche.fichierPdf)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-blue hover:underline"
                >
                  Fiche PDF actuelle
                </a>
                <span className="text-slate-400">(remplacer ci-dessous)</span>
              </div>
            )}
            <input
              id="fichierPdf"
              name="fichierPdf"
              type="file"
              accept=".pdf"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-navy/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-brand-navy hover:file:bg-brand-navy/20"
            />
          </Field>

          <Field label="Statut" htmlFor="actif">
            <select
              id="actif"
              name="actif"
              defaultValue={fiche.actif ? "true" : "false"}
              className={inputClasses}
            >
              <option value="true">Actif</option>
              <option value="false">Inactif</option>
            </select>
          </Field>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <Link href="/fiches-techniques" className={buttonClasses("secondary")}>
              Annuler
            </Link>
            <SubmitButton pendingLabel="Enregistrement…">Enregistrer les modifications</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
