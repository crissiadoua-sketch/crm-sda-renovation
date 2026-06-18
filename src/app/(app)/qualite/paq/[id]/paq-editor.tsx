"use client";
import { useState } from "react";
import Link from "next/link";
import { sauvegarderPAQ, supprimerPAQ } from "@/lib/actions/qualite";

type Fiche = {
  id: string;
  numero: string;
  statut: string;
  ouvrage: string | null;
  lot: string | null;
};

type PAQ = {
  id: string;
  numero: string;
  statut: string;
  version: string;
  chantierId: string | null;
  clientId: string | null;
  dateEmission: string | null;
  dateRevision: string | null;
  redacteurNom: string | null;
  approbateurNom: string | null;
  objetMarche: string | null;
  delaiExecution: string | null;
  listeIntervenants: string | null;
  proceduresQualite: string | null;
  planControle: string | null;
  enregistrements: string | null;
  notes: string | null;
  fiches: Fiche[];
};

type Props = {
  paq: PAQ;
  chantiers: { id: string; nom: string; ville?: string | null }[];
  clients: { id: string; nom: string; prenom?: string | null }[];
};

const STATUTS = ["BROUILLON", "EN_VIGUEUR", "ARCHIVE"];
const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  EN_VIGUEUR: "En vigueur",
  ARCHIVE: "Archivé",
};

export function PAQEditor({ paq, chantiers, clients }: Props) {
  const [tab, setTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const [statut, setStatut] = useState(paq.statut);
  const [version, setVersion] = useState(paq.version);
  const [chantierId, setChantierId] = useState(paq.chantierId ?? "");
  const [clientId, setClientId] = useState(paq.clientId ?? "");
  const [dateEmission, setDateEmission] = useState(paq.dateEmission ?? "");
  const [dateRevision, setDateRevision] = useState(paq.dateRevision ?? "");
  const [redacteurNom, setRedacteurNom] = useState(paq.redacteurNom ?? "");
  const [approbateurNom, setApprobateurNom] = useState(paq.approbateurNom ?? "");
  const [objetMarche, setObjetMarche] = useState(paq.objetMarche ?? "");
  const [delaiExecution, setDelaiExecution] = useState(paq.delaiExecution ?? "");
  const [listeIntervenants, setListeIntervenants] = useState(paq.listeIntervenants ?? "");
  const [proceduresQualite, setProceduresQualite] = useState(paq.proceduresQualite ?? "");
  const [planControle, setPlanControle] = useState(paq.planControle ?? "");
  const [enregistrements, setEnregistrements] = useState(paq.enregistrements ?? "");
  const [notes, setNotes] = useState(paq.notes ?? "");

  async function handleSave() {
    setIsSaving(true);
    try {
      await sauvegarderPAQ(paq.id, {
        statut,
        version,
        chantierId: chantierId || null,
        clientId: clientId || null,
        dateEmission: dateEmission || null,
        dateRevision: dateRevision || null,
        redacteurNom: redacteurNom || null,
        approbateurNom: approbateurNom || null,
        objetMarche: objetMarche || null,
        delaiExecution: delaiExecution || null,
        listeIntervenants: listeIntervenants || null,
        proceduresQualite: proceduresQualite || null,
        planControle: planControle || null,
        enregistrements: enregistrements || null,
        notes: notes || null,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer ce Plan d'Assurance Qualité ? Cette action est irréversible.")) return;
    await supprimerPAQ(paq.id);
  }

  const statutBadgeClass =
    statut === "EN_VIGUEUR"
      ? "bg-green-100 text-green-700"
      : statut === "ARCHIVE"
      ? "bg-gray-200 text-gray-500"
      : "bg-slate-100 text-slate-600";

  const tabs = ["Identification", "Plan qualité", "Fiches associées"];

  const fieldClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="flex gap-6 p-6 max-w-7xl mx-auto">
      {/* Contenu principal */}
      <div className="flex-1 min-w-0">
        {/* En-tête */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Plan d&apos;Assurance Qualité</p>
              <h1 className="text-xl font-bold text-brand-navy">{paq.numero}</h1>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="flex border-b border-gray-200">
            {tabs.map((t, i) => (
              <button
                key={i}
                onClick={() => setTab(i)}
                className={`px-4 py-3 text-sm font-medium transition-colors ${tab === i ? "border-b-2 border-brand-navy text-brand-navy" : "text-gray-500 hover:text-gray-700"}`}
              >
                {t}
                {i === 2 && paq.fiches.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-xs font-semibold text-brand-blue">
                    {paq.fiches.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Onglet 0 : Identification */}
            {tab === 0 && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Statut</label>
                    <select value={statut} onChange={(e) => setStatut(e.target.value)} className={fieldClass}>
                      {STATUTS.map((s) => (
                        <option key={s} value={s}>{STATUT_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Version</label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder="ex: 1.0"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Chantier</label>
                    <select value={chantierId} onChange={(e) => setChantierId(e.target.value)} className={fieldClass}>
                      <option value="">— Aucun —</option>
                      {chantiers.map((c) => (
                        <option key={c.id} value={c.id}>{c.nom}{c.ville ? ` (${c.ville})` : ""}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Client</label>
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={fieldClass}>
                      <option value="">— Aucun —</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.prenom ? `${c.prenom} ${c.nom}` : c.nom}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date d&apos;émission</label>
                    <input
                      type="date"
                      value={dateEmission}
                      onChange={(e) => setDateEmission(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Date de révision</label>
                    <input
                      type="date"
                      value={dateRevision}
                      onChange={(e) => setDateRevision(e.target.value)}
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Rédacteur</label>
                    <input
                      type="text"
                      value={redacteurNom}
                      onChange={(e) => setRedacteurNom(e.target.value)}
                      placeholder="Nom du rédacteur"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Approbateur</label>
                    <input
                      type="text"
                      value={approbateurNom}
                      onChange={(e) => setApprobateurNom(e.target.value)}
                      placeholder="Nom de l'approbateur"
                      className={fieldClass}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Objet du marché</label>
                  <input
                    type="text"
                    value={objetMarche}
                    onChange={(e) => setObjetMarche(e.target.value)}
                    placeholder="Description de l'opération"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Délai d&apos;exécution</label>
                  <input
                    type="text"
                    value={delaiExecution}
                    onChange={(e) => setDelaiExecution(e.target.value)}
                    placeholder="ex: 6 mois"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Notes internes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Notes internes…"
                    className={`${fieldClass} resize-none`}
                  />
                </div>
              </div>
            )}

            {/* Onglet 1 : Plan qualité */}
            {tab === 1 && (
              <div className="space-y-5">
                <div>
                  <label className={labelClass}>Liste des intervenants</label>
                  <textarea
                    value={listeIntervenants}
                    onChange={(e) => setListeIntervenants(e.target.value)}
                    rows={4}
                    placeholder="Entreprises, sous-traitants, MO, MOE…"
                    className={`${fieldClass} resize-none`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Procédures qualité</label>
                  <textarea
                    value={proceduresQualite}
                    onChange={(e) => setProceduresQualite(e.target.value)}
                    rows={5}
                    placeholder="Description des procédures mises en place…"
                    className={`${fieldClass} resize-none`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Plan de contrôle</label>
                  <textarea
                    value={planControle}
                    onChange={(e) => setPlanControle(e.target.value)}
                    rows={5}
                    placeholder="Points de contrôle, fréquences, méthodes…"
                    className={`${fieldClass} resize-none`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Enregistrements</label>
                  <textarea
                    value={enregistrements}
                    onChange={(e) => setEnregistrements(e.target.value)}
                    rows={4}
                    placeholder="Documents qualité à conserver…"
                    className={`${fieldClass} resize-none`}
                  />
                </div>
              </div>
            )}

            {/* Onglet 2 : Fiches associées */}
            {tab === 2 && (
              <div>
                {paq.fiches.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center">
                    <p className="text-slate-500">Aucune fiche d&apos;autocontrôle associée.</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Créez une fiche depuis le module Fiches d&apos;autocontrôle et associez ce PAQ.
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <th className="py-2 pr-4">Numéro</th>
                        <th className="py-2 pr-4">Statut</th>
                        <th className="py-2 pr-4">Lot</th>
                        <th className="py-2 pr-4">Ouvrage</th>
                        <th className="py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paq.fiches.map((fiche) => (
                        <tr key={fiche.id} className="hover:bg-slate-50">
                          <td className="py-2 pr-4 font-mono text-xs font-medium text-brand-blue">{fiche.numero}</td>
                          <td className="py-2 pr-4 text-slate-600">{fiche.statut.replace(/_/g, " ")}</td>
                          <td className="py-2 pr-4 text-slate-600">{fiche.lot ?? "—"}</td>
                          <td className="py-2 pr-4 text-slate-600">{fiche.ouvrage ?? "—"}</td>
                          <td className="py-2">
                            <a
                              href={`/qualite/autocontrole/${fiche.id}`}
                              className="text-xs font-medium text-brand-blue hover:underline"
                            >
                              Ouvrir →
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 shrink-0 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Référence</p>
          <p className="font-mono text-sm font-bold text-brand-navy">{paq.numero}</p>
          <p className="mt-3 text-xs text-gray-500 uppercase tracking-wide mb-1">Statut</p>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statutBadgeClass}`}>
            {STATUT_LABELS[statut] ?? statut}
          </span>
        </div>

        {/* Imprimer */}
        <button
          type="button"
          onClick={() => window.open(`/apercu/paq/${paq.id}`, "_blank")}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 w-full justify-center"
        >
          🖨 Imprimer
        </button>

        {/* Enregistrer */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-brand-orange hover:bg-orange-600 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
        >
          {isSaving && (
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          )}
          {isSaving ? "Enregistrement…" : "Enregistrer"}
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="w-full border border-red-300 text-red-600 hover:bg-red-50 rounded-lg py-2 text-sm font-medium transition-colors"
        >
          Supprimer
        </button>

        <Link
          href="/qualite/paq"
          className="block text-center text-sm text-slate-500 hover:text-slate-700"
        >
          ← Retour à la liste
        </Link>
      </aside>
    </div>
  );
}
