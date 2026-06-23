"use client";

import { useEffect, useRef } from "react";
import { AlignLeft, AlignCenter, AlignRight, Palette, Type } from "lucide-react";

const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28];
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
  const lastValue = useRef(value);

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

  const applyAlign = (align: "left" | "center" | "right") => {
    ref.current?.focus();
    document.execCommand(align === "left" ? "justifyLeft" : align === "center" ? "justifyCenter" : "justifyRight");
    emit();
  };

  const btnCls = "flex h-7 w-7 items-center justify-center rounded text-sm text-slate-600 transition hover:bg-slate-200";

  return (
    <div className={`rounded-lg border border-slate-200 bg-white ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border-b border-slate-200 bg-slate-50 px-2 py-1.5">
        <button type="button" title="Gras" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("bold")} className={`${btnCls} font-bold`}>B</button>
        <button type="button" title="Italique" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("italic")} className={`${btnCls} italic`}>I</button>
        <button type="button" title="Souligné" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("underline")} className={`${btnCls} underline`}>S</button>

        <div className="mx-1 h-5 w-px bg-slate-300" />

        <label className="flex items-center gap-1 text-xs text-slate-500">
          <Type className="h-3.5 w-3.5" />
          <select
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { const v = Number(e.target.value); if (v) applyFontSize(v); e.target.value = ""; }}
            defaultValue=""
            className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs focus:outline-none"
          >
            <option value="">Taille…</option>
            {FONT_SIZES.map((s) => <option key={s} value={s}>{s}pt</option>)}
          </select>
        </label>

        <div className="mx-1 h-5 w-px bg-slate-300" />

        <div className="flex items-center gap-1">
          <Palette className="h-3.5 w-3.5 text-slate-400" />
          <div className="flex gap-0.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                title={c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => exec("foreColor", c)}
                style={{ background: c }}
                className="h-5 w-5 rounded transition hover:scale-110"
              />
            ))}
          </div>
        </div>

        <div className="mx-1 h-5 w-px bg-slate-300" />

        {(["left", "center", "right"] as const).map((align) => {
          const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
          return (
            <button key={align} type="button" title={align} onMouseDown={(e) => e.preventDefault()} onClick={() => applyAlign(align)} className={btnCls}>
              <Icon className="h-3.5 w-3.5" />
            </button>
          );
        })}

        <div className="mx-1 h-5 w-px bg-slate-300" />

        <button type="button" title="Effacer la mise en forme" onMouseDown={(e) => e.preventDefault()} onClick={() => exec("removeFormat")} className="rounded px-2 py-0.5 text-xs text-slate-400 hover:bg-slate-200 hover:text-slate-600">
          Effacer
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder}
        className="px-3 py-2 text-sm leading-snug focus:outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
        style={{ minHeight: `${rows * 1.4}rem` }}
      />
    </div>
  );
}
