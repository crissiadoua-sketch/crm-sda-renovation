"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { inputClasses, selectClasses } from "@/components/ui/fields";
import { DeleteButton } from "@/components/ui/delete-button";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import {
  sauvegarderCoutMateriaux,
  supprimerCoutMateriaux,
  type CMRLigneData,
} from "@/lib/actions/cout-materiaux";
import { formatEuros } from "@/lib/format";

type Ligne = CMRLigneData & { id?: string };

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
    id: string; ordre: number; reference: string | null; designation: string;
    unite: string | null; prixAchatHT: number; transportKm: number | null;
    transportPU: number | null; transportTotal: number | null; dechargementH: number | null;
    dechargementDH: number | null; dechargementTotal: number | null;
    pertesPercent: number | null; prixRevientRenduChantier: number | null;
  }[];
};

type Chantier = { id: string; nom: string; reference: string; clientId?: string | null };
type DevisItem = { id: string; numero: string; objet: string | null; chantierId?: string | null };

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
      type="number" step="any" value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
      placeholder={placeholder}
      className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
    />
  );
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 16px; }
  h1 { font-size: 15px; color: #1E2F6E; border-bottom: 2px solid #1E2F6E; padding-bottom: 5px; margin: 0 0 10px; }
  .meta { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 10px; font-size: 10px; }
  .meta-label { font-weight: 700; color: #475569; margin-right: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; }
  th { background: #1E2F6E; color: #fff; padding: 4px 6px; text-align: center; border: 1px solid #cbd5e1; }
  th.group-transport { background: #dbeafe; color: #1e40af; }
  th.group-dechargement { background: #fef3c7; color: #92400e; }
  td { border: 1px solid #e2e8f0; padding: 3px 6px; }
  td.right { text-align: right; font-family: monospace; }
  td.transport { background: #eff6ff; }
  td.dechargement { background: #fffbeb; }
  td.prix-revient { text-align: right; font-weight: 800; color: #1E2F6E; font-family: monospace; }
  tfoot td { font-weight: 700; background: #f8fafc; border-top: 2px solid #94a3b8; }
  .notes { margin-top: 10px; padding: 8px; background: #fefce8; border-left: 3px solid #ca8a04; }
  .footer { margin-top: 16px; font-size: 8px; color: #94a3b8; text-align: right; }
  @page { margin: 10mm; }
`;

export function CmrEditor({
  doc,
  chantiers,
  devisList,
}: {
  doc: Doc;
  chantiers: Chantier[];
  devisList: DevisItem[];
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
      ordre: l.ordre, reference: l.reference ?? "", designation: l.designation,
      unite: l.unite ?? "", prixAchatHT: l.prixAchatHT, transportKm: l.transportKm,
      transportPU: l.transportPU, dechargementH: l.dechargementH,
      dechargementDH: l.dechargementDH, pertesPercent: l.pertesPercent,
    }))
  );

  // ── Devis filtrés par chantier ──────────────────────────────────────────
  const devisFiltres = chantierId
    ? devisList.filter((d) => !d.chantierId || d.chantierId === chantierId)
    : devisList;

  const chantierActuel = chantiers.find((c) => c.id === chantierId);
  const devisActuel = devisList.find((d) => d.id === devisId);

  // ── Auto-remplissage titre ──────────────────────────────────────────────
  function autoFillTitre(chId: string, dvId: string) {
    if (!chId || !dvId) return;
    setTitre((prev) => {
      if (prev) return prev; // ne pas écraser si déjà renseigné
      const ch = chantiers.find((c) => c.id === chId);
      const dv = devisList.find((d) => d.id === dvId);
      if (!dv) return prev;
      return dv.objet || (ch ? `${ch.reference} — ${dv.numero}` : dv.numero);
    });
  }

  function handleChantierChange(id: string) {
    setChantierId(id);
    // Réinitialiser devis si incompatible
    if (devisId) {
      const dv = devisList.find((d) => d.id === devisId);
      if (dv?.chantierId && dv.chantierId !== id) setDevisId("");
    }
    // Auto-sélection si 1 seul devis pour ce chantier
    if (id) {
      const match = devisList.filter((d) => d.chantierId === id);
      if (match.length === 1) {
        setDevisId(match[0].id);
        autoFillTitre(id, match[0].id);
      }
    }
  }

  function handleDevisChange(id: string) {
    setDevisId(id);
    autoFillTitre(chantierId, id);
  }

  // ── Mutations lignes ────────────────────────────────────────────────────
  const updateLigne = useCallback((idx: number, patch: Partial<Ligne>) => {
    setLignes((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }, []);

  function addLigne() {
    setLignes((prev) => [...prev, {
      ordre: prev.length + 1, reference: "", designation: "", unite: "",
      prixAchatHT: 0, transportKm: null, transportPU: null,
      dechargementH: null, dechargementDH: null, pertesPercent: null,
    }]);
  }

  function removeLigne(idx: number) {
    setLignes((prev) => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, ordre: i + 1 })));
  }

  function handleSave() {
    startTransition(async () => {
      await sauvegarderCoutMateriaux(doc.id, {
        titre: titre || null, chantierId: chantierId || null, devisId: devisId || null,
        responsable: responsable || null, notes: notes || null,
        lignes: lignes.map((l, i) => ({ ...l, ordre: i + 1 })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  // ── Print popup ─────────────────────────────────────────────────────────
  function handlePrint(autoPrint = true) {
    const chantierNom = chantierActuel ? `${chantierActuel.reference} — ${chantierActuel.nom}` : "—";
    const devisLabel = devisActuel ? `${devisActuel.numero}${devisActuel.objet ? " — " + devisActuel.objet : ""}` : "—";
    const calculs = lignes.map((l) => calcLigne(l));
    const totalPrixRevient = calculs.reduce((s, c) => s + c.prixRevient, 0);
    const pmp = lignes.length > 0 ? totalPrixRevient / lignes.length : 0;

    const rows = lignes.map((l, idx) => {
      const { transport, dechargement, prixRevient } = calcLigne(l);
      return `<tr>
        <td>${l.reference || "—"}</td>
        <td>${l.designation}</td>
        <td>${l.unite || "—"}</td>
        <td class="right">${l.prixAchatHT.toFixed(4)}</td>
        <td class="right transport">${l.transportKm ?? "—"}</td>
        <td class="right transport">${l.transportPU ?? "—"}</td>
        <td class="right transport">${transport > 0 ? transport.toFixed(4) : "—"}</td>
        <td class="right dechargement">${l.dechargementH ?? "—"}</td>
        <td class="right dechargement">${l.dechargementDH ?? "—"}</td>
        <td class="right dechargement">${dechargement > 0 ? dechargement.toFixed(4) : "—"}</td>
        <td class="right">${l.pertesPercent != null ? l.pertesPercent + "%" : "0%"}</td>
        <td class="prix-revient">${prixRevient > 0 ? prixRevient.toFixed(4) : "—"}</td>
      </tr>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="fr"><head>
      <meta charset="utf-8">
      <title>CMR ${doc.numero}</title>
      <style>${PRINT_CSS}</style>
      ${autoPrint ? `<script>window.onload=()=>{setTimeout(()=>window.print(),300)}<\/script>` : ""}
    </head><body>
      <h1>COÛT MATÉRIAUX RENDUS CHANTIER — ${doc.numero}</h1>
      <div class="meta">
        <div><span class="meta-label">Date :</span>${doc.date.slice(0, 10)}</div>
        <div><span class="meta-label">Titre :</span>${titre || "—"}</div>
        <div><span class="meta-label">Responsable :</span>${responsable || "—"}</div>
        <div><span class="meta-label">Chantier :</span>${chantierNom}</div>
        <div><span class="meta-label">Devis :</span>${devisLabel}</div>
      </div>
      <table>
        <thead>
          <tr>
            <th rowspan="2">Réf.</th>
            <th rowspan="2" style="min-width:120px">Désignation</th>
            <th rowspan="2">U.</th>
            <th rowspan="2">Prix achat HT (€)</th>
            <th colspan="3" class="group-transport">TRANSPORT</th>
            <th colspan="3" class="group-dechargement">DÉCHARGEMENT</th>
            <th rowspan="2">Pertes %</th>
            <th rowspan="2" style="background:#1E2F6E;color:#fff">Prix revient HT rendu chantier (€)</th>
          </tr>
          <tr>
            <th class="group-transport">km</th>
            <th class="group-transport">€/km</th>
            <th class="group-transport">Total</th>
            <th class="group-dechargement">h</th>
            <th class="group-dechargement">€/h</th>
            <th class="group-dechargement">Total</th>
          </tr>
        </thead>
        <tbody>${rows || '<tr><td colspan="12" style="text-align:center;font-style:italic">Aucun matériau</td></tr>'}</tbody>
        <tfoot>
          <tr>
            <td colspan="11">Nb lignes : ${lignes.length} &nbsp;|&nbsp; Prix moyen pondéré</td>
            <td class="right">${pmp > 0 ? pmp.toFixed(4) + " €" : "—"}</td>
          </tr>
        </tfoot>
      </table>
      ${notes ? `<div class="notes"><strong>Notes :</strong> ${notes}</div>` : ""}
      <p class="footer">SDA Rénovation — ${doc.numero} — Imprimé le ${new Date().toLocaleDateString("fr-FR")}</p>
    </body></html>`;

    const win = window.open("", "_blank", "width=1100,height=750");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
  }

  // ── Calculs sidebar ─────────────────────────────────────────────────────
  const calculs = lignes.map((l) => calcLigne(l));
  const prixMoyenPondere = lignes.length > 0
    ? calculs.reduce((s, c) => s + c.prixRevient, 0) / lignes.length : 0;

  const thCell = "border border-slate-300 bg-slate-100 px-2 py-1.5 text-center text-xs font-semibold text-slate-600";
  const tdCell = "border border-slate-200 px-1 py-1";

  return (
    <FullscreenToggle>
      <div className="flex gap-6 flex-col xl:flex-row">
        {/* Main */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Header formulaire */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-600">Titre</label>
                <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} className={inputClasses} placeholder="Ex: Dalle terrasse — matériaux livrés" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Chantier</label>
                <select value={chantierId} onChange={(e) => handleChantierChange(e.target.value)} className={selectClasses}>
                  <option value="">— Aucun —</option>
                  {chantiers.map((c) => (
                    <option key={c.id} value={c.id}>{c.reference} — {c.nom}</option>
                  ))}
                </select>
                {chantierActuel && (
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                    <Link href={`/chantiers/${chantierActuel.id}`} className="flex items-center gap-1 text-brand-blue hover:underline">
                      <ExternalLink className="h-3 w-3" /> Voir chantier
                    </Link>
                    {chantierActuel.clientId && (
                      <>
                        <span>·</span>
                        <Link href={`/clients/${chantierActuel.clientId}`} className="flex items-center gap-1 text-brand-blue hover:underline">
                          <ExternalLink className="h-3 w-3" /> Voir client
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Devis{chantierId && devisFiltres.length < devisList.length && (
                    <span className="ml-1 text-brand-blue">({devisFiltres.length})</span>
                  )}
                </label>
                <select value={devisId} onChange={(e) => handleDevisChange(e.target.value)} className={selectClasses}>
                  <option value="">— Aucun —</option>
                  {devisFiltres.map((d) => (
                    <option key={d.id} value={d.id}>{d.numero}{d.objet ? ` — ${d.objet}` : ""}</option>
                  ))}
                </select>
                {devisActuel && (
                  <div className="mt-1 text-xs">
                    <Link href={`/devis/${devisActuel.id}`} className="flex items-center gap-1 text-brand-blue hover:underline">
                      <ExternalLink className="h-3 w-3" /> Voir devis
                    </Link>
                  </div>
                )}
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
                <tr>
                  <th className={thCell} rowSpan={2}>Réf.</th>
                  <th className={thCell} rowSpan={2} style={{ minWidth: 160 }}>Désignation matériaux</th>
                  <th className={thCell} rowSpan={2}>U.</th>
                  <th className={thCell} rowSpan={2}>Prix achat HT (€)</th>
                  <th className={`${thCell} bg-blue-50`} colSpan={3}>TRANSPORT</th>
                  <th className={`${thCell} bg-amber-50`} colSpan={3}>DÉCHARGEMENT</th>
                  <th className={thCell} rowSpan={2}>Pertes %</th>
                  <th className="border border-slate-300 bg-brand-navy/10 px-2 py-1.5 text-center text-xs font-semibold text-brand-navy" rowSpan={2} style={{ minWidth: 120 }}>
                    Prix revient HT rendu chantier (€)
                  </th>
                  <th className={thCell} rowSpan={2}></th>
                </tr>
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
                    <td colSpan={14} className="py-6 text-center text-slate-400 italic">
                      Aucun matériau — cliquez sur &quot;+ Ajouter&quot;
                    </td>
                  </tr>
                )}
                {lignes.map((l, idx) => {
                  const { transport, dechargement, prixRevient } = calcLigne(l);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className={tdCell}>
                        <input type="text" value={l.reference ?? ""} onChange={(e) => updateLigne(idx, { reference: e.target.value })}
                          className="w-16 rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-brand-blue" />
                      </td>
                      <td className={tdCell}>
                        <input type="text" value={l.designation} onChange={(e) => updateLigne(idx, { designation: e.target.value })}
                          className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-brand-blue" placeholder="Désignation…" />
                      </td>
                      <td className={tdCell}>
                        <input type="text" value={l.unite ?? ""} onChange={(e) => updateLigne(idx, { unite: e.target.value })}
                          className="w-12 rounded border border-slate-200 px-1.5 py-1 text-xs outline-none focus:border-brand-blue" placeholder="m²" />
                      </td>
                      <td className={tdCell}>{numInput(l.prixAchatHT, (v) => updateLigne(idx, { prixAchatHT: v ?? 0 }))}</td>
                      <td className={`${tdCell} bg-blue-50/30`}>{numInput(l.transportKm, (v) => updateLigne(idx, { transportKm: v }))}</td>
                      <td className={`${tdCell} bg-blue-50/30`}>{numInput(l.transportPU, (v) => updateLigne(idx, { transportPU: v }))}</td>
                      <td className={`${tdCell} bg-blue-50/30 text-right font-medium`}>{transport > 0 ? transport.toFixed(2) : "—"}</td>
                      <td className={`${tdCell} bg-amber-50/30`}>{numInput(l.dechargementH, (v) => updateLigne(idx, { dechargementH: v }))}</td>
                      <td className={`${tdCell} bg-amber-50/30`}>{numInput(l.dechargementDH, (v) => updateLigne(idx, { dechargementDH: v }))}</td>
                      <td className={`${tdCell} bg-amber-50/30 text-right font-medium`}>{dechargement > 0 ? dechargement.toFixed(2) : "—"}</td>
                      <td className={tdCell}>{numInput(l.pertesPercent, (v) => updateLigne(idx, { pertesPercent: v }), "0")}</td>
                      <td className={`${tdCell} text-right font-bold text-brand-navy`}>{prixRevient > 0 ? prixRevient.toFixed(4) : "—"}</td>
                      <td className={`${tdCell} text-center`}>
                        <button type="button" onClick={() => removeLigne(idx)}
                          className="text-red-400 hover:text-red-600 font-bold text-base leading-none" title="Supprimer">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="p-3 border-t border-slate-100">
              <button type="button" onClick={addLigne}
                className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-xs font-medium text-slate-500 hover:border-brand-blue hover:text-brand-blue transition">
                + Ajouter matériau
              </button>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm font-medium text-brand-navy">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              className={`${inputClasses} resize-none`} placeholder="Remarques, conditions de transport, fournisseurs…" />
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

          <button type="button" onClick={handleSave} disabled={isPending}
            className="w-full rounded-lg bg-gradient-to-r from-brand-orange to-brand-orange-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 disabled:opacity-60">
            {isPending ? "Enregistrement…" : saved ? "✓ Enregistré !" : "💾 Enregistrer"}
          </button>

          <button type="button" onClick={() => handlePrint(false)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 w-full justify-center">
            👁 Aperçu PDF
          </button>

          <button type="button" onClick={() => handlePrint(true)}
            className="flex items-center gap-2 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-4 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue/10 w-full justify-center">
            🖨 Imprimer / Enregistrer PDF
          </button>

          <DeleteButton action={supprimerCoutMateriaux.bind(null, doc.id)} confirmMessage={`Supprimer le document ${doc.numero} ?`}>
            Supprimer
          </DeleteButton>

          {/* Liaisons */}
          {(chantierActuel || devisActuel) && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
              <p className="mb-2 font-semibold text-slate-600 uppercase tracking-wide text-[10px]">Liaisons modules</p>
              <div className="flex flex-col gap-1.5">
                {chantierActuel && (
                  <Link href={`/chantiers/${chantierActuel.id}`} className="flex items-center gap-1 text-brand-blue hover:underline">
                    <ExternalLink className="h-3 w-3" /> Chantier : {chantierActuel.reference}
                  </Link>
                )}
                {chantierActuel?.clientId && (
                  <Link href={`/clients/${chantierActuel.clientId}`} className="flex items-center gap-1 text-brand-blue hover:underline">
                    <ExternalLink className="h-3 w-3" /> Client associé
                  </Link>
                )}
                {devisActuel && (
                  <Link href={`/devis/${devisActuel.id}`} className="flex items-center gap-1 text-brand-blue hover:underline">
                    <ExternalLink className="h-3 w-3" /> Devis : {devisActuel.numero}
                  </Link>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </FullscreenToggle>
  );
}
