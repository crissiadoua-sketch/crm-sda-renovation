"use client";
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="print:hidden rounded-lg bg-white px-4 py-1.5 text-sm font-medium text-[#1E2F6E] hover:bg-slate-100"
    >
      🖨 Imprimer / Enregistrer en PDF
    </button>
  );
}
