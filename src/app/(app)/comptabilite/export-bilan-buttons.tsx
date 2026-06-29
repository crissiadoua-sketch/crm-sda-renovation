"use client";

import { FileSpreadsheet, FileText } from "lucide-react";

export function ExportBilanButtons({ periodeQuery }: { periodeQuery: string }) {
  return (
    <>
      <a
        href={`/api/comptabilite/export-excel?${periodeQuery}`}
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
        Excel
      </a>
      <a
        href={`/apercu/comptabilite?${periodeQuery}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <FileText className="h-4 w-4 text-red-500" />
        PDF
      </a>
    </>
  );
}
