"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Plus, PackagePlus, Save } from "lucide-react";
import {
  mettreAJourBonCommande,
  sauvegarderLignesBc,
  supprimerBonCommande,
  creerBlDepuisBc,
} from "@/lib/actions/bons-commande";
import { formatEuros, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Fournisseur = { id: string; nom: string };
type Chantier    = { id: string; nom: string };
type Ligne = {
  id: string; ordre: number; designation: string;
  unite: string | null; quantite: number | null; prixUnitaireHT: number | null;
  tauxTVA: number | null; totalHT: number | null;
};
type BlRef = { id: string; numero: string; statut: string };

type BcData = {
  id: string; numero: string; statut: string; notes: string | null;
  totalHT: number; totalTVA: number; totalTTC: number;
  createdAt: Date;
  fournisseur: { id: string; nom: string };
  chantier: { id: string; nom: string } | null;
  lignes: Ligne[];
  bonsLivraison: BlRef[];
};

const STATUTS = ["BROUILLON", "ENVOYE", "CONFIRME", "RECU_PARTIEL", "RECU", "ANNULE"];
const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon", ENVOYE: "Envoyé", CONFIRME: "Confirmé",
  RECU_PARTIEL: "Reçu partiel", RECU: "Reçu complet", ANNULE: "Annulé",
};
const STATUT_TONES: Record<string, "green" | "blue" | "orange" | "gray" | "red" | "navy"> = {
  BROUILLON: "gray", ENVOYE: "blue", CONFIRME: "navy",
  RECU_PARTIEL: "orange", RECU: "green", ANNULE: "red",
};

type LigneRow = {
  key: string;
  designation: string;
  unite: string;
  quantite: number;
  prixUnitaireHT: number;
  tauxTVA: number;
};

let counter = 0;
const newKey = () => `new-${++counter}`;

function rowTotal(r: LigneRow) {
  return Math.round(r.quantite * r.prixUnitaireHT * 100) / 100;
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export function BonCommandeDetail({
  bc,
  fournisseurs,
  chantiers,
}: {
  bc: BcData;
  fournisseurs: Fournisseur[];
  chantiers:    Chantier[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [lignes, setLignes] = useState<LigneRow[]>(
    bc.lignes.length > 0
      ? bc.lignes.map((l) => ({
          key: l.id,
          designation:    l.designation,
          unite:          l.unite ?? "u",
          quantite:       l.quantite ?? 0,
          prixUnitaireHT: l.prixUnitaireHT ?? 0,
          tauxTVA:        l.tauxTVA ?? 20,
        }))
      : [{ key: newKey(), designation: "", unite: "u", quantite: 1, prixUnitaireHT: 0, tauxTVA: 20 }]
  );

  const [dirty, setDirty]     = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const totalHT  = lignes.reduce((s, l) => s + rowTotal(l), 0);
  const totalTVA = lignes.reduce((s, l) => s + rowTotal(l) * (l.tauxTVA / 100), 0);
  const totalTTC = totalHT + totalTVA;

  function updateLigne(key: string, patch: Partial<LigneRow>) {
    setLignes((prev) => prev.map((l) => l.key === key ? { ...l, ...patch } : l));
    setDirty(true);
  }

  function addLigne() {
    setLignes((prev) => [...prev, { key: newKey(), designation: "", unite: "u", quantite: 1, prixUnitaireHT: 0, tauxTVA: 20 }]);
    setDirty(true);
  }

  function removeLigne(key: string) {
    setLignes((prev) => prev.filter((l) => l.key !== key));
    setDirty(true);
  }

  function handleSaveLignes() {
    setError(null);
    startTransition(async () => {
      try {
        await sauvegarderLignesBc(bc.id, lignes.map((l, i) => ({ ...l, ordre: i })));
        setSaved(true);
        setDirty(false);
        setTimeout(() => setSaved(false), 2000);
        router.refresh();
      } catch {
        setError("Erreur lors de la sauvegarde.");
      }
    });
  }

  function handleDelete() {
    if (!confirm(`Supprimer le bon de commande ${bc.numero} ?`)) return;
    startTransition(async () => {
      await supprimerBonCommande(bc.id);
    });
  }

  function handleCreerBl() {
    if (!confirm(`Créer un bon de livraison depuis ${bc.numero} ?`)) return;
    startTransition(async () => {
      await creerBlDepuisBc(bc.id);
    });
  }

  return (
    <FullscreenToggle>
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/bons-commande" className="text-sm text-brand-blue hover:underline">← Bons de commande</Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{bc.numero}</h2>
            <Badge tone={STATUT_TONES[bc.statut] ?? "gray"}>{STATUT_LABELS[bc.statut]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <Link href={`/fournisseurs/${bc.fournisseur.id}`} className="text-brand-blue hover:underline">{bc.fournisseur.nom}</Link>
            {" · "}
            {bc.chantier
              ? <Link href={`/chantiers/${bc.chantier.id}`} className="text-brand-blue hover:underline">{bc.chantier.nom}</Link>
              : "Sans chantier"}
            {" · "}{formatDate(bc.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCreerBl}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-brand-blue px-3 py-2 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5 transition"
          >
            <PackagePlus className="h-3.5 w-3.5" /> Créer BL
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition"
          >
            <Trash2 className="h-3.5 w-3.5" /> Supprimer
          </button>
        </div>
      </div>

      {/* Métadonnées */}
      <form
        action={mettreAJourBonCommande.bind(null, bc.id)}
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Fournisseur</label>
            <select name="fournisseurId" defaultValue={bc.fournisseur.id}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Chantier</label>
            <select name="chantierId" defaultValue={bc.chantier?.id ?? ""}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Sans chantier</option>
              {chantiers.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Statut</label>
            <select name="statut" defaultValue={bc.statut}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {STATUTS.map(s => <option key={s} value={s}>{STATUT_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</label>
            <input name="notes" type="text" defaultValue={bc.notes ?? ""}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <button type="submit" className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark transition">
            Enregistrer
          </button>
        </div>
      </form>

      {/* Bons de livraison associés */}
      {bc.bonsLivraison.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="mb-2 text-sm font-semibold text-brand-navy">Bons de livraison associés</p>
          <div className="flex flex-wrap gap-2">
            {bc.bonsLivraison.map(bl => (
              <Link
                key={bl.id}
                href={`/bons-livraison/${bl.id}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5 transition"
              >
                {bl.numero} <span className="text-slate-400">—</span> {bl.statut}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Lignes */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="font-semibold text-brand-navy">Lignes de commande</p>
          {dirty && (
            <button
              onClick={handleSaveLignes}
              disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-orange-dark transition"
            >
              <Save className="h-3.5 w-3.5" />
              {saved ? "Sauvegardé ✓" : isPending ? "Sauvegarde…" : "Sauvegarder"}
            </button>
          )}
        </div>

        {error && <p className="px-4 py-2 text-xs text-red-600 bg-red-50">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2">Désignation</th>
                <th className="px-4 py-2 w-20">Unité</th>
                <th className="px-4 py-2 w-24">Quantité</th>
                <th className="px-4 py-2 w-28">PU HT (€)</th>
                <th className="px-4 py-2 w-20">TVA (%)</th>
                <th className="px-4 py-2 w-28 text-right">Total HT</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lignes.map((l) => (
                <tr key={l.key} className="group hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <input value={l.designation} onChange={e => updateLigne(l.key, { designation: e.target.value })}
                      className="w-full rounded border-0 bg-transparent px-0 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/20 focus:rounded-md focus:px-2"
                      placeholder="Désignation de l'article…" />
                  </td>
                  <td className="px-4 py-2">
                    <input value={l.unite} onChange={e => updateLigne(l.key, { unite: e.target.value })}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-center" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min="0" step="0.001" value={l.quantite}
                      onChange={e => updateLigne(l.key, { quantite: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-right" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="number" min="0" step="0.01" value={l.prixUnitaireHT}
                      onChange={e => updateLigne(l.key, { prixUnitaireHT: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm text-right" />
                  </td>
                  <td className="px-4 py-2">
                    <select value={l.tauxTVA} onChange={e => updateLigne(l.key, { tauxTVA: parseFloat(e.target.value) })}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-sm">
                      <option value="5.5">5,5%</option>
                      <option value="10">10%</option>
                      <option value="20">20%</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 text-right font-semibold text-brand-navy whitespace-nowrap">
                    {formatEuros(rowTotal(l))}
                  </td>
                  <td className="px-4 py-2 text-center">
                    <button onClick={() => removeLigne(l.key)}
                      className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Ajouter une ligne */}
        <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between">
          <button onClick={addLigne}
            className="flex items-center gap-1.5 text-sm font-medium text-brand-blue hover:text-brand-navy transition">
            <Plus className="h-4 w-4" /> Ajouter une ligne
          </button>
          {dirty && (
            <button onClick={handleSaveLignes} disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition">
              <Save className="h-4 w-4" />
              {isPending ? "Sauvegarde…" : "Sauvegarder les lignes"}
            </button>
          )}
        </div>

        {/* Totaux */}
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-slate-500">
              <span>Total HT</span>
              <span className="font-semibold">{formatEuros(totalHT)}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>TVA</span>
              <span>{formatEuros(totalTVA)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-300 pt-1 text-brand-navy font-bold">
              <span>Total TTC</span>
              <span className="text-lg">{formatEuros(totalTTC)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    </FullscreenToggle>
  );
}
