export const dynamic = "force-dynamic";

import Link from "next/link";
import { ExternalLink, FileText, Upload } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { updateDtu, deleteDtu, uploadDtuPdf } from "@/lib/actions/dtu";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { buttonClasses } from "@/components/ui/button";
import { urlFichier } from "@/lib/format";

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

const DOMAINE_LABELS: Record<string, string> = {
  TERRASSEMENT: "Terrassement & Fondations",
  MACONNERIE: "Maçonnerie générale",
  BETON: "Béton",
  DALLAGE: "Dallage & Sol industriel",
  CHAPE: "Chapes",
  COUVERTURE: "Couverture & Zinguerie",
  RAVALEMENT: "Ravalement & Façade",
  PLATRERIE: "Plâtrerie",
  MENUISERIE: "Menuiserie intérieure & extérieure",
  AGENCEMENT: "Agencement",
  REVETEMENT_SOL: "Revêtements de sol",
  REVETEMENT_MURAL: "Revêtements muraux",
  PEINTURE: "Peinture",
  PLOMBERIE: "Plomberie, Sanitaire & CVC",
  ELECTRICITE: "Électricité",
  RENFORCEMENT_STRUCTUREL: "Renforcement structurel",
  AUTRE: "Autres",
};

export default async function DTUDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const dtu = await prisma.dTU.findUnique({ where: { id } });

  if (!dtu) {
    return (
      <div className="flex flex-col gap-4">
        <Link href="/dtu" className="text-sm text-brand-blue hover:underline">
          ← Retour à la bibliothèque DTU
        </Link>
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-semibold text-brand-navy">DTU introuvable</p>
          <p className="mt-1 text-sm text-slate-500">
            Ce DTU n&apos;existe pas ou a été supprimé.
          </p>
          <Link href="/dtu" className={`mt-4 inline-block ${buttonClasses("secondary")}`}>
            Retour à la bibliothèque
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Breadcrumb ── */}
      <div>
        <Link href="/dtu" className="text-sm text-brand-blue hover:underline">
          ← Retour à la bibliothèque DTU
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-md bg-brand-navy px-3 py-1 font-mono text-sm font-bold text-white">
            {dtu.reference}
          </span>
          <h2 className="text-xl font-bold text-brand-navy">{dtu.titre}</h2>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {DOMAINE_LABELS[dtu.domaine] ?? dtu.domaine}
          {dtu.corpsEtat ? ` · ${dtu.corpsEtat}` : ""}
        </p>
      </div>

      {/* ── Detail card ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="font-medium text-slate-500">Référence</dt>
            <dd className="font-mono text-brand-navy">{dtu.reference}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Titre</dt>
            <dd className="text-slate-700">{dtu.titre}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-500">Domaine</dt>
            <dd className="text-slate-700">{DOMAINE_LABELS[dtu.domaine] ?? dtu.domaine}</dd>
          </div>
          {dtu.corpsEtat && (
            <div>
              <dt className="font-medium text-slate-500">Corps d&apos;état</dt>
              <dd className="text-slate-700">{dtu.corpsEtat}</dd>
            </div>
          )}
          {dtu.version && (
            <div>
              <dt className="font-medium text-slate-500">Version</dt>
              <dd className="text-slate-700">{dtu.version}</dd>
            </div>
          )}
          {dtu.normeNF && (
            <div>
              <dt className="font-medium text-slate-500">Norme NF</dt>
              <dd className="font-mono text-slate-700">{dtu.normeNF}</dd>
            </div>
          )}
          {dtu.lienAchat && (
            <div>
              <dt className="font-medium text-slate-500">Lien d&apos;achat</dt>
              <dd>
                <a
                  href={dtu.lienAchat}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-brand-blue hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Boutique AFNOR
                </a>
              </dd>
            </div>
          )}
          {dtu.description && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="font-medium text-slate-500">Description</dt>
              <dd className="mt-1 text-slate-600 leading-relaxed">{dtu.description}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* ── PDF section ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 font-semibold text-brand-navy">Document PDF</h3>

        {dtu.fichierPdf ? (
          <div className="flex flex-col gap-4">
            {/* Available */}
            <div className="flex flex-wrap items-center gap-3 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
              <FileText className="h-5 w-5 shrink-0 text-emerald-700" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-emerald-800">PDF disponible</p>
                <p className="text-xs text-emerald-600 font-mono">{dtu.fichierPdf}</p>
              </div>
              <a
                href={urlFichier(dtu.fichierPdf)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses("secondary")}
              >
                <ExternalLink className="h-4 w-4" />
                Ouvrir le PDF
              </a>
            </div>

            {/* Replace */}
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-brand-blue hover:underline select-none">
                Remplacer le PDF
              </summary>
              <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-4">
                <p className="mb-3 text-xs text-slate-500">
                  Sélectionnez votre exemplaire légalement acquis via la boutique AFNOR ou votre
                  abonnement CSTB Solutions. L&apos;ancien fichier sera supprimé.
                </p>
                <form
                  action={uploadDtuPdf.bind(null, dtu.id)}
                  encType="multipart/form-data"
                  className="flex flex-wrap items-end gap-3"
                >
                  <div className="flex-1">
                    <label htmlFor="fichier-replace" className="mb-1 block text-sm font-medium text-brand-navy">
                      Nouveau fichier PDF
                    </label>
                    <input
                      id="fichier-replace"
                      name="fichier"
                      type="file"
                      accept=".pdf"
                      required
                      className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-navy file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-navy/90 outline-none"
                    />
                  </div>
                  <SubmitButton pendingLabel="Envoi…" variant="secondary">
                    <Upload className="h-4 w-4" />
                    Remplacer
                  </SubmitButton>
                </form>
              </div>
            </details>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Copyright note */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <p className="font-semibold mb-1">Droits d&apos;auteur</p>
              <p>
                Les DTU et normes AFNOR sont protégés par le droit d&apos;auteur. Uploadez
                uniquement votre propre exemplaire obtenu légalement via la{" "}
                <a
                  href={dtu.lienAchat ?? "https://www.boutique.afnor.org"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium"
                >
                  boutique AFNOR
                </a>{" "}
                ou votre abonnement CSTB Solutions.
              </p>
            </div>

            {/* Upload form */}
            <form
              action={uploadDtuPdf.bind(null, dtu.id)}
              encType="multipart/form-data"
              className="flex flex-wrap items-end gap-3"
            >
              <div className="flex-1">
                <label htmlFor="fichier-upload" className="mb-1 block text-sm font-medium text-brand-navy">
                  Fichier PDF (votre exemplaire)
                </label>
                <input
                  id="fichier-upload"
                  name="fichier"
                  type="file"
                  accept=".pdf"
                  required
                  className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-navy file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white hover:file:bg-brand-navy/90 outline-none"
                />
              </div>
              <SubmitButton pendingLabel="Envoi en cours…">
                <Upload className="h-4 w-4" />
                Uploader le PDF
              </SubmitButton>
            </form>
          </div>
        )}
      </div>

      {/* ── Edit form ── */}
      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer items-center justify-between p-5 font-semibold text-brand-navy select-none">
          Modifier les informations
          <span className="text-slate-400 transition-transform group-open:rotate-180">▾</span>
        </summary>
        <div className="border-t border-slate-100 p-5">
          <form action={updateDtu.bind(null, dtu.id)} className="flex flex-col gap-5">
            {/* Référence + Titre */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Référence *" htmlFor="edit-reference">
                <input
                  id="edit-reference"
                  name="reference"
                  type="text"
                  required
                  defaultValue={dtu.reference}
                  className={inputClasses}
                />
              </Field>
              <Field label="Titre *" htmlFor="edit-titre">
                <input
                  id="edit-titre"
                  name="titre"
                  type="text"
                  required
                  defaultValue={dtu.titre}
                  className={inputClasses}
                />
              </Field>
            </div>

            {/* Domaine + Corps d'état */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Domaine" htmlFor="edit-domaine">
                <select
                  id="edit-domaine"
                  name="domaine"
                  defaultValue={dtu.domaine}
                  className={inputClasses}
                >
                  {DOMAINE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Corps d'état" htmlFor="edit-corpsEtat">
                <select
                  id="edit-corpsEtat"
                  name="corpsEtat"
                  defaultValue={dtu.corpsEtat ?? undefined}
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

            {/* Version + Norme NF */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Field label="Version / Date" htmlFor="edit-version">
                <input
                  id="edit-version"
                  name="version"
                  type="text"
                  defaultValue={dtu.version ?? ""}
                  className={inputClasses}
                />
              </Field>
              <Field label="Norme NF" htmlFor="edit-normeNF">
                <input
                  id="edit-normeNF"
                  name="normeNF"
                  type="text"
                  defaultValue={dtu.normeNF ?? ""}
                  className={inputClasses}
                />
              </Field>
            </div>

            {/* Description */}
            <Field label="Description" htmlFor="edit-description">
              <textarea
                id="edit-description"
                name="description"
                rows={4}
                defaultValue={dtu.description ?? ""}
                className={inputClasses}
              />
            </Field>

            {/* Lien achat */}
            <Field label="Lien d'achat" htmlFor="edit-lienAchat">
              <input
                id="edit-lienAchat"
                name="lienAchat"
                type="url"
                defaultValue={dtu.lienAchat ?? ""}
                className={inputClasses}
              />
            </Field>

            <div className="flex justify-end">
              <SubmitButton pendingLabel="Enregistrement…">Enregistrer les modifications</SubmitButton>
            </div>
          </form>
        </div>
      </details>

      {/* ── Danger zone ── */}
      <div className="rounded-xl border border-red-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 font-semibold text-red-700">Zone de danger</h3>
        <p className="mb-4 text-sm text-slate-500">
          La suppression de ce DTU est irréversible. Le fichier PDF associé (si présent) sera
          également supprimé du serveur.
        </p>
        <DeleteButton
          action={deleteDtu.bind(null, dtu.id)}
          confirmMessage={`Supprimer le DTU "${dtu.reference} — ${dtu.titre}" ? Cette action est irréversible.`}
        >
          Supprimer ce DTU
        </DeleteButton>
      </div>
    </div>
  );
}
