"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";

// Enveloppe un module d'édition de document (devis, facture, PV, bons…) avec un
// bouton qui bascule son affichage en superposition plein écran (au-dessus de la
// barre latérale et du header de l'app), pour travailler plus confortablement sur
// de longs formulaires. Échap ou le bouton referme le mode plein écran.
export function FullscreenToggle({ children }: { children: ReactNode }) {
  const [pleinEcran, setPleinEcran] = useState(false);

  useEffect(() => {
    if (!pleinEcran) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPleinEcran(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pleinEcran]);

  return (
    <div className={pleinEcran ? "fixed inset-0 z-50 overflow-y-auto bg-slate-50 p-4 sm:p-6" : ""}>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setPleinEcran((v) => !v)}
          title={pleinEcran ? "Quitter le plein écran (Échap)" : "Afficher en plein écran"}
          className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {pleinEcran ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {pleinEcran ? "Quitter le plein écran" : "Plein écran"}
        </button>
      </div>
      {children}
    </div>
  );
}
