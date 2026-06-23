"use client";

import { AlignLeft, AlignCenter, AlignRight, Palette, Type } from "lucide-react";
import type { StyleTexte } from "@/lib/style-texte";

export type { StyleTexte };

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28];
const PRESET_COLORS = ["#1e293b", "#1B3F94", "#F7941E", "#dc2626", "#16a34a", "#7c3aed", "#0f766e", "#78716c"];

export function FontToolbar({
  style,
  onChange,
}: {
  style: StyleTexte;
  onChange: (patch: Partial<StyleTexte>) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 mb-1">
      {/* Gras */}
      <button
        type="button"
        title="Gras (Ctrl+B)"
        onClick={() => onChange({ bold: !style.bold })}
        className={`flex h-7 w-7 items-center justify-center rounded font-bold text-sm transition ${
          style.bold ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-200"
        }`}
      >
        B
      </button>

      {/* Italique */}
      <button
        type="button"
        title="Italique (Ctrl+I)"
        onClick={() => onChange({ italic: !style.italic })}
        className={`flex h-7 w-7 items-center justify-center rounded italic text-sm transition ${
          style.italic ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-200"
        }`}
      >
        I
      </button>

      {/* Souligné */}
      <button
        type="button"
        title="Souligné (Ctrl+U)"
        onClick={() => onChange({ underline: !style.underline })}
        className={`flex h-7 w-7 items-center justify-center rounded underline text-sm transition ${
          style.underline ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-200"
        }`}
      >
        S
      </button>

      <div className="mx-1 h-5 w-px bg-slate-300" />

      {/* Taille de police */}
      <label className="flex items-center gap-1 text-xs text-slate-500">
        <Type className="h-3.5 w-3.5" />
        <select
          value={style.fontSize ?? 14}
          onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
          className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs focus:outline-none"
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>{s}pt</option>
          ))}
        </select>
      </label>

      <div className="mx-1 h-5 w-px bg-slate-300" />

      {/* Couleur de texte */}
      <div className="flex items-center gap-1">
        <Palette className="h-3.5 w-3.5 text-slate-400" />
        <div className="flex gap-0.5">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              onClick={() => onChange({ color: c })}
              style={{ background: c }}
              className={`h-5 w-5 rounded transition hover:scale-110 ${
                style.color === c ? "ring-2 ring-offset-1 ring-brand-blue" : ""
              }`}
            />
          ))}
        </div>
        {/* Couleur personnalisée */}
        <label title="Couleur personnalisée" className="cursor-pointer">
          <input
            type="color"
            value={style.color ?? "#1e293b"}
            onChange={(e) => onChange({ color: e.target.value })}
            className="h-5 w-5 cursor-pointer rounded border border-slate-300 p-0"
          />
        </label>
        {style.color && (
          <button
            type="button"
            title="Réinitialiser la couleur"
            onClick={() => onChange({ color: undefined })}
            className="rounded p-0.5 text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        )}
      </div>

      <div className="mx-1 h-5 w-px bg-slate-300" />

      {/* Alignement */}
      {(["left", "center", "right"] as const).map((align) => {
        const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
        const label = align === "left" ? "Gauche" : align === "center" ? "Centré" : "Droite";
        return (
          <button
            key={align}
            type="button"
            title={label}
            onClick={() => onChange({ align })}
            className={`flex h-7 w-7 items-center justify-center rounded transition ${
              (style.align ?? "left") === align
                ? "bg-brand-navy text-white"
                : "text-slate-500 hover:bg-slate-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}

      <div className="mx-1 h-5 w-px bg-slate-300" />

      {/* Réinitialiser */}
      <button
        type="button"
        title="Effacer la mise en forme"
        onClick={() => onChange({ bold: false, italic: false, underline: false, fontSize: undefined, color: undefined, align: "left" })}
        className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600"
      >
        Effacer
      </button>
    </div>
  );
}
