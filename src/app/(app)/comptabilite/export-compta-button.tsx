"use client";

import { useState } from "react";
import { Download } from "lucide-react";

export function ExportComptaButton({
  factureIds,
  depenseIds,
  periode,
}: {
  factureIds: string[];
  depenseIds: string[];
  periode:    string;
}) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/export-comptabilite?periode=${encodeURIComponent(periode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factureIds, depenseIds }),
      });
      if (!res.ok) throw new Error("Export échoué");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `export-compta-${periode}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Erreur lors de l'export CSV.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading || (factureIds.length === 0 && depenseIds.length === 0)}
      className="flex items-center gap-2 rounded-xl bg-brand-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue-dark transition disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {loading ? "Export en cours…" : "Exporter CSV comptable"}
    </button>
  );
}
