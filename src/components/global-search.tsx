"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, X, Building2, HardHat, FileText, Receipt, Wrench, Loader2, Truck, Users, ShoppingCart, ClipboardList } from "lucide-react";

type SearchResult = {
  type: string;
  label: string;
  sublabel?: string;
  href: string;
  badge?: string;
};

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  client: Building2,
  fournisseur: Truck,
  "sous-traitant": Users,
  chantier: HardHat,
  devis: FileText,
  facture: Receipt,
  "bon-commande": ShoppingCart,
  "ordre-mission": ClipboardList,
  ouvrage: Wrench,
};

const TYPE_COLORS: Record<string, string> = {
  client: "bg-blue-100 text-blue-700",
  fournisseur: "bg-cyan-100 text-cyan-700",
  "sous-traitant": "bg-indigo-100 text-indigo-700",
  chantier: "bg-orange-100 text-orange-700",
  devis: "bg-purple-100 text-purple-700",
  facture: "bg-green-100 text-green-700",
  "bon-commande": "bg-amber-100 text-amber-700",
  "ordre-mission": "bg-rose-100 text-rose-700",
  ouvrage: "bg-slate-100 text-slate-600",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const res = await fetch(`/api/recherche?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
      const data = await res.json();
      setResults(data.results ?? []);
      setActiveIdx(-1);
    } catch (e) {
      if ((e as Error).name !== "AbortError") setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 250);
    return () => clearTimeout(timeout);
  }, [query, search]);

  // Ferme si clic hors du composant
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Raccourci clavier Ctrl+K / Cmd+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") { setOpen(false); setQuery(""); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    router.push(href);
  }

  function onKeyDownInput(e: React.KeyboardEvent) {
    if (!results.length) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, results.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    if (e.key === "Enter" && activeIdx >= 0) { navigate(results[activeIdx].href); }
  }

  const showDropdown = open && query.length >= 2;

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xl">
      {/* Champ de recherche */}
      <div
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500 cursor-text transition hover:border-slate-300 hover:bg-white focus-within:border-brand-blue focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-blue/10"
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand-blue" />
        ) : (
          <Search className="h-4 w-4 shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher un client, chantier, devis… (Ctrl+K)"
          className="flex-1 bg-transparent outline-none placeholder:text-slate-400 text-slate-800"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDownInput}
        />
        {query && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setQuery(""); setResults([]); inputRef.current?.focus(); }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {!query && (
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            Ctrl K
          </kbd>
        )}
      </div>

      {/* Dropdown des résultats */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-8 text-center text-sm text-slate-400">
              Aucun résultat pour «&nbsp;{query}&nbsp;»
            </div>
          ) : (
            <>
              <ul className="max-h-96 overflow-y-auto py-1">
                {results.map((r, i) => {
                  const Icon = TYPE_ICONS[r.type] ?? Search;
                  const colorClass = TYPE_COLORS[r.type] ?? "bg-slate-100 text-slate-600";
                  return (
                    <li key={`${r.type}-${r.href}-${i}`}>
                      <button
                        type="button"
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                          i === activeIdx ? "bg-brand-blue/5" : "hover:bg-slate-50"
                        }`}
                        onClick={() => navigate(r.href)}
                        onMouseEnter={() => setActiveIdx(i)}
                      >
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="flex flex-col min-w-0">
                          <span className="truncate text-sm font-medium text-slate-800">{r.label}</span>
                          {r.sublabel && (
                            <span className="truncate text-xs text-slate-500">{r.sublabel}</span>
                          )}
                        </span>
                        <span className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colorClass}`}>
                          {r.badge}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-slate-100 px-4 py-2 text-[11px] text-slate-400 flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono">↑↓</kbd>
                  Naviguer
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono">↵</kbd>
                  Ouvrir
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="rounded border border-slate-200 bg-slate-50 px-1 py-0.5 font-mono">Échap</kbd>
                  Fermer
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
