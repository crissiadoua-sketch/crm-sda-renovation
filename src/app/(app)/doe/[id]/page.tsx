export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronUp, ChevronDown, Paperclip, X, FileText } from "lucide-react";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerDoeParEmail } from "@/lib/actions/email-documents";
import { prisma } from "@/lib/prisma";
import {
  updateDOEInfo,
  deleteDOE,
  addDOESection,
  updateDOESection,
  deleteDOESection,
  attachFicheFromForm,
  detachFicheFromDOESection,
  moveDOESection,
} from "@/lib/actions/doe";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { buttonClasses } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { formatDate } from "@/lib/format";

const modeleTones: Record<string, BadgeTone> = {
  MARCHE_PUBLIC: "navy",
  PERSONNALISE: "orange",
};
const modeleLabels: Record<string, string> = {
  MARCHE_PUBLIC: "Marché public",
  PERSONNALISE: "Personnalisé",
};

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  FINAL: "green",
  TRANSMIS: "blue",
};
const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  FINAL: "Final",
  TRANSMIS: "Transmis",
};

const SECTION_TYPES = [
  { value: "TRAVAUX", label: "Travaux" },
  { value: "MATERIAUX", label: "Matériaux" },
  { value: "ATTESTATION", label: "Attestation" },
  { value: "PLAN", label: "Plan" },
  { value: "NOTICE", label: "Notice" },
  { value: "GARANTIE", label: "Garantie" },
  { value: "AUTRE", label: "Autre" },
];

const sectionTypeTones: Record<string, BadgeTone> = {
  TRAVAUX: "navy",
  MATERIAUX: "orange",
  ATTESTATION: "green",
  PLAN: "blue",
  NOTICE: "gray",
  GARANTIE: "green",
  AUTRE: "gray",
};

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

export default async function DOEDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [doe, allFiches] = await Promise.all([
    prisma.dOE.findUnique({
      where: { id },
      include: {
        chantier: true,
        devis: { include: { lignes: { orderBy: { ordre: "asc" } } } },
        sections: {
          include: { fiches: true },
          orderBy: { ordre: "asc" },
        },
      },
    }),
    prisma.ficheTechnique.findMany({
      where: { actif: true },
      orderBy: [{ corpsEtat: "asc" }, { designation: "asc" }],
      select: { id: true, designation: true, corpsEtat: true, marque: true },
    }),
  ]);

  if (!doe) notFound();

  return (
    <FullscreenToggle>
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/doe" className="text-sm text-brand-blue hover:underline">
            ← Retour aux DOE
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{doe.titre}</h2>
            <Badge tone={modeleTones[doe.modele] ?? "gray"}>
              {modeleLabels[doe.modele] ?? doe.modele}
            </Badge>
            <Badge tone={statutTones[doe.statut] ?? "gray"}>
              {statutLabels[doe.statut] ?? doe.statut}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <Link href={`/chantiers/${doe.chantier.id}`} className="text-brand-blue hover:underline">
              {doe.chantier.nom}
            </Link>
            {" · "}Créé le {formatDate(doe.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <EnvoyerEmailModal
            action={envoyerDoeParEmail.bind(null, doe.id)}
            defaultTo=""
            documentLabel={`DOE ${doe.titre}`}
          />
          <button
            disabled
            title="Bientôt disponible"
            className={`${buttonClasses("secondary")} opacity-50 cursor-not-allowed`}
          >
            Aperçu PDF
          </button>
          <DeleteButton
            action={deleteDOE.bind(null, doe.id)}
            confirmMessage={`Supprimer le DOE "${doe.titre}" ? Cette action est irréversible.`}
          >
            Supprimer
          </DeleteButton>
        </div>
      </div>

      {/* ── Info card ── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <div>
            <p className="font-medium text-slate-500">Chantier</p>
            <p className="text-brand-navy">{doe.chantier.nom}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Modèle</p>
            <p className="text-slate-700">{modeleLabels[doe.modele] ?? doe.modele}</p>
          </div>
          {doe.reference && (
            <div>
              <p className="font-medium text-slate-500">Référence marché</p>
              <p className="font-mono text-slate-700">{doe.reference}</p>
            </div>
          )}
          {doe.devis && (
            <div>
              <p className="font-medium text-slate-500">Devis source</p>
              <Link href={`/devis/${doe.devisId}`} className="text-brand-blue hover:underline">
                {doe.devis.numero}
              </Link>
            </div>
          )}
          <div>
            <p className="font-medium text-slate-500">Créé le</p>
            <p className="text-slate-700">{formatDate(doe.createdAt)}</p>
          </div>
          <div>
            <p className="font-medium text-slate-500">Statut</p>
            <Badge tone={statutTones[doe.statut] ?? "gray"}>
              {statutLabels[doe.statut] ?? doe.statut}
            </Badge>
          </div>
        </div>
      </div>

      {/* ── Modifier les infos du DOE ── */}
      <details className="group rounded-xl border border-slate-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer items-center justify-between p-5 font-semibold text-brand-navy select-none">
          Modifier les informations du DOE
          <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <div className="border-t border-slate-100 p-5">
          <form action={updateDOEInfo.bind(null, doe.id)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Titre" htmlFor="edit-titre">
                <input
                  id="edit-titre"
                  name="titre"
                  type="text"
                  required
                  defaultValue={doe.titre}
                  className={inputClasses}
                />
              </Field>
              <Field label="Modèle" htmlFor="edit-modele">
                <select id="edit-modele" name="modele" defaultValue={doe.modele} className={inputClasses}>
                  <option value="PERSONNALISE">Personnalisé</option>
                  <option value="MARCHE_PUBLIC">Marché public</option>
                </select>
              </Field>
              <Field label="Statut" htmlFor="edit-statut">
                <select id="edit-statut" name="statut" defaultValue={doe.statut} className={inputClasses}>
                  <option value="BROUILLON">Brouillon</option>
                  <option value="FINAL">Final</option>
                  <option value="TRANSMIS">Transmis</option>
                </select>
              </Field>
              <Field label="Référence du marché" htmlFor="edit-reference">
                <input
                  id="edit-reference"
                  name="reference"
                  type="text"
                  defaultValue={doe.reference ?? ""}
                  className={inputClasses}
                />
              </Field>
            </div>
            <Field label="Introduction" htmlFor="edit-intro">
              <textarea
                id="edit-intro"
                name="intro"
                rows={4}
                defaultValue={doe.intro ?? ""}
                className={inputClasses}
              />
            </Field>
            <Field label="Conclusion" htmlFor="edit-conclusion">
              <textarea
                id="edit-conclusion"
                name="conclusion"
                rows={3}
                defaultValue={doe.conclusion ?? ""}
                className={inputClasses}
              />
            </Field>
            <div className="flex justify-end">
              <SubmitButton pendingLabel="Enregistrement…">Enregistrer</SubmitButton>
            </div>
          </form>
        </div>
      </details>

      {/* ── Sections de travaux ── */}
      <section className="flex flex-col gap-4">
        <h3 className="font-semibold text-brand-navy">
          Sections du DOE{" "}
          <span className="ml-1 text-sm font-normal text-slate-400">
            ({doe.sections.length} section{doe.sections.length !== 1 ? "s" : ""})
          </span>
        </h3>

        {doe.sections.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
            Aucune section. Ajoutez la première section ci-dessous.
          </div>
        )}

        {doe.sections.map((section, idx) => {
          const attachedIds = new Set(section.fiches.map((f) => f.id));
          const availableFiches = allFiches.filter((f) => !attachedIds.has(f.id));
          // Group available fiches by corpsEtat
          const fichesByCorps = availableFiches.reduce<Record<string, typeof availableFiches>>(
            (acc, f) => {
              acc[f.corpsEtat] = acc[f.corpsEtat] ?? [];
              acc[f.corpsEtat].push(f);
              return acc;
            },
            {},
          );

          return (
            <div
              key={section.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden"
            >
              {/* Section header */}
              <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3">
                <span className="text-sm font-semibold text-slate-500">{idx + 1}</span>
                <Badge tone={sectionTypeTones[section.type] ?? "gray"}>
                  {SECTION_TYPES.find((t) => t.value === section.type)?.label ?? section.type}
                </Badge>
                <span className="font-semibold text-brand-navy">{section.titre}</span>
                {section.corpsEtat && (
                  <Badge tone="gray" className="ml-1">
                    {section.corpsEtat}
                  </Badge>
                )}
                <div className="ml-auto flex items-center gap-1">
                  {/* Move up */}
                  <form action={moveDOESection.bind(null, section.id, doe.id, "up")}>
                    <button
                      type="submit"
                      disabled={idx === 0}
                      className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="Monter"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                  </form>
                  {/* Move down */}
                  <form action={moveDOESection.bind(null, section.id, doe.id, "down")}>
                    <button
                      type="submit"
                      disabled={idx === doe.sections.length - 1}
                      className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                      title="Descendre"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                  </form>
                  {/* Delete */}
                  <DeleteButton
                    action={deleteDOESection.bind(null, section.id, doe.id)}
                    confirmMessage={`Supprimer la section "${section.titre}" ?`}
                  >
                    <X className="h-4 w-4" />
                  </DeleteButton>
                </div>
              </div>

              <div className="p-4 flex flex-col gap-4">
                {/* Description */}
                {section.description && (
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">{section.description}</p>
                )}

                {/* Fiches attachées */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Fiches techniques attachées
                  </p>
                  {section.fiches.length === 0 ? (
                    <p className="text-sm text-slate-400 italic">Aucune fiche attachée.</p>
                  ) : (
                    <ul className="flex flex-col gap-1.5">
                      {section.fiches.map((fiche) => (
                        <li
                          key={fiche.id}
                          className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm"
                        >
                          <FileText className="h-4 w-4 shrink-0 text-brand-blue" />
                          <span className="flex-1 text-brand-navy font-medium">
                            {fiche.designation}
                          </span>
                          <Badge tone="gray" className="shrink-0">
                            {fiche.corpsEtat}
                          </Badge>
                          <form
                            action={detachFicheFromDOESection.bind(null, section.id, doe.id, fiche.id)}
                          >
                            <button
                              type="submit"
                              className="ml-1 rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                              title="Détacher cette fiche"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Attacher une fiche */}
                {availableFiches.length > 0 && (
                  <form
                    action={attachFicheFromForm.bind(null, section.id, doe.id)}
                    className="flex items-end gap-2"
                  >
                    <div className="flex-1">
                      <label
                        htmlFor={`attach-fiche-${section.id}`}
                        className="mb-1 block text-xs font-medium text-slate-500"
                      >
                        Attacher une fiche technique
                      </label>
                      <select
                        id={`attach-fiche-${section.id}`}
                        name="ficheId"
                        defaultValue=""
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
                      >
                        <option value="" disabled>
                          Sélectionner une fiche…
                        </option>
                        {Object.entries(fichesByCorps)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([corps, fiches_]) => (
                            <optgroup key={corps} label={corps}>
                              {fiches_.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.designation}
                                  {f.marque ? ` (${f.marque})` : ""}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                      </select>
                    </div>
                    <button type="submit" className={`${buttonClasses("secondary")} shrink-0`}>
                      <Paperclip className="h-4 w-4" />
                      Attacher
                    </button>
                  </form>
                )}

                {/* Edit section inline */}
                <details className="group">
                  <summary className="cursor-pointer text-xs font-medium text-brand-blue hover:underline select-none">
                    Modifier cette section
                  </summary>
                  <div className="mt-3 rounded-lg border border-slate-100 p-4">
                    <form
                      action={updateDOESection.bind(null, section.id, doe.id)}
                      className="flex flex-col gap-3"
                    >
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Type" htmlFor={`sec-type-${section.id}`}>
                          <select
                            id={`sec-type-${section.id}`}
                            name="type"
                            defaultValue={section.type}
                            className={inputClasses}
                          >
                            {SECTION_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>
                                {t.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Corps d'état" htmlFor={`sec-corps-${section.id}`}>
                          <select
                            id={`sec-corps-${section.id}`}
                            name="corpsEtat"
                            defaultValue={section.corpsEtat ?? ""}
                            className={inputClasses}
                          >
                            <option value="">— Non spécifié —</option>
                            {CORPS_ETAT_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <Field label="Titre" htmlFor={`sec-titre-${section.id}`}>
                        <input
                          id={`sec-titre-${section.id}`}
                          name="titre"
                          type="text"
                          required
                          defaultValue={section.titre}
                          className={inputClasses}
                        />
                      </Field>
                      <Field label="Description" htmlFor={`sec-desc-${section.id}`}>
                        <textarea
                          id={`sec-desc-${section.id}`}
                          name="description"
                          rows={3}
                          defaultValue={section.description ?? ""}
                          className={inputClasses}
                        />
                      </Field>
                      <div className="flex justify-end">
                        <SubmitButton pendingLabel="Mise à jour…" variant="secondary">
                          Mettre à jour
                        </SubmitButton>
                      </div>
                    </form>
                  </div>
                </details>
              </div>
            </div>
          );
        })}

        {/* Ajouter une section */}
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 shadow-sm">
          <h4 className="mb-4 font-semibold text-brand-navy">Ajouter une section</h4>
          <form action={addDOESection.bind(null, doe.id)} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Type" htmlFor="new-sec-type">
                <select id="new-sec-type" name="type" defaultValue="TRAVAUX" className={inputClasses}>
                  {SECTION_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Corps d'état" htmlFor="new-sec-corps">
                <select id="new-sec-corps" name="corpsEtat" defaultValue="" className={inputClasses}>
                  <option value="">— Non spécifié —</option>
                  {CORPS_ETAT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label="Titre *" htmlFor="new-sec-titre">
              <input
                id="new-sec-titre"
                name="titre"
                type="text"
                required
                placeholder="Ex. : Travaux de maçonnerie"
                className={inputClasses}
              />
            </Field>
            <Field label="Description" htmlFor="new-sec-desc">
              <textarea
                id="new-sec-desc"
                name="description"
                rows={2}
                placeholder="Description de la section (optionnel)…"
                className={inputClasses}
              />
            </Field>
            <div className="flex justify-end">
              <SubmitButton pendingLabel="Ajout…">
                <Paperclip className="h-4 w-4" />
                Ajouter la section
              </SubmitButton>
            </div>
          </form>
        </div>
      </section>
    </div>
    </FullscreenToggle>
  );
}

