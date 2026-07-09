"use client";

import React, { useActionState, useState, startTransition } from "react";
import {
  Plus, Trash2, ChevronUp, ChevronDown, BookOpen, Save, Search, X, Eye, EyeOff,
} from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { formatEuros } from "@/lib/format";
import { CORPS_ETAT_CODES, CORPS_ETAT_LABELS, type CorpsEtatCode } from "@/lib/corps-etat";
import { saveOuvrageFromDevis } from "@/lib/actions/ouvrages";
import type { DevisLignesState } from "@/lib/actions/devis";
import type { DevisLigne } from "@/generated/prisma/client";
import { computeSousTotaux } from "@/lib/devis-subtotals";

type LigneType = "CHAPITRE" | "SOUS_CHAPITRE" | "LIGNE" | "CLAUSE_RESERVE";

type LigneRow = {
  key: string;
  type: LigneType;
  codeArticle: string;
  designation: string;
  unite: string;
  quantite: string;
  prixUnitaireHT: string;
  coutUnitaireDS: string; // Déboursé sec unitaire — interne, non visible dans le PDF
  remise: string;
  tauxTVA: string;
  styleTexte: string; // JSON StyleTexte
  clausesReserves: string; // JSON string[]
  sousTotalMasque: boolean; // CHAPITRE/SOUS_CHAPITRE : masque l'affichage du sous-total
  sousTotalManuel: string; // CHAPITRE/SOUS_CHAPITRE : si renseigné, remplace le sous-total calculé
};

export type OuvrageRow = {
  id: string;
  code: string;
  corpsEtat: string;
  designation: string;
  unite: string;
  tauxTVA: number;
  description: string | null;
  // 3 offres
  ecoPrixTotal:  number;
  optPrixTotal:  number;
  premPrixTotal: number;
  // Rétro-compat (= offre optimisée)
  prixUnitaire:   number;
  prixFourniture: number;
  prixPose:       number;
  styleTexte?: string | null; // JSON StyleTexte (mise en forme de la désignation)
  clausesReserves?: string | null; // JSON string[] — pré-remplies depuis la BPU
};

type Action = (prevState: DevisLignesState, formData: FormData) => Promise<DevisLignesState>;

let keyCounter = 0;
function newKey() { keyCounter += 1; return `new-${keyCounter}`; }

function toRow(ligne: DevisLigne): LigneRow {
  return {
    key: ligne.id,
    type: ligne.type as LigneType,
    codeArticle: ligne.codeArticle ?? "",
    designation: ligne.designation,
    unite: ligne.unite ?? "",
    quantite: ligne.quantite != null ? String(ligne.quantite) : "",
    prixUnitaireHT: ligne.prixUnitaireHT != null ? String(ligne.prixUnitaireHT) : "",
    coutUnitaireDS: (ligne as DevisLigne & { coutUnitaireDS?: number | null }).coutUnitaireDS != null
      ? String((ligne as DevisLigne & { coutUnitaireDS?: number | null }).coutUnitaireDS)
      : "",
    remise: ligne.remise != null ? String(ligne.remise) : "0",
    tauxTVA: ligne.tauxTVA != null ? String(ligne.tauxTVA) : "20",
    styleTexte: (ligne as DevisLigne & { styleTexte?: string }).styleTexte ?? "{}",
    clausesReserves: (ligne as DevisLigne & { clausesReserves?: string | null }).clausesReserves ?? "[]",
    sousTotalMasque: (ligne as DevisLigne & { sousTotalMasque?: boolean }).sousTotalMasque ?? false,
    sousTotalManuel: (ligne as DevisLigne & { sousTotalManuel?: number | null }).sousTotalManuel != null
      ? String((ligne as DevisLigne & { sousTotalManuel?: number | null }).sousTotalManuel)
      : "",
  };
}

function emptyRow(type: LigneType): LigneRow {
  return {
    key: newKey(), type, codeArticle: "", designation: "",
    unite: "", quantite: "", prixUnitaireHT: "", coutUnitaireDS: "", remise: "0", tauxTVA: "20",
    styleTexte: "{}", clausesReserves: "[]", sousTotalMasque: false, sousTotalManuel: "",
  };
}

function rowFromOuvrage(o: OuvrageRow, offreKey: "eco" | "opt" | "prem" = "opt"): LigneRow {
  const prix = offreKey === "eco" ? o.ecoPrixTotal : offreKey === "prem" ? o.premPrixTotal : o.optPrixTotal;
  return {
    key: newKey(),
    type: "LIGNE",
    codeArticle: o.code,
    designation: o.designation,
    unite: o.unite,
    quantite: "1",
    prixUnitaireHT: String(prix),
    coutUnitaireDS: "",
    remise: "0",
    tauxTVA: String(o.tauxTVA),
    styleTexte: o.styleTexte ?? "{}",
    clausesReserves: o.clausesReserves && o.clausesReserves !== "[]" ? o.clausesReserves : "[]",
    sousTotalMasque: false,
    sousTotalManuel: "",
  };
}

function lineTotal(row: LigneRow) {
  const q = parseFloat(row.quantite);
  const pu = parseFloat(row.prixUnitaireHT);
  if (Number.isNaN(q) || Number.isNaN(pu)) return 0;
  const remise = parseFloat(row.remise);
  const facteurRemise = Number.isNaN(remise) ? 1 : 1 - remise / 100;
  return Math.round(q * pu * facteurRemise * 100) / 100;
}

function lineDS(row: LigneRow) {
  const q = parseFloat(row.quantite);
  const ds = parseFloat(row.coutUnitaireDS);
  if (Number.isNaN(q) || Number.isNaN(ds)) return 0;
  return Math.round(q * ds * 100) / 100;
}

function lineMarge(row: LigneRow) {
  if (row.coutUnitaireDS === "") return null;
  const pv = lineTotal(row);
  const ds = lineDS(row);
  return Math.round((pv - ds) * 100) / 100;
}

function computeSubtotals(rows: LigneRow[]) {
  return computeSousTotaux(rows, lineTotal);
}

function computeNumbering(rows: LigneRow[]) {
  let chapitre = 0, sousChapitre = 0, ligne = 0;
  return rows.map((row) => {
    if (row.type === "CHAPITRE") { chapitre++; sousChapitre = 0; ligne = 0; return `${chapitre}`; }
    if (row.type === "SOUS_CHAPITRE") { sousChapitre++; ligne = 0; return `${chapitre || 1}.${sousChapitre}`; }
    if (row.type === "CLAUSE_RESERVE") return "";
    ligne++;
    return sousChapitre > 0 ? `${chapitre || 1}.${sousChapitre}.${ligne}` : `${chapitre || 1}.${ligne}`;
  });
}

const typeLabels: Record<LigneType, string> = {
  CHAPITRE: "Titre", SOUS_CHAPITRE: "Sous-titre", LIGNE: "Ligne", CLAUSE_RESERVE: "Clause et réserve",
};

// ─── Picker BPU ──────────────────────────────────────────────────────────────

const BPU_OFFRES = [
  { key: "eco"  as const, label: "Éco",    short: "Éco",     color: "bg-emerald-600 hover:bg-emerald-700" },
  { key: "opt"  as const, label: "Optimisée", short: "Opt",  color: "bg-blue-600 hover:bg-blue-700"     },
  { key: "prem" as const, label: "Premium", short: "Prem",   color: "bg-violet-600 hover:bg-violet-700" },
] as const;

function BpuPicker({
  ouvrages,
  onInsert,
  onClose,
}: {
  ouvrages: OuvrageRow[];
  onInsert: (o: OuvrageRow, offre: "eco" | "opt" | "prem") => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  const [corps, setCorps] = useState("");

  const filtered = ouvrages.filter((o) => {
    const matchCorps = !corps || o.corpsEtat === corps;
    const matchQ =
      !q ||
      o.designation.toLowerCase().includes(q.toLowerCase()) ||
      o.code.toLowerCase().includes(q.toLowerCase());
    return matchCorps && matchQ;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-brand-navy">Bibliothèque d'ouvrages (BPU)</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher…"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              autoFocus
            />
          </div>
          <select
            value={corps}
            onChange={(e) => setCorps(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="">Tous les corps d'état</option>
            {CORPS_ETAT_CODES.map((c) => (
              <option key={c} value={c}>{c} — {CORPS_ETAT_LABELS[c]}</option>
            ))}
          </select>
        </div>

        {/* Légende des offres */}
        <div className="flex gap-2 flex-wrap">
          {BPU_OFFRES.map((of) => (
            <span key={of.key} className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white ${of.color}`}>
              {of.label}
            </span>
          ))}
          <span className="text-[10px] text-slate-400 self-center">Cliquez sur le niveau souhaité pour insérer le prix correspondant</span>
        </div>

        <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-100">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Aucun ouvrage trouvé.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Désignation</th>
                  <th className="px-3 py-2 text-center">U</th>
                  <th className="px-3 py-2 text-right">P.U. réf.</th>
                  <th className="px-3 py-2 text-center" colSpan={3}>Insérer au prix</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500 whitespace-nowrap">{o.code}</td>
                    <td className="px-3 py-2">
                      <span className="font-medium text-slate-700">{o.designation}</span>
                      {o.description && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[200px]">{o.description}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center text-slate-500 whitespace-nowrap">{o.unite}</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-600 whitespace-nowrap">
                      {o.prixUnitaire > 0 ? formatEuros(o.prixUnitaire) : <span className="text-slate-300">—</span>}
                    </td>
                    {BPU_OFFRES.map((of) => {
                      const prix = of.key === "eco" ? o.ecoPrixTotal : of.key === "prem" ? o.premPrixTotal : o.optPrixTotal;
                      return (
                        <td key={of.key} className="px-1.5 py-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => { onInsert(o, of.key); onClose(); }}
                            className={`inline-flex flex-col items-center rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-white transition ${of.color}`}
                          >
                            <span>{of.short}</span>
                            <span className="font-normal opacity-90">{formatEuros(prix)}</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="text-xs text-slate-400">
          {filtered.length} ouvrage{filtered.length !== 1 ? "s" : ""} affiché{filtered.length !== 1 ? "s" : ""}
          {ouvrages.length !== filtered.length && ` sur ${ouvrages.length}`}
        </p>
      </div>
    </div>
  );
}

// ─── Popover Save-to-BPU ─────────────────────────────────────────────────────

function SaveToBpuPopover({
  row,
  onSaved,
  onClose,
}: {
  row: LigneRow;
  onSaved: (code: string) => void;
  onClose: () => void;
}) {
  const [corpsEtat, setCorpsEtat] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pu = parseFloat(row.prixUnitaireHT) || 0;

  function handleSave() {
    if (!corpsEtat) { setError("Sélectionnez un corps d'état."); return; }
    if (!row.designation) { setError("La désignation est vide."); return; }
    setSaving(true);
    startTransition(async () => {
      try {
        const result = await saveOuvrageFromDevis({
          corpsEtat,
          designation: row.designation,
          unite: row.unite || "u",
          prixFourniture: pu,
          prixPose: 0,
          prixUnitaire: pu,
          tauxTVA: parseFloat(row.tauxTVA) || 20,
          description: undefined,
          styleTexte: row.styleTexte,
        });
        onSaved(result.code);
        onClose();
      } catch {
        setError("Erreur lors de l'enregistrement.");
        setSaving(false);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-brand-navy">Enregistrer dans la bibliothèque</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-1 text-sm font-medium text-slate-700">{row.designation || "—"}</p>
        <p className="mb-4 text-sm text-slate-500">
          {row.unite || "u"} · {formatEuros(pu)} HT
        </p>
        <label className="mb-1 block text-xs font-medium text-slate-600">Corps d'état</label>
        <select
          value={corpsEtat}
          onChange={(e) => { setCorpsEtat(e.target.value); setError(null); }}
          className="mb-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        >
          <option value="">— Choisir —</option>
          {CORPS_ETAT_CODES.map((c) => (
            <option key={c} value={c}>{c} — {CORPS_ETAT_LABELS[c as CorpsEtatCode]}</option>
          ))}
        </select>
        {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark disabled:opacity-50 transition"
        >
          {saving ? "Enregistrement…" : "Enregistrer dans le BPU"}
        </button>
      </div>
    </div>
  );
}

// ─── Éditeur principal ───────────────────────────────────────────────────────

export function DevisLignesEditor({
  lignes,
  action,
  ouvrages = [],
}: {
  lignes: DevisLigne[];
  action: Action;
  ouvrages?: OuvrageRow[];
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [rows, setRows] = useState<LigneRow[]>(() =>
    lignes.length > 0 ? [...lignes].sort((a, b) => a.ordre - b.ordre).map(toRow) : [emptyRow("CHAPITRE")],
  );
  const [bpuPickerOpen, setBpuPickerOpen] = useState(false);
  const [savePopoverRow, setSavePopoverRow] = useState<LigneRow | null>(null);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [clausesOpen, setClausesOpen] = useState<Set<string>>(new Set());
  const [showDS, setShowDS] = useState(() => {
    try { return localStorage.getItem("devis-showDS") === "1"; } catch { return false; }
  });

  function toggleClauses(key: string) {
    setClausesOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function parseClauses(json: string): string[] {
    try { return JSON.parse(json) as string[]; } catch { return []; }
  }

  function addClause(key: string) {
    setRows((cur) => cur.map((r) => {
      if (r.key !== key) return r;
      const clauses = parseClauses(r.clausesReserves);
      return { ...r, clausesReserves: JSON.stringify([...clauses, ""]) };
    }));
  }

  function updateClause(key: string, idx: number, value: string) {
    setRows((cur) => cur.map((r) => {
      if (r.key !== key) return r;
      const clauses = parseClauses(r.clausesReserves);
      clauses[idx] = value;
      return { ...r, clausesReserves: JSON.stringify(clauses) };
    }));
  }

  function removeClause(key: string, idx: number) {
    setRows((cur) => cur.map((r) => {
      if (r.key !== key) return r;
      const clauses = parseClauses(r.clausesReserves);
      clauses.splice(idx, 1);
      return { ...r, clausesReserves: JSON.stringify(clauses) };
    }));
  }

  function update(key: string, patch: Partial<LigneRow>) {
    setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow(type: LigneType) { setRows((cur) => [...cur, emptyRow(type)]); }

  function removeRow(key: string) {
    setRows((cur) => (cur.length > 1 ? cur.filter((r) => r.key !== key) : cur));
    if (selectedRowKey === key) setSelectedRowKey(null);
  }

  function moveRow(key: string, direction: -1 | 1) {
    setRows((cur) => {
      const i = cur.findIndex((r) => r.key === key);
      const t = i + direction;
      if (t < 0 || t >= cur.length) return cur;
      const next = [...cur];
      [next[i], next[t]] = [next[t], next[i]];
      return next;
    });
  }

  function insertFromBpu(o: OuvrageRow, offre: "eco" | "opt" | "prem" = "opt") {
    setRows((cur) => [...cur, rowFromOuvrage(o, offre)]);
  }

  const numbering = computeNumbering(rows);
  const subtotals = computeSubtotals(rows);

  let totalHT = 0;
  let totalDS = 0;
  const tvaParTaux = new Map<string, { base: number; tva: number }>();
  rows.forEach((row) => {
    if (row.type === "LIGNE") {
      const total = lineTotal(row);
      if (total !== 0) {
        totalHT += total;
        const taux = row.tauxTVA || "20";
        const entry = tvaParTaux.get(taux) ?? { base: 0, tva: 0 };
        entry.base += total;
        entry.tva += total * (parseFloat(taux) / 100);
        tvaParTaux.set(taux, entry);
      }
      totalDS += lineDS(row);
    }
  });
  totalHT = Math.round(totalHT * 100) / 100;
  totalDS = Math.round(totalDS * 100) / 100;
  const margeGlobale = Math.round((totalHT - totalDS) * 100) / 100;
  const coefficientK = totalDS > 0 ? Math.round((totalHT / totalDS) * 100) / 100 : null;
  const totalTVA = Math.round(Array.from(tvaParTaux.values()).reduce((s, v) => s + v.tva, 0) * 100) / 100;
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100;

  const payload = JSON.stringify(
    rows.map((row) => ({
      type: row.type,
      codeArticle: row.type === "LIGNE" && row.codeArticle ? row.codeArticle : null,
      designation: row.designation,
      unite: row.type === "LIGNE" && row.unite ? row.unite : null,
      quantite: row.type === "LIGNE" && row.quantite !== "" ? Number(row.quantite) : null,
      prixUnitaireHT: row.type === "LIGNE" && row.prixUnitaireHT !== "" ? Number(row.prixUnitaireHT) : null,
      coutUnitaireDS: row.type === "LIGNE" && row.coutUnitaireDS !== "" ? Number(row.coutUnitaireDS) : null,
      remise: row.type === "LIGNE" && row.remise !== "" ? Number(row.remise) : null,
      tauxTVA: row.type === "LIGNE" && row.tauxTVA !== "" ? Number(row.tauxTVA) : null,
      styleTexte: row.styleTexte,
      clausesReserves: parseClauses(row.clausesReserves).length > 0 ? row.clausesReserves : null,
      sousTotalMasque: row.sousTotalMasque,
      sousTotalManuel: row.sousTotalManuel !== "" ? Number(row.sousTotalManuel) : null,
    })),
  );

  return (
    <>
      {bpuPickerOpen && (
        <BpuPicker
          ouvrages={ouvrages}
          onInsert={insertFromBpu}
          onClose={() => setBpuPickerOpen(false)}
        />
      )}
      {savePopoverRow && (
        <SaveToBpuPopover
          row={savePopoverRow}
          onSaved={(code) => update(savePopoverRow.key, { codeArticle: code })}
          onClose={() => setSavePopoverRow(null)}
        />
      )}

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="lignes" value={payload} />

        <p className="text-xs text-slate-400">
          Chaque désignation a son propre éditeur : sélectionnez un mot ou une phrase à l&apos;intérieur du texte pour lui appliquer gras / italique / taille / couleur, indépendamment du reste de la ligne.
        </p>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-10 px-3 py-2">N°</th>
                <th className="w-28 px-3 py-2">Type</th>
                <th className="w-28 px-3 py-2">Code article</th>
                <th className="px-3 py-2">Désignation</th>
                <th className="w-24 whitespace-nowrap px-3 py-2">Unité</th>
                <th className="w-28 whitespace-nowrap px-3 py-2">Quantité</th>
                <th className="w-32 whitespace-nowrap px-3 py-2">PU HT €</th>
                <th className="w-32 whitespace-nowrap px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setShowDS((v) => {
                      const next = !v;
                      try { localStorage.setItem("devis-showDS", next ? "1" : "0"); } catch {}
                      return next;
                    })}
                    title={showDS ? "Masquer les déboursés secs" : "Afficher les déboursés secs (DS)"}
                    className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-500 hover:text-brand-navy transition"
                  >
                    {showDS ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    DS €
                  </button>
                </th>
                <th className="w-24 whitespace-nowrap px-3 py-2">Remise %</th>
                <th className="w-24 whitespace-nowrap px-3 py-2">TVA %</th>
                <th className="w-32 px-3 py-2 text-right">Prix de vente HT</th>
                <th className="w-28 px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, index) => {
                const isSelected = selectedRowKey === row.key;
                const clauses = parseClauses(row.clausesReserves);

                return (
                  <React.Fragment key={row.key}>
                  <tr
                    onClick={() => setSelectedRowKey(row.key)}
                    className={[
                      "cursor-pointer transition-colors",
                      row.type === "CHAPITRE" ? "bg-brand-navy/5 font-semibold text-brand-navy" : "",
                      row.type === "SOUS_CHAPITRE" ? "bg-slate-50 font-medium text-slate-700" : "",
                      row.type === "CLAUSE_RESERVE" ? "bg-red-50/60 font-medium text-red-700" : "",
                      isSelected ? "ring-2 ring-inset ring-brand-blue/40" : "hover:bg-blue-50/30",
                    ].filter(Boolean).join(" ")}
                  >
                    <td className="px-3 py-2 align-top text-slate-400">{numbering[index]}</td>
                    <td className="px-3 py-2 align-top">
                      <select
                        value={row.type}
                        onChange={(e) => update(row.key, { type: e.target.value as LigneType })}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs"
                      >
                        {Object.entries(typeLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </td>
                    {row.type === "LIGNE" ? (
                      <td className="px-3 py-2 align-top">
                        <input
                          value={row.codeArticle}
                          onChange={(e) => update(row.key, { codeArticle: e.target.value })}
                          onClick={(e) => e.stopPropagation()}
                          placeholder="Code"
                          className="w-full rounded-md border border-slate-200 px-2 py-1 text-sm"
                        />
                      </td>
                    ) : (
                      <td className="px-3 py-2 align-top"></td>
                    )}
                    <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
                      <div style={{ paddingLeft: row.type === "LIGNE" ? "1.25rem" : row.type === "SOUS_CHAPITRE" ? "0.625rem" : "0" }} className="min-w-[280px]">
                        <RichTextEditor
                          value={row.designation}
                          onChange={(html) => update(row.key, { designation: html })}
                          rows={row.type === "CLAUSE_RESERVE" ? 3 : 2}
                          placeholder={
                            row.type === "CHAPITRE"
                              ? "Intitulé du titre"
                              : row.type === "SOUS_CHAPITRE"
                                ? "Intitulé du sous-titre"
                                : row.type === "CLAUSE_RESERVE"
                                  ? "Saisir la clause ou réserve…"
                                  : "Désignation / descriptif de l'ouvrage"
                          }
                          className={row.type === "CLAUSE_RESERVE" ? "border-red-200" : ""}
                        />
                      </div>
                    </td>
                    {row.type === "LIGNE" ? (
                      <>
                        <td className="px-3 py-2 align-top">
                          <input
                            value={row.unite}
                            onChange={(e) => update(row.key, { unite: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            placeholder="m², u…"
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number" step="0.01"
                            value={row.quantite}
                            onChange={(e) => update(row.key, { quantite: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number" step="0.01"
                            value={row.prixUnitaireHT}
                            onChange={(e) => update(row.key, { prixUnitaireHT: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                          />
                        </td>
                        {showDS ? (
                          <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number" step="0.01"
                              value={row.coutUnitaireDS}
                              onChange={(e) => update(row.key, { coutUnitaireDS: e.target.value })}
                              placeholder="DS/u"
                              title="Déboursé sec unitaire (coût de revient interne — non imprimé)"
                              className="w-full rounded-md border border-amber-300 bg-amber-50/60 px-2 py-2 text-sm placeholder:text-amber-300"
                            />
                            {lineMarge(row) !== null && (
                              <div className={`mt-0.5 text-right text-[10px] font-medium ${lineMarge(row)! >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                                marge {lineMarge(row)! >= 0 ? "+" : ""}{formatEuros(lineMarge(row)!)}
                              </div>
                            )}
                          </td>
                        ) : (
                          <td className="px-3 py-2 align-top"></td>
                        )}
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number" step="0.1"
                            value={row.remise}
                            onChange={(e) => update(row.key, { remise: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="number" step="0.1"
                            value={row.tauxTVA}
                            onChange={(e) => update(row.key, { tauxTVA: e.target.value })}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                          />
                        </td>
                        <td className="px-3 py-2 text-right align-top font-medium text-slate-700">
                          {formatEuros(lineTotal(row))}
                        </td>
                      </>
                    ) : row.type === "CLAUSE_RESERVE" ? (
                      <td className="px-3 py-2" colSpan={7}></td>
                    ) : (
                      <>
                        <td className="px-3 py-2" colSpan={6}></td>
                        <td className="px-3 py-2 align-top" onClick={(e) => e.stopPropagation()}>
                          {!row.sousTotalMasque && (
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="whitespace-nowrap text-xs text-slate-400">Sous-total :</span>
                              <input
                                type="number" step="0.01"
                                value={row.sousTotalManuel}
                                onChange={(e) => update(row.key, { sousTotalManuel: e.target.value })}
                                placeholder={subtotals[index].toFixed(2)}
                                title="Laisser vide pour le calcul automatique"
                                className="w-24 rounded-md border border-slate-200 px-2 py-1 text-right text-sm text-slate-700"
                              />
                              <span className="text-xs text-slate-400">€</span>
                            </div>
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2 align-top">
                      <div className="flex items-center justify-end gap-1">
                        {(row.type === "CHAPITRE" || row.type === "SOUS_CHAPITRE") && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); update(row.key, { sousTotalMasque: !row.sousTotalMasque }); }}
                            title={row.sousTotalMasque ? "Afficher le sous-total" : "Masquer le sous-total"}
                            className={`rounded p-1 transition ${
                              row.sousTotalMasque ? "text-slate-300 hover:bg-slate-100" : "text-brand-blue hover:bg-brand-blue/10"
                            }`}
                          >
                            {row.sousTotalMasque ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        )}
                        {/* Bouton Clauses et Réserves */}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleClauses(row.key); }}
                          title="Clauses et Réserves"
                          className={`rounded px-1.5 py-1 text-[10px] font-bold transition ${
                            clausesOpen.has(row.key) || parseClauses(row.clausesReserves).length > 0
                              ? "bg-red-100 text-red-600 hover:bg-red-200"
                              : "text-slate-400 hover:bg-slate-100"
                          }`}
                        >
                          C&R{parseClauses(row.clausesReserves).length > 0 ? ` (${parseClauses(row.clausesReserves).length})` : ""}
                        </button>
                        {row.type === "LIGNE" && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setSavePopoverRow(row); }}
                            title="Enregistrer dans la bibliothèque BPU"
                            className="rounded p-1 text-brand-blue hover:bg-brand-blue/10"
                          >
                            <Save className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveRow(row.key, -1); }}
                          disabled={index === 0}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                          aria-label="Monter"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); moveRow(row.key, 1); }}
                          disabled={index === rows.length - 1}
                          className="rounded p-1 text-slate-400 hover:bg-slate-100 disabled:opacity-30"
                          aria-label="Descendre"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeRow(row.key); }}
                          className="rounded p-1 text-brand-orange-dark hover:bg-brand-orange/10"
                          aria-label="Supprimer la ligne"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* ── Panneau CLAUSES ET RÉSERVES ── */}
                  {clausesOpen.has(row.key) && (
                      <tr className="bg-red-50/60 border-b border-red-100">
                        <td colSpan={12} className="px-4 py-3">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <p className="text-[11px] font-bold uppercase tracking-widest text-red-700">
                                Clauses et Réserves
                              </p>
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); addClause(row.key); }}
                                className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition"
                              >
                                <Plus className="h-3 w-3" /> Ajouter une clause
                              </button>
                            </div>
                            {clauses.length === 0 ? (
                              <p className="text-xs text-red-400 italic">
                                Aucune clause — cliquez sur "Ajouter une clause" pour en saisir.
                              </p>
                            ) : (
                              <ul className="flex flex-col gap-1.5">
                                {clauses.map((clause, ci) => (
                                  <li key={ci} className="flex items-start gap-2">
                                    <span className="mt-2 text-red-400 text-xs">•</span>
                                    <input
                                      type="text"
                                      value={clause}
                                      onChange={(e) => { e.stopPropagation(); updateClause(row.key, ci, e.target.value); }}
                                      onClick={(e) => e.stopPropagation()}
                                      placeholder="Saisir la clause ou réserve…"
                                      className="flex-1 rounded border border-red-200 bg-white px-2 py-1 text-xs italic text-red-700 placeholder:text-red-300 focus:border-red-400 focus:outline-none focus:ring-1 focus:ring-red-300"
                                    />
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); removeClause(row.key, ci); }}
                                      className="mt-0.5 rounded p-1 text-red-300 hover:bg-red-100 hover:text-red-500 transition"
                                      title="Supprimer cette clause"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </td>
                      </tr>
                  )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => addRow("CHAPITRE")}
            className="inline-flex items-center gap-1 rounded-lg border border-brand-navy/30 bg-brand-navy/5 px-3 py-1.5 text-xs font-semibold text-brand-navy hover:bg-brand-navy/10"
          >
            <Plus className="h-3.5 w-3.5" /> Titre (niveau 1)
          </button>
          <button
            type="button"
            onClick={() => addRow("SOUS_CHAPITRE")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" /> Sous-titre (niveau 2)
          </button>
          <button
            type="button"
            onClick={() => addRow("LIGNE")}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Plus className="h-3.5 w-3.5" /> Ligne de détail
          </button>
          <button
            type="button"
            onClick={() => addRow("CLAUSE_RESERVE")}
            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100"
          >
            <Plus className="h-3.5 w-3.5" /> Clause et réserve
          </button>
          {ouvrages.length > 0 && (
            <button
              type="button"
              onClick={() => setBpuPickerOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-3 py-1.5 text-xs font-semibold text-brand-blue-dark hover:bg-brand-blue/10"
            >
              <BookOpen className="h-3.5 w-3.5" /> Depuis la bibliothèque BPU
            </button>
          )}
        </div>

        {/* Récapitulatif */}
        <div className="flex flex-col items-end gap-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex w-full max-w-xs justify-between text-sm text-slate-600">
            <span>Total HT</span>
            <span className="font-medium">{formatEuros(totalHT)}</span>
          </div>
          {Array.from(tvaParTaux.entries()).map(([taux, { base, tva }]) => (
            <div key={taux} className="flex w-full max-w-xs justify-between text-sm text-slate-500">
              <span>dont TVA {taux} % (sur {formatEuros(base)})</span>
              <span>{formatEuros(tva)}</span>
            </div>
          ))}
          <div className="flex w-full max-w-xs justify-between border-t border-slate-100 pt-1 text-base font-bold text-brand-navy">
            <span>Total TTC</span>
            <span>{formatEuros(totalTTC)}</span>
          </div>
          {totalDS > 0 && (
            <div className="mt-3 w-full max-w-xs rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 flex flex-col gap-1">
              <div className="flex justify-between text-xs text-amber-700">
                <span>Total DS (déboursé sec)</span>
                <span className="font-semibold">{formatEuros(totalDS)}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-700">
                <span>Marge brute</span>
                <span className={`font-semibold ${margeGlobale >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                  {margeGlobale >= 0 ? "+" : ""}{formatEuros(margeGlobale)}{" "}
                  {totalHT > 0 && (
                    <span className="font-normal text-[10px]">({Math.round((margeGlobale / totalHT) * 1000) / 10} %)</span>
                  )}
                </span>
              </div>
              {coefficientK !== null && (
                <div className="flex justify-between text-xs text-amber-700">
                  <span>Coefficient K (PV/DS)</span>
                  <span className="font-semibold">{coefficientK.toFixed(2)}</span>
                </div>
              )}
              <p className="text-[10px] text-amber-500 italic mt-0.5">Données internes — non imprimées sur le devis client</p>
            </div>
          )}
        </div>

        {state?.error && <p className="text-sm text-brand-orange-dark">{state.error}</p>}

        <div className="flex justify-end">
          <SubmitButton pendingLabel="Enregistrement…">Enregistrer le métré</SubmitButton>
        </div>
      </form>
    </>
  );
}
