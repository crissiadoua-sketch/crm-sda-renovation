"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { sauvegarderBcf, supprimerBcf } from "@/lib/actions/bons-commande-fournitures";

const CATEGORIES = [
  { value: "PAPETERIE",     label: "📄 Papeterie & Fournitures" },
  { value: "INFORMATIQUE",  label: "💻 Informatique & Télécoms" },
  { value: "MOBILIER",      label: "🪑 Mobilier & Aménagement" },
  { value: "HYGIENE",       label: "🧼 Hygiène & Entretien" },
  { value: "CONSOMMABLES",  label: "🖨️ Consommables imprimante" },
  { value: "EPI",           label: "🦺 EPI & Sécurité" },
  { value: "OUTILLAGE",     label: "🔧 Outillage" },
  { value: "STOCKAGE",      label: "📦 Stockage & Rayonnage" },
  { value: "EMBALLAGE",     label: "📫 Emballage & Expédition" },
  { value: "AUTRE",         label: "➕ Autre" },
];

const STATUTS = ["BROUILLON", "EN_ATTENTE", "VALIDE", "ENVOYE", "RECU", "ANNULE"];
const STATUT_LABELS: Record<string, string> = {
  BROUILLON:  "Brouillon",
  EN_ATTENTE: "En attente de validation",
  VALIDE:     "Validé",
  ENVOYE:     "Envoyé au fournisseur",
  RECU:       "Reçu ✓",
  ANNULE:     "Annulé",
};

const MODES_REGLEMENT = ["Comptant", "30 jours fin de mois", "45 jours fin de mois", "60 jours fin de mois", "Sur BL signé"];

const SERVICES = [
  { value: "ADMINISTRATION", label: "Administration" },
  { value: "DIRECTION",      label: "Direction" },
  { value: "PRODUCTION",     label: "Production / Exploitation" },
  { value: "COMMERCIAL",     label: "Commercial" },
  { value: "AUTRE",          label: "Autre" },
];

const TVA_TAUX = [20, 10, 5.5, 0];

type Ligne = {
  categorie:      string;
  designation:    string;
  reference:      string;
  quantite:       string;
  unite:          string;
  prixUnitaireHT: string;
  tauxTVA:        string;
};

type BCF = {
  id: string;
  numero: string;
  type: string;
  statut: string;
  fournisseurId: string;
  service: string;
  demandeurNom: string | null;
  demandeurEmail: string | null;
  validateurNom: string | null;
  refBudget: string | null;
  refBonLivraison: string | null;
  adresseLivraison: string | null;
  dateCommande: string;
  dateSouhaitee: string | null;
  modeReglement: string | null;
  notes: string | null;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  fournisseur: { id: string; nom: string; adresse?: string | null; codePostal?: string | null; ville?: string | null; telephone?: string | null; email?: string | null; siret?: string | null };
  lignes: { categorie: string; designation: string; reference: string | null; quantite: number; unite: string; prixUnitaireHT: number; tauxTVA: number }[];
};

export function BcFournituresEditor({
  bcf, fournisseurs,
}: {
  bcf: BCF;
  fournisseurs: { id: string; nom: string }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved]     = useState(false);
  const [confirmDel, setDel]  = useState(false);

  const [form, setForm] = useState({
    statut:           bcf.statut,
    type:             bcf.type,
    fournisseurId:    bcf.fournisseurId,
    service:          bcf.service,
    demandeurNom:     bcf.demandeurNom ?? "",
    demandeurEmail:   bcf.demandeurEmail ?? "",
    validateurNom:    bcf.validateurNom ?? "",
    refBudget:        bcf.refBudget ?? "",
    refBonLivraison:  bcf.refBonLivraison ?? "",
    adresseLivraison: bcf.adresseLivraison ?? "",
    dateSouhaitee:    bcf.dateSouhaitee ?? "",
    modeReglement:    bcf.modeReglement ?? "",
    notes:            bcf.notes ?? "",
  });

  const [lignes, setLignes] = useState<Ligne[]>(
    bcf.lignes.length > 0
      ? bcf.lignes.map(l => ({
          categorie:      l.categorie,
          designation:    l.designation,
          reference:      l.reference ?? "",
          quantite:       l.quantite.toString(),
          unite:          l.unite,
          prixUnitaireHT: l.prixUnitaireHT.toString(),
          tauxTVA:        l.tauxTVA.toString(),
        }))
      : [{ categorie: "PAPETERIE", designation: "", reference: "", quantite: "1", unite: "u", prixUnitaireHT: "0", tauxTVA: "20" }]
  );

  const set = (f: string, v: string) => setForm(p => ({ ...p, [f]: v }));

  const addLigne = (cat = "PAPETERIE") =>
    setLignes(l => [...l, { categorie: cat, designation: "", reference: "", quantite: "1", unite: "u", prixUnitaireHT: "0", tauxTVA: "20" }]);

  const remLigne = (i: number) => setLignes(l => l.filter((_, idx) => idx !== i));

  const updLigne = (i: number, f: keyof Ligne, v: string) =>
    setLignes(l => l.map((item, idx) => idx === i ? { ...item, [f]: v } : item));

  const totalHT  = lignes.reduce((s, l) => s + (parseFloat(l.quantite)||0) * (parseFloat(l.prixUnitaireHT)||0), 0);
  const totalTVA = lignes.reduce((s, l) => s + (parseFloat(l.quantite)||0) * (parseFloat(l.prixUnitaireHT)||0) * (parseFloat(l.tauxTVA)||0)/100, 0);
  const totalTTC = totalHT + totalTVA;

  const handleSave = () => {
    startTransition(async () => {
      await sauvegarderBcf(bcf.id, {
        ...form,
        lignes: lignes.filter(l => l.designation.trim()).map(l => ({
          categorie:      l.categorie,
          designation:    l.designation,
          reference:      l.reference || undefined,
          quantite:       parseFloat(l.quantite) || 1,
          unite:          l.unite || "u",
          prixUnitaireHT: parseFloat(l.prixUnitaireHT) || 0,
          tauxTVA:        parseFloat(l.tauxTVA) || 20,
        })),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    });
  };

  const handleDel = () => startTransition(async () => { await supprimerBcf(bcf.id); });

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

  // Grouper les lignes par catégorie pour l'affichage
  const categoriesUsees = [...new Set(lignes.map(l => l.categorie))];

  return (
    <FullscreenToggle>
    <div className="flex flex-col gap-5 pb-12">

      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/bons-commande" className="hover:text-brand-blue">Bons de commande</Link>
        <span>/</span>
        <Link href="/bons-commande/fournitures" className="hover:text-brand-blue">Fournitures</Link>
        <span>/</span>
        <span className="font-mono text-brand-navy font-semibold">{bcf.numero}</span>
      </div>

      {/* ── En-tête ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-navy">{bcf.numero}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            BC Fournitures {form.type === "BUREAU" ? "Bureau" : form.type === "ENTREPOT" ? "Entrepôt" : "Mixte"} —{" "}
            <Link href={`/fournisseurs/${bcf.fournisseur.id}`} className="text-brand-blue hover:underline">{bcf.fournisseur.nom}</Link>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={form.statut} onChange={e => set("statut", e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium">
            {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
          </select>
          <Link href={`/apercu/bon-commande-fournitures/${bcf.id}`} target="_blank"
            className="rounded-lg border border-brand-navy px-4 py-2 text-sm font-medium text-brand-navy hover:bg-brand-navy/5 transition">
            Aperçu PDF
          </Link>
          <button onClick={handleSave} disabled={isPending}
            className="rounded-lg bg-brand-orange px-5 py-2 text-sm font-semibold text-white hover:opacity-90 transition disabled:opacity-50">
            {isPending ? "…" : saved ? "✓ Enregistré" : "Enregistrer"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ── Colonne principale ─────────────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-6">

          {/* Identification */}
          <Card title="Identification" icon="📋">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <F label="Type de commande">
                <div className="flex gap-2">
                  {[["BUREAU","🖥️ Bureau"],["ENTREPOT","🏭 Entrepôt"],["MIXTE","📦 Mixte"]].map(([v,l]) => (
                    <button key={v} type="button"
                      onClick={() => set("type", v)}
                      className={`flex-1 rounded-lg border-2 py-2 text-xs font-bold transition ${
                        form.type === v ? "border-brand-navy bg-brand-navy text-white" : "border-slate-200 text-slate-600 hover:border-brand-navy/40"
                      }`}>
                      {l}
                    </button>
                  ))}
                </div>
              </F>
              <F label="Fournisseur *">
                <select value={form.fournisseurId} onChange={e => set("fournisseurId", e.target.value)} className={inp}>
                  {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </F>
              <F label="Service demandeur">
                <select value={form.service} onChange={e => set("service", e.target.value)} className={inp}>
                  {SERVICES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </F>
              <F label="Mode de règlement">
                <select value={form.modeReglement} onChange={e => set("modeReglement", e.target.value)} className={inp}>
                  <option value="">—</option>
                  {MODES_REGLEMENT.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </F>
              <F label="Demandeur (nom)">
                <input value={form.demandeurNom} onChange={e => set("demandeurNom", e.target.value)}
                  className={inp} placeholder="Nom du demandeur" />
              </F>
              <F label="Email demandeur">
                <input type="email" value={form.demandeurEmail} onChange={e => set("demandeurEmail", e.target.value)}
                  className={inp} placeholder="prenom.nom@sda-renovation.com" />
              </F>
              <F label="Valideur interne">
                <input value={form.validateurNom} onChange={e => set("validateurNom", e.target.value)}
                  className={inp} placeholder="Nom du responsable validant" />
              </F>
              <F label="Réf. budget / centre de coût">
                <input value={form.refBudget} onChange={e => set("refBudget", e.target.value)}
                  className={inp} placeholder="Ex: ADM-2025 / CC-001" />
              </F>
              <F label="Date de livraison souhaitée">
                <input type="date" value={form.dateSouhaitee} onChange={e => set("dateSouhaitee", e.target.value)}
                  className={inp} />
              </F>
              <F label="Adresse de livraison">
                <input value={form.adresseLivraison} onChange={e => set("adresseLivraison", e.target.value)}
                  className={inp} placeholder="Bureau / entrepôt / siège social" />
              </F>
            </div>
          </Card>

          {/* Lignes de commande */}
          <Card title="Lignes de commande" icon="📝">
            {/* Boutons ajout rapide par catégorie */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <p className="w-full text-xs text-slate-400 mb-1">Ajout rapide par catégorie :</p>
              {CATEGORIES.map(c => (
                <button key={c.value} type="button"
                  onClick={() => addLigne(c.value)}
                  className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-brand-blue hover:text-brand-blue transition">
                  {c.label}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-brand-navy text-white text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="px-2 py-2.5 text-left w-6">#</th>
                    <th className="px-2 py-2.5 text-left w-32">Catégorie</th>
                    <th className="px-2 py-2.5 text-left">Désignation</th>
                    <th className="px-2 py-2.5 text-left w-24">Réf. fournisseur</th>
                    <th className="px-2 py-2.5 text-right w-14">Qté</th>
                    <th className="px-2 py-2.5 text-left w-12">Unité</th>
                    <th className="px-2 py-2.5 text-right w-20">PU HT</th>
                    <th className="px-2 py-2.5 text-center w-14">TVA</th>
                    <th className="px-2 py-2.5 text-right w-20">Total HT</th>
                    <th className="w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {lignes.map((l, i) => {
                    const ligneHT = (parseFloat(l.quantite)||0) * (parseFloat(l.prixUnitaireHT)||0);
                    return (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          <select value={l.categorie} onChange={e => updLigne(i, "categorie", e.target.value)}
                            className="w-full rounded border border-slate-200 px-1.5 py-1 text-[10px]">
                            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={l.designation} onChange={e => updLigne(i, "designation", e.target.value)}
                            className="w-full rounded border border-slate-200 px-2 py-1 focus:outline-none focus:border-brand-blue"
                            placeholder="Désignation de l'article…" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={l.reference} onChange={e => updLigne(i, "reference", e.target.value)}
                            className="w-full rounded border border-slate-200 px-2 py-1" placeholder="Réf." />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min="0" step="1" value={l.quantite}
                            onChange={e => updLigne(i, "quantite", e.target.value)}
                            className="w-14 rounded border border-slate-200 px-1.5 py-1 text-right" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={l.unite} onChange={e => updLigne(i, "unite", e.target.value)}
                            className="w-12 rounded border border-slate-200 px-1.5 py-1" placeholder="u" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" min="0" step="0.01" value={l.prixUnitaireHT}
                            onChange={e => updLigne(i, "prixUnitaireHT", e.target.value)}
                            className="w-20 rounded border border-slate-200 px-1.5 py-1 text-right" />
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <select value={l.tauxTVA} onChange={e => updLigne(i, "tauxTVA", e.target.value)}
                            className="rounded border border-slate-200 px-1 py-1 text-[10px]">
                            {TVA_TAUX.map(t => <option key={t} value={t}>{t}%</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-right font-bold text-brand-navy">
                          {new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2 }).format(ligneHT)} €
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button onClick={() => remLigne(i)} className="text-red-400 hover:text-red-600">✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="border-t border-slate-100 px-3 py-2">
                <button onClick={() => addLigne()} type="button"
                  className="text-xs font-medium text-brand-blue hover:underline">
                  + Ajouter un article
                </button>
              </div>
            </div>

            {/* Totaux inline */}
            <div className="mt-4 flex justify-end">
              <div className="w-64 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Total HT</span>
                  <span className="font-medium">{fmt(totalHT)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">TVA</span>
                  <span className="font-medium">{fmt(totalTVA)}</span>
                </div>
                <div className="flex justify-between border-t-2 border-brand-navy pt-1.5 mt-1">
                  <span className="font-bold text-brand-navy text-base">TOTAL TTC</span>
                  <span className="font-black text-brand-navy text-base">{fmt(totalTTC)}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Notes */}
          <Card title="Notes internes" icon="📝">
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={3} className={`${inp} resize-none w-full`}
              placeholder="Informations complémentaires, conditions de livraison, précisions…" />
          </Card>
        </div>

        {/* ── Colonne latérale ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Synthèse */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="bg-brand-navy px-4 py-3">
              <h3 className="text-sm font-bold text-white">Synthèse</h3>
            </div>
            <div className="p-4 flex flex-col gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Lignes</span>
                <span className="font-medium">{lignes.filter(l => l.designation).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total HT</span>
                <span className="font-medium">{fmt(totalHT)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">TVA</span>
                <span className="font-medium">{fmt(totalTVA)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2 mt-1">
                <span className="font-bold text-brand-navy text-lg">TTC</span>
                <span className="font-black text-brand-navy text-xl">{fmt(totalTTC)}</span>
              </div>
            </div>
          </div>

          {/* Catégories */}
          {categoriesUsees.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Répartition</p>
              {categoriesUsees.map(cat => {
                const catLignes = lignes.filter(l => l.categorie === cat);
                const catHT = catLignes.reduce((s, l) => s + (parseFloat(l.quantite)||0)*(parseFloat(l.prixUnitaireHT)||0), 0);
                const catInfo = CATEGORIES.find(c => c.value === cat);
                return (
                  <div key={cat} className="flex justify-between items-center py-1 text-xs">
                    <span className="text-slate-600">{catInfo?.label ?? cat}</span>
                    <span className="font-semibold text-brand-navy">{fmt(catHT)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Actions */}
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 flex flex-col gap-2">
            <button onClick={handleSave} disabled={isPending}
              className="w-full rounded-lg bg-brand-orange py-2.5 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-50">
              💾 Enregistrer
            </button>
            <Link href={`/apercu/bon-commande-fournitures/${bcf.id}`} target="_blank"
              className="block w-full rounded-lg border border-brand-navy py-2.5 text-center text-sm font-semibold text-brand-navy hover:bg-brand-navy/5 transition">
              🖨 Aperçu PDF
            </Link>
            {!confirmDel ? (
              <button onClick={() => setDel(true)} type="button"
                className="w-full rounded-lg border border-red-200 py-2 text-sm text-red-500 hover:bg-red-50 transition">
                Supprimer
              </button>
            ) : (
              <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-center">
                <p className="text-xs text-red-700 mb-2 font-medium">Confirmer la suppression ?</p>
                <div className="flex gap-2">
                  <button onClick={handleDel} disabled={isPending}
                    className="flex-1 rounded bg-red-600 py-1.5 text-xs font-bold text-white">Oui</button>
                  <button onClick={() => setDel(false)}
                    className="flex-1 rounded border border-red-200 py-1.5 text-xs text-red-600">Non</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    </FullscreenToggle>
  );
}

const inp = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30";

function Card({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <span>{icon}</span>
        <h3 className="text-sm font-bold text-brand-navy">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</label>
      {children}
    </div>
  );
}
