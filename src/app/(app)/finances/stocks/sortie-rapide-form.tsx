"use client";

import { useRef, useState, useTransition } from "react";
import { createMouvement } from "@/lib/actions/stock";

interface ArticleInfo {
  id: string;
  designation: string;
  reference: string;
  unite: string;
  cump: number;
  stockActuel: number;
}
interface Chantier { id: string; nom: string; reference: string }

export function SortiRapideForm({
  articles,
  chantiers,
}: {
  articles: ArticleInfo[];
  chantiers: Chantier[];
}) {
  const [selected, setSelected] = useState<ArticleInfo | null>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function handleArticleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const article = articles.find((a) => a.id === e.target.value) ?? null;
    setSelected(article);
    setSuccess(false);
  }

  function handleSubmit(formData: FormData) {
    formData.set("type", "SORTIE");
    formData.set("emplacement", "DEPOT");
    startTransition(async () => {
      await createMouvement(formData);
      setSuccess(true);
      setSelected(null);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* Article — auto-rempli */}
      <div className="lg:col-span-2">
        <label className="mb-1 block text-xs font-semibold text-slate-500">Article *</label>
        <select
          name="articleId"
          required
          onChange={handleArticleChange}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="">— Sélectionner un article —</option>
          {articles.map((a) => (
            <option key={a.id} value={a.id}>
              {a.designation} ({a.reference}) · stock : {a.stockActuel} {a.unite}
            </option>
          ))}
        </select>
        {selected && (
          <p className="mt-1 text-xs text-brand-blue">
            CUMP : <strong>{selected.cump.toFixed(4)} €/{selected.unite}</strong> · Stock dispo : {selected.stockActuel} {selected.unite}
          </p>
        )}
      </div>

      {/* Chantier */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Chantier *</label>
        <select name="chantierId" required className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">— Chantier —</option>
          {chantiers.map((c) => (
            <option key={c.id} value={c.id}>{c.nom} ({c.reference})</option>
          ))}
        </select>
      </div>

      {/* Quantité */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          Quantité * {selected && <span className="text-slate-400">({selected.unite})</span>}
        </label>
        <input
          name="quantite"
          type="number"
          step="0.001"
          min="0.001"
          required
          max={selected?.stockActuel ?? undefined}
          placeholder="0"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {/* Prix CUMP — auto-rempli, modifiable */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">
          Prix unit. HT (CUMP)
          {selected && <span className="ml-1 rounded-full bg-brand-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-brand-blue">Auto</span>}
        </label>
        <input
          key={selected?.id ?? "none"}
          name="prixUnitaireHT"
          type="number"
          step="0.0001"
          min="0"
          defaultValue={selected ? selected.cump.toFixed(4) : ""}
          placeholder="0.00"
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
        />
      </div>

      {/* Date */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Date</label>
        <input
          name="date"
          type="date"
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {/* Motif */}
      <div>
        <label className="mb-1 block text-xs font-semibold text-slate-500">Motif</label>
        <input
          name="motif"
          placeholder="Consommation chantier"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {/* Submit */}
      <div className="flex items-end lg:col-span-2">
        <button
          type="submit"
          disabled={isPending || !selected}
          className="w-full rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-40"
        >
          {isPending ? "Enregistrement…" : "Enregistrer la sortie"}
        </button>
      </div>

      {success && (
        <div className="sm:col-span-2 lg:col-span-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          Sortie enregistrée avec succès.
        </div>
      )}
    </form>
  );
}
