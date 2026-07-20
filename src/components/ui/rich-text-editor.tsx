"use client";

import React, { useEffect, useRef, useState } from "react";
import { AlignLeft, AlignCenter, AlignRight, ChevronDown, ChevronUp, Eraser, List, ListOrdered, Indent, Outdent } from "lucide-react";

export const BULLET_STYLES = [
  { label: "• Puce", value: "disc" },
  { label: "○ Cercle", value: "circle" },
  { label: "▪ Carré", value: "square" },
];
export const NUMBERING_STYLES = [
  { label: "1, 2, 3…", value: "decimal" },
  { label: "01, 02, 03…", value: "decimal-leading-zero" },
  { label: "a, b, c…", value: "lower-alpha" },
  { label: "A, B, C…", value: "upper-alpha" },
  { label: "i, ii, iii…", value: "lower-roman" },
  { label: "I, II, III…", value: "upper-roman" },
];

export const FONT_SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28];
export const FONT_FAMILIES = [
  { label: "Calibri", value: "Calibri, Candara, 'Segoe UI', sans-serif" },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Times New Roman", value: "'Times New Roman', Times, serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Courier New", value: "'Courier New', Courier, monospace" },
];
export const PRESET_COLORS = ["#1e293b", "#1B3F94", "#F7941E", "#dc2626", "#16a34a", "#7c3aed", "#0f766e", "#78716c"];

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
  styleBase,
}: {
  value: string;
  onChange: (html: string) => void;
  rows?: number;
  placeholder?: string;
  className?: string;
  styleBase?: { fontFamily?: string; fontSize?: number; color?: string; bulletStyle?: string; numberStyle?: string; textAlign?: "left" | "center" | "right" };
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

  useEffect(() => {
    if (!ref.current) return;
    ref.current.querySelectorAll<HTMLUListElement>("ul").forEach((ul) => {
      if (styleBase?.bulletStyle) ul.style.listStyleType = styleBase.bulletStyle;
      else ul.style.removeProperty("list-style-type");
    });
    const html = ref.current.innerHTML;
    if (html !== lastValue.current) { lastValue.current = html; onChange(html); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleBase?.bulletStyle]);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.querySelectorAll<HTMLOListElement>("ol").forEach((ol) => {
      if (styleBase?.numberStyle) ol.style.listStyleType = styleBase.numberStyle;
      else ol.style.removeProperty("list-style-type");
    });
    const html = ref.current.innerHTML;
    if (html !== lastValue.current) { lastValue.current = html; onChange(html); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleBase?.numberStyle]);

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

  const applyList = (ordered: boolean, listStyleType: string) => {
    ref.current?.focus();
    document.execCommand(ordered ? "insertOrderedList" : "insertUnorderedList");
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let node: Node | null = sel.getRangeAt(0).startContainer;
      while (node && node !== ref.current) {
        if (node instanceof HTMLElement && (node.tagName === "UL" || node.tagName === "OL")) {
          node.style.listStyleType = listStyleType;
          break;
        }
        node = node.parentNode;
      }
    }
    emit();
  };

  const applyIndent = (direction: "indent" | "outdent") => {
    ref.current?.focus();
    document.execCommand(direction);
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

          <div className="mx-0.5 h-4 w-px bg-slate-300" />

          <button type="button" title="Liste à puces" onMouseDown={(e) => e.preventDefault()} onClick={() => applyList(false, styleBase?.bulletStyle ?? "disc")} className={btnCls}>
            <List className="h-3 w-3" />
          </button>
          <select
            title="Bibliothèque de puces"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { const v = e.target.value; if (v) applyList(false, v); e.target.value = ""; }}
            defaultValue=""
            className={`${selectCls} max-w-[4rem]`}
          >
            <option value="" disabled>Puces…</option>
            {BULLET_STYLES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>

          <button type="button" title="Liste numérotée" onMouseDown={(e) => e.preventDefault()} onClick={() => applyList(true, styleBase?.numberStyle ?? "decimal")} className={btnCls}>
            <ListOrdered className="h-3 w-3" />
          </button>
          <select
            title="Bibliothèque de numérotation"
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => { const v = e.target.value; if (v) applyList(true, v); e.target.value = ""; }}
            defaultValue=""
            className={`${selectCls} max-w-[4.5rem]`}
          >
            <option value="" disabled>Numéros…</option>
            {NUMBERING_STYLES.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>

          <button type="button" title="Diminuer le retrait" onMouseDown={(e) => e.preventDefault()} onClick={() => applyIndent("outdent")} className={btnCls}>
            <Outdent className="h-3 w-3" />
          </button>
          <button type="button" title="Augmenter le retrait" onMouseDown={(e) => e.preventDefault()} onClick={() => applyIndent("indent")} className={btnCls}>
            <Indent className="h-3 w-3" />
          </button>

          <div className="mx-0.5 h-4 w-px bg-slate-300" />

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
        className="rich-text-content whitespace-pre-wrap px-3 py-2 text-sm leading-snug focus:outline-none empty:before:text-slate-400 empty:before:content-[attr(data-placeholder)]"
        style={{
          minHeight: `${rows * 1.4}rem`,
          fontFamily: styleBase?.fontFamily || undefined,
          fontSize: styleBase?.fontSize ? `${styleBase.fontSize}px` : undefined,
          color: styleBase?.color || undefined,
          textAlign: styleBase?.textAlign || undefined,
          ...(styleBase?.bulletStyle ? { "--list-bullet-style": styleBase.bulletStyle } : {}),
          ...(styleBase?.numberStyle ? { "--list-number-style": styleBase.numberStyle } : {}),
        } as React.CSSProperties}
      />
    </div>
  );
}
