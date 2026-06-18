"use client";
import { useState } from "react";
import Link from "next/link";
import { sauvegarderFicheAutocontrole, supprimerFicheAutocontrole } from "@/lib/actions/qualite";

type Point = {
  id?: string;
  ordre: number;
  critere: string;
  exigence: string | null;
  resultat: string;
  observations: string | null;
};

type FAC = {
  id: string;
  numero: string;
  statut: string;
  chantierId: string | null;
  clientId: string | null;
  paqId: string | null;
  lot: string | null;
  ouvrage: string | null;
  localisation: string | null;
  dateControle: string | null;
  controleurNom: string | null;
  entreprise: string | null;
  observations: string | null;
  notes: string | null;
  points: Point[];
};

type Props = {
  fac: FAC;
  chantiers: { id: string; nom: string; ville?: string | null }[];
  clients: { id: string; nom: string; prenom?: string | null }[];
  paqs: { id: string; numero: string; objetMarche: string | null }[];
};

const RESULTATS = [
  { value: "CONFORME", label: "Conforme" },
  { value: "NON_CONFORME", label: "Non conforme" },
  { value: "SANS_OBJET", label: "Sans objet" },
  { value: "NON_VERIFIE", label: "Non vérifié" },
];

function calcStatut(points: Point[]): string {
  const verifies = points.filter((p) => p.resultat !== "NON_VERIFIE" && p.resultat !== "SANS_OBJET");
  if (verifies.length === 0) return "EN_COURS";
  const nonConformes = verifies.filter((p) => p.resultat === "NON_CONFORME");
  if (nonConformes.length > 0) return "NON_CONFORME";
  const conformes = verifies.filter((p) => p.resultat === "CONFORME");
  if (conformes.length === verifies.length) return "CONFORME";
  return "AVEC_RESERVES";
}

const STATUT_LABELS: Record<string, string> = {
  EN_COURS: "En cours",
  CONFORME: "Conforme",
  NON_CONFORME: "Non conforme",
  AVEC_RESERVES: "Avec réserves",
};

export function FACEditor({ fac, chantiers, clients, paqs }: Props) {
  const [tab, setTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [newCritere, setNewCritere] = useState("");

  const [statut, setStatut] = useState(fac.statut);
  const [chantierId, setChantierId] = useState(fac.chantierId ?? "");
  const [clientId, setClientId] = useState(fac.clientId ?? "");
  const [paqId, setPaqId] = useState(fac.paqId ?? "");
  const [lot, setLot] = useState(fac.lot ?? "");
  const [ouvrage, setOuvrage] = useState(fac.ouvrage ?? "");
  const [localisation, setLocalisation] = useState(fac.localisation ?? "");
  const [dateControle, setDateControle] = useState(fac.dateControle ?? "");
  const [controleurNom, setControleurNom] = useState(fac.controleurNom ?? "");
  const [entreprise, setEntreprise] = useState(fac.entreprise ?? "");
  const [observations, setObservations] = useState(fac.observations ?? "");
  const [notes, setNotes] = useState(fac.notes ?? "");
  const [points, setPoints] = useState<Point[]>(fac.points);

  function addPoint() {
    if (!newCritere.trim()) return;
    setPoints((prev) => [
      ...prev,
      { ordre: prev.length + 1, critere: newCritere.trim(), exigence: null, resultat: "NON_VERIFIE", observations: null },
    ]);
    setNewCritere("");
  }

  function removePoint(idx: number) {
    setPoints((prev) => prev.filter((_, i) => i !== idx).map((p, i) => ({ ...p, ordre: i + 1 })));
  }

  function updatePoint(idx: number, field: keyof Point, value: string | null) {
    setPoints((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  }

  const computedStatut = calcStatut(points);
  const conformesCount = points.filter((p) => p.resultat === "CONFORME").length;
  const verifiedCount = points.filter((p) => p.resultat !== "NON_VERIFIE").length;

  const statutBadgeClass =
    computedStatut === "CONFORME"
      ? "bg-green-100 text-green-700"
      : computedStatut === "NON_CONFORME"
      ? "bg-red-100 text-red-700"
      : computedStatut === "AVEC_RESERVES"
      ? "bg-orange-100 text-orange-700"
      : "bg-slate-100 text-slate-600";

  async function handleSave() {
    setIsSaving(true);
    try {
      await sauvegarderFicheAutocontrole(fac.id, {
        statut: computedStatut,
        chantierId: chantierId || null,
        clientId: clientId || null,
        paqId: paqId || null,
        lot: lot || null,
        ouvrage: ouvrage || null,
        localisation: localisation || null,
        dateControle: dateControle || null,
        controleurNom: controleurNom || null,
        entreprise: entreprise || null,
        observations: observations || null,
        notes: notes || null,
        points: points.map((p) => ({
          ordre: p.ordre,
          critere: p.critere,
          exigence: p.exigence,
          resultat: p.resultat,
          observations: p.observations,
        })),
      });
      setStatut(computedStatut);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette fiche d'autocontrôle ? Cette action est irréversible.")) return;
    await supprimerFicheAutocontrole(fac.id);
  }

  const fieldClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  const tabs = ["Informations", "Points de contrôle"];

  return (
    <div className="flex gap-6 p-6 max-w-7xl mx-auto">
      <div className="flex-1 min-w-0">
        {/* En-tête */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Fiche d&apos;autocontrôle</p>
              <h1 className="text-xl font-bold text-brand-navy">{fac.numero}</h1>
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
                {i === 1 && points.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-xs font-semibold text-brand-blue">
                    {points.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Onglet 0 : Informations */}
            {tab === 0 && (
              <div className="space-y-5">
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

                <div>
                  <label className={labelClass}>PAQ associé</label>
                  <select value={paqId} onChange={(e) => setPaqId(e.target.value)} className={fieldClass}>
                    <option value="">— Aucun —</option>
                    {paqs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.numero}{p.objetMarche ? ` — ${p.objetMarche}` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Lot</label>
                    <input type="text" value={lot} onChange={(e) => setLot(e.target.value)} placeholder="ex: Maçonnerie" className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Ouvrage</label>
                    <input type="text" value={ouvrage} onChange={(e) => setOuvrage(e.target.value)} placeholder="ex: Dallage RdC" className={fieldClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Localisation</label>
                  <input type="text" value={localisation} onChange={(e) => setLocalisation(e.target.value)} placeholder="Zone, bâtiment, niveau…" className={fieldClass} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date de contrôle</label>
                    <input type="date" value={dateControle} onChange={(e) => setDateControle(e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Contrôleur</label>
                    <input type="text" value={controleurNom} onChange={(e) => setControleurNom(e.target.value)} placeholder="Nom du contrôleur" className={fieldClass} />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Entreprise</label>
                  <input type="text" value={entreprise} onChange={(e) => setEntreprise(e.target.value)} placeholder="Entreprise réalisatrice" className={fieldClass} />
                </div>

                <div>
                  <label className={labelClass}>Observations générales</label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    rows={3}
                    placeholder="Observations sur le contrôle…"
                    className={`${fieldClass} resize-none`}
                  />
                </div>

                <div>
                  <label className={labelClass}>Notes internes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder="Notes internes…"
                    className={`${fieldClass} resize-none`}
                  />
                </div>
              </div>
            )}

            {/* Onglet 1 : Points de contrôle */}
            {tab === 1 && (
              <div className="space-y-4">
                {/* Ajouter un point */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCritere}
                    onChange={(e) => setNewCritere(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addPoint()}
                    placeholder="Nouveau critère de contrôle…"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy"
                  />
                  <button
                    type="button"
                    onClick={addPoint}
                    className="rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90"
                  >
                    +
                  </button>
                </div>

                {/* Tableau des points */}
                {points.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-400 text-sm">
                    Aucun point de contrôle. Ajoutez un critère ci-dessus.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <th className="py-2 pr-2 w-6">#</th>
                          <th className="py-2 pr-3">Critère</th>
                          <th className="py-2 pr-3">Exigence</th>
                          <th className="py-2 pr-3 w-40">Résultat</th>
                          <th className="py-2 pr-3">Observations</th>
                          <th className="py-2 w-8"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {points.map((p, idx) => {
                          const rowBg =
                            p.resultat === "CONFORME"
                              ? "bg-[#f0fdf4]"
                              : p.resultat === "NON_CONFORME"
                              ? "bg-[#fef2f2]"
                              : "";
                          return (
                            <tr key={idx} className={`border-b border-slate-100 ${rowBg}`}>
                              <td className="py-2 pr-2 text-xs text-slate-400 font-bold">{p.ordre}</td>
                              <td className="py-2 pr-3">
                                <input
                                  type="text"
                                  value={p.critere}
                                  onChange={(e) => updatePoint(idx, "critere", e.target.value)}
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-navy"
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  type="text"
                                  value={p.exigence ?? ""}
                                  onChange={(e) => updatePoint(idx, "exigence", e.target.value || null)}
                                  placeholder="Valeur requise"
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-navy"
                                />
                              </td>
                              <td className="py-2 pr-3">
                                <select
                                  value={p.resultat}
                                  onChange={(e) => updatePoint(idx, "resultat", e.target.value)}
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-navy"
                                >
                                  {RESULTATS.map((r) => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 pr-3">
                                <input
                                  type="text"
                                  value={p.observations ?? ""}
                                  onChange={(e) => updatePoint(idx, "observations", e.target.value || null)}
                                  placeholder="Observations"
                                  className="w-full border border-gray-200 rounded px-2 py-1 text-sm bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-navy"
                                />
                              </td>
                              <td className="py-2">
                                <button
                                  type="button"
                                  onClick={() => removePoint(idx)}
                                  className="text-red-500 hover:text-red-700 text-lg leading-none"
                                >
                                  ✕
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
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
          <p className="font-mono text-sm font-bold text-brand-navy">{fac.numero}</p>
          <p className="mt-3 text-xs text-gray-500 uppercase tracking-wide mb-1">Statut calculé</p>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statutBadgeClass}`}>
            {STATUT_LABELS[computedStatut] ?? computedStatut}
          </span>
          <p className="mt-3 text-xs text-gray-500 uppercase tracking-wide mb-1">Conformité</p>
          <p className="text-lg font-bold text-brand-navy">
            {conformesCount} / {verifiedCount} conformes
          </p>
          <p className="text-xs text-slate-400">{points.length} points au total</p>
        </div>

        {/* Imprimer */}
        <button
          type="button"
          onClick={() => window.open(`/apercu/fiche-autocontrole/${fac.id}`, "_blank")}
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
          href="/qualite/autocontrole"
          className="block text-center text-sm text-slate-500 hover:text-slate-700"
        >
          ← Retour à la liste
        </Link>
      </aside>
    </div>
  );
}
