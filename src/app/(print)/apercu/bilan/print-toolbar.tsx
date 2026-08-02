"use client";

export function PrintToolbar({ label, showCodes }: { label: string; showCodes: boolean }) {
  function toggleCodes() {
    const url = new URL(window.location.href);
    if (showCodes) {
      url.searchParams.delete("codes");
    } else {
      url.searchParams.set("codes", "1");
    }
    window.location.href = url.toString();
  }

  return (
    <div className="print:hidden sticky top-0 z-50 flex items-center justify-between gap-3 bg-gradient-to-r from-[#1976D2] via-[#1B3F94] to-[#1E2F6E] px-6 py-3 shadow-lg border-b-[3px] border-[#F7941E]">
      <span className="text-sm font-semibold text-white">{label}</span>
      <div className="flex items-center gap-3">
        <label className="flex cursor-pointer select-none items-center gap-1.5">
          <input
            type="checkbox"
            checked={showCodes}
            onChange={toggleCodes}
            className="h-3.5 w-3.5 accent-[#F7941E]"
          />
          <span className="text-xs font-medium text-white/80">Codes PCG</span>
        </label>
        <button onClick={() => window.print()} className="rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-[#1E2F6E] hover:bg-slate-100">🖨 Imprimer / PDF</button>
        <button onClick={() => window.close()} className="rounded-lg bg-white/10 px-4 py-1.5 text-sm font-medium text-white hover:bg-white/20">✕ Fermer</button>
      </div>
    </div>
  );
}
