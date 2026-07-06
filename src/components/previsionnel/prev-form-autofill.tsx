"use client";

import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { ajouterDepensePrevisionnelle } from "@/lib/actions/depenses";

const CAT_OPTIONS = [
  { value: "MATERIAUX",      label: "Matériaux" },
  { value: "SOUS_TRAITANCE", label: "Sous-traitance" },
  { value: "MAIN_OEUVRE",    label: "Main d'œuvre" },
  { value: "TRANSPORT",      label: "Transport" },
  { value: "ADMINISTRATIF",  label: "Administratif" },
  { value: "AUTRE",          label: "Autre" },
];

type DepenseRecente = {
  id: string; libelle: string; montant: number;
  categorie: string; chantierId: string | null; fournisseurId: string | null;
};

type Props = {
  depensesRecentes: DepenseRecente[];
  chantiers: { id: string; nom: string }[];
  fournisseurs: { id: string; nom: string }[];
};

export function PrevFormAutoFill({ depensesRecentes, chantiers, fournisseurs }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [libelle, setLibelle] = useState("");
  const [montant, setMontant] = useState("");
  const [categorie, setCategorie] = useState("AUTRE");
  const [chantierId, setChantierId] = useState("");
  const [fournisseurId, setFournisseurId] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");

  function autoFill(id: string) {
    if (!id) return;
    const d = depensesRecentes.find((r) => r.id === id);
    if (!d) return;
    setLibelle(d.libelle);
    setMontant(String(d.montant));
    setCategorie(d.categorie);
    setChantierId(d.chantierId ?? "");
    setFournisseurId(d.fournisseurId ?? "");
  }

  return (
    <div className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-2 text-slate-600">
          <Plus className="h-4 w-4" />
          <span className="text-sm font-semibold">Ajouter une dépense prévisionnelle</span>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Planifiez une dépense future — elle apparaîtra dans la timeline et le calcul de marge
        </p>
      </div>

      {depensesRecentes.length > 0 && (
        <div className="border-b border-slate-100 bg-orange-50/30 px-5 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-xs font-medium text-slate-600">
              Remplissage automatique depuis une dépense récente
            </span>
          </div>
          <select
            onChange={(e) => autoFill(e.target.value)}
            defaultValue=""
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Choisir une dépense récente à reproduire —</option>
            {depensesRecentes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.libelle} · {d.montant.toLocaleString("fr-FR")} €
              </option>
            ))}
          </select>
        </div>
      )}

      <form
        action={ajouterDepensePrevisionnelle}
        className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3"
      >
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Libellé *</label>
          <input
            name="libelle"
            required
            value={libelle}
            onChange={(e) => setLibelle(e.target.value)}
            placeholder="Ex : Béton 2e dalle — VICAT"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Montant HT (€) *</label>
          <input
            name="montant"
            type="number"
            step="0.01"
            min="0"
            required
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Date prévue *</label>
          <input
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Catégorie</label>
          <select
            name="categorie"
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {CAT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Chantier</label>
          <select
            name="chantierId"
            value={chantierId}
            onChange={(e) => setChantierId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">— Aucun —</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Fournisseur</label>
          <select
            name="fournisseurId"
            value={fournisseurId}
            onChange={(e) => setFournisseurId(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">— Aucun —</option>
            {fournisseurs.map((f) => (
              <option key={f.id} value={f.id}>{f.nom}</option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Notes</label>
          <input
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Précisions, références devis…"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition"
          >
            + Ajouter
          </button>
        </div>
      </form>
    </div>
  );
}
