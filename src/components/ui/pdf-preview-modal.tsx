"use client";

import { useState } from "react";
import { FileText, X, Printer, ExternalLink, Maximize2 } from "lucide-react";

interface PdfPreviewModalProps {
  href: string;
  label?: string;
  buttonLabel?: string;
  buttonClassName?: string;
  disabled?: boolean;
  disabledTitle?: string;
}

export function PdfPreviewModal({
  href,
  label = "Aperçu PDF",
  buttonLabel,
  buttonClassName,
  disabled = false,
  disabledTitle = "Enregistrez le document avant de prévisualiser",
}: PdfPreviewModalProps) {
  const [open, setOpen] = useState(false);

  const trigger = buttonLabel ?? label;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        title={disabled ? disabledTitle : label}
        onClick={() => setOpen(true)}
        className={
          buttonClassName ??
          "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm hover:border-brand-blue/40 hover:bg-brand-blue/5 hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
        }
      >
        <FileText className="h-4 w-4" />
        {trigger}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center bg-black/60">
          {/* Panneau */}
          <div className="relative flex w-full max-w-5xl flex-col bg-slate-100 shadow-2xl">
            {/* Barre modal */}
            <div className="flex items-center justify-between gap-3 bg-[#1E2F6E] px-4 py-2.5">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-white/70" />
                <span className="text-sm font-semibold text-white">{label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20"
                >
                  <ExternalLink className="h-3 w-3" />
                  Ouvrir dans un onglet
                </a>
                <button
                  onClick={() => {
                    const iframe = document.getElementById("pdf-preview-iframe") as HTMLIFrameElement | null;
                    iframe?.contentWindow?.print();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1 text-xs font-medium text-[#1E2F6E] hover:bg-slate-100"
                >
                  <Printer className="h-3 w-3" />
                  Imprimer / PDF
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
                  aria-label="Fermer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* iframe */}
            <iframe
              id="pdf-preview-iframe"
              src={href}
              className="flex-1 w-full border-0 bg-white"
              title={label}
            />
          </div>
        </div>
      )}
    </>
  );
}
