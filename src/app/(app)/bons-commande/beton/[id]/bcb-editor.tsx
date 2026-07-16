"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { sauvegarderBonCommandeBeton, supprimerBonCommandeBeton } from "@/lib/actions/bons-commande-beton";

const CLASSES_RESISTANCE = [
  "C8/10","C12/15","C16/20","C20/25","C25/30","C30/37","C35/45","C40/50","C45/55","C50/60",
];
const CLASSES_EXPOSITION = [
  "X0","XC1","XC2","XC3","XC4","XD1","XD2","XD3","XF1","XF2","XF3","XF4","XS1","XS2","XS3","XA1","XA2","XA3",
];
const CONSISTANCES = ["S1","S2","S3","S4","S5","F1","F2","F3","F4","F5","F6","C0","C1","C2","C3","C4","V0","V1","V2","V3","V4"];
const MODES_REGLEMENT = ["Comptant","30 jours fin de mois","45 jours fin de mois","60 jours fin de mois","Sur BL signé"];
const STATUTS = ["BROUILLON","ENVOYE","CONFIRME","LIVRE","ANNULE"];
const STATUT_LABELS: Record<string,string> = {
  BROUILLON:"Brouillon", ENVOYE:"Envoyé", CONFIRME:"Confirmé", LIVRE:"Livré", ANNULE:"Annulé",
};

type Livraison = {
  id?: string;
  dateLivraison: string;
  quantiteM3: number;
  heureDebut?: string | null;
  heureFin?: string | null;
  cadenceM3h?: number | null;
  observations?: string | null;
};

type BCBData = {
  id: string;
  numero: string;
  statut: string;
  fournisseurId: string;
  chantierId: string | null;
  nomChantier: string | null;
  adresseChantier: string | null;
  refAnalytique: string | null;
  modeReglement: string | null;
  classeResistance: string | null;
  classeExposition: string | null;
  consistance: string | null;
  affaissement: number | null;
  dmax: number | null;
  typeCiment: string | null;
  rapportEauCiment: number | null;
  teneurCimentMin: number | null;
  adjuvant: string | null;
  chlorures: string | null;
  qteTotale: number;
  prixM3: number | null;
  betonPompe: boolean;
  essaisBeton: boolean;
  ajoutEau: boolean;
  modeMiseEnOeuvre: string | null;
  dateLivraison: string | null;
  heureDebut: string | null;
  heureFin: string | null;
  cadenceM3h: number | null;
  observations: string | null;
  notes: string | null;
  livraisons: Livraison[];
  fournisseur: { id: string; nom: string; telephone?: string | null; email?: string | null };
  chantier: { id: string; nom: string; adresse?: string | null } | null;
};

export function BonCommandeBetonEditor({
  bcb,
  fournisseurs,
  chantiers,
}: {
  bcb: BCBData;
  fournisseurs: { id: string; nom: string }[];
  chantiers:    { id: string; nom: string; adresse?: string | null }[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── État du formulaire ───────────────────────────────────────────────────────
  const [form, setForm] = useState({
    fournisseurId:    bcb.fournisseurId,
    chantierId:       bcb.chantierId ?? "",
    statut:           bcb.statut,
    nomChantier:      bcb.nomChantier ?? "",
    adresseChantier:  bcb.adresseChantier ?? "",
    refAnalytique:    bcb.refAnalytique ?? "",
    modeReglement:    bcb.modeReglement ?? "",
    classeResistance: bcb.classeResistance ?? "",
    classeExposition: bcb.classeExposition ?? "",
    consistance:      bcb.consistance ?? "",
    affaissement:     bcb.affaissement?.toString() ?? "",
    dmax:             bcb.dmax?.toString() ?? "",
    typeCiment:       bcb.typeCiment ?? "",
    rapportEauCiment: bcb.rapportEauCiment?.toString() ?? "",
    teneurCimentMin:  bcb.teneurCimentMin?.toString() ?? "",
    adjuvant:         bcb.adjuvant ?? "",
    chlorures:        bcb.chlorures ?? "",
    qteTotale:        bcb.qteTotale.toString(),
    prixM3:           bcb.prixM3?.toString() ?? "",
    betonPompe:       bcb.betonPompe,
    essaisBeton:      bcb.essaisBeton,
    ajoutEau:         bcb.ajoutEau,
    modeMiseEnOeuvre: bcb.modeMiseEnOeuvre ?? "",
    dateLivraison:    bcb.dateLivraison ?? "",
    heureDebut:       bcb.heureDebut ?? "",
    heureFin:         bcb.heureFin ?? "",
    cadenceM3h:       bcb.cadenceM3h?.toString() ?? "",
    observations:     bcb.observations ?? "",
    notes:            bcb.notes ?? "",
  });

  const [livraisons, setLivraisons] = useState<Livraison[]>(bcb.livraisons);

  const set = (field: string, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }));

  // ── Pré-remplissage depuis chantier ──────────────────────────────────────────
  const handleChantierChange = (chantierId: string) => {
    const ch = chantiers.find(c => c.id === chantierId);
    if (!ch) { set("chantierId", chantierId); return; }
    setForm(prev => ({
      ...prev,
      chantierId,
      nomChantier:     prev.nomChantier     || ch.nom        || "",
      adresseChantier: prev.adresseChantier || ch.adresse    || "",
    }));
  };

  // ── Livraisons ───────────────────────────────────────────────────────────────
  const addLivraison = () =>
    setLivraisons(l => [
      ...l,
      { dateLivraison: form.dateLivraison || new Date().toISOString().slice(0, 10), quantiteM3: 0 },
    ]);

  const removeLivraison = (i: number) =>
    setLivraisons(l => l.filter((_, idx) => idx !== i));

  const updateLivraison = (i: number, field: keyof Livraison, value: string | number | null) =>
    setLivraisons(l => l.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const totalLivraisons = livraisons.reduce((s, l) => s + (l.quantiteM3 || 0), 0);

  // ── Sauvegarde ───────────────────────────────────────────────────────────────
  const handleSave = () => {
    startTransition(async () => {
      await sauvegarderBonCommandeBeton(bcb.id, {
        fournisseurId:    form.fournisseurId,
        chantierId:       form.chantierId || undefined,
        statut:           form.statut,
        nomChantier:      form.nomChantier || undefined,
        adresseChantier:  form.adresseChantier || undefined,
        refAnalytique:    form.refAnalytique || undefined,
        modeReglement:    form.modeReglement || undefined,
        classeResistance: form.classeResistance || undefined,
        classeExposition: form.classeExposition || undefined,
        consistance:      form.consistance || undefined,
        affaissement:     form.affaissement ? parseFloat(form.affaissement) : undefined,
        dmax:             form.dmax ? parseFloat(form.dmax) : undefined,
        typeCiment:       form.typeCiment || undefined,
        rapportEauCiment: form.rapportEauCiment ? parseFloat(form.rapportEauCiment) : undefined,
        teneurCimentMin:  form.teneurCimentMin ? parseFloat(form.teneurCimentMin) : undefined,
        adjuvant:         form.adjuvant || undefined,
        chlorures:        form.chlorures || undefined,
        qteTotale:        parseFloat(form.qteTotale) || 0,
        prixM3:           form.prixM3 ? parseFloat(form.prixM3) : undefined,
        betonPompe:       form.betonPompe,
        essaisBeton:      form.essaisBeton,
        ajoutEau:         form.ajoutEau,
        modeMiseEnOeuvre: form.modeMiseEnOeuvre || undefined,
        dateLivraison:    form.dateLivraison || undefined,
        heureDebut:       form.heureDebut || undefined,
        heureFin:         form.heureFin || undefined,
        cadenceM3h:       form.cadenceM3h ? parseFloat(form.cadenceM3h) : undefined,
        observations:     form.observations || undefined,
        notes:            form.notes || undefined,
        livraisons:       livraisons.map(l => ({
          dateLivraison: l.dateLivraison,
          quantiteM3:    l.quantiteM3,
          heureDebut:    l.heureDebut ?? undefined,
          heureFin:      l.heureFin ?? undefined,
          cadenceM3h:    l.cadenceM3h ?? undefined,
          observations:  l.observations ?? undefined,
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      await supprimerBonCommandeBeton(bcb.id);
    });
  };

  const montantTotal = parseFloat(form.qteTotale || "0") * parseFloat(form.prixM3 || "0");

  return (
    <FullscreenToggle>
    <div className="flex flex-col gap-6 pb-12">
      {/* ── En-tête ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/bons-commande" className="hover:text-brand-blue">Bons de commande</Link>
        <span>/</span>
        <Link href="/bons-commande/beton" className="hover:text-brand-blue">Béton</Link>
        <span>/</span>
        <span className="font-mono text-brand-navy font-semibold">{bcb.numero}</span>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-navy">{bcb.numero}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Bon de commande Béton —{" "}
            <Link href={`/fournisseurs/${bcb.fournisseur.id}`} className="text-brand-blue hover:underline">{bcb.fournisseur.nom}</Link>
            {bcb.chantier && (
              <> · <Link href={`/chantiers/${bcb.chantier.id}`} className="text-brand-blue hover:underline">{bcb.chantier.nom}</Link></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={form.statut}
            onChange={e => set("statut", e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium"
          >
            {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
          </select>
          <Link
            href={`/apercu/bon-commande-beton/${bcb.id}`}
            target="_blank"
            className="rounded-lg border border-brand-navy px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-navy/5 transition"
          >
            Aperçu PDF
          </Link>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50"
          >
            {isPending ? "Enregistrement…" : saved ? "✓ Enregistré" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Colonne principale ──────────────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-6">

          {/* Section 1 — Identification */}
          <Section title="Identification" icon="📋">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Centrale à béton *">
                <select value={form.fournisseurId} onChange={e => set("fournisseurId", e.target.value)}
                  className={input}>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </Field>
              <Field label="Chantier lié (CRM)">
                <select value={form.chantierId} onChange={e => handleChantierChange(e.target.value)}
                  className={input}>
                  <option value="">— aucun —</option>
                  {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </Field>
              <Field label="Nom du chantier (libre)">
                <input value={form.nomChantier} onChange={e => set("nomChantier", e.target.value)}
                  className={input} placeholder="Ex: Résidence Les Pins" />
              </Field>
              <Field label="Adresse de livraison">
                <input value={form.adresseChantier} onChange={e => set("adresseChantier", e.target.value)}
                  className={input} placeholder="12 rue du Moulin, 13000 Marseille" />
              </Field>
              <Field label="Réf. analytique">
                <input value={form.refAnalytique} onChange={e => set("refAnalytique", e.target.value)}
                  className={input} placeholder="CH-2025-001" />
              </Field>
              <Field label="Modalité de règlement">
                <select value={form.modeReglement} onChange={e => set("modeReglement", e.target.value)}
                  className={input}>
                  <option value="">—</option>
                  {MODES_REGLEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </Field>
            </div>
          </Section>

          {/* Section 2 — Spécifications béton (NF EN 206) */}
          <Section title="Spécifications béton — NF EN 206 / CN" icon="⚗️">
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <strong>NA.7.5 — Rappel normatif :</strong> Tout ajout d'eau sur chantier est interdit sauf s'il
              fait partie de la formulation et est inclus dans le rapport E/C de référence.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Field label="Classe de résistance">
                <select value={form.classeResistance} onChange={e => set("classeResistance", e.target.value)}
                  className={input}>
                  <option value="">—</option>
                  {CLASSES_RESISTANCE.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Classe d'exposition">
                <select value={form.classeExposition} onChange={e => set("classeExposition", e.target.value)}
                  className={input}>
                  <option value="">—</option>
                  {CLASSES_EXPOSITION.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Consistance (classe)">
                <select value={form.consistance} onChange={e => set("consistance", e.target.value)}
                  className={input}>
                  <option value="">—</option>
                  {CONSISTANCES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Affaissement cible (mm)">
                <input type="number" min="0" max="260" value={form.affaissement}
                  onChange={e => set("affaissement", e.target.value)}
                  className={input} placeholder="Ex: 180" />
              </Field>
              <Field label="Dmax (mm)">
                <select value={form.dmax} onChange={e => set("dmax", e.target.value)} className={input}>
                  <option value="">—</option>
                  {["8","11.2","16","20","22.4","25","31.5","40"].map(v => (
                    <option key={v} value={v}>{v} mm</option>
                  ))}
                </select>
              </Field>
              <Field label="Type de ciment">
                <input value={form.typeCiment} onChange={e => set("typeCiment", e.target.value)}
                  className={input} placeholder="Ex: CEM II/A-L 42.5 R" />
              </Field>
              <Field label="Rapport E/C max">
                <input type="number" step="0.01" min="0" max="1" value={form.rapportEauCiment}
                  onChange={e => set("rapportEauCiment", e.target.value)}
                  className={input} placeholder="Ex: 0.55" />
              </Field>
              <Field label="Teneur min. ciment (kg/m³)">
                <input type="number" step="5" min="200" max="450" value={form.teneurCimentMin}
                  onChange={e => set("teneurCimentMin", e.target.value)}
                  className={input} placeholder="Ex: 300" />
              </Field>
              <Field label="Adjuvant(s)">
                <input value={form.adjuvant} onChange={e => set("adjuvant", e.target.value)}
                  className={input} placeholder="Plastifiant, retardateur…" />
              </Field>
              <Field label="Teneur chlorures (Cl)">
                <select value={form.chlorures} onChange={e => set("chlorures", e.target.value)} className={input}>
                  <option value="">—</option>
                  <option value="Cl 0,10">Cl 0,10</option>
                  <option value="Cl 0,20">Cl 0,20</option>
                  <option value="Cl 0,40">Cl 0,40</option>
                </select>
              </Field>
              <Field label="Mode de mise en œuvre">
                <input value={form.modeMiseEnOeuvre} onChange={e => set("modeMiseEnOeuvre", e.target.value)}
                  className={input} placeholder="Pompe / Benne / Goulotte" />
              </Field>
            </div>

            {/* Cases à cocher obligatoires */}
            <div className="mt-4 flex flex-col gap-3">
              <CheckboxField
                id="betonPompe"
                label="Béton pompé"
                description="Le béton sera mis en œuvre par pompage"
                checked={form.betonPompe}
                onChange={v => set("betonPompe", v)}
              />
              <CheckboxField
                id="essaisBeton"
                label="Essais béton requis"
                description="Des éprouvettes de contrôle seront prélevées (NF EN 206 §8)"
                checked={form.essaisBeton}
                onChange={v => set("essaisBeton", v)}
              />
              <CheckboxField
                id="ajoutEau"
                label="Ajout d'eau autorisé sur chantier"
                description="⚠ Dérogation à la norme NA.7.5 — à justifier expressément"
                checked={form.ajoutEau}
                onChange={v => set("ajoutEau", v)}
                warning
              />
            </div>
          </Section>

          {/* Section 3 — Planning de livraison */}
          <Section title="Planning de livraison" icon="🚚">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Field label="Date livraison principale">
                <input type="date" value={form.dateLivraison} onChange={e => set("dateLivraison", e.target.value)}
                  className={input} />
              </Field>
              <Field label="Heure début">
                <input type="time" value={form.heureDebut} onChange={e => set("heureDebut", e.target.value)}
                  className={input} />
              </Field>
              <Field label="Heure fin">
                <input type="time" value={form.heureFin} onChange={e => set("heureFin", e.target.value)}
                  className={input} />
              </Field>
              <Field label="Cadence (m³/h)">
                <input type="number" step="0.5" min="0" value={form.cadenceM3h}
                  onChange={e => set("cadenceM3h", e.target.value)}
                  className={input} placeholder="Ex: 20" />
              </Field>
            </div>

            {/* Tableau des rotations */}
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Rotations / Tranches de livraison</span>
                <button onClick={addLivraison} type="button"
                  className="text-xs font-medium text-brand-blue hover:underline">
                  + Ajouter une tranche
                </button>
              </div>
              {livraisons.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-slate-400">
                  Aucune tranche définie — la livraison est en une seule fois.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-[11px] uppercase tracking-wider text-slate-400">
                    <tr className="border-b border-slate-100 bg-slate-50/50">
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">Date</th>
                      <th className="px-3 py-2 text-right">m³</th>
                      <th className="px-3 py-2 text-left">Début</th>
                      <th className="px-3 py-2 text-left">Fin</th>
                      <th className="px-3 py-2 text-right">Cadence m³/h</th>
                      <th className="px-3 py-2 text-left">Observations</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {livraisons.map((l, i) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-3 py-1.5 text-slate-400 text-xs font-mono">{i + 1}</td>
                        <td className="px-3 py-1.5">
                          <input type="date" value={l.dateLivraison}
                            onChange={e => updateLivraison(i, "dateLivraison", e.target.value)}
                            className="rounded border border-slate-200 px-2 py-1 text-xs w-full" />
                        </td>
                        <td className="px-3 py-1.5">
                          <input type="number" step="0.5" min="0" value={l.quantiteM3 || ""}
                            onChange={e => updateLivraison(i, "quantiteM3", parseFloat(e.target.value) || 0)}
                            className="rounded border border-slate-200 px-2 py-1 text-xs w-20 text-right" />
                        </td>
                        <td className="px-3 py-1.5">
                          <input type="time" value={l.heureDebut ?? ""}
                            onChange={e => updateLivraison(i, "heureDebut", e.target.value || null)}
                            className="rounded border border-slate-200 px-2 py-1 text-xs" />
                        </td>
                        <td className="px-3 py-1.5">
                          <input type="time" value={l.heureFin ?? ""}
                            onChange={e => updateLivraison(i, "heureFin", e.target.value || null)}
                            className="rounded border border-slate-200 px-2 py-1 text-xs" />
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <input type="number" step="0.5" min="0" value={l.cadenceM3h ?? ""}
                            onChange={e => updateLivraison(i, "cadenceM3h", parseFloat(e.target.value) || null)}
                            className="rounded border border-slate-200 px-2 py-1 text-xs w-20 text-right" />
                        </td>
                        <td className="px-3 py-1.5">
                          <input value={l.observations ?? ""}
                            onChange={e => updateLivraison(i, "observations", e.target.value || null)}
                            className="rounded border border-slate-200 px-2 py-1 text-xs w-full" placeholder="…" />
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <button onClick={() => removeLivraison(i)} type="button"
                            className="text-red-400 hover:text-red-600 text-xs">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 text-xs text-slate-500 font-medium">Total rotations</td>
                      <td className="px-3 py-2 text-right text-xs font-bold text-brand-navy">{totalLivraisons.toFixed(1)} m³</td>
                      <td colSpan={5}></td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>

            <div className="mt-3">
              <Field label="Observations de livraison">
                <textarea value={form.observations} onChange={e => set("observations", e.target.value)}
                  rows={3} className={`${input} resize-none`}
                  placeholder="Accès chantier, contraintes horaires, contacts sur place…" />
              </Field>
            </div>
          </Section>

          {/* Section 4 — Notes internes */}
          <Section title="Notes internes" icon="📝">
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={4} className={`${input} resize-none w-full`}
              placeholder="Notes confidentielles, négociation prix, historique…" />
          </Section>
        </div>

        {/* ── Colonne latérale ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Synthèse commande */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-brand-navy px-4 py-3">
              <h3 className="text-sm font-bold text-white">Synthèse de commande</h3>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <Field label="Quantité totale (m³) *">
                <input type="number" step="0.5" min="0" value={form.qteTotale}
                  onChange={e => set("qteTotale", e.target.value)}
                  className={`${input} text-lg font-bold text-brand-navy`} />
              </Field>
              <Field label="Prix unitaire (€/m³ HT)">
                <input type="number" step="0.5" min="0" value={form.prixM3}
                  onChange={e => set("prixM3", e.target.value)}
                  className={input} placeholder="0.00" />
              </Field>
              {parseFloat(form.prixM3 || "0") > 0 && (
                <div className="rounded-lg bg-brand-navy/5 border border-brand-navy/20 px-3 py-2.5 text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Montant total HT estimé</p>
                  <p className="text-2xl font-black text-brand-navy">
                    {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(montantTotal)}
                  </p>
                </div>
              )}
              {livraisons.length > 0 && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                  <p className="font-medium mb-1">Récapitulatif rotations</p>
                  <div className="flex justify-between">
                    <span>Total planifié</span>
                    <span className="font-bold">{totalLivraisons.toFixed(1)} m³</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Commandé</span>
                    <span className="font-bold">{parseFloat(form.qteTotale || "0").toFixed(1)} m³</span>
                  </div>
                  {Math.abs(totalLivraisons - parseFloat(form.qteTotale || "0")) > 0.1 && (
                    <p className="mt-1 text-amber-600 font-medium">
                      ⚠ Écart : {(totalLivraisons - parseFloat(form.qteTotale || "0")).toFixed(1)} m³
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Récapitulatif NF EN 206 */}
          {(form.classeResistance || form.classeExposition || form.consistance) && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
              <p className="text-xs font-bold text-brand-navy mb-2 uppercase tracking-wide">Désignation NF EN 206</p>
              <p className="font-mono text-sm text-brand-navy break-all leading-relaxed">
                {[
                  form.classeResistance,
                  form.classeExposition,
                  form.consistance ? `S${form.consistance.replace(/^S/,"")}` : "",
                  form.dmax ? `D${form.dmax}` : "",
                  form.chlorures,
                ].filter(Boolean).join(" / ")}
              </p>
            </div>
          )}

          {/* Options */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Options & contrôles</p>
            <OptionBadge active={form.betonPompe} label="Béton pompé" />
            <OptionBadge active={form.essaisBeton} label="Essais béton" />
            <OptionBadge active={form.ajoutEau} label="Ajout eau autorisé" warning />
          </div>

          {/* Actions */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-2">
            <button onClick={handleSave} disabled={isPending}
              className="w-full rounded-lg bg-brand-orange py-2.5 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50">
              {isPending ? "Enregistrement…" : "💾 Enregistrer"}
            </button>
            <Link href={`/apercu/bon-commande-beton/${bcb.id}`} target="_blank"
              className="block w-full rounded-lg border border-brand-navy py-2.5 text-center text-sm font-semibold text-brand-navy hover:bg-brand-navy/5 transition">
              🖨 Aperçu / Imprimer
            </Link>
            {bcb.statut === "BROUILLON" && (
              !confirmDelete ? (
                <button onClick={() => setConfirmDelete(true)} type="button"
                  className="w-full rounded-lg border border-red-200 py-2 text-sm text-red-500 hover:bg-red-50 transition">
                  Supprimer ce BC
                </button>
              ) : (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-center">
                  <p className="text-xs text-red-700 mb-2 font-medium">Confirmer la suppression ?</p>
                  <div className="flex gap-2">
                    <button onClick={handleDelete} disabled={isPending}
                      className="flex-1 rounded bg-red-600 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                      Oui, supprimer
                    </button>
                    <button onClick={() => setConfirmDelete(false)}
                      className="flex-1 rounded border border-red-200 py-1.5 text-xs text-red-600 hover:bg-red-50">
                      Annuler
                    </button>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
    </FullscreenToggle>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const input = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30";

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-bold text-brand-navy">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function CheckboxField({
  id, label, description, checked, onChange, warning = false,
}: {
  id: string; label: string; description: string; checked: boolean;
  onChange: (v: boolean) => void; warning?: boolean;
}) {
  return (
    <label htmlFor={id}
      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition ${
        warning
          ? checked ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
          : checked ? "border-brand-blue/30 bg-blue-50" : "border-slate-200 bg-white"
      }`}>
      <input id={id} type="checkbox" checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded accent-brand-navy shrink-0" />
      <div>
        <p className={`text-sm font-medium ${warning && checked ? "text-red-700" : "text-slate-700"}`}>{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
    </label>
  );
}

function OptionBadge({ active, label, warning = false }: { active: boolean; label: string; warning?: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
      active
        ? warning ? "bg-red-100 text-red-700 font-medium" : "bg-green-100 text-green-700 font-medium"
        : "bg-slate-50 text-slate-400"
    }`}>
      <span>{active ? (warning ? "⚠" : "✓") : "—"}</span>
      {label}
    </div>
  );
}
