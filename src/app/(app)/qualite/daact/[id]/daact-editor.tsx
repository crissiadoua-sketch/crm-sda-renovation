"use client";
import { useState } from "react";
import Link from "next/link";
import { sauvegarderDAACT, supprimerDAACT } from "@/lib/actions/qualite";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";

type DAACT = {
  id: string;
  numero: string;
  statut: string;
  chantierId: string | null;
  clientId: string | null;
  adresseChantier: string | null;
  dateAchevement: string | null;
  dateDepot: string | null;
  natureTravaux: string | null;
  nomDeclarant: string | null;
  qualiteDeclarant: string | null;
  conformePC: boolean;
  reservesMO: string | null;
  dateReponse: string | null;
  notes: string | null;
};

type Props = {
  daact: DAACT;
  chantiers: { id: string; nom: string; ville?: string | null }[];
  clients: { id: string; nom: string; prenom?: string | null }[];
};

const STATUTS = ["BROUILLON", "SOUMIS", "ACCEPTE", "AVEC_RESERVES"];
const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "Soumis",
  ACCEPTE: "Accepté",
  AVEC_RESERVES: "Avec réserves",
};

export function DAACTEditor({ daact, chantiers, clients }: Props) {
  const [tab, setTab] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const [statut, setStatut] = useState(daact.statut);
  const [chantierId, setChantierId] = useState(daact.chantierId ?? "");
  const [clientId, setClientId] = useState(daact.clientId ?? "");
  const [adresseChantier, setAdresseChantier] = useState(daact.adresseChantier ?? "");
  const [natureTravaux, setNatureTravaux] = useState(daact.natureTravaux ?? "");
  const [dateAchevement, setDateAchevement] = useState(daact.dateAchevement ?? "");
  const [dateDepot, setDateDepot] = useState(daact.dateDepot ?? "");
  const [nomDeclarant, setNomDeclarant] = useState(daact.nomDeclarant ?? "");
  const [qualiteDeclarant, setQualiteDeclarant] = useState(daact.qualiteDeclarant ?? "");
  const [conformePC, setConformePC] = useState(daact.conformePC);
  const [reservesMO, setReservesMO] = useState(daact.reservesMO ?? "");
  const [dateReponse, setDateReponse] = useState(daact.dateReponse ?? "");
  const [notes, setNotes] = useState(daact.notes ?? "");

  async function handleSave() {
    setIsSaving(true);
    try {
      await sauvegarderDAACT(daact.id, {
        statut,
        chantierId: chantierId || null,
        clientId: clientId || null,
        adresseChantier: adresseChantier || null,
        natureTravaux: natureTravaux || null,
        dateAchevement: dateAchevement || null,
        dateDepot: dateDepot || null,
        nomDeclarant: nomDeclarant || null,
        qualiteDeclarant: qualiteDeclarant || null,
        conformePC,
        reservesMO: reservesMO || null,
        dateReponse: dateReponse || null,
        notes: notes || null,
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette DAACT ? Cette action est irréversible.")) return;
    await supprimerDAACT(daact.id);
  }

  const fieldClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  const statutBadgeClass =
    statut === "ACCEPTE"
      ? "bg-green-100 text-green-700"
      : statut === "AVEC_RESERVES"
      ? "bg-orange-100 text-orange-700"
      : statut === "SOUMIS"
      ? "bg-blue-100 text-blue-700"
      : "bg-slate-100 text-slate-600";

  const tabs = ["Déclaration", "Conformité & Suites"];

  return (
    <FullscreenToggle>
    <div className="flex gap-6 p-6 max-w-7xl mx-auto">
      <div className="flex-1 min-w-0">
        {/* En-tête */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">DAACT</p>
              <h1 className="text-xl font-bold text-brand-navy">{daact.numero}</h1>
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
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Onglet 0 : Déclaration */}
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

                <div>
                  <label className={labelClass}>Adresse du chantier</label>
                  <input
                    type="text"
                    value={adresseChantier}
                    onChange={(e) => setAdresseChantier(e.target.value)}
                    placeholder="Adresse complète des travaux"
                    className={fieldClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Nature des travaux</label>
                  <input
                    type="text"
                    value={natureTravaux}
                    onChange={(e) => setNatureTravaux(e.target.value)}
                    placeholder="Description des travaux réalisés"
                    className={fieldClass}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Date d&apos;achèvement</label>
                    <input type="date" value={dateAchevement} onChange={(e) => setDateAchevement(e.target.value)} className={fieldClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Date de dépôt</label>
                    <input type="date" value={dateDepot} onChange={(e) => setDateDepot(e.target.value)} className={fieldClass} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Nom du déclarant</label>
                    <input
                      type="text"
                      value={nomDeclarant}
                      onChange={(e) => setNomDeclarant(e.target.value)}
                      placeholder="Nom complet"
                      className={fieldClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Qualité du déclarant</label>
                    <input
                      type="text"
                      value={qualiteDeclarant}
                      onChange={(e) => setQualiteDeclarant(e.target.value)}
                      placeholder="ex: Gérant, Directeur de travaux…"
                      className={fieldClass}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Onglet 1 : Conformité & Suites */}
            {tab === 1 && (
              <div className="space-y-5">
                {/* Conformité PC */}
                <div className="rounded-xl border-2 border-slate-200 p-6 text-center">
                  <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
                    Conformité au permis de construire
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      type="button"
                      onClick={() => setConformePC(true)}
                      className={`flex items-center gap-2 rounded-xl px-6 py-4 text-lg font-bold transition-colors ${
                        conformePC
                          ? "bg-green-500 text-white shadow-md"
                          : "border-2 border-slate-200 text-slate-400 hover:border-green-300"
                      }`}
                    >
                      ✓ CONFORME
                    </button>
                    <button
                      type="button"
                      onClick={() => setConformePC(false)}
                      className={`flex items-center gap-2 rounded-xl px-6 py-4 text-lg font-bold transition-colors ${
                        !conformePC
                          ? "bg-red-500 text-white shadow-md"
                          : "border-2 border-slate-200 text-slate-400 hover:border-red-300"
                      }`}
                    >
                      ✗ AVEC RÉSERVES
                    </button>
                  </div>
                </div>

                {/* Réserves MO — visible seulement si non conforme */}
                {!conformePC && (
                  <div>
                    <label className={labelClass}>Réserves du Maître d&apos;ouvrage</label>
                    <textarea
                      value={reservesMO}
                      onChange={(e) => setReservesMO(e.target.value)}
                      rows={4}
                      placeholder="Description des réserves formulées par le MO…"
                      className={`${fieldClass} resize-none`}
                    />
                  </div>
                )}

                <div>
                  <label className={labelClass}>Date de réponse du MO</label>
                  <input type="date" value={dateReponse} onChange={(e) => setDateReponse(e.target.value)} className={fieldClass} />
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
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-64 shrink-0 space-y-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Référence</p>
          <p className="font-mono text-sm font-bold text-brand-navy">{daact.numero}</p>
          <p className="mt-3 text-xs text-gray-500 uppercase tracking-wide mb-1">Statut</p>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statutBadgeClass}`}>
            {STATUT_LABELS[statut] ?? statut}
          </span>
          <div className={`mt-4 rounded-xl p-3 text-center font-bold text-lg ${
            conformePC ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {conformePC ? "✓ CONFORME" : "✗ AVEC RÉSERVES"}
          </div>
        </div>

        {/* Imprimer */}
        <button
          type="button"
          onClick={() => window.open(`/apercu/daact/${daact.id}`, "_blank")}
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
          href="/qualite/daact"
          className="block text-center text-sm text-slate-500 hover:text-slate-700"
        >
          ← Retour à la liste
        </Link>
      </aside>
    </div>
    </FullscreenToggle>
  );
}
