import type { CSSProperties } from "react";

export type StyleTexte = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
};

export function parseStyle(s: string): StyleTexte {
  try { return JSON.parse(s) as StyleTexte; } catch { return {}; }
}

export function styleToCSS(s: StyleTexte): CSSProperties {
  return {
    fontWeight: s.bold ? "bold" : "normal",
    fontStyle: s.italic ? "italic" : "normal",
    textDecoration: s.underline ? "underline" : "none",
    fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
    color: s.color || undefined,
    textAlign: s.align || "left",
  };
}
