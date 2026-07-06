"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importerArticlesStock, type ImportArticle } from "@/lib/actions/stock";

const CORPS_ETAT_OPTIONS = ["GO","CHA","COU","ETA","MEX","MIN","PLA","ISO","CAR","PEI","PLO","ELE","CVC","VRD","DEM","BUR","GEN"];
const CATEGORIE_OPTIONS = ["MATERIAU","FOURNITURE","OUTILLAGE","EPI","CONSOMMABLE"];
const UNITE_OPTIONS = ["u","m²","ml","L","kg","m³","boîte","rouleau","sac","carton","palette","lot"];

type ArticleRow = ImportArticle & { selected: boolean; key: string; doublon: boolean; doublonRef?: string };

export function ImportStockClient({ fournisseurs }: { fournisseurs: { id: string; nom: string }[] }) {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [analysing, setAnalysing] = useState(false);
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [fournisseurId, setFournisseurId] = useState("");
  const [fournisseurDetecte, setFournisseurDetecte] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number } | null>(null);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  async function analyseFile(file: File) {
    setError(null); setArticles([]); setResult(null); setFournisseurDetecte(null);
    setAnalysing(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("fournisseurs", JSON.stringify(fournisseurs));
      const res = await fetch("/api/stock/import-analyse", { method: "POST", body: fd });
      const data = await res.json() as {
        articles?: (ImportArticle & { doublon?: boolean; doublonRef?: string })[];
        fournisseurNom?: string;
        fournisseurId?: string;
        error?: string;
        debug?: string;
      };
      if (data.error) { setError(data.error); return; }
      if (!data.articles?.length) {
        setError(data.debug ?? "Aucun article détecté. Assurez-vous de déposer une facture ou devis fournisseur avec des lignes articles.");
        return;
      }
      // Auto-sélection du fournisseur détecté
      if (data.fournisseurId) {
        setFournisseurId(data.fournisseurId);
        setFournisseurDetecte(data.fournisseurNom ?? null);
      } else if (data.fournisseurNom) {
        setFournisseurDetecte(data.fournisseurNom);
      }
      setArticles(data.articles.map((a, i) => ({
        ...a,
        doublon:    a.doublon ?? false,
        doublonRef: a.doublonRef,
        selected:   !a.doublon, // doublons décochés par défaut
        key:        `${i}-${a.designation}`,
      })));
    } catch { setError("Erreur lors de l'analyse. Vérifiez votre connexion."); }
    finally { setAnalysing(false); }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) analyseFile(file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) analyseFile(file);
    e.target.value = "";
  }

  function updateRow(key: string, patch: Partial<ArticleRow>) {
    setArticles((prev) => prev.map((a) => a.key === key ? { ...a, ...patch } : a));
  }

  function toggleAll(v: boolean) {
    setArticles((prev) => prev.map((a) => ({ ...a, selected: v })));
  }

  function handleImport() {
    const toImport = articles.filter((a) => a.selected).map((a) => ({ ...a, fournisseurId: fournisseurId || undefined }));
    if (!toImport.length) return;
    startTransition(async () => {
      const res = await importerArticlesStock(toImport);
      setResult({ created: res.created });
      if (res.created > 0) setTimeout(() => router.push("/stock"), 2000);
    });
  }

  const selectedCount = articles.filter((a) => a.selected).length;
  const doublonCount  = articles.filter((a) => a.doublon).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Zone dépôt */}
      {!articles.length && !analysing && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed px-8 py-16 text-center transition ${dragging ? "border-brand-blue bg-brand-blue/5" : "border-slate-300 bg-white hover:border-brand-blue/50 hover:bg-slate-50"}`}
        >
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFile} />
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-700">Déposer une facture ou un devis fournisseur</p>
          <p className="mt-1 text-sm text-slate-400">PDF, JPG, PNG, WEBP — l&apos;IA extrait les articles et identifie le fournisseur</p>
          <p className="mt-3 inline-flex items-center rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white">
            Parcourir les fichiers
          </p>
        </div>
      )}

      {/* Chargement */}
      {analysing && (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200 bg-white py-16">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-navy border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Analyse en cours…</p>
          <p className="text-xs text-slate-400">Identification du fournisseur · Extraction des articles · Vérification des doublons</p>
        </div>
      )}

      {/* Erreur */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => { setError(null); inputRef.current?.click(); }} className="ml-3 underline text-red-600">Réessayer</button>
        </div>
      )}

      {/* Résultat import */}
      {result && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 font-medium">
          ✓ {result.created} article{result.created > 1 ? "s" : ""} importé{result.created > 1 ? "s" : ""} dans le stock. Redirection…
        </div>
      )}

      {/* Tableau de revue */}
      {articles.length > 0 && !result && (
        <>
          {/* Fournisseur détecté */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Fournisseur du document</p>
                {fournisseurDetecte && (
                  <p className="text-sm text-slate-700 mb-2">
                    <span className="font-medium text-emerald-600">✓ Détecté :</span> {fournisseurDetecte}
                    {fournisseurId && <span className="ml-2 text-xs text-emerald-500">(lié à un fournisseur CRM)</span>}
                    {!fournisseurId && <span className="ml-2 text-xs text-amber-500">(non trouvé dans le CRM — sélectionnez ci-dessous)</span>}
                  </p>
                )}
                <select value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 min-w-64">
                  <option value="">— Aucun fournisseur —</option>
                  {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
                </select>
              </div>
              <div className="text-right text-xs text-slate-500">
                <p className="font-semibold text-brand-navy">{articles.length} articles détectés</p>
                {doublonCount > 0 && <p className="text-amber-600">{doublonCount} doublon{doublonCount > 1 ? "s" : ""} détecté{doublonCount > 1 ? "s" : ""} (décochés)</p>}
                <p className="text-emerald-600">{selectedCount} sélectionné{selectedCount > 1 ? "s" : ""} pour import</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => toggleAll(true)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">Tout sélectionner</button>
              <button onClick={() => toggleAll(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50">Tout désélectionner</button>
              <button onClick={() => setArticles((prev) => prev.map((a) => ({ ...a, selected: !a.doublon })))}
                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 hover:bg-amber-100">
                Sélectionner hors doublons
              </button>
              <button onClick={() => { setArticles([]); setError(null); setFournisseurDetecte(null); }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50 ml-auto">
                Nouvelle analyse
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    <th className="px-2 py-2 w-8">
                      <input type="checkbox" checked={selectedCount === articles.length} onChange={(e) => toggleAll(e.target.checked)} className="h-3.5 w-3.5 rounded" />
                    </th>
                    <th className="px-2 py-2 min-w-[200px]">Désignation</th>
                    <th className="px-2 py-2 w-28">Réf. fournisseur</th>
                    <th className="px-2 py-2 w-16">Unité</th>
                    <th className="px-2 py-2 w-24">Prix HT</th>
                    <th className="px-2 py-2 w-20">Corps d'état</th>
                    <th className="px-2 py-2 w-28">Catégorie</th>
                    <th className="px-2 py-2 w-32">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {articles.map((row) => (
                    <tr key={row.key} className={`${row.selected ? "bg-white" : "bg-slate-50 opacity-60"} ${row.doublon ? "border-l-2 border-amber-400" : ""}`}>
                      <td className="px-2 py-2">
                        <input type="checkbox" checked={row.selected} onChange={(e) => updateRow(row.key, { selected: e.target.checked })} className="h-3.5 w-3.5 rounded" />
                      </td>
                      <td className="px-2 py-2">
                        <input value={row.designation} onChange={(e) => updateRow(row.key, { designation: e.target.value })}
                          className="w-full rounded border border-transparent px-1 py-0.5 hover:border-slate-200 focus:border-brand-blue focus:outline-none" />
                      </td>
                      <td className="px-2 py-2">
                        <input value={row.reference} onChange={(e) => updateRow(row.key, { reference: e.target.value })}
                          className="w-full rounded border border-transparent px-1 py-0.5 hover:border-slate-200 focus:border-brand-blue focus:outline-none" />
                      </td>
                      <td className="px-2 py-2">
                        <select value={row.unite} onChange={(e) => updateRow(row.key, { unite: e.target.value })}
                          className="w-full rounded border border-transparent px-1 py-0.5 hover:border-slate-200 focus:border-brand-blue focus:outline-none bg-transparent">
                          {UNITE_OPTIONS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" min="0" value={row.prixUnitaireHT}
                          onChange={(e) => updateRow(row.key, { prixUnitaireHT: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-transparent px-1 py-0.5 hover:border-slate-200 focus:border-brand-blue focus:outline-none text-right" />
                      </td>
                      <td className="px-2 py-2">
                        <select value={row.corpsEtat} onChange={(e) => updateRow(row.key, { corpsEtat: e.target.value })}
                          className="w-full rounded border border-transparent px-1 py-0.5 hover:border-slate-200 focus:border-brand-blue focus:outline-none bg-transparent">
                          {CORPS_ETAT_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        <select value={row.categorie} onChange={(e) => updateRow(row.key, { categorie: e.target.value })}
                          className="w-full rounded border border-transparent px-1 py-0.5 hover:border-slate-200 focus:border-brand-blue focus:outline-none bg-transparent">
                          {CATEGORIE_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-2">
                        {row.doublon ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            ⚠ Doublon ({row.doublonRef})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            ✓ Nouveau
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => { setArticles([]); setError(null); setFournisseurDetecte(null); }}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              Annuler
            </button>
            <button onClick={handleImport} disabled={selectedCount === 0}
              className="rounded-lg bg-brand-navy px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark transition disabled:opacity-40">
              ⬇ Importer {selectedCount > 0 ? `${selectedCount} article${selectedCount > 1 ? "s" : ""}` : ""}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
