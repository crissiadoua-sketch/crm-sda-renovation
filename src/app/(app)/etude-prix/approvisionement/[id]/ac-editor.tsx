"use client";

import { useState, useTransition, useCallback } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { inputClasses, selectClasses } from "@/components/ui/fields";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import {
  sauvegarderApprovisionement,
  supprimerApprovisionement,
} from "@/lib/actions/approvisionement";

type LigneData = {
  ordre: number; lot: string; designation: string; rendementConso: number | null;
  uniteRendement: string; qteARealiser: number | null; uniteQteARealiser: string;
  pertesPercent: number | null; unite: string; conditionnement: string;
  aCommander: string; articleStockId: string | null;
};

type Doc = {
  id: string; numero: string; titre: string | null; chantierId: string | null;
  devisId: string | null; responsable: string | null; notes: string | null; date: string;
  lignes: {
    id: string; ordre: number; lot: string | null; designation: string;
    rendementConso: number | null; uniteRendement: string | null; qteARealiser: number | null;
    uniteQteARealiser: string | null; besoinsMateriau: number | null; pertesPercent: number | null;
    unite: string | null; besoinsApresPertes: number | null; conditionnement: string | null;
    aCommander: string | null; articleStockId: string | null;
  }[];
};

type Chantier = { id: string; nom: string; reference: string; clientId?: string | null };
type DevisItem = { id: string; numero: string; objet: string | null; chantierId?: string | null };

function numInput(value: number | null | undefined, onChange: (v: number | null) => void, placeholder = "") {
  return (
    <input type="number" step="any" value={value ?? ""}
      onChange={(e) => onChange(e.target.value === "" ? null : parseFloat(e.target.value))}
      placeholder={placeholder}
      className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-right text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20"
    />
  );
}

function strInput(value: string, onChange: (v: string) => void, placeholder = "", width = "w-full") {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className={`${width} rounded border border-slate-200 bg-white px-1.5 py-1 text-xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/20`}
    />
  );
}

function groupByLot(lignes: LigneData[]) {
  const groups: { lot: string; lignes: { idx: number; ligne: LigneData }[] }[] = [];
  lignes.forEach((ligne, idx) => {
    const lot = ligne.lot || "";
    const existing = groups.find((g) => g.lot === lot);
    if (existing) { existing.lignes.push({ idx, ligne }); }
    else { groups.push({ lot, lignes: [{ idx, ligne }] }); }
  });
  return groups;
}

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 10px; color: #1e293b; margin: 0; padding: 16px; }
  h1 { font-size: 15px; color: #1E2F6E; border-bottom: 2px solid #1E2F6E; padding-bottom: 5px; margin: 0 0 10px; }
  .meta { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 10px; }
  .meta-label { font-weight: 700; color: #475569; margin-right: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9px; }
  th { background: #1E2F6E; color: #fff; padding: 4px 6px; text-align: center; border: 1px solid #cbd5e1; white-space: nowrap; }
  th.navy { background: #1E2F6E; }
  td { border: 1px solid #e2e8f0; padding: 3px 6px; }
  td.right { text-align: right; font-family: monospace; }
  td.besoins { background: #f0f9ff; text-align: right; font-weight: 700; color: #1E2F6E; }
  tr.lot-row td { background: #eef2ff; font-weight: 700; color: #1E2F6E; padding: 4px 8px; }
  tfoot td { font-weight: 700; background: #f8fafc; border-top: 2px solid #94a3b8; }
  .notes { margin-top: 10px; padding: 8px; background: #fefce8; border-left: 3px solid #ca8a04; }
  .footer { margin-top: 16px; font-size: 8px; color: #94a3b8; text-align: right; }
  @page { margin: 10mm; }
`;

export function AcEditor({
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

  const [lignes, setLignes] = useState<LigneData[]>(
    doc.lignes.map((l) => ({
      ordre: l.ordre, lot: l.lot ?? "", designation: l.designation,
      rendementConso: l.rendementConso, uniteRendement: l.uniteRendement ?? "",
      qteARealiser: l.qteARealiser, uniteQteARealiser: l.uniteQteARealiser ?? "",
      pertesPercent: l.pertesPercent, unite: l.unite ?? "",
      conditionnement: l.conditionnement ?? "", aCommander: l.aCommander ?? "",
      articleStockId: l.articleStockId,
    }))
  );

  const [currentLot, setCurrentLot] = useState("");

  // ── Devis filtrés + liaisons ────────────────────────────────────────────
  const devisFiltres = chantierId
    ? devisList.filter((d) => !d.chantierId || d.chantierId === chantierId)
    : devisList;

  const chantierActuel = chantiers.find((c) => c.id === chantierId);
  const devisActuel = devisList.find((d) => d.id === devisId);

  function autoFillTitre(chId: string, dvId: string) {
    if (!chId || !dvId) return;
    setTitre((prev) => {
      if (prev) return prev;
      const ch = chantiers.find((c) => c.id === chId);
      const dv = devisList.find((d) => d.id === dvId);
      if (!dv) return prev;
      return dv.objet || (ch ? `${ch.reference} — ${dv.numero}` : dv.numero);
    });
  }

  function handleChantierChange(id: string) {
    setChantierId(id);
    if (devisId) {
      const dv = devisList.find((d) => d.id === devisId);
      if (dv?.chantierId && dv.chantierId !== id) setDevisId("");
    }
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
  const updateLigne = useCallback((idx: number, patch: Partial<LigneData>) => {
    setLignes((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }, []);

  function addLigne() {
    setLignes((prev) => [...prev, {
      ordre: prev.length + 1, lot: currentLot, designation: "", rendementConso: null,
      uniteRendement: "", qteARealiser: null, uniteQteARealiser: "", pertesPercent: null,
      unite: "", conditionnement: "", aCommander: "", articleStockId: null,
    }]);
  }

  function removeLigne(idx: number) {
    setLignes((prev) => prev.filter((_, i) => i !== idx).map((l, i) => ({ ...l, ordre: i + 1 })));
  }

  function handleSave() {
    startTransition(async () => {
      await sauvegarderApprovisionement(doc.id, {
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
    const groups = groupByLot(lignes);

    const tbody = groups.map((group) => {
      const lotRow = group.lot
        ? `<tr class="lot-row"><td colspan="11">Lot : ${group.lot}</td></tr>` : "";
      const lignesRows = group.lignes.map(({ ligne }) => {
        const besoins = (ligne.qteARealiser ?? 0) * (ligne.rendementConso ?? 1);
        const besoinsAP = besoins * (1 + (ligne.pertesPercent ?? 0) / 100);
        return `<tr>
          <td>${ligne.designation}${ligne.articleStockId ? ' <em style="color:#16a34a">[Stock]</em>' : ""}</td>
          <td class="right">${ligne.rendementConso ?? "—"}</td>
          <td>${ligne.uniteRendement || "—"}</td>
          <td class="right">${ligne.qteARealiser ?? "—"}</td>
          <td>${ligne.uniteQteARealiser || "—"}</td>
          <td class="besoins">${besoins > 0 ? besoins.toFixed(2) : "—"}</td>
          <td class="right">${ligne.pertesPercent != null ? ligne.pertesPercent + "%" : "0%"}</td>
          <td>${ligne.unite || "—"}</td>
          <td class="besoins">${besoinsAP > 0 ? besoinsAP.toFixed(2) : "—"}</td>
          <td>${ligne.conditionnement || "—"}</td>
          <td>${ligne.aCommander || "—"}</td>
        </tr>`;
      }).join("");
      return lotRow + lignesRows;
    }).join("");

    const lots = groups.filter((g) => g.lot).length;

    const html = `<!DOCTYPE html><html lang="fr"><head>
      <meta charset="utf-8">
      <title>AC ${doc.numero}</title>
      <style>${PRINT_CSS}</style>
      ${autoPrint ? `<script>window.onload=()=>{setTimeout(()=>window.print(),300)}<\/script>` : ""}
    </head><body>
      <h1>APPROVISIONNEMENT CHANTIER — ${doc.numero}</h1>
      <div class="meta">
        <div><span class="meta-label">Date :</span>${doc.date.slice(0, 10)}</div>
        <div><span class="meta-label">Titre :</span>${titre || "—"}</div>
        <div><span class="meta-label">Responsable :</span>${responsable || "—"}</div>
        <div><span class="meta-label">Chantier :</span>${chantierNom}</div>
        <div><span class="meta-label">Devis :</span>${devisLabel}</div>
      </div>
      <table>
        <thead><tr>
          <th style="min-width:120px">Matériaux</th>
          <th>Rend./Conso</th>
          <th>Unité rend.</th>
          <th>Qté à réaliser</th>
          <th>Unité qté</th>
          <th class="navy">Besoins</th>
          <th>Pertes %</th>
          <th>Unité résultat</th>
          <th class="navy">Besoins après pertes</th>
          <th>Conditionnement</th>
          <th>À commander</th>
        </tr></thead>
        <tbody>${tbody || '<tr><td colspan="11" style="text-align:center;font-style:italic">Aucune ligne</td></tr>'}</tbody>
        <tfoot><tr>
          <td colspan="9">Nb lignes : ${lignes.length} &nbsp;|&nbsp; Lots : ${lots} &nbsp;|&nbsp; Liés stock : ${lignes.filter(l => l.articleStockId).length}</td>
          <td colspan="2"></td>
        </tr></tfoot>
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

  const groups = groupByLot(lignes);
  const thCell = "border border-slate-300 bg-slate-100 px-2 py-1.5 text-center text-xs font-semibold text-slate-600 whitespace-nowrap";
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
                <input type="text" value={titre} onChange={(e) => setTitre(e.target.value)} className={inputClasses} placeholder="Ex: Maison neuve — béton gros œuvre" />
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

          {/* Tableau approvisionnement */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className={thCell} style={{ minWidth: 160 }}>Matériaux (désignation)</th>
                  <th className={thCell}>Rendement / Conso</th>
                  <th className={thCell}>Unité rend.</th>
                  <th className={thCell}>Qté à réaliser</th>
                  <th className={thCell}>Unité qté</th>
                  <th className={`${thCell} bg-brand-navy/10 text-brand-navy`}>Besoins matx.</th>
                  <th className={thCell}>Pertes %</th>
                  <th className={thCell}>Unité résultat</th>
                  <th className={`${thCell} bg-brand-navy/10 text-brand-navy`}>Besoins après pertes</th>
                  <th className={thCell}>Conditionnement</th>
                  <th className={thCell}>À commander</th>
                  <th className={thCell}></th>
                </tr>
              </thead>
              {groups.length === 0 && (
                <tbody>
                  <tr>
                    <td colSpan={12} className="py-6 text-center text-slate-400 italic">
                      Aucune ligne — cliquez sur &quot;+ Ajouter ligne&quot;
                    </td>
                  </tr>
                </tbody>
              )}
              {groups.map((group) => (
                <tbody key={group.lot || "__no_lot__"}>
                  {group.lot && (
                    <tr className="bg-brand-navy/5">
                      <td colSpan={12} className="px-3 py-1.5 text-xs font-bold text-brand-navy border border-slate-200">
                        Lot : {group.lot}
                      </td>
                    </tr>
                  )}
                  {group.lignes.map(({ idx, ligne }) => {
                    const besoins = (ligne.qteARealiser ?? 0) * (ligne.rendementConso ?? 1);
                    const besoinsAP = besoins * (1 + (ligne.pertesPercent ?? 0) / 100);
                    return (
                      <tr key={`row-${idx}`} className="hover:bg-slate-50">
                        <td className={tdCell}>
                          <div className="flex items-center gap-1">
                            {ligne.articleStockId && (<Badge tone="green" className="shrink-0">Stock</Badge>)}
                            {strInput(ligne.designation, (v) => updateLigne(idx, { designation: v }), "Désignation…")}
                          </div>
                        </td>
                        <td className={tdCell}>{numInput(ligne.rendementConso, (v) => updateLigne(idx, { rendementConso: v }))}</td>
                        <td className={tdCell}>{strInput(ligne.uniteRendement, (v) => updateLigne(idx, { uniteRendement: v }), "kg/m²", "w-16")}</td>
                        <td className={tdCell}>{numInput(ligne.qteARealiser, (v) => updateLigne(idx, { qteARealiser: v }))}</td>
                        <td className={tdCell}>{strInput(ligne.uniteQteARealiser, (v) => updateLigne(idx, { uniteQteARealiser: v }), "m²", "w-14")}</td>
                        <td className={`${tdCell} bg-brand-navy/5 text-right font-medium`}>{besoins > 0 ? besoins.toFixed(2) : "—"}</td>
                        <td className={tdCell}>{numInput(ligne.pertesPercent, (v) => updateLigne(idx, { pertesPercent: v }), "0")}</td>
                        <td className={tdCell}>{strInput(ligne.unite, (v) => updateLigne(idx, { unite: v }), "kg", "w-14")}</td>
                        <td className={`${tdCell} bg-brand-navy/5 text-right font-bold text-brand-navy`}>{besoinsAP > 0 ? besoinsAP.toFixed(2) : "—"}</td>
                        <td className={tdCell}>{strInput(ligne.conditionnement, (v) => updateLigne(idx, { conditionnement: v }), "Sacs 25kg")}</td>
                        <td className={tdCell}>{strInput(ligne.aCommander, (v) => updateLigne(idx, { aCommander: v }), "Ex: 10 sacs")}</td>
                        <td className={`${tdCell} text-center`}>
                          <button type="button" onClick={() => removeLigne(idx)}
                            className="text-red-400 hover:text-red-600 font-bold text-base leading-none" title="Supprimer">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
            <div className="flex items-center gap-3 p-3 border-t border-slate-100">
              <button type="button" onClick={addLigne}
                className="rounded-lg border border-dashed border-slate-300 px-4 py-2 text-xs font-medium text-slate-500 hover:border-brand-blue hover:text-brand-blue transition">
                + Ajouter ligne
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Lot actif :</span>
                <input type="text" value={currentLot} onChange={(e) => setCurrentLot(e.target.value)}
                  placeholder="Ex : 04 — Béton"
                  className="rounded border border-slate-200 px-2 py-1 text-xs outline-none focus:border-brand-blue w-40" />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <label className="mb-1 block text-sm font-medium text-brand-navy">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4}
              className={`${inputClasses} resize-none`} placeholder="Remarques, fournisseurs préférentiels, délais…" />
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
                <span className="text-slate-500">Lots</span>
                <span className="font-medium text-slate-700">{groups.filter((g) => g.lot).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Liés stock</span>
                <span className="font-medium text-slate-700">{lignes.filter((l) => l.articleStockId).length}</span>
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

          <DeleteButton action={supprimerApprovisionement.bind(null, doc.id)} confirmMessage={`Supprimer le document ${doc.numero} ?`}>
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
