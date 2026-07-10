"use client";

import { Download } from "lucide-react";

export function FecDownloadButton({ annee }: { annee: number }) {
  return (
    <a
      href={`/api/compta/fec?annee=${annee}`}
      download
      className="flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-navy transition"
    >
      <Download className="h-4 w-4" />
      Télécharger
    </a>
  );
}
