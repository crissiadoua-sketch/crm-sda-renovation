"use client";

import { useState, useEffect } from "react";
import { Maximize2, Minimize2, Printer, FileSpreadsheet } from "lucide-react";

export function PrevToolbar({ exportUrl }: { exportUrl: string }) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <a
        href={exportUrl}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
        Excel
      </a>
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Printer className="h-4 w-4 text-red-500" />
        Imprimer
      </button>
      <button
        type="button"
        onClick={toggleFullscreen}
        title={fullscreen ? "Quitter le plein écran" : "Plein écran"}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </button>
    </div>
  );
}
