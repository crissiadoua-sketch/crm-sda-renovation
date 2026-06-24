"use client";

import { useEffect, useRef, useState } from "react";
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp, Eraser } from "lucide-react";

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28];
const FONT_FAMILIES = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];
const PRESET_COLORS = ["#1e293b", "#1B3F94", "#F7941E", "#dc2626", "#16a34a", "#7c3aed", "#0f766e", "#78716c"];

// Éditeur de texte enrichi — permet d'appliquer gras/italique/souligné/taille/
// couleur/alignement sur une SÉLECTION à l'intérieur du texte (pas tout le
// champ comme l'ancien FontToolbar), via contentEditable + Selection API.
// Le contenu est stocké en HTML ; il doit être assaini (sanitizeRichText)
// avant tout affichage en dehors de cet éditeur.
export function RichTextEditor({
  value,
  onChange,
  rows = 3,
  placeholder,
  className,
}: {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string | null>(null);
  const [toolbarOpen, setToolbarOpen] = useState(true);

  useEffect(() => {
    if (ref.current && value !== lastValue.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
      lastValue.current = value;
    }
  }, [value]);

  const emit = () => {
    const html = ref.current?.innerHTML ?? "";
    lastValue.current = html;
    onChange(html);
  };

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    emit();
  };

  const applyFontSize = (px: number) => {
    const sel = window.getSelection();
    ref.current?.focus();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontSize = `${px}px`;
    try {
      range.surroundContents(span);
    } catch {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    sel.removeAllRanges();
    emit();
  };

  const applyFontFamily = (family: string) => {
    const sel = window.getSelection();
    ref.current?.focus();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    const span = document.createElement("span");
    span.style.fontFamily = family;
    try {
      range.surroundContents(span);
    } catch {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    sel.removeAllRanges();
    emit();
  };

  const applyAlign = (align: "left" | "center" | "right") => {
    ref.current?.focus();
    document.execCommand(align === "left" ? "justifyLeft" : align === "center" ? "justifyCenter" : "justifyRight");
    emit();
  };

  const btnCls = "flex h-5 w-5 items-center justify-center rounded text-[11px] text-slate-600 transition hover:bg-slate-200";
  const selectCls = "rounded border border-slate-200 bg-white px-1 py-0.5 text-[10px] leading-tight text-slate-500 focus:outline-none";
  const toggleBtnCls = "flex h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-600";

  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className ?? ""}`}>
      {toolbarOpen ? (
        <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-slate-200 bg-slate-50 px-1.5 py-1">
          <button type="button" title="Gras" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} className={`${btnCls} font-bold`}>B</button>
          <button type="button" title="Italique" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} className={`${btnCls} italic`}>I</button>
          <button type="button" title="Souligné" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} className={`${btnCls} underline`}>S</button>

          <div className="mx-0.5 h-4 w-px bg-slate-300" />

          <select
            title="Police"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { const v = e.target.value; if (v) applyFontFamily(v); e.target.value = ""; }}
            defaultValue=""
            className={`${selectCls} max-w-[5.5rem]`}
          >
            <option value="">Police…</option>
            {FONT_FAMILIES.map((f) => <option key={f.label} value={f.value}>{f.label}</option>)}
          </select>

          <select
            title="Taille"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { const v = Number(e.target.value); if (v) applyFontSize(v); e.target.value = ""; }}
            defaultValue=""
            className={`${selectCls} max-w-[3.5rem]`}
          >
            <option value="">Taille…</option>
            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}pt</option>)}
          </select>

          <div className="mx-0.5 h-4 w-px bg-slate-300" />

          <div className="flex gap-0.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec("foreColor", c)}
                style={{ background: c }}
                className="h-4 w-4 rounded-sm transition hover:scale-110"
              />
            ))}
          </div>

          <div className="mx-0.5 h-4 w-px bg-slate-300" />

          {(["left", "center", "right"] as const).map((align) => {
            const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
            return (
              <button key={align} type="button" title={align} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAlign(align)} className={btnCls}>
                <Icon className="h-3 w-3" />
              </button>
            );
          })}

          <button type="button" title="Effacer la mise en forme" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("removeFormat")} className={btnCls}>
            <Eraser className="h-3 w-3" />
          </button>

          <button
            type="button"
            title="Masquer la barre d'outils"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setToolbarOpen(false)}
            className={`${toggleBtnCls} ml-auto`}
          >
            <ChevronUp className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-end rounded-t-lg border-b border-slate-100 bg-slate-50 px-1.5 py-0.5">
          <button
            type="button"
            title="Afficher la barre d'outils"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setToolbarOpen(true)}
            className={toggleBtnCls}
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>
      )}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className="whitespace-pre-wrap px-3 py-2 text-sm leading-snug focus:outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
        style={{ minHeight: `${rows * 1.4}rem` }}
      />
    </div>
  );
}
