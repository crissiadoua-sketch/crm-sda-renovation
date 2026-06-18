"use client";

import { useState, useRef } from "react";
import {
  ImageIcon,
  FileText,
  ScanLine,
  Layers,
  Ruler,
  Download,
  ChevronRight,
  Camera,
  ArrowRight,
} from "lucide-react";
import VectorisationCanvas from "./vectorisation-canvas";

export default function VectorisationLauncher() {
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (file) {
    return (
      <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-2.5">
          <div>
            <h2 className="font-bold text-brand-navy">Vectorisation & Mise à l&apos;échelle</h2>
            <p className="text-xs text-slate-500">
              Plan : <strong className="text-slate-700">{file.name}</strong> ·{" "}
              {file.type === "application/pdf" ? "PDF affiché à gauche" : "Image en fond du canvas"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!file.type.startsWith("image/") ? null : (
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                Réglez l&apos;opacité du fond pour mieux tracer
              </span>
            )}
            <button
              onClick={() => setFile(null)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
            >
              ← Changer de fichier
            </button>
            <a
              href="/conception"
              className="text-sm text-brand-blue hover:underline"
            >
              ← Retour conception
            </a>
          </div>
        </div>
        <VectorisationCanvas initialFile={file} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex rounded-full bg-brand-navy/10 p-4">
            <ScanLine className="h-8 w-8 text-brand-navy" />
          </div>
          <h1 className="text-2xl font-bold text-brand-navy">Vectorisation de plan</h1>
          <p className="mt-2 text-slate-500">
            Importez une photo ou un scan de votre plan dessiné à la main.
            Calibrez l&apos;échelle, puis tracez par-dessus pour créer un plan numérique propre.
          </p>
        </div>

        {/* Upload zone */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) setFile(f);
          }}
          className="group mb-6 cursor-pointer rounded-2xl border-2 border-dashed border-brand-blue/40 bg-white p-10 text-center transition hover:border-brand-blue hover:bg-brand-blue/5"
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,application/pdf"
            className="sr-only"
            onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f); }}
          />
          <div className="mb-4 flex justify-center gap-4">
            <div className="rounded-xl bg-slate-100 p-3 group-hover:bg-brand-blue/10">
              <ImageIcon className="h-6 w-6 text-brand-blue" />
            </div>
            <div className="rounded-xl bg-slate-100 p-3 group-hover:bg-brand-blue/10">
              <FileText className="h-6 w-6 text-brand-blue" />
            </div>
            <div className="rounded-xl bg-slate-100 p-3 group-hover:bg-brand-blue/10">
              <Camera className="h-6 w-6 text-brand-blue" />
            </div>
          </div>
          <p className="text-sm font-medium text-brand-navy">
            Cliquez ou glissez-déposez votre fichier
          </p>
          <p className="mt-1 text-xs text-slate-400">
            JPEG · PNG · WEBP · PDF — taille max recommandée : 10 Mo
          </p>
        </div>

        {/* How it works */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-brand-navy">Comment ça marche</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: <Camera className="h-5 w-5 text-brand-orange" />,
                step: "1",
                title: "Prenez une photo",
                desc: "Photographiez votre plan dessiné à la main sur papier",
              },
              {
                icon: <Layers className="h-5 w-5 text-brand-blue" />,
                step: "2",
                title: "Importez le fichier",
                desc: "Photo (JPEG/PNG) ou scan (PDF) — apparaît en fond transparent",
              },
              {
                icon: <ScanLine className="h-5 w-5 text-brand-orange" />,
                step: "3",
                title: "Calibrez l'échelle",
                desc: "Tracez une ligne sur une distance connue et entrez sa mesure réelle",
              },
              {
                icon: <Ruler className="h-5 w-5 text-brand-blue" />,
                step: "4",
                title: "Tracez & cotez",
                desc: "Retracez les murs et ajoutez des cotes — en cm ou en mètres réels",
              },
            ].map(({ icon, step, title, desc }) => (
              <div key={step} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-[10px] font-bold text-white">
                    {step}
                  </span>
                  {icon}
                  <span className="text-sm font-medium text-slate-700">{title}</span>
                </div>
                <p className="text-xs text-slate-500 pl-7">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature list */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {[
            "Calibration d'échelle réelle (m / cm)",
            "Opacité du fond ajustable",
            "Outils : crayon, ligne, rectangle, cercle, cote",
            "PDF affiché côte à côte",
            "Cotation automatique en unités réelles",
            "Export PNG propre",
          ].map(f => (
            <div key={f} className="flex items-start gap-1.5 text-xs text-slate-600">
              <ChevronRight className="mt-0.5 h-3 w-3 shrink-0 text-brand-blue" />
              {f}
            </div>
          ))}
        </div>

        {/* Export note */}
        <div className="mt-5 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          <Download className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Après traçage, exportez le plan en PNG. Pour insérer dans un devis ou un DOE,
            attachez-le comme document à votre chantier via le module{" "}
            <a href="/documents" className="underline">Documents</a>.
          </span>
        </div>

        <div className="mt-6 text-center">
          <a href="/conception" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600">
            <ArrowRight className="h-3 w-3 rotate-180" />
            Retour au catalogue Conception
          </a>
        </div>
      </div>
    </div>
  );
}
