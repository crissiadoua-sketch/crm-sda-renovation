"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import Link from "next/link";
import { Download, ExternalLink, Maximize2, Minimize2, Printer } from "lucide-react";
import { sauvegarderEtudeDebourse, supprimerEtudeDebourse } from "@/lib/actions/etudes-debourse";

// ─── Types ──────────────────────────────────────────────────────────────────

type ElementLocal = {
  _key: string;
  ordre: number;
  designation: string;
  unite: string;
  quantite: number;
  prixUnitaire: number;
  type: "MATERIAU" | "MATERIEL" | "MO";
  montantMateriaux: number;
  montantMateriel: number;
  montantMO: number;
};

type PosteLocal = {
  _key: string;
  ordre: number;
  codeOuvrage: string;
  unite: string;
  designation: string;
  ouvrageId: string;
  elements: ElementLocal[];
};

type SdpLigne = {
  id: string; ordre: number; nature: string; designation: string;
  unite: string; quantite: number; prixUnitaireHT: number; totalHT: number;
};

type Ouvrage = {
  id: string; code: string; designation: string; unite: string | null; corpsEtat: string;
  sousDetailPrix: { id: string; lignes: SdpLigne[] } | null;
};

type EtudeData = {
  id: string; numero: string; titre: string | null; chantierId: string | null;
  devisId: string | null; responsable: string | null; coeffK: number; notes: string | null;
  date: string; totalMateriauxHT: number; totalMaterielHT: number; totalMOHT: number; totalDSHT: number;
  chantier: { id: string; nom: string; reference: string; clientId?: string | null } | null;
  devis: { id: string; numero: string; objet: string | null } | null;
  postes: {
    id: string; ordre: number; codeOuvrage: string | null; unite: string | null;
    designation: string; ouvrageId: string | null; totalMateriauxHT: number;
    totalMaterielHT: number; totalMOHT: number; totalDSPoste: number;
    elements: {
      id: string; ordre: number; designation: string; unite: string | null;
      quantite: number; prixUnitaire: number; montantMateriaux: number;
      montantMateriel: number; montantMO: number;
    }[];
  }[];
};

type Props = {
  etude: EtudeData;
  chantiers: { id: string; nom: string; reference: string; clientId?: string | null }[];
  devisList: { id: string; numero: string; objet: string | null; chantierId?: string | null }[];
  ouvrages: Ouvrage[];
};

// ─── Helpers ────────────────────────────────────────────────────────────────

let _keyCounter = 0;
function nextKey() { return `k${++_keyCounter}`; }

function euro(v: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(v);
}

function parseNum(s: string): number {
  return parseFloat(s.replace(",", ".")) || 0;
}

function natureToType(nature: string): "MATERIAU" | "MATERIEL" | "MO" {
  if (nature === "MAIN_OEUVRE") return "MO";
  if (nature === "MATERIEL" || nature === "LOCATION" || nature === "SOUS_TRAITANCE") return "MATERIEL";
  return "MATERIAU";
}

function buildElement(partial: Partial<ElementLocal>): ElementLocal {
  const type = partial.type ?? "MATERIAU";
  const quantite = partial.quantite ?? 0;
  const prixUnitaire = partial.prixUnitaire ?? 0;
  const montant = quantite * prixUnitaire;
  return {
    _key: nextKey(), ordre: partial.ordre ?? 0,
    designation: partial.designation ?? "", unite: partial.unite ?? "",
    quantite, prixUnitaire, type,
    montantMateriaux: type === "MATERIAU" ? montant : 0,
    montantMateriel: type === "MATERIEL" ? montant : 0,
    montantMO: type === "MO" ? montant : 0,
  };
}

const NAVY = "#1E2F6E";
const ORANGE = "#F7941E";

// ─── Input numérique non-contrôlé (évite le blocage de saisie décimale) ─────

function NumInput({
  defaultVal, onCommit, className, step = "0.01",
}: { defaultVal: number; onCommit: (v: number) => void; className?: string; step?: string }) {
  const ref = useRef<HTMLInputElement>(null);
  // Re-sync quand la valeur change depuis l'extérieur (ex: ouvrage appliqué)
  const prevVal = useRef(defaultVal);
  if (prevVal.current !== defaultVal && ref.current && document.activeElement !== ref.current) {
    ref.current.value = defaultVal === 0 ? "" : String(defaultVal);
    prevVal.current = defaultVal;
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="decimal"
      defaultValue={defaultVal === 0 ? "" : defaultVal}
      placeholder="0"
      step={step}
      onBlur={(e) => {
        const v = parseNum(e.target.value);
        e.target.value = v === 0 ? "" : String(v);
        prevVal.current = v;
        onCommit(v);
      }}
      className={className}
    />
  );
}

// ─── CSS impression ───────────────────────────────────────────────────────────

const PRINT_CSS = `
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 0; padding: 20px; }
  h1 { font-size: 16px; color: #1E2F6E; border-bottom: 2px solid #1E2F6E; padding-bottom: 6px; margin: 0 0 12px; }
  h2 { font-size: 13px; color: #fff; background: #1E2F6E; padding: 5px 10px; margin: 16px 0 8px; }
  h3 { font-size: 12px; color: #1E2F6E; margin: 12px 0 4px; border-left: 3px solid #29ABE2; padding-left: 8px; }
  .meta { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 12px; }
  .meta-item { display: flex; gap: 6px; }
  .meta-label { font-weight: 700; color: #475569; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  th { background: #1E2F6E; color: #fff; padding: 5px 8px; text-align: left; font-size: 10px; }
  td { border-bottom: 1px solid #f1f5f9; padding: 4px 8px; }
  tr:nth-child(even) td { background: #f8fafc; }
  tfoot td { font-weight: 700; background: #f1f5f9 !important; border-top: 2px solid #cbd5e1; }
  .right { text-align: right; font-family: monospace; }
  .totaux-box { display: flex; gap: 16px; margin-top: 12px; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; }
  .total-item { flex: 1; text-align: center; }
  .total-val { font-size: 14px; font-weight: 800; color: #1E2F6E; }
  .total-pvht { color: #F7941E; }
  .notes { margin-top: 12px; padding: 10px; background: #fefce8; border-left: 4px solid #ca8a04; border-radius: 4px; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; }
  .badge-mat { background: #dcfce7; color: #166534; }
  .badge-mtl { background: #dbeafe; color: #1e40af; }
  .badge-mo { background: #ffedd5; color: #9a3412; }
  @page { margin: 12mm; }
`;

// ─── Composant principal ─────────────────────────────────────────────────────

export function EdsEditor({ etude, chantiers, devisList, ouvrages }: Props) {
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"synthese" | "detail">("synthese");
  const [fullscreen, setFullscreen] = useState(false);

  const [titre, setTitre] = useState(etude.titre ?? "");
  const [chantierId, setChantierId] = useState(etude.chantierId ?? "");
  const [devisId, setDevisId] = useState(etude.devisId ?? "");
  const [responsable, setResponsable] = useState(etude.responsable ?? "");
  const [coeffK, setCoeffK] = useState(etude.coeffK);
  const [notes, setNotes] = useState(etude.notes ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [postes, setPostes] = useState<PosteLocal[]>(() =>
    etude.postes.map((p) => ({
      _key: nextKey(), ordre: p.ordre, codeOuvrage: p.codeOuvrage ?? "",
      unite: p.unite ?? "", designation: p.designation, ouvrageId: p.ouvrageId ?? "",
      elements: p.elements.map((e) => {
        const type: "MATERIAU" | "MATERIEL" | "MO" =
          e.montantMO > 0 ? "MO" : e.montantMateriel > 0 ? "MATERIEL" : "MATERIAU";
        return { _key: nextKey(), ordre: e.ordre, designation: e.designation, unite: e.unite ?? "",
          quantite: e.quantite, prixUnitaire: e.prixUnitaire, type,
          montantMateriaux: e.montantMateriaux, montantMateriel: e.montantMateriel, montantMO: e.montantMO };
      }),
    })),
  );

  // ── Devis filtrés par chantier ────────────────────────────────────────────
  const devisFiltres = chantierId
    ? devisList.filter((d) => !d.chantierId || d.chantierId === chantierId)
    : devisList;

  // ── Auto-remplissage titre ────────────────────────────────────────────────
  const autoFillTitre = useCallback((chId: string, dvId: string) => {
    if (!chId || !dvId) return;
    setTitre((prev) => {
      if (prev) return prev;
      const ch = chantiers.find((c) => c.id === chId);
      const dv = devisList.find((d) => d.id === dvId);
      if (!dv) return prev;
      return dv.objet || (ch ? `${ch.reference} — ${dv.numero}` : dv.numero);
    });
  }, [chantiers, devisList]);

  const handleChantierChange = (id: string) => {
    setChantierId(id);
    // Si le devis actuel n'appartient pas au nouveau chantier, le réinitialiser
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
  };

  const handleDevisChange = (dvId: string) => {
    setDevisId(dvId);
    autoFillTitre(chantierId, dvId);
  };

  // ── Chantier / client courant ─────────────────────────────────────────────
  const chantierActuel = chantiers.find((c) => c.id === chantierId);
  const devisActuel = devisList.find((d) => d.id === devisId);

  // ── Calculs globaux ───────────────────────────────────────────────────────
  const totaux = postes.reduce(
    (acc, p) => ({
      mat: acc.mat + p.elements.reduce((s, e) => s + e.montantMateriaux, 0),
      mtl: acc.mtl + p.elements.reduce((s, e) => s + e.montantMateriel, 0),
      mo: acc.mo + p.elements.reduce((s, e) => s + e.montantMO, 0),
    }),
    { mat: 0, mtl: 0, mo: 0 },
  );
  const totalDS = totaux.mat + totaux.mtl + totaux.mo;
  const totalPVHT = totalDS * coeffK;

  // ── Mutations postes ──────────────────────────────────────────────────────
  const ajouterPoste = useCallback(() => {
    setPostes((prev) => [...prev, { _key: nextKey(), ordre: prev.length + 1,
      codeOuvrage: "", unite: "", designation: "Nouvel ouvrage", ouvrageId: "", elements: [] }]);
  }, []);

  const supprimerPoste = useCallback((key: string) => {
    setPostes((prev) => prev.filter((p) => p._key !== key));
  }, []);

  const mettreAJourPoste = useCallback((key: string, field: keyof PosteLocal, value: string) => {
    setPostes((prev) => prev.map((p) => p._key === key ? { ...p, [field]: value } : p));
  }, []);

  const appliquerOuvrage = useCallback((posteKey: string, ouvrageId: string) => {
    const ouvrage = ouvrages.find((o) => o.id === ouvrageId);
    if (!ouvrage) return;
    const elements: ElementLocal[] = ouvrage.sousDetailPrix
      ? ouvrage.sousDetailPrix.lignes.sort((a, b) => a.ordre - b.ordre).map((l, idx) =>
          buildElement({ ordre: idx + 1, designation: l.designation, unite: l.unite,
            quantite: l.quantite, prixUnitaire: l.prixUnitaireHT, type: natureToType(l.nature) }))
      : [];
    setPostes((prev) => prev.map((p) => p._key === posteKey
      ? { ...p, ouvrageId: ouvrage.id, codeOuvrage: ouvrage.code,
          designation: ouvrage.designation, unite: ouvrage.unite ?? "", elements }
      : p));
  }, [ouvrages]);

  // ── Mutations éléments ────────────────────────────────────────────────────
  const ajouterElement = useCallback((posteKey: string) => {
    setPostes((prev) => prev.map((p) => p._key === posteKey
      ? { ...p, elements: [...p.elements, buildElement({ ordre: p.elements.length + 1 })] }
      : p));
  }, []);

  const supprimerElement = useCallback((posteKey: string, elemKey: string) => {
    setPostes((prev) => prev.map((p) => p._key === posteKey
      ? { ...p, elements: p.elements.filter((e) => e._key !== elemKey) }
      : p));
  }, []);

  const mettreAJourElement = useCallback((posteKey: string, elemKey: string, field: string, value: string | number) => {
    setPostes((prev) => prev.map((p) => {
      if (p._key !== posteKey) return p;
      return {
        ...p,
        elements: p.elements.map((e) => {
          if (e._key !== elemKey) return e;
          const updated = { ...e, [field]: value };
          const montant = updated.quantite * updated.prixUnitaire;
          return { ...updated,
            montantMateriaux: updated.type === "MATERIAU" ? montant : 0,
            montantMateriel: updated.type === "MATERIEL" ? montant : 0,
            montantMO: updated.type === "MO" ? montant : 0 };
        }),
      };
    }));
  }, []);

  // ── Sauvegarde ────────────────────────────────────────────────────────────
  const handleSave = () => {
    startTransition(async () => {
      await sauvegarderEtudeDebourse(etude.id, {
        titre: titre || null, chantierId: chantierId || null, devisId: devisId || null,
        responsable: responsable || null, coeffK, notes: notes || null,
        postes: postes.map((p, pi) => ({
          ordre: pi + 1, codeOuvrage: p.codeOuvrage || undefined,
          unite: p.unite || undefined, designation: p.designation, ouvrageId: p.ouvrageId || undefined,
          elements: p.elements.map((e, ei) => ({
            ordre: ei + 1, designation: e.designation, unite: e.unite || undefined,
            quantite: e.quantite, prixUnitaire: e.prixUnitaire,
            montantMateriaux: e.montantMateriaux, montantMateriel: e.montantMateriel, montantMO: e.montantMO,
          })),
        })),
      });
      setSaveMsg("Enregistré !");
      setTimeout(() => setSaveMsg(""), 2500);
    });
  };

  const handleDelete = () => {
    startTransition(async () => { await supprimerEtudeDebourse(etude.id); });
  };

  // ── Impression / PDF ──────────────────────────────────────────────────────
  const handlePrint = (autoPrint = true) => {
    const chantierNom = chantierActuel ? `${chantierActuel.reference} — ${chantierActuel.nom}` : "—";
    const devisLabel = devisActuel ? `${devisActuel.numero}${devisActuel.objet ? " — " + devisActuel.objet : ""}` : "—";

    const syntheseRows = postes.map((p) => {
      const mat = p.elements.reduce((s, e) => s + e.montantMateriaux, 0);
      const mtl = p.elements.reduce((s, e) => s + e.montantMateriel, 0);
      const mo = p.elements.reduce((s, e) => s + e.montantMO, 0);
      const ds = mat + mtl + mo;
      return `<tr>
        <td>${p.codeOuvrage || "—"}</td>
        <td>${p.unite || "—"}</td>
        <td>${p.designation}</td>
        <td class="right">${euro(mat)}</td>
        <td class="right">${euro(mtl)}</td>
        <td class="right">${euro(mo)}</td>
        <td class="right" style="font-weight:800;color:#1E2F6E">${euro(ds)}</td>
        <td class="right" style="font-weight:800;color:#F7941E">${euro(ds * coeffK)}</td>
      </tr>`;
    }).join("");

    const detailBlocks = postes.map((p, pi) => {
      const rows = p.elements.map((e) => `<tr>
        <td>${e.designation}</td>
        <td><span class="badge badge-${e.type === "MATERIAU" ? "mat" : e.type === "MATERIEL" ? "mtl" : "mo"}">${e.type === "MATERIAU" ? "Matériau" : e.type === "MATERIEL" ? "Matériel" : "MO"}</span></td>
        <td class="right">${e.unite}</td>
        <td class="right">${e.quantite}</td>
        <td class="right">${euro(e.prixUnitaire)}</td>
        <td class="right">${e.type === "MATERIAU" ? euro(e.montantMateriaux) : "—"}</td>
        <td class="right">${e.type === "MATERIEL" ? euro(e.montantMateriel) : "—"}</td>
        <td class="right">${e.type === "MO" ? euro(e.montantMO) : "—"}</td>
      </tr>`).join("");

      const mat = p.elements.reduce((s, e) => s + e.montantMateriaux, 0);
      const mtl = p.elements.reduce((s, e) => s + e.montantMateriel, 0);
      const mo = p.elements.reduce((s, e) => s + e.montantMO, 0);
      return `<h3>Poste ${pi + 1} — ${p.designation}${p.codeOuvrage ? " [" + p.codeOuvrage + "]" : ""}</h3>
      <table>
        <thead><tr><th>Désignation</th><th>Type</th><th>Unité</th><th>Qté</th><th>P.U.</th><th>Matériaux</th><th>Matériel</th><th>MO</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="8" style="text-align:center;color:#94a3b8;font-style:italic">Aucun élément</td></tr>'}</tbody>
        <tfoot><tr><td colspan="5">Sous-total DS poste</td><td class="right">${euro(mat)}</td><td class="right">${euro(mtl)}</td><td class="right">${euro(mo)}</td></tr></tfoot>
      </table>`;
    }).join("");

    const html = `<!DOCTYPE html><html lang="fr"><head>
      <meta charset="utf-8">
      <title>EDS ${etude.numero} — ${titre || "Étude déboursé sec"}</title>
      <style>${PRINT_CSS}</style>
      ${autoPrint ? `<script>window.onload=()=>{setTimeout(()=>window.print(),300)}<\/script>` : ""}
    </head><body>
      <h1>ÉTUDE DÉBOURSÉ SEC — ${etude.numero}</h1>
      <div class="meta">
        <div class="meta-item"><span class="meta-label">Date :</span><span>${etude.date}</span></div>
        <div class="meta-item"><span class="meta-label">Titre :</span><span>${titre || "—"}</span></div>
        <div class="meta-item"><span class="meta-label">Responsable :</span><span>${responsable || "—"}</span></div>
        <div class="meta-item"><span class="meta-label">Chantier :</span><span>${chantierNom}</span></div>
        <div class="meta-item"><span class="meta-label">Devis :</span><span>${devisLabel}</span></div>
      </div>
      <h2>SYNTHÈSE PAR POSTE</h2>
      <table>
        <thead><tr>
          <th>Code</th><th>Unité</th><th>Désignation</th>
          <th style="text-align:right">Matériaux</th>
          <th style="text-align:right">Matériel</th>
          <th style="text-align:right">MO</th>
          <th style="text-align:right">DS Poste</th>
          <th style="text-align:right;color:#F7941E">PVHT</th>
        </tr></thead>
        <tbody>${syntheseRows || '<tr><td colspan="8" style="text-align:center;font-style:italic">Aucun poste</td></tr>'}</tbody>
        <tfoot><tr>
          <td colspan="3">TOTAUX</td>
          <td class="right">${euro(totaux.mat)}</td>
          <td class="right">${euro(totaux.mtl)}</td>
          <td class="right">${euro(totaux.mo)}</td>
          <td class="right">${euro(totalDS)}</td>
          <td class="right" style="color:#F7941E">${euro(totalPVHT)}</td>
        </tr></tfoot>
      </table>
      <div class="totaux-box">
        <div class="total-item"><div class="total-val">${euro(totaux.mat)}</div><div>Matériaux</div></div>
        <div class="total-item"><div class="total-val">${euro(totaux.mtl)}</div><div>Matériel/Conso</div></div>
        <div class="total-item"><div class="total-val">${euro(totaux.mo)}</div><div>Main d'œuvre</div></div>
        <div class="total-item"><div class="total-val">${euro(totalDS)}</div><div>Total DS HT</div></div>
        <div class="total-item"><div style="font-size:11px;margin-bottom:2px">Coeff. K = <strong>${coeffK}</strong></div><div class="total-val total-pvht">${euro(totalPVHT)}</div><div>PVHT</div></div>
      </div>
      <h2>DÉTAIL PAR POSTE</h2>
      ${detailBlocks || "<p style='font-style:italic;color:#94a3b8'>Aucun poste</p>"}
      ${notes ? `<div class="notes"><strong>Notes :</strong> ${notes}</div>` : ""}
      <p style="margin-top:20px;font-size:9px;color:#94a3b8;text-align:right">
        SDA Rénovation — EDS ${etude.numero} — Imprimé le ${new Date().toLocaleDateString("fr-FR")}
      </p>
    </body></html>`;

    const win = window.open("", "_blank", "width=1000,height=750");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-blue focus:outline-none focus:ring-1 focus:ring-brand-blue";
  const numCls = "rounded border border-slate-200 px-2 py-1 text-xs text-right font-mono focus:border-brand-blue focus:outline-none bg-white";

  return (
    <div className={fullscreen ? "fixed inset-0 z-50 overflow-auto bg-slate-100 p-4" : "flex flex-col gap-0"}>
      {/* Bouton plein écran */}
      <div className={`mb-3 flex justify-end ${fullscreen ? "" : ""}`}>
        <button
          onClick={() => setFullscreen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-sm"
        >
          {fullscreen ? <><Minimize2 className="h-3.5 w-3.5" /> Quitter le plein écran</> : <><Maximize2 className="h-3.5 w-3.5" /> Plein écran</>}
        </button>
      </div>

      <div className={fullscreen ? "mx-auto w-full max-w-7xl" : ""}>
        <div className="mb-4">
          <Link href="/etude-prix/debourses-secs" className="text-sm text-brand-blue hover:underline">
            ← Retour aux études déboursés secs
          </Link>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ── Contenu principal ──────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            {/* En-tête */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="font-mono text-sm font-bold text-brand-navy">{etude.numero}</span>
                <span className="text-slate-400">·</span>
                <span className="text-sm text-slate-500">{etude.date}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="mb-1 block text-xs font-medium text-slate-600">Titre</label>
                  <input value={titre} onChange={(e) => setTitre(e.target.value)} className={inputCls} placeholder="Titre de l'étude" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Chantier</label>
                  <select value={chantierId} onChange={(e) => handleChantierChange(e.target.value)} className={inputCls}>
                    <option value="">— Chantier —</option>
                    {chantiers.map((c) => (
                      <option key={c.id} value={c.id}>{c.reference} — {c.nom}</option>
                    ))}
                  </select>
                  {chantierActuel && (
                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <Link href={`/chantiers/${chantierActuel.id}`} className="flex items-center gap-1 text-brand-blue hover:underline">
                        <ExternalLink className="h-3 w-3" /> Voir le chantier
                      </Link>
                      {chantierActuel.clientId && (
                        <>
                          <span>·</span>
                          <Link href={`/clients/${chantierActuel.clientId}`} className="flex items-center gap-1 text-brand-blue hover:underline">
                            <ExternalLink className="h-3 w-3" /> Voir le client
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Devis{chantierId && devisFiltres.length < devisList.length && (
                      <span className="ml-1 text-brand-blue">({devisFiltres.length} pour ce chantier)</span>
                    )}
                  </label>
                  <select value={devisId} onChange={(e) => handleDevisChange(e.target.value)} className={inputCls}>
                    <option value="">— Devis —</option>
                    {devisFiltres.map((d) => (
                      <option key={d.id} value={d.id}>{d.numero}{d.objet ? ` — ${d.objet}` : ""}</option>
                    ))}
                  </select>
                  {devisActuel && (
                    <div className="mt-1 text-xs text-slate-400">
                      <Link href={`/devis/${devisActuel.id}`} className="flex items-center gap-1 text-brand-blue hover:underline">
                        <ExternalLink className="h-3 w-3" /> Voir le devis
                      </Link>
                    </div>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Responsable</label>
                  <input value={responsable} onChange={(e) => setResponsable(e.target.value)} className={inputCls} placeholder="Nom du responsable" />
                </div>
              </div>
            </div>

            {/* Onglets */}
            <div className="flex gap-2 border-b border-slate-200">
              {(["synthese", "detail"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                    tab === t ? "border-b-2 border-brand-navy bg-white text-brand-navy" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  {t === "synthese" ? "Vue synthèse" : "Détail par poste"}
                </button>
              ))}
            </div>

            {/* ── Vue Synthèse ───────────────────────────────────────────── */}
            {tab === "synthese" && (
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wider text-white" style={{ background: NAVY }}>
                        <th className="px-3 py-3">Code</th>
                        <th className="px-3 py-3">Unité</th>
                        <th className="px-3 py-3">Désignation</th>
                        <th className="px-3 py-3 text-right">Matériaux</th>
                        <th className="px-3 py-3 text-right">Matériel/Conso</th>
                        <th className="px-3 py-3 text-right">MO</th>
                        <th className="px-3 py-3 text-right font-bold">DS Poste</th>
                        <th className="px-3 py-3 text-right" style={{ color: ORANGE }}>PVHT = DS×K</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {postes.length === 0 && (
                        <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400 italic">Aucun poste. Ajoutez un ouvrage ci-dessous.</td></tr>
                      )}
                      {postes.map((p) => {
                        const mat = p.elements.reduce((s, e) => s + e.montantMateriaux, 0);
                        const mtl = p.elements.reduce((s, e) => s + e.montantMateriel, 0);
                        const mo = p.elements.reduce((s, e) => s + e.montantMO, 0);
                        const ds = mat + mtl + mo;
                        return (
                          <tr key={p._key} className="hover:bg-slate-50">
                            <td className="px-3 py-2.5 font-mono text-xs text-slate-500">{p.codeOuvrage || "—"}</td>
                            <td className="px-3 py-2.5 text-xs text-slate-500">{p.unite || "—"}</td>
                            <td className="px-3 py-2.5 font-medium text-slate-700">{p.designation}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600">{euro(mat)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600">{euro(mtl)}</td>
                            <td className="px-3 py-2.5 text-right text-slate-600">{euro(mo)}</td>
                            <td className="px-3 py-2.5 text-right font-bold text-brand-navy">{euro(ds)}</td>
                            <td className="px-3 py-2.5 text-right font-bold" style={{ color: ORANGE }}>{euro(ds * coeffK)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {postes.length > 0 && (
                      <tfoot>
                        <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                          <td colSpan={3} className="px-3 py-3 text-sm text-slate-600">TOTAUX</td>
                          <td className="px-3 py-3 text-right text-sm text-slate-700">{euro(totaux.mat)}</td>
                          <td className="px-3 py-3 text-right text-sm text-slate-700">{euro(totaux.mtl)}</td>
                          <td className="px-3 py-3 text-right text-sm text-slate-700">{euro(totaux.mo)}</td>
                          <td className="px-3 py-3 text-right text-brand-navy">{euro(totalDS)}</td>
                          <td className="px-3 py-3 text-right" style={{ color: ORANGE }}>{euro(totalPVHT)}</td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* ── Vue Détail ─────────────────────────────────────────────── */}
            {tab === "detail" && (
              <div className="flex flex-col gap-4">
                {postes.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-slate-400 italic">
                    Aucun poste. Cliquez sur « + Ajouter un ouvrage/poste ».
                  </div>
                )}
                {postes.map((p, pi) => {
                  const mat = p.elements.reduce((s, e) => s + e.montantMateriaux, 0);
                  const mtl = p.elements.reduce((s, e) => s + e.montantMateriel, 0);
                  const mo = p.elements.reduce((s, e) => s + e.montantMO, 0);
                  const ds = mat + mtl + mo;
                  return (
                    <div key={p._key} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                      {/* En-tête poste */}
                      <div className="flex flex-wrap items-center gap-3 px-4 py-3"
                        style={{ background: `${NAVY}10`, borderBottom: `2px solid ${NAVY}20` }}>
                        <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: NAVY }}>
                          {pi + 1}
                        </span>
                        <select value={p.ouvrageId} onChange={(e) => appliquerOuvrage(p._key, e.target.value)}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs focus:border-brand-blue focus:outline-none">
                          <option value="">— Choisir un ouvrage BDD —</option>
                          {ouvrages.map((o) => <option key={o.id} value={o.id}>[{o.code}] {o.designation}</option>)}
                        </select>
                        <input value={p.codeOuvrage} onChange={(e) => mettreAJourPoste(p._key, "codeOuvrage", e.target.value)}
                          placeholder="Code" className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-mono focus:border-brand-blue focus:outline-none" />
                        <input value={p.designation} onChange={(e) => mettreAJourPoste(p._key, "designation", e.target.value)}
                          placeholder="Désignation" className="flex-1 min-w-0 rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium focus:border-brand-blue focus:outline-none" />
                        <input value={p.unite} onChange={(e) => mettreAJourPoste(p._key, "unite", e.target.value)}
                          placeholder="U" className="w-14 rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-center focus:border-brand-blue focus:outline-none" />
                        <button onClick={() => supprimerPoste(p._key)}
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors">
                          ✕ Supprimer poste
                        </button>
                      </div>

                      {/* Tableau éléments */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 bg-slate-50 text-left font-semibold uppercase tracking-wider text-slate-500">
                              <th className="px-3 py-2">Désignation</th>
                              <th className="px-3 py-2 w-32">Type</th>
                              <th className="px-3 py-2 w-14 text-center">Unité</th>
                              <th className="px-3 py-2 w-24 text-right">Quantité</th>
                              <th className="px-3 py-2 w-28 text-right">Prix unit. €</th>
                              <th className="px-3 py-2 w-24 text-right text-emerald-700">Matériaux</th>
                              <th className="px-3 py-2 w-24 text-right text-blue-700">Matériel</th>
                              <th className="px-3 py-2 w-24 text-right text-orange-700">MO</th>
                              <th className="px-3 py-2 w-8"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {p.elements.length === 0 && (
                              <tr><td colSpan={9} className="px-4 py-4 text-center text-slate-300 italic">Aucun élément — cliquez « + Ajouter élément »</td></tr>
                            )}
                            {p.elements.map((e) => (
                              <tr key={e._key} className="hover:bg-slate-50/60">
                                <td className="px-3 py-1.5">
                                  <input value={e.designation}
                                    onChange={(ev) => mettreAJourElement(p._key, e._key, "designation", ev.target.value)}
                                    className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand-blue focus:outline-none"
                                    placeholder="Désignation" />
                                </td>
                                <td className="px-3 py-1.5">
                                  <select value={e.type}
                                    onChange={(ev) => mettreAJourElement(p._key, e._key, "type", ev.target.value)}
                                    className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs focus:border-brand-blue focus:outline-none">
                                    <option value="MATERIAU">Matériau</option>
                                    <option value="MATERIEL">Matériel/Conso</option>
                                    <option value="MO">Main d&apos;œuvre</option>
                                  </select>
                                </td>
                                <td className="px-3 py-1.5">
                                  <input value={e.unite}
                                    onChange={(ev) => mettreAJourElement(p._key, e._key, "unite", ev.target.value)}
                                    className={`${numCls} w-14 text-center`} placeholder="u" />
                                </td>
                                <td className="px-3 py-1.5">
                                  <NumInput
                                    defaultVal={e.quantite}
                                    onCommit={(v) => mettreAJourElement(p._key, e._key, "quantite", v)}
                                    className={`${numCls} w-24`}
                                    step="0.001"
                                  />
                                </td>
                                <td className="px-3 py-1.5">
                                  <NumInput
                                    defaultVal={e.prixUnitaire}
                                    onCommit={(v) => mettreAJourElement(p._key, e._key, "prixUnitaire", v)}
                                    className={`${numCls} w-28`}
                                    step="0.01"
                                  />
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  {e.type === "MATERIAU"
                                    ? <span className="font-mono font-semibold text-emerald-700">{euro(e.montantMateriaux)}</span>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  {e.type === "MATERIEL"
                                    ? <span className="font-mono font-semibold text-blue-700">{euro(e.montantMateriel)}</span>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-3 py-1.5 text-right">
                                  {e.type === "MO"
                                    ? <span className="font-mono font-semibold text-orange-700">{euro(e.montantMO)}</span>
                                    : <span className="text-slate-300">—</span>}
                                </td>
                                <td className="px-3 py-1.5">
                                  <button onClick={() => supprimerElement(p._key, e._key)}
                                    className="text-red-400 hover:text-red-600 text-base leading-none" title="Supprimer">✕</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="border-t border-slate-200 bg-slate-50">
                              <td colSpan={5} className="px-3 py-2 text-xs font-semibold text-slate-600">Sous-total DS poste</td>
                              <td className="px-3 py-2 text-right text-xs font-semibold text-emerald-700">{euro(mat)}</td>
                              <td className="px-3 py-2 text-right text-xs font-semibold text-blue-700">{euro(mtl)}</td>
                              <td className="px-3 py-2 text-right text-xs font-semibold text-orange-700">{euro(mo)}</td>
                              <td className="px-3 py-2 text-right text-xs font-bold text-brand-navy">{euro(ds)}</td>
                            </tr>
                            <tr>
                              <td colSpan={9} className="px-3 py-2">
                                <button onClick={() => ajouterElement(p._key)}
                                  className="text-xs font-semibold text-brand-blue hover:underline">
                                  + Ajouter élément
                                </button>
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                })}
                <button onClick={ajouterPoste}
                  className="flex items-center gap-2 rounded-xl border-2 border-dashed border-brand-blue/40 px-5 py-3.5 text-sm font-semibold text-brand-blue hover:border-brand-blue hover:bg-brand-blue/5 transition-colors">
                  + Ajouter un ouvrage / poste
                </button>
              </div>
            )}

            {/* Notes */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <label className="mb-2 block text-sm font-semibold text-brand-navy">Notes internes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={inputCls}
                placeholder="Remarques, hypothèses, conditions particulières…" />
            </div>
          </div>

          {/* ── Sidebar ──────────────────────────────────────────────────── */}
          <div className="w-full lg:w-72 flex flex-col gap-4 lg:sticky lg:top-6">
            {/* Coefficient K */}
            <div className="rounded-xl p-5 shadow-sm text-white" style={{ background: NAVY }}>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider opacity-70">Coefficient K (PVHT = DS × K)</p>
              <NumInput
                defaultVal={coeffK}
                onCommit={(v) => setCoeffK(v || 1)}
                step="0.001"
                className="w-full rounded-lg border-2 border-white/30 bg-white/10 px-3 py-2 text-3xl font-bold text-white text-center focus:border-white focus:outline-none"
              />
              <p className="mt-2 text-center text-xs opacity-60">PVHT = {euro(totalPVHT)}</p>
            </div>

            {/* Totaux */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Total DS HT</p>
              <p className="text-2xl font-bold text-brand-navy">{euro(totalDS)}</p>
              <div className="mt-4 flex flex-col gap-2">
                {[
                  { label: "Matériaux", val: totaux.mat, color: "#10b981", bar: "bg-emerald-500" },
                  { label: "Matériel/Conso", val: totaux.mtl, color: "#3b82f6", bar: "bg-blue-500" },
                  { label: "Main d'œuvre", val: totaux.mo, color: ORANGE, bar: "" },
                ].map(({ label, val, color, bar }) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-semibold" style={{ color }}>{euro(val)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className={`h-2 rounded-full ${bar}`}
                        style={{ width: totalDS > 0 ? `${(val / totalDS) * 100}%` : "0%", background: bar ? undefined : ORANGE }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-slate-100 pt-3">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-slate-700">PVHT (DS × K)</span>
                  <span className="font-bold" style={{ color: ORANGE }}>{euro(totalPVHT)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <button onClick={handleSave} disabled={isPending}
                className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-sm transition-opacity disabled:opacity-60"
                style={{ background: NAVY }}>
                {isPending ? "Enregistrement…" : "💾 Enregistrer"}
              </button>
              {saveMsg && <p className="text-center text-xs font-semibold text-emerald-600">{saveMsg}</p>}

              <button onClick={() => handlePrint(false)}
                className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 justify-center transition">
                <Printer className="h-4 w-4" /> Aperçu PDF
              </button>

              <button onClick={() => handlePrint(true)}
                className="flex items-center gap-2 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-4 py-2 text-sm font-medium text-brand-blue hover:bg-brand-blue/10 justify-center transition">
                <Download className="h-4 w-4" /> Imprimer / Enregistrer PDF
              </button>

              {!confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition-colors">
                  🗑️ Supprimer
                </button>
              ) : (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="mb-2 text-xs font-semibold text-red-700">Confirmer la suppression ?</p>
                  <div className="flex gap-2">
                    <button onClick={handleDelete} disabled={isPending}
                      className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60">
                      Oui, supprimer
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Infos & liens intermodulaires */}
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-500">
              <p className="mb-2 font-semibold text-slate-600 uppercase tracking-wide text-[10px]">Liaisons modules</p>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span>{postes.length} poste{postes.length > 1 ? "s" : ""}</span>
                  <span className="text-slate-400">{postes.reduce((s, p) => s + p.elements.length, 0)} éléments</span>
                </div>
                {chantierActuel && (
                  <Link href={`/chantiers/${chantierActuel.id}`}
                    className="flex items-center gap-1 text-brand-blue hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    Chantier : {chantierActuel.reference}
                  </Link>
                )}
                {chantierActuel?.clientId && (
                  <Link href={`/clients/${chantierActuel.clientId}`}
                    className="flex items-center gap-1 text-brand-blue hover:underline">
                    <ExternalLink className="h-3 w-3" /> Client associé
                  </Link>
                )}
                {devisActuel && (
                  <Link href={`/devis/${devisActuel.id}`}
                    className="flex items-center gap-1 text-brand-blue hover:underline">
                    <ExternalLink className="h-3 w-3" />
                    Devis : {devisActuel.numero}
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
