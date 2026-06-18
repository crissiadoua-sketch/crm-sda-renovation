"use client";

import { useState, useTransition, useCallback } from "react";
import { inputClasses, selectClasses } from "@/components/ui/fields";
import { DeleteButton } from "@/components/ui/delete-button";
import {
  sauvegarderCoutMateriaux,
  supprimerCoutMateriaux,
  type CMRLigneData,
} from "@/lib/actions/cout-materiaux";
import { formatEuros } from "@/lib/format";

type Ligne = CMRLigneData & {
  id?: string;
  transportTotal?: number;
  dechargementTotal?: number;
  prixRevientRenduChantier?: number;
};

type Doc = {
  id: string;
  numero: string;
  titre: string | null;
  chantierId: string | null;
  devisId: string | null;
  responsable: string | null;
  notes: string | null;
  date: string;
  lignes: {
    id: string;
    ordre: number;
    reference: string | null;
    designation: string;
    unite: string | null;
    prixAchatHT: number;
    transportKm: number | null;
    transportPU: number | null;
    transportTotal: number | null;
    dechargementH: number | null;
    dechargementDH: number | null;
    dechargementTotal: number | null;
    pertesPercent: number | null;
    prixRevientRenduChantier: number | null;
  }[];
};

function calcLigne(l: Ligne) {
  const transport = (l.transportKm ?? 0) * (l.transportPU ?? 0);
  const dechargement = (l.dechargementH ?? 0) * (l.dechargementDH ?? 0);
  const baseHT = l.prixAchatHT + transport + dechargement;
  const prixRevient = baseHT * (1 + (l.pertesPercent ?? 0) / 100);
  return { transport, dechargement, prixRevient };
}

function numInput(
  value: number | null | undefined,
  onChange: (v: number | null) => void,
  placeholder = ""
) {
  return (
    <input
      type="number"
      step="any"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
      placeholder={placeholder}
      className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
    />
  );
}

export function CmrEditor({
  doc,
  chantiers,
  devisList,
}: {
  doc: Doc;
  chantiers: { id: string; nom: string; reference: string }[];
  devisList: { id: string; numero: string; objet: string | null }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [titre, setTitre] = useState(doc.titre ?? "");
  const [chantierId, setChantierId] = useState(doc.chantierId ?? "");
  const [devisId, setDevisId] = useState(doc.devisId ?? "");
  const [responsable, setResponsable] = useState(doc.responsable ?? "");
  const [notes, setNotes] = useState(doc.notes ?? "");

  const [lignes, setLignes] = useState<Ligne[]>(
    doc.lignes.map((l) => ({
      ordre: l.ordre,
      reference: l.reference ?? "",
      designation: l.designation,
      unite: l.unite ?? "",
      prixAchatHT: l.prixAchatHT,
      transportKm: l.transportKm,
      transportPU: l.transportPU,
      dechargementH: l.dechargementH,
      dechargementDH: l.dechargementDH,
      pertesPercent: l.pertesPercent,
    }))
  );

  const updateLigne = useCallback(
    (idx: number, patch: Partial<Ligne>) => {
      setLignes((prev) =>
        prev.map((l, i) => (i === idx ? { ...l, ...patch } : l))
      );
    },
    []
  );

  function addLigne() {
    setLignes((prev) => [
      ...prev,
      {
        ordre: prev.length + 1,
        reference: "",
        designation: "",
        unite: "",
        prixAchatHT: 0,
        transportKm: null,
        transportPU: null,
        dechargementH: null,
        dechargementDH: null,
        pertesPercent: null,
      },
    ]);
  }

  function removeLigne(idx: number) {
    setLignes((prev) => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, ordre: i + 1 })));
  }

  function handleSave() {
    startTransition(async () => {
      await sauvegarderCoutMateriaux(doc.id, {
        titre: titre || null,
        chantierId: chantierId || null,
        devisId: devisId || null,
        responsable: responsable || null,
        notes: notes || null,
        lignes: lignes.map((l, i) => ({ ...l, ordre: i + 1 })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  // Stats sidebar
  const calculs = lignes.map((l) => calcLigne(l));
  const prixMoyenPondere =
    lignes.length > 0
      ? calculs.reduce((s, c) => s + c.prixRevient, 0) / lignes.length
      : 0;

  const thCell = "border border-slate-300 bg-slate-100 px-2 py-1.5 text-center text-xs font-semibold text-slate-600";
  const thCellBlue = "border border-slate-300 bg-brand-navy/10 px-2 py-1.5 text-center text-xs font-semibold text-brand-navy";
  const tdCell = "border border-slate-200 px-1 py-1";

  return (
    <div className="flex gap-6 flex-col xl:flex-row">
      {/* Main */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Header formulaire */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Titre</label>
              <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} className={inputClasses} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Chantier</label>
              <select value={chantierId} onChange={(e) => setChantierId(e.target.value)} className={selectClasses}>
                <option value="">— Aucun —</option>
                {chantiers.map((c) => (
                  <option key={c.id} value={c.id}>{c.reference} — {c.nom}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Devis</label>
              <select value={devisId} onChange={(e) => setDevisId(e.target.value)} className={selectClasses}>
                <option value="">— Aucun —</option>
                {devisList.map((d) => (
                  <option key={d.id} value={d.id}>{d.numero}{d.objet ? ` — ${d.objet}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Responsable</label>
              <input type="text" value={responsable} onChange={(e) => setResponsable(e.target.value)} className={inputClasses} />
            </div>
          </div>
        </div>

        {/* Tableau matériaux */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              {/* Ligne 1 : groupes */}
              <tr>
                <th className={thCell} rowSpan={2}>Réf.</th>
                <th className={thCell} rowSpan={2} style={{ minWidth: 160 }}>Désignation matériaux</th>
                <th className={thCell} rowSpan={2}>U.</th>
                <th className={thCell} rowSpan={2}>Prix achat HT (€)</th>
                <th className={`${thCell} bg-blue-50`} colSpan={3}>TRANSPORT</th>
                <th className={`${thCell} bg-amber-50`} colSpan={3}>DÉCHARGEMENT</th>
                <th className={thCell} rowSpan={2}>Pertes %</th>
                <th className={thCellBlue} rowSpan={2} style={{ minWidth: 120 }}>Prix revient HT rendu chantier (€)</th>
                <th className={thCell} rowSpan={2}></th>
              </tr>
              {/* Ligne 2 : sous-colonnes */}
              <tr>
                <th className="border border-slate-300 bg-blue-50 px-2 py-1 text-center text-xs font-medium text-slate-500">km</th>
                <th className="border border-slate-300 bg-blue-50 px-2 py-1 text-center text-xs font-medium text-slate-500">€/km</th>
                <th className="border border-slate-300 bg-blue-50 px-2 py-1 text-center text-xs font-medium text-slate-500">Total</th>
                <th className="border border-slate-300 bg-amber-50 px-2 py-1 text-center text-xs font-medium text-slate-500">h</th>
                <th className="border border-slate-300 bg-amber-50 px-2 py-1 text-center text-xs font-medium text-slate-500">€/h</th>
                <th className="border border-slate-300 bg-amber-50 px-2 py-1 text-center text-xs font-medium text-slate-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {lignes.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-6 text-center text-slate-400">
                    Aucun matériau — cliquez sur &quot;+ Ajouter&quot;
                  </td>
                </tr>
              )}
              {lignes.map((l, idx) => {
                const { transport, dechargement, prixRevient } = calcLigne(l);
                return (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className={tdCell}>
                      <input
                        type="text"
                        value={l.reference ?? ""}
                        onChange={(e) => updateLigne(idx, { reference: e.target.value })}
                        className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-brand-blue"
                      />
                    </td>
                    <td className={tdCell}>
                      <input
                        type="text"
                        value={l.designation}
                        onChange={(e) => updateLigne(idx, { designation: e.target.value })}
                        className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-brand-blue"
                        placeholder="Désignation…"
                      />
                    </td>
                    <td className={tdCell}>
                      <input
                        type="text"
                        value={l.unite ?? ""}
                        onChange={(e) => updateLigne(idx, { unite: e.target.value })}
                        className="w-12 rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-brand-blue"
                        placeholder="m²"
                      />
                    </td>
                    <td className={tdCell}>{numInput(l.prixAchatHT, (v) => updateLigne(idx, { prixAchatHT: v ?? 0 }))}</td>
                    <td className={`${tdCell} bg-blue-50/30`}>{numInput(l.transportKm, (v) => updateLigne(idx, { transportKm: v }))}</td>
                    <td className={`${tdCell} bg-blue-50/30`}>{numInput(l.transportPU, (v) => updateLigne(idx, { transportPU: v }))}</td>
                    <td className={`${tdCell} bg-blue-50/30 text-right font-medium`}>
                      {transport > 0 ? transport.toFixed(2) : "—"}
                    </td>
                    <td className={`${tdCell} bg-amber-50/30`}>{numInput(l.dechargementH, (v) => updateLigne(idx, { dechargementH: v }))}</td>
                    <td className={`${tdCell} bg-amber-50/30`}>{numInput(l.dechargementDH, (v) => updateLigne(idx, { dechargementDH: v }))}</td>
                    <td className={`${tdCell} bg-amber-50/30 text-right font-medium`}>
                      {dechargement > 0 ? dechargement.toFixed(2) : "—"}
                    </td>
                    <td className={tdCell}>{numInput(l.pertesPercent, (v) => updateLigne(idx, { pertesPercent: v }), "0")}</td>
                    <td className={`${tdCell} text-right font-bold text-brand-navy`}>
                      {prixRevient > 0 ? prixRevient.toFixed(4) : "—"}
                    </td>
                    <td className={`${tdCell} text-center`}>
                      <button
                        type="button"
                        onClick={() => removeLigne(idx)}
                        className="text-red-400 hover:text-red-600 font-bold text-base leading-none"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-3 border-t border-slate-100">
            <button
              type="button"
              onClick={addLigne}
              className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-xs font-medium text-slate-500 hover:border-brand-blue hover:text-brand-blue transition"
            >
              + Ajouter matériau
            </button>
          </div>
        </div>

        {/* Notes */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <label className="mb-1 block text-sm font-medium text-brand-navy">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={`${inputClasses} resize-none`}
            placeholder="Remarques, conditions de transport, fournisseurs…"
          />
        </div>
      </div>

      {/* Sidebar */}
      <aside className="w-full xl:w-64 flex flex-col gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-3">
          <h3 className="font-semibold text-brand-navy text-sm">Résumé</h3>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Nb lignes</span>
              <span className="font-medium text-slate-700">{lignes.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Prix moyen pondéré</span>
              <span className="font-bold text-brand-navy">
                {prixMoyenPondere > 0 ? `${prixMoyenPondere.toFixed(4)} €` : "—"}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full rounded-lg bg-gradient-to-r from-brand-orange to-brand-orange-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Enregistrement…" : saved ? "Enregistré !" : "Enregistrer"}
        </button>

        <button
          type="button"
          onClick={() => window.open(`/apercu/cout-materiaux/${doc.id}`, '_blank')}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 w-full justify-center"
        >
          🖨 Imprimer
        </button>

        <DeleteButton
          action={supprimerCoutMateriaux.bind(null, doc.id)}
          confirmMessage={`Supprimer le document ${doc.numero} ?`}
        >
          Supprimer
        </DeleteButton>
      </aside>
    </div>
  );
}
