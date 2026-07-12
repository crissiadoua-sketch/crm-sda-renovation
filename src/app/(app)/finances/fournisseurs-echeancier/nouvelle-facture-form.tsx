"use client";

import { useState, useTransition, useRef } from "react";
import { Plus } from "lucide-react";
import { creerFactureFournisseur } from "@/lib/actions/factures-fournisseur";

interface Fournisseur { id: string; nom: string }
interface Chantier { id: string; nom: string; reference: string }

interface Props {
  fournisseurs: Fournisseur[];
  chantiers: Chantier[];
}

export function NouvelleFactureForm({ fournisseurs, chantiers }: Props) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [montantHT, setMontantHT] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const tva = parseFloat(montantHT) > 0 ? parseFloat(montantHT) * 0.2 : 0;
  const ttc = parseFloat(montantHT) > 0 ? parseFloat(montantHT) * 1.2 : 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark"
      >
        <Plus className="h-4 w-4" />
        Saisir une facture
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-4">
          <h3 className="font-semibold text-brand-navy">Nouvelle facture fournisseur</h3>
        </div>
        <form
          ref={formRef}
          action={(fd) => {
            fd.set("montantTVA", tva.toFixed(2));
            fd.set("montantTTC", ttc.toFixed(2));
            startTransition(() => {
              creerFactureFournisseur(fd).then(() => {
                setOpen(false);
                setMontantHT("");
              });
            });
          }}
          className="flex flex-col gap-4 px-6 py-4"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">Fournisseur *</label>
              <select name="fournisseurId" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="">— Sélectionner —</option>
                {fournisseurs.map((f) => (
                  <option key={f.id} value={f.id}>{f.nom}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">N° facture *</label>
              <input name="numero" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="FAC-2025-001" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Votre référence</label>
              <input name="reference" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="BC-2025-012" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Date de réception</label>
              <input
                name="dateReception"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Date d&apos;échéance</label>
              <input name="dateEcheance" type="date" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">Montant HT *</label>
              <input
                name="montantHT"
                type="number"
                step="0.01"
                min="0"
                required
                value={montantHT}
                onChange={(e) => setMontantHT(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">TVA 20% / TTC</label>
              <div className="flex items-center gap-1 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                {tva > 0 ? `${tva.toFixed(2)} € / ${ttc.toFixed(2)} €` : "—"}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Chantier (optionnel)</label>
            <select name="chantierId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">— Aucun —</option>
              {chantiers.map((c) => (
                <option key={c.id} value={c.id}>{c.nom} ({c.reference})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">Notes</label>
            <textarea name="notes" rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm resize-none" />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark disabled:opacity-50"
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
