"use client";

import { useState, useEffect } from "react";
import { Printer, Maximize2, Minimize2, Download, Eye } from "lucide-react";

export function RentabiliteActions() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFSChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, []);

  function toggleFullscreen() {
    const el = document.getElementById("main-content");
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }

  return (
    <div className="print:hidden flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={toggleFullscreen}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-brand-blue/40 hover:text-brand-blue transition"
      >
        {isFullscreen ? (
          <Minimize2 className="h-4 w-4" />
        ) : (
          <Maximize2 className="h-4 w-4" />
        )}
        {isFullscreen ? "Quitter" : "Plein écran"}
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-violet-400/60 hover:text-violet-700 transition"
      >
        <Eye className="h-4 w-4" />
        Aperçu PDF
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg border border-brand-navy/20 bg-brand-navy/5 px-3 py-2 text-sm font-medium text-brand-navy shadow-sm hover:bg-brand-navy/10 transition"
      >
        <Printer className="h-4 w-4" />
        Imprimer
      </button>

      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-navy transition"
      >
        <Download className="h-4 w-4" />
        Enregistrer PDF
      </button>
    </div>
  );
}
