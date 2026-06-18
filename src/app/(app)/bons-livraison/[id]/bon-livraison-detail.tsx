"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Save, CheckCircle2 } from "lucide-react";
import { mettreAJourBonLivraison, sauvegarderLignesBl, supprimerBonLivraison, type LigneBlData } from "@/lib/actions/bons-livraison";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type LigneBl = {
  id: string; ordre: number; designation: string;
  unite: string | null; quantiteCommandee: number | null;
  quantiteRecue: number | null; notes: string | null;
};

type BlData = {
  id: string; numero: string; statut: string; notes: string | null;
  dateLivraison: Date | null; createdAt: Date;
  fournisseur: { id: string; nom: string };
  chantier:    { id: string; nom: string } | null;
  bonCommande: { id: string; numero: string } | null;
  lignes:      LigneBl[];
};

type LigneRow = {
  key: string; designation: string; unite: string;
  quantiteCommandee: number; quantiteRecue: number; notes: string;
};

const STATUT_TONES: Record<string, "green" | "blue" | "orange" | "gray" | "red" | "navy"> = {
  ATTENDU: "blue", PARTIEL: "orange", COMPLET: "green",
};
const STATUT_LABELS: Record<string, string> = {
  ATTENDU: "Attendu", PARTIEL: "Reçu partiel", COMPLET: "Reçu complet",
};

let counter = 0;
const newKey = () => `new-${++counter}`;

export function BonLivraisonDetail({ bl }: { bl: BlData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [lignes, setLignes] = useState<LigneRow[]>(
    bl.lignes.length > 0
      ? bl.lignes.map(l => ({
          key:               l.id,
          designation:       l.designation,
          unite:             l.unite ?? "u",
          quantiteCommandee: l.quantiteCommandee ?? 0,
          quantiteRecue:     l.quantiteRecue ?? 0,
          notes:             l.notes ?? "",
        }))
      : [{ key: newKey(), designation: "", unite: "u", quantiteCommandee: 0, quantiteRecue: 0, notes: "" }]
  );

  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calcul statut en direct
  const totalCmd  = lignes.reduce((s, l) => s + l.quantiteCommandee, 0);
  const totalRecu = lignes.reduce((s, l) => s + l.quantiteRecue, 0);
  const progression = totalCmd > 0 ? Math.round((totalRecu / totalCmd) * 100) : 0;
  const statutLocal = totalRecu >= totalCmd && totalCmd > 0 ? "COMPLET" : totalRecu > 0 ? "PARTIEL" : "ATTENDU";

  function updateLigne(key: string, patch: Partial<LigneRow>) {
    setLignes(prev => prev.map(l => l.key === key ? { ...l, ...patch } : l));
    setDirty(true);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      try {
        await sauvegarderLignesBl(bl.id, lignes.map((l, i) => ({ ...l, ordre: i })));
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
    if (!confirm(`Supprimer le bon de livraison ${bl.numero} ?`)) return;
    startTransition(async () => { await supprimerBonLivraison(bl.id); });
  }

  function handleToutRecu() {
    setLignes(prev => prev.map(l => ({ ...l, quantiteRecue: l.quantiteCommandee })));
    setDirty(true);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/bons-livraison" className="text-sm text-brand-blue hover:underline">← Bons de livraison</Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{bl.numero}</h2>
            <Badge tone={STATUT_TONES[statutLocal] ?? "gray"}>{STATUT_LABELS[statutLocal]}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {bl.fournisseur.nom} · {bl.chantier?.nom ?? "Sans chantier"}
            {bl.bonCommande && (
              <> · BC : <Link href={`/bons-commande/${bl.bonCommande.id}`} className="text-brand-blue hover:underline">{bl.bonCommande.numero}</Link></>
            )}
          </p>
        </div>
        <button onClick={handleDelete} disabled={isPending}
          className="flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition self-start">
          <Trash2 className="h-3.5 w-3.5" /> Supprimer
        </button>
      </div>

      {/* Progression */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-brand-navy">Réception</span>
          <span className="text-sm font-bold text-brand-navy">{progression} %</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${progression >= 100 ? "bg-emerald-500" : progression > 0 ? "bg-amber-400" : "bg-slate-300"}`}
            style={{ width: `${progression}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-slate-500">{totalRecu.toFixed(2)} reçus / {totalCmd.toFixed(2)} commandés</p>
      </div>

      {/* Lignes */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="font-semibold text-brand-navy">Lignes de livraison</p>
          <div className="flex gap-2">
            <button onClick={handleToutRecu}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition">
              <CheckCircle2 className="h-3.5 w-3.5" /> Tout reçu
            </button>
            {dirty && (
              <button onClick={handleSave} disabled={isPending}
                className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-orange-dark transition">
                <Save className="h-3.5 w-3.5" />
                {saved ? "Sauvegardé ✓" : isPending ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            )}
          </div>
        </div>

        {error && <p className="px-4 py-2 text-xs text-red-600 bg-red-50">{error}</p>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-2">Désignation</th>
                <th className="px-4 py-2 w-20">Unité</th>
                <th className="px-4 py-2 w-28">Qté commandée</th>
                <th className="px-4 py-2 w-28">Qté reçue</th>
                <th className="px-4 py-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {lignes.map(l => {
                const ok = l.quantiteRecue >= l.quantiteCommandee && l.quantiteCommandee > 0;
                return (
                  <tr key={l.key} className={`hover:bg-slate-50 ${ok ? "bg-emerald-50/30" : ""}`}>
                    <td className="px-4 py-2">
                      <span className="font-medium text-slate-700">{l.designation || "—"}</span>
                    </td>
                    <td className="px-4 py-2 text-center text-slate-500">{l.unite}</td>
                    <td className="px-4 py-2 text-center text-slate-600">{l.quantiteCommandee}</td>
                    <td className="px-4 py-2">
                      <input
                        type="number" min="0" step="0.001"
                        value={l.quantiteRecue}
                        onChange={e => updateLigne(l.key, { quantiteRecue: parseFloat(e.target.value) || 0 })}
                        className={`w-full rounded border px-2 py-1 text-sm text-right font-semibold ${ok ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-white text-slate-700"}`}
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input value={l.notes} onChange={e => updateLigne(l.key, { notes: e.target.value })}
                        placeholder="Observation…"
                        className="w-full border-0 bg-transparent text-sm text-slate-500 focus:outline-none" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {dirty && (
          <div className="border-t border-slate-100 px-4 py-3 flex justify-end">
            <button onClick={handleSave} disabled={isPending}
              className="flex items-center gap-1.5 rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange-dark transition">
              <Save className="h-4 w-4" />
              {isPending ? "Sauvegarde…" : "Enregistrer la réception"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
