export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { Printer, ShieldAlert } from "lucide-react";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerPpspsParEmail } from "@/lib/actions/email-documents";
import { prisma } from "@/lib/prisma";
import {
  updatePPSPSInfo,
  deletePPSPS,
  addRisque,
  deleteRisque,
  addSecours,
  deleteSecours,
} from "@/lib/actions/ppsps";
import { PPSPSContentEditor } from "@/components/ppsps/ppsps-content-editor";
import { SubmitButton } from "@/components/ui/submit-button";
import { DeleteButton } from "@/components/ui/delete-button";
import { Field, inputClasses } from "@/components/ui/fields";
import { buttonClasses } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

// ---------------------------------------------------------------------------
// Lookup maps
// ---------------------------------------------------------------------------

const modeleTones: Record<string, BadgeTone> = {
  APPEL_OFFRE: "navy",
  PERSONNALISE: "orange",
};
const modeleLabels: Record<string, string> = {
  APPEL_OFFRE: "Appel d'offres",
  PERSONNALISE: "Personnalisé",
};

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  VALIDE: "green",
  TRANSMIS: "blue",
};
const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  VALIDE: "Validé",
  TRANSMIS: "Transmis",
};

const prioriteTones: Record<string, BadgeTone> = {
  FAIBLE: "green",
  MOYEN: "orange",
  ELEVE: "orange",
  CRITIQUE: "red",
};
const prioriteLabels: Record<string, string> = {
  FAIBLE: "Faible",
  MOYEN: "Moyen",
  ELEVE: "Élevé",
  CRITIQUE: "Critique",
};

const secoursTypeLabels: Record<string, string> = {
  SAMU: "SAMU",
  POMPIERS: "Pompiers",
  MEDECIN: "Médecin",
  HOPITAL: "Hôpital",
  SSIAP: "SSIAP",
  AUTRE: "Autre",
};

const secoursTypeTones: Record<string, BadgeTone> = {
  SAMU: "red",
  POMPIERS: "red",
  MEDECIN: "blue",
  HOPITAL: "blue",
  SSIAP: "navy",
  AUTRE: "gray",
};

const CORPS_ETAT_OPTIONS = [
  "TER", "MAC", "DAL", "COV", "RAV", "PLA", "MEN", "RSD", "RSS", "PEI", "SER", "AUTRE",
];

const TABS = [
  { key: "identification", label: "Identification" },
  { key: "contenu", label: "Contenu du plan" },
  { key: "risques", label: "Analyse des risques" },
  { key: "secours", label: "Contacts de secours" },
  { key: "apercu", label: "Aperçu & Export" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PPSPSDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const activeTab = onglet ?? "identification";

  const [ppsps, chantiers, devis] = await Promise.all([
    prisma.pPSPS.findUnique({
      where: { id },
      include: {
        chantier: true,
        devis: { select: { numero: true, objet: true } },
        risques: { orderBy: { ordre: "asc" } },
        secours: true,
      },
    }),
    prisma.chantier.findMany({
      where: { statut: { not: "ANNULE" } },
      select: { id: true, nom: true, reference: true },
      orderBy: { nom: "asc" },
    }),
    prisma.devis.findMany({
      where: { statut: "ACCEPTE" },
      select: { id: true, numero: true, objet: true },
      orderBy: { numero: "asc" },
    }),
  ]);

  if (!ppsps) notFound();

  // Parse contenu libre
  let sections: Record<string, string> = {};
  if (ppsps.contenuLibre) {
    try {
      sections = JSON.parse(ppsps.contenuLibre);
    } catch {
      // ignore
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/ppsps" className="text-sm text-brand-blue hover:underline">
            ← Retour aux PPSPS
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-brand-navy" />
            <h2 className="text-xl font-bold text-brand-navy">{ppsps.titre}</h2>
            <Badge tone={modeleTones[ppsps.modele] ?? "gray"}>
              {modeleLabels[ppsps.modele] ?? ppsps.modele}
            </Badge>
            <Badge tone={statutTones[ppsps.statut] ?? "gray"}>
              {statutLabels[ppsps.statut] ?? ppsps.statut}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <Link
              href={`/chantiers/${ppsps.chantier.id}`}
              className="text-brand-blue hover:underline"
            >
              {ppsps.chantier.nom}
            </Link>
            {" · "}Créé le {formatDate(ppsps.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <EnvoyerEmailModal
            action={envoyerPpspsParEmail.bind(null, ppsps.id)}
            defaultTo=""
            documentLabel={`PPSPS ${ppsps.titre}`}
          defaultSubject={`PPSPS — ${ppsps.titre} — SDA Rénovation`}
          />
          <DeleteButton
            action={deletePPSPS.bind(null, ppsps.id)}
            confirmMessage={`Supprimer le PPSPS "${ppsps.titre}" ? Cette action est irréversible.`}
          >
            Supprimer
          </DeleteButton>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={`?onglet=${tab.key}`}
              className={`rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "border-brand-blue text-brand-blue"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
              {tab.key === "risques" && ppsps.risques.length > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs">
                  {ppsps.risques.length}
                </span>
              )}
              {tab.key === "secours" && ppsps.secours.length > 0 && (
                <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs">
                  {ppsps.secours.length}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          TAB 1 — Identification
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "identification" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-5 text-base font-semibold text-brand-navy">
            Informations générales
          </h3>
          <form action={updatePPSPSInfo.bind(null, id)} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {/* Modèle */}
              <Field label="Modèle" htmlFor="edit-modele">
                <select
                  id="edit-modele"
                  name="modele"
                  defaultValue={ppsps.modele}
                  className={inputClasses}
                >
                  <option value="PERSONNALISE">Personnalisé</option>
                  <option value="APPEL_OFFRE">Appel d&apos;offres</option>
                </select>
              </Field>

              {/* Statut */}
              <Field label="Statut" htmlFor="edit-statut">
                <select
                  id="edit-statut"
                  name="statut"
                  defaultValue={ppsps.statut}
                  className={inputClasses}
                >
                  <option value="BROUILLON">Brouillon</option>
                  <option value="VALIDE">Validé</option>
                  <option value="TRANSMIS">Transmis</option>
                </select>
              </Field>

              {/* Titre */}
              <Field label="Titre *" htmlFor="edit-titre">
                <input
                  id="edit-titre"
                  name="titre"
                  type="text"
                  required
                  defaultValue={ppsps.titre}
                  className={inputClasses}
                />
              </Field>

              {/* Référence */}
              <Field label="Référence du marché / opération" htmlFor="edit-reference">
                <input
                  id="edit-reference"
                  name="reference"
                  type="text"
                  defaultValue={ppsps.reference ?? ""}
                  className={inputClasses}
                />
              </Field>

              {/* Nom opération */}
              <Field label="Nom de l'opération" htmlFor="edit-nomOperation">
                <input
                  id="edit-nomOperation"
                  name="nomOperation"
                  type="text"
                  defaultValue={ppsps.nomOperation ?? ""}
                  className={inputClasses}
                />
              </Field>

              {/* Chantier */}
              <Field label="Chantier *" htmlFor="edit-chantierId">
                <select
                  id="edit-chantierId"
                  name="chantierId"
                  defaultValue={ppsps.chantierId}
                  required
                  className={inputClasses}
                >
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.reference} — {c.nom}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Devis */}
              <Field label="Devis associé" htmlFor="edit-devisId">
                <select
                  id="edit-devisId"
                  name="devisId"
                  defaultValue={ppsps.devisId ?? ""}
                  className={inputClasses}
                >
                  <option value="">— Aucun —</option>
                  {devis.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.numero}
                      {d.objet ? ` — ${d.objet}` : ""}
                    </option>
                  ))}
                </select>
              </Field>

              {/* Maître d'ouvrage */}
              <Field label="Maître d'ouvrage" htmlFor="edit-maitreOuvrage">
                <input
                  id="edit-maitreOuvrage"
                  name="maitreOuvrage"
                  type="text"
                  defaultValue={ppsps.maitreOuvrage ?? ""}
                  className={inputClasses}
                />
              </Field>

              {/* Maître d'œuvre */}
              <Field label="Maître d'œuvre" htmlFor="edit-maitreOeuvre">
                <input
                  id="edit-maitreOeuvre"
                  name="maitreOeuvre"
                  type="text"
                  defaultValue={ppsps.maitreOeuvre ?? ""}
                  className={inputClasses}
                />
              </Field>

              {/* Coordonnateur SPS */}
              <Field label="Coordonnateur SPS" htmlFor="edit-coordonateurSPS">
                <input
                  id="edit-coordonateurSPS"
                  name="coordonateurSPS"
                  type="text"
                  defaultValue={ppsps.coordonateurSPS ?? ""}
                  className={inputClasses}
                />
              </Field>

              {/* Dates */}
              <Field label="Date de début du chantier" htmlFor="edit-dateDebut">
                <input
                  id="edit-dateDebut"
                  name="dateDebutChantier"
                  type="date"
                  defaultValue={
                    ppsps.dateDebutChantier
                      ? ppsps.dateDebutChantier.toISOString().split("T")[0]
                      : ""
                  }
                  className={inputClasses}
                />
              </Field>

              <Field label="Date de fin du chantier" htmlFor="edit-dateFin">
                <input
                  id="edit-dateFin"
                  name="dateFinChantier"
                  type="date"
                  defaultValue={
                    ppsps.dateFinChantier
                      ? ppsps.dateFinChantier.toISOString().split("T")[0]
                      : ""
                  }
                  className={inputClasses}
                />
              </Field>

              {/* Effectif */}
              <Field label="Effectif prévu (personnes)" htmlFor="edit-effectifPrevu">
                <input
                  id="edit-effectifPrevu"
                  name="effectifPrevu"
                  type="number"
                  min="0"
                  defaultValue={ppsps.effectifPrevu ?? ""}
                  className={inputClasses}
                />
              </Field>

              {/* Assurances */}
              <Field label="N° assurance décennale" htmlFor="edit-assuranceDecennale">
                <input
                  id="edit-assuranceDecennale"
                  name="assuranceDecennale"
                  type="text"
                  defaultValue={ppsps.assuranceDecennale ?? ""}
                  className={inputClasses}
                />
              </Field>

              <Field label="N° RC professionnelle" htmlFor="edit-assuranceRC">
                <input
                  id="edit-assuranceRC"
                  name="assuranceRC"
                  type="text"
                  defaultValue={ppsps.assuranceRC ?? ""}
                  className={inputClasses}
                />
              </Field>
            </div>

            {/* Adresse chantier */}
            <Field label="Adresse du chantier" htmlFor="edit-adresseChantier">
              <textarea
                id="edit-adresseChantier"
                name="adresseChantier"
                rows={2}
                defaultValue={ppsps.adresseChantier ?? ""}
                className={inputClasses}
              />
            </Field>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <SubmitButton pendingLabel="Enregistrement…">
                Enregistrer les informations
              </SubmitButton>
            </div>
          </form>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 2 — Contenu du plan
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "contenu" && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Rédigez le contenu de chaque section du PPSPS. Les modifications sont sauvegardées
            en cliquant sur le bouton en bas de page.
          </p>
          <PPSPSContentEditor
            ppspsId={ppsps.id}
            modele={ppsps.modele}
            initialSections={sections}
          />
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 3 — Analyse des risques
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "risques" && (
        <div className="flex flex-col gap-6">
          {/* Table */}
          {ppsps.risques.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Phase</th>
                    <th className="px-4 py-3">Corps d&apos;état</th>
                    <th className="px-4 py-3">Description du risque</th>
                    <th className="px-4 py-3">Mesures de prévention</th>
                    <th className="px-4 py-3">Responsable</th>
                    <th className="px-4 py-3">EPI</th>
                    <th className="px-4 py-3">Priorité</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ppsps.risques.map((risque, idx) => {
                    let epiList: string[] = [];
                    if (risque.epi) {
                      try {
                        epiList = JSON.parse(risque.epi);
                      } catch {
                        epiList = [];
                      }
                    }
                    return (
                      <tr key={risque.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{risque.phase}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {risque.corpsEtat ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs">
                          {risque.description}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs">{risque.mesures}</td>
                        <td className="px-4 py-3 text-slate-500 text-xs">
                          {risque.responsable ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {epiList.length > 0 ? epiList.join(", ") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge tone={prioriteTones[risque.priorite] ?? "gray"}>
                            {prioriteLabels[risque.priorite] ?? risque.priorite}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <DeleteButton
                            action={deleteRisque.bind(null, risque.id, id)}
                            confirmMessage="Supprimer ce risque ?"
                            className="text-xs text-red-500 hover:underline"
                          >
                            Supprimer
                          </DeleteButton>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
              Aucun risque enregistré. Ajoutez le premier risque ci-dessous.
            </div>
          )}

          {/* Add risque form */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 shadow-sm">
            <h4 className="mb-4 font-semibold text-brand-navy">Ajouter un risque</h4>
            <form action={addRisque.bind(null, id)} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Phase de travaux *" htmlFor="new-phase">
                  <input
                    id="new-phase"
                    name="phase"
                    type="text"
                    required
                    placeholder="Ex. : Terrassement"
                    className={inputClasses}
                  />
                </Field>

                <Field label="Corps d'état" htmlFor="new-corpsEtat">
                  <select
                    id="new-corpsEtat"
                    name="corpsEtat"
                    defaultValue=""
                    className={inputClasses}
                  >
                    <option value="">— Non spécifié —</option>
                    {CORPS_ETAT_OPTIONS.map((ce) => (
                      <option key={ce} value={ce}>
                        {ce}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Priorité" htmlFor="new-priorite">
                  <select
                    id="new-priorite"
                    name="priorite"
                    defaultValue="MOYEN"
                    className={inputClasses}
                  >
                    <option value="FAIBLE">Faible</option>
                    <option value="MOYEN">Moyen</option>
                    <option value="ELEVE">Élevé</option>
                    <option value="CRITIQUE">Critique</option>
                  </select>
                </Field>
              </div>

              <Field label="Description du risque *" htmlFor="new-description">
                <textarea
                  id="new-description"
                  name="description"
                  rows={2}
                  required
                  placeholder="Décrivez le risque identifié…"
                  className={inputClasses}
                />
              </Field>

              <Field label="Mesures de prévention *" htmlFor="new-mesures">
                <textarea
                  id="new-mesures"
                  name="mesures"
                  rows={2}
                  required
                  placeholder="Mesures de prévention à mettre en œuvre…"
                  className={inputClasses}
                />
              </Field>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Responsable" htmlFor="new-responsable">
                  <input
                    id="new-responsable"
                    name="responsable"
                    type="text"
                    placeholder="Chef de chantier, coordonnateur…"
                    className={inputClasses}
                  />
                </Field>

                <Field
                  label="EPI requis (séparés par des virgules)"
                  htmlFor="new-epi"
                >
                  <input
                    id="new-epi"
                    name="epi"
                    type="text"
                    placeholder="Ex. : Casque, Harnais, Gants"
                    className={inputClasses}
                  />
                </Field>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-3">
                <SubmitButton pendingLabel="Ajout…">Ajouter le risque</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 4 — Contacts de secours
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "secours" && (
        <div className="flex flex-col gap-6">
          {/* Numéros nationaux */}
          <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-blue-dark">
              Numéros d&apos;urgence nationaux
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              {[
                { label: "SAMU", num: "15" },
                { label: "Pompiers", num: "18" },
                { label: "Police", num: "17" },
                { label: "Urgences européen", num: "112" },
                { label: "Urgences personne sourde", num: "114" },
              ].map(({ label, num }) => (
                <div key={num} className="flex items-center gap-1.5">
                  <span className="font-medium text-slate-600">{label} :</span>
                  <span className="text-lg font-bold text-brand-navy">{num}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contacts list */}
          {ppsps.secours.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ppsps.secours.map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Badge tone={secoursTypeTones[s.type] ?? "gray"}>
                      {secoursTypeLabels[s.type] ?? s.type}
                    </Badge>
                    <DeleteButton
                      action={deleteSecours.bind(null, s.id, id)}
                      confirmMessage="Supprimer ce contact ?"
                      className="text-xs text-red-400 hover:text-red-600 hover:underline transition"
                    >
                      Supprimer
                    </DeleteButton>
                  </div>
                  {s.nom && <p className="mb-1 font-semibold text-brand-navy">{s.nom}</p>}
                  <p className="text-2xl font-bold text-brand-orange">{s.telephone}</p>
                  {s.adresse && <p className="mt-1 text-xs text-slate-500">{s.adresse}</p>}
                  {s.distance && (
                    <p className="mt-1 text-xs text-slate-400">
                      Distance depuis le chantier : {s.distance}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-400">
              Aucun contact de secours enregistré.
            </div>
          )}

          {/* Add secours form */}
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 shadow-sm">
            <h4 className="mb-4 font-semibold text-brand-navy">Ajouter un contact de secours</h4>
            <form action={addSecours.bind(null, id)} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Type *" htmlFor="new-sec-type">
                  <select
                    id="new-sec-type"
                    name="type"
                    defaultValue="AUTRE"
                    className={inputClasses}
                  >
                    <option value="SAMU">SAMU</option>
                    <option value="POMPIERS">Pompiers</option>
                    <option value="MEDECIN">Médecin</option>
                    <option value="HOPITAL">Hôpital</option>
                    <option value="SSIAP">SSIAP</option>
                    <option value="AUTRE">Autre</option>
                  </select>
                </Field>

                <Field label="Nom / Désignation" htmlFor="new-sec-nom">
                  <input
                    id="new-sec-nom"
                    name="nom"
                    type="text"
                    placeholder="Ex. : CHU de Nantes"
                    className={inputClasses}
                  />
                </Field>

                <Field label="Téléphone *" htmlFor="new-sec-tel">
                  <input
                    id="new-sec-tel"
                    name="telephone"
                    type="tel"
                    required
                    placeholder="Ex. : 02 40 08 33 33"
                    className={inputClasses}
                  />
                </Field>

                <Field label="Distance depuis le chantier" htmlFor="new-sec-distance">
                  <input
                    id="new-sec-distance"
                    name="distance"
                    type="text"
                    placeholder="Ex. : 2.3 km"
                    className={inputClasses}
                  />
                </Field>

                <Field label="Adresse" htmlFor="new-sec-adresse" className="sm:col-span-2">
                  <input
                    id="new-sec-adresse"
                    name="adresse"
                    type="text"
                    placeholder="Adresse complète"
                    className={inputClasses}
                  />
                </Field>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-3">
                <SubmitButton pendingLabel="Ajout…">Ajouter le contact</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          TAB 5 — Aperçu & Export
      ════════════════════════════════════════════════════════════════ */}
      {activeTab === "apercu" && (
        <div className="flex flex-col gap-6">
          {/* Export buttons */}
          <div className="flex items-center gap-3">
            <button
              disabled
              title="Bientôt disponible"
              className={`${buttonClasses("secondary")} opacity-50 cursor-not-allowed`}
            >
              <Printer className="h-4 w-4" />
              Export PDF — Bientôt disponible
            </button>
          </div>

          {/* Preview document */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            {/* Document header */}
            <div className="bg-brand-navy px-8 py-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
                    SDA Rénovation — SIREN {ppsps.sirenEntreprise}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold">{ppsps.titre}</h1>
                  <p className="mt-1 text-sm text-white/80">
                    Plan Particulier de Sécurité et de Protection de la Santé
                  </p>
                </div>
                <div className="text-right text-sm text-white/70">
                  {ppsps.reference && <p>Réf. : {ppsps.reference}</p>}
                  <p>
                    <Badge tone={statutTones[ppsps.statut] ?? "gray"}>
                      {statutLabels[ppsps.statut] ?? ppsps.statut}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>

            <div className="p-8 flex flex-col gap-8">
              {/* General info grid */}
              <section>
                <h2 className="mb-3 text-base font-bold text-brand-navy border-b border-slate-200 pb-1">
                  Renseignements généraux
                </h2>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase">Chantier</p>
                    <p className="text-slate-700">{ppsps.chantier.nom}</p>
                  </div>
                  {ppsps.nomOperation && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Opération</p>
                      <p className="text-slate-700">{ppsps.nomOperation}</p>
                    </div>
                  )}
                  {ppsps.adresseChantier && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Adresse</p>
                      <p className="text-slate-700 whitespace-pre-wrap">{ppsps.adresseChantier}</p>
                    </div>
                  )}
                  {ppsps.maitreOuvrage && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Maître d&apos;ouvrage
                      </p>
                      <p className="text-slate-700">{ppsps.maitreOuvrage}</p>
                    </div>
                  )}
                  {ppsps.maitreOeuvre && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Maître d&apos;œuvre
                      </p>
                      <p className="text-slate-700">{ppsps.maitreOeuvre}</p>
                    </div>
                  )}
                  {ppsps.coordonateurSPS && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">
                        Coordonnateur SPS
                      </p>
                      <p className="text-slate-700">{ppsps.coordonateurSPS}</p>
                    </div>
                  )}
                  {ppsps.dateDebutChantier && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Début</p>
                      <p className="text-slate-700">{formatDate(ppsps.dateDebutChantier)}</p>
                    </div>
                  )}
                  {ppsps.dateFinChantier && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Fin</p>
                      <p className="text-slate-700">{formatDate(ppsps.dateFinChantier)}</p>
                    </div>
                  )}
                  {ppsps.effectifPrevu != null && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase">Effectif</p>
                      <p className="text-slate-700">{ppsps.effectifPrevu} personnes</p>
                    </div>
                  )}
                </div>
              </section>

              {/* Content sections */}
              {Object.keys(sections).length > 0 && (
                <section>
                  <h2 className="mb-4 text-base font-bold text-brand-navy border-b border-slate-200 pb-1">
                    Contenu du plan
                  </h2>
                  <div className="flex flex-col gap-5">
                    {Object.entries(sections).map(([sectionKey, value]) => {
                      if (!value) return null;
                      return (
                        <div key={sectionKey}>
                          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                            {value}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Risques table */}
              {ppsps.risques.length > 0 && (
                <section>
                  <h2 className="mb-3 text-base font-bold text-brand-navy border-b border-slate-200 pb-1">
                    Analyse des risques
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border border-slate-200">
                      <thead className="bg-slate-100 text-left font-semibold text-slate-500">
                        <tr>
                          <th className="border border-slate-200 px-3 py-2">Phase</th>
                          <th className="border border-slate-200 px-3 py-2">Risque</th>
                          <th className="border border-slate-200 px-3 py-2">Mesures</th>
                          <th className="border border-slate-200 px-3 py-2">Priorité</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ppsps.risques.map((r) => (
                          <tr key={r.id} className="even:bg-slate-50">
                            <td className="border border-slate-200 px-3 py-2 font-medium">
                              {r.phase}
                            </td>
                            <td className="border border-slate-200 px-3 py-2">{r.description}</td>
                            <td className="border border-slate-200 px-3 py-2">{r.mesures}</td>
                            <td className="border border-slate-200 px-3 py-2">
                              <Badge tone={prioriteTones[r.priorite] ?? "gray"}>
                                {prioriteLabels[r.priorite] ?? r.priorite}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Secours table */}
              {ppsps.secours.length > 0 && (
                <section>
                  <h2 className="mb-3 text-base font-bold text-brand-navy border-b border-slate-200 pb-1">
                    Contacts de secours
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border border-slate-200">
                      <thead className="bg-slate-100 text-left font-semibold text-slate-500">
                        <tr>
                          <th className="border border-slate-200 px-3 py-2">Type</th>
                          <th className="border border-slate-200 px-3 py-2">Nom</th>
                          <th className="border border-slate-200 px-3 py-2">Téléphone</th>
                          <th className="border border-slate-200 px-3 py-2">Adresse</th>
                          <th className="border border-slate-200 px-3 py-2">Distance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ppsps.secours.map((s) => (
                          <tr key={s.id} className="even:bg-slate-50">
                            <td className="border border-slate-200 px-3 py-2 font-medium">
                              {secoursTypeLabels[s.type] ?? s.type}
                            </td>
                            <td className="border border-slate-200 px-3 py-2">{s.nom ?? "—"}</td>
                            <td className="border border-slate-200 px-3 py-2 font-bold">
                              {s.telephone}
                            </td>
                            <td className="border border-slate-200 px-3 py-2">
                              {s.adresse ?? "—"}
                            </td>
                            <td className="border border-slate-200 px-3 py-2">
                              {s.distance ?? "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Footer */}
              <div className="border-t border-slate-200 pt-4 text-xs text-slate-400">
                <p>
                  Document généré par CRM SDA Rénovation — {ppsps.nomEntreprise} — SIREN{" "}
                  {ppsps.sirenEntreprise}
                </p>
                {ppsps.assuranceDecennale && (
                  <p>Assurance décennale : {ppsps.assuranceDecennale}</p>
                )}
                {ppsps.assuranceRC && <p>RC Professionnelle : {ppsps.assuranceRC}</p>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
