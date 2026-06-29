"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useActionState } from "react";
import {
  MousePointer2, Pencil, Minus, Square, Circle, Eraser, Hand, Type,
  Ruler, ArrowRight, Undo2, Redo2, Trash2, Download, ZoomIn, ZoomOut,
  Maximize, Grid, Layers, ScanLine, CheckCircle2, XCircle, Settings2,
  PlusCircle, Send, Trash,
} from "lucide-react";
import { mmVersUnite, uniteVersMm, formatLongueur, type UniteAffichage } from "@/lib/metre-units";
import { parseDxf, bornesDxf, type EntiteDxf } from "@/lib/metre-dxf";
import { urlFichier } from "@/lib/format";
import type { SaveMetreState, EnvoyerDevisState } from "@/lib/actions/metre";

// ─── Types ─────────────────────────────────────────────────────────────────

type Shape = {
  id: string;
  type: "pencil" | "line" | "rect" | "circle" | "arrow" | "text" | "dimension";
  x: number; y: number; x2?: number; y2?: number;
  w?: number; h?: number; r?: number;
  points?: { x: number; y: number }[];
  text?: string;
  color: string; fill: string; lineWidth: number; opacity: number;
  fontSize?: number; selected?: boolean;
};

type Tool = "select" | "pencil" | "line" | "rect" | "circle" | "arrow" | "text" | "dimension" | "eraser" | "hand" | "calibrate";

type TypeLigne = "LONGUEUR" | "SURFACE" | "QUANTITE";
type UniteCible = "ml" | "m2" | "u";

type LigneMetreLocale = {
  id: string;
  designation: string;
  type: TypeLigne;
  valeurMm: number;
  uniteCible: UniteCible;
};

function estIdLocal(id: string) { return id.startsWith("local-"); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}
function snapToGrid(val: number, size: number) { return Math.round(val / size) * size; }

// 1 unité de canvas = 1 mm pour un fond DXF (les coordonnées DXF sont déjà
// converties en mm par parseDxf) — pas de calibration manuelle nécessaire.
const DXF_PX_PER_MM = 1;

// ─── Draw ──────────────────────────────────────────────────────────────────

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape, scalePxPerMm: number | null, uniteAffichage: UniteAffichage) {
  ctx.save();
  ctx.globalAlpha = shape.opacity / 100;
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.lineWidth;
  ctx.fillStyle = shape.fill === "none" ? "transparent" : shape.fill;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.setLineDash(shape.selected ? [5, 4] : []);

  switch (shape.type) {
    case "pencil":
      if (!shape.points || shape.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) ctx.lineTo(shape.points[i].x, shape.points[i].y);
      ctx.stroke();
      break;
    case "line":
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.x2 ?? shape.x, shape.y2 ?? shape.y);
      ctx.stroke();
      break;
    case "rect": {
      const w = shape.w ?? 0; const h = shape.h ?? 0;
      ctx.beginPath(); ctx.rect(shape.x, shape.y, w, h);
      if (shape.fill !== "none") ctx.fill();
      ctx.stroke();
      break;
    }
    case "circle": {
      const r = shape.r ?? 0;
      ctx.beginPath(); ctx.arc(shape.x, shape.y, r, 0, Math.PI * 2);
      if (shape.fill !== "none") ctx.fill();
      ctx.stroke();
      break;
    }
    case "arrow": {
      const ex = shape.x2 ?? shape.x; const ey = shape.y2 ?? shape.y;
      const angle = Math.atan2(ey - shape.y, ex - shape.x);
      const head = 14 + shape.lineWidth * 2;
      ctx.beginPath(); ctx.moveTo(shape.x, shape.y); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ex, ey);
      ctx.lineTo(ex - head * Math.cos(angle - Math.PI / 6), ey - head * Math.sin(angle - Math.PI / 6));
      ctx.lineTo(ex - head * Math.cos(angle + Math.PI / 6), ey - head * Math.sin(angle + Math.PI / 6));
      ctx.closePath(); ctx.fillStyle = shape.color; ctx.fill();
      break;
    }
    case "text": {
      const fs = shape.fontSize ?? 16;
      ctx.font = `${fs}px sans-serif`; ctx.fillStyle = shape.color;
      ctx.fillText(shape.text ?? "", shape.x, shape.y);
      if (shape.selected) {
        const m = ctx.measureText(shape.text ?? "");
        ctx.strokeStyle = "#3B82F6"; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
        ctx.strokeRect(shape.x - 2, shape.y - fs, m.width + 4, fs + 4);
      }
      break;
    }
    case "dimension": {
      const ex = shape.x2 ?? shape.x + 100; const ey = shape.y2 ?? shape.y;
      const pxLen = dist(shape.x, shape.y, ex, ey);
      const label = scalePxPerMm && scalePxPerMm > 0
        ? formatLongueur(pxLen / scalePxPerMm, uniteAffichage)
        : `${Math.round(pxLen)} px`;
      const angle = Math.atan2(ey - shape.y, ex - shape.x);
      const perp = angle + Math.PI / 2;
      const tick = 10;
      ctx.beginPath(); ctx.moveTo(shape.x, shape.y); ctx.lineTo(ex, ey); ctx.stroke();
      [{ x: shape.x, y: shape.y }, { x: ex, y: ey }].forEach(({ x, y }) => {
        ctx.beginPath();
        ctx.moveTo(x + tick * Math.cos(perp), y + tick * Math.sin(perp));
        ctx.lineTo(x - tick * Math.cos(perp), y - tick * Math.sin(perp));
        ctx.stroke();
      });
      const mx = (shape.x + ex) / 2; const my = (shape.y + ey) / 2;
      ctx.save(); ctx.setLineDash([]); ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "bottom";
      ctx.translate(mx, my); ctx.rotate(angle);
      ctx.fillStyle = "#fff"; ctx.fillRect(-30, -18, 60, 16);
      ctx.fillStyle = shape.color; ctx.fillText(label, 0, -4);
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

function drawDxf(ctx: CanvasRenderingContext2D, entites: EntiteDxf[]) {
  ctx.save();
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 1;
  for (const e of entites) {
    if (e.pointsMm.length < 2) continue;
    ctx.beginPath();
    ctx.moveTo(e.pointsMm[0].x, e.pointsMm[0].y);
    for (let i = 1; i < e.pointsMm.length; i++) ctx.lineTo(e.pointsMm[i].x, e.pointsMm[i].y);
    ctx.stroke();
  }
  ctx.restore();
}

function hitTest(shape: Shape, px: number, py: number): boolean {
  const tol = 8;
  switch (shape.type) {
    case "pencil": return (shape.points ?? []).some(pt => dist(pt.x, pt.y, px, py) < tol);
    case "line": case "arrow": case "dimension": {
      const x2 = shape.x2 ?? shape.x; const y2 = shape.y2 ?? shape.y;
      const d = dist(shape.x, shape.y, x2, y2);
      if (d === 0) return dist(shape.x, shape.y, px, py) < tol;
      const t = Math.max(0, Math.min(1, ((px - shape.x) * (x2 - shape.x) + (py - shape.y) * (y2 - shape.y)) / (d * d)));
      return dist(shape.x + t * (x2 - shape.x), shape.y + t * (y2 - shape.y), px, py) < tol;
    }
    case "rect": {
      const w = shape.w ?? 0; const h = shape.h ?? 0;
      return px >= Math.min(shape.x, shape.x + w) - tol && px <= Math.max(shape.x, shape.x + w) + tol
        && py >= Math.min(shape.y, shape.y + h) - tol && py <= Math.max(shape.y, shape.y + h) + tol;
    }
    case "circle": return dist(shape.x, shape.y, px, py) < (shape.r ?? 0) + tol;
    case "text": return px >= shape.x - 4 && py >= shape.y - (shape.fontSize ?? 16) - 4 && py <= shape.y + 4;
    default: return false;
  }
}

function ToolBtn({ active, onClick, title, disabled, children }: { active?: boolean; onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick} disabled={disabled}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:opacity-30 ${active ? "bg-brand-blue text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
      {children}
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface MetreCanvasProps {
  chantierId: string;
  metreId: string;
  initialFichierUrl: string | null;
  initialFichierNom: string | null;
  initialUniteAffichage: UniteAffichage;
  initialDonneesCanvas: string | null;
  initialLignes: LigneMetreLocale[];
  devisOptions: { id: string; numero: string }[];
  saveAction: (prevState: SaveMetreState, formData: FormData) => Promise<SaveMetreState>;
  envoyerAction: (prevState: EnvoyerDevisState, formData: FormData) => Promise<EnvoyerDevisState>;
}

export default function MetreCanvas({
  chantierId, metreId, initialFichierUrl, initialFichierNom, initialUniteAffichage,
  initialDonneesCanvas, initialLignes, devisOptions, saveAction, envoyerAction,
}: MetreCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [future, setFuture] = useState<Shape[][]>([]);
  const [tool, setTool] = useState<Tool>("pencil");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [bgOpacity, setBgOpacity] = useState(40);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [dxfEntites, setDxfEntites] = useState<EntiteDxf[] | null>(null);
  const [fichierNom, setFichierNom] = useState<string | null>(initialFichierNom);
  const [nouveauFichier, setNouveauFichier] = useState<File | null>(null);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: "" });

  // Calibration — scalePxPerMm est TOUJOURS exprimé en pixels par millimètre,
  // quelle que soit l'unité d'affichage choisie (mm/cm/m) : ça évite tout
  // recalcul fragile quand l'utilisateur change juste l'unité affichée.
  const [scalePxPerMm, setScalePxPerMm] = useState<number | null>(null);
  const [uniteAffichage, setUniteAffichage] = useState<UniteAffichage>(initialUniteAffichage);
  const [calibrating, setCalibrating] = useState(false);
  const [calibLine, setCalibLine] = useState<{ x: number; y: number; x2: number; y2: number } | null>(null);
  const [calibInput, setCalibInput] = useState<{ value: string; visible: boolean }>({ value: "", visible: false });

  // Style
  const [strokeColor, setStrokeColor] = useState("#1e2f6e");
  const [fillColor, setFillColor] = useState("none");
  const [lineWidth, setLineWidth] = useState(2);
  const [opacity, setOpacity] = useState(100);
  const [fontSize, setFontSize] = useState(16);

  // Lignes de métré
  const [metreLignes, setMetreLignes] = useState<LigneMetreLocale[]>(initialLignes);
  const [lignesSelectionnees, setLignesSelectionnees] = useState<Set<string>>(new Set());
  const [ajoutLigne, setAjoutLigne] = useState<{ visible: boolean; designation: string; uniteCible: UniteCible } | null>(null);
  const [manuelle, setManuelle] = useState({ designation: "", valeur: "" });

  const dragRef = useRef<{ startX: number; startY: number; shapeX: number; shapeY: number; shapeX2?: number; shapeY2?: number; active: boolean } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  const [saveState, saveFormAction] = useActionState<SaveMetreState, FormData>(saveAction, undefined);
  const [envoyerState, envoyerFormAction] = useActionState<EnvoyerDevisState, FormData>(envoyerAction, undefined);

  // ── Chargement initial (plan + tracé déjà enregistrés) ──────────────────

  useEffect(() => {
    if (initialDonneesCanvas) {
      try {
        const data = JSON.parse(initialDonneesCanvas) as { shapes?: Shape[]; scalePxPerMm?: number | null };
        if (Array.isArray(data.shapes)) setShapes(data.shapes);
        if (typeof data.scalePxPerMm === "number") setScalePxPerMm(data.scalePxPerMm);
      } catch {
        // tracé corrompu — on repart d'un canvas vide plutôt que de planter
      }
    }
    if (!initialFichierUrl) return;
    const nomBas = (initialFichierNom ?? initialFichierUrl).toLowerCase();
    const src = urlFichier(initialFichierUrl);
    if (nomBas.endsWith(".pdf")) {
      setPdfUrl(src);
    } else if (nomBas.endsWith(".dxf")) {
      fetch(src).then(r => r.text()).then(texte => {
        const { entites } = parseDxf(texte);
        setDxfEntites(entites);
        setScalePxPerMm(DXF_PX_PER_MM);
      }).catch(() => {});
    } else {
      const img = new Image();
      img.onload = () => setBgImage(img);
      img.src = src;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toCanvas = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      let x = (e.clientX - rect.left - pan.x) / zoom;
      let y = (e.clientY - rect.top - pan.y) / zoom;
      if (gridEnabled) { x = snapToGrid(x, gridSize); y = snapToGrid(y, gridSize); }
      return { x, y };
    },
    [pan, zoom, gridEnabled, gridSize]
  );

  // ── Redraw ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    if (bgImage) {
      ctx.globalAlpha = bgOpacity / 100;
      ctx.drawImage(bgImage, 0, 0);
      ctx.globalAlpha = 1;
    }
    if (dxfEntites) drawDxf(ctx, dxfEntites);

    if (gridEnabled) {
      ctx.save(); ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 0.5;
      const w = canvas.width / zoom; const h = canvas.height / zoom;
      for (let gx = 0; gx <= w; gx += gridSize) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
      for (let gy = 0; gy <= h; gy += gridSize) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
      ctx.restore();
    }

    for (const shape of shapes) drawShape(ctx, shape, scalePxPerMm, uniteAffichage);
    if (currentShape) drawShape(ctx, currentShape, scalePxPerMm, uniteAffichage);

    if (calibrating && calibLine) {
      ctx.save();
      ctx.strokeStyle = "#f97316"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(calibLine.x, calibLine.y); ctx.lineTo(calibLine.x2, calibLine.y2); ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }, [shapes, currentShape, pan, zoom, gridEnabled, gridSize, bgImage, bgOpacity, dxfEntites, scalePxPerMm, uniteAffichage, calibrating, calibLine]);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ro = new ResizeObserver(() => { canvas.width = container.clientWidth; canvas.height = container.clientHeight; });
    ro.observe(container);
    canvas.width = container.clientWidth; canvas.height = container.clientHeight;
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.02, Math.min(10, z * (e.deltaY > 0 ? 0.9 : 1.1))));
    };
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, []);

  const pushHistory = useCallback((prev: Shape[]) => {
    setHistory(h => [...h, prev]); setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    setHistory(h => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      setFuture(f => [shapes, ...f]); setShapes(prev);
      return h.slice(0, -1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes]);

  const handleRedo = useCallback(() => {
    setFuture(f => {
      if (!f.length) return f;
      const next = f[0];
      setHistory(h => [...h, shapes]); setShapes(next);
      return f.slice(1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes]);

  // ── Mouse handlers ───────────────────────────────────────────────────────

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const { x, y } = toCanvas(e);

      if (calibrating || tool === "calibrate") {
        setCalibrating(true);
        setCalibLine({ x, y, x2: x, y2: y });
        return;
      }

      if (tool === "hand") {
        panRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
        return;
      }

      if (tool === "select") {
        const hit = [...shapes].reverse().find(s => hitTest(s, x, y));
        if (hit) {
          setSelectedId(hit.id);
          setShapes(s => s.map(sh => ({ ...sh, selected: sh.id === hit.id })));
          dragRef.current = { startX: x, startY: y, shapeX: hit.x, shapeY: hit.y, shapeX2: hit.x2, shapeY2: hit.y2, active: true };
        } else {
          setSelectedId(null); setShapes(s => s.map(sh => ({ ...sh, selected: false })));
        }
        setIsDrawing(true); return;
      }

      if (tool === "eraser") {
        const hit = [...shapes].reverse().find(s => hitTest(s, x, y));
        if (hit) { pushHistory(shapes); setShapes(s => s.filter(sh => sh.id !== hit.id)); }
        return;
      }

      if (tool === "text") {
        const rect = canvasRef.current!.getBoundingClientRect();
        setTextInput({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top, value: "" });
        return;
      }

      setIsDrawing(true);
      const base: Shape = {
        id: uid(), type: tool as Shape["type"],
        x, y, x2: x, y2: y,
        color: strokeColor, fill: fillColor, lineWidth, opacity, fontSize,
      };
      if (tool === "pencil") base.points = [{ x, y }];
      if (tool === "circle") base.r = 0;
      setCurrentShape(base);
    },
    [tool, shapes, pan, toCanvas, strokeColor, fillColor, lineWidth, opacity, fontSize, pushHistory, calibrating]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = toCanvas(e);

      if (calibrating && calibLine && e.buttons === 1) {
        setCalibLine(c => c ? { ...c, x2: x, y2: y } : c);
        return;
      }

      if (tool === "hand" && panRef.current) {
        setPan({ x: panRef.current.panX + (e.clientX - panRef.current.startX), y: panRef.current.panY + (e.clientY - panRef.current.startY) });
        return;
      }

      if (tool === "select" && isDrawing && dragRef.current?.active && selectedId) {
        const dx = x - dragRef.current.startX; const dy = y - dragRef.current.startY;
        setShapes(s => s.map(sh => {
          if (sh.id !== selectedId) return sh;
          const u: Shape = { ...sh, x: dragRef.current!.shapeX + dx, y: dragRef.current!.shapeY + dy };
          if (sh.x2 !== undefined && dragRef.current!.shapeX2 !== undefined) u.x2 = dragRef.current!.shapeX2 + dx;
          if (sh.y2 !== undefined && dragRef.current!.shapeY2 !== undefined) u.y2 = dragRef.current!.shapeY2 + dy;
          if (sh.points) u.points = sh.points.map(pt => ({ x: pt.x + dx, y: pt.y + dy }));
          return u;
        }));
        return;
      }

      if (!isDrawing || !currentShape) return;
      const updated = { ...currentShape };
      switch (tool) {
        case "pencil": updated.points = [...(currentShape.points ?? []), { x, y }]; break;
        case "line": case "arrow": case "dimension": updated.x2 = x; updated.y2 = y; break;
        case "rect": updated.w = x - currentShape.x; updated.h = y - currentShape.y; break;
        case "circle": updated.r = dist(currentShape.x, currentShape.y, x, y); break;
      }
      setCurrentShape(updated);
    },
    [tool, isDrawing, currentShape, selectedId, toCanvas, calibrating, calibLine]
  );

  const onMouseUp = useCallback(
    () => {
      if (calibrating && calibLine) {
        const d = dist(calibLine.x, calibLine.y, calibLine.x2, calibLine.y2);
        if (d > 10) {
          setCalibInput({ value: "", visible: true });
        } else {
          setCalibrating(false); setCalibLine(null);
        }
        return;
      }

      if (tool === "hand") { panRef.current = null; return; }
      if (tool === "select") { setIsDrawing(false); if (dragRef.current?.active) { pushHistory(shapes); dragRef.current = null; } return; }
      if (!isDrawing || !currentShape) return;
      setIsDrawing(false);

      let valid = true;
      if (tool === "pencil") valid = (currentShape.points?.length ?? 0) > 2;
      else if (tool === "rect") valid = Math.abs(currentShape.w ?? 0) > 3 && Math.abs(currentShape.h ?? 0) > 3;
      else if (tool === "circle") valid = (currentShape.r ?? 0) > 3;
      else if (["line", "arrow", "dimension"].includes(tool)) valid = dist(currentShape.x, currentShape.y, currentShape.x2 ?? currentShape.x, currentShape.y2 ?? currentShape.y) > 5;

      if (valid) { pushHistory(shapes); setShapes(s => [...s, currentShape]); }
      setCurrentShape(null);
    },
    [calibrating, calibLine, tool, isDrawing, currentShape, shapes, pushHistory]
  );

  const confirmCalibration = useCallback(() => {
    const val = parseFloat(calibInput.value.replace(",", "."));
    if (!calibLine || isNaN(val) || val <= 0) return;
    const pxLen = dist(calibLine.x, calibLine.y, calibLine.x2, calibLine.y2);
    setScalePxPerMm(pxLen / uniteVersMm(val, uniteAffichage));
    setCalibrating(false); setCalibLine(null);
    setCalibInput({ value: "", visible: false });
    setTool("dimension");
  }, [calibInput, calibLine, uniteAffichage]);

  const commitText = useCallback(() => {
    if (!textInput.value.trim()) { setTextInput(t => ({ ...t, visible: false })); return; }
    const { x, y } = { x: (textInput.x - pan.x) / zoom, y: (textInput.y - pan.y) / zoom };
    const shape: Shape = { id: uid(), type: "text", x, y, text: textInput.value, color: strokeColor, fill: "none", lineWidth, opacity, fontSize };
    pushHistory(shapes); setShapes(s => [...s, shape]);
    setTextInput(t => ({ ...t, visible: false, value: "" }));
  }, [textInput, pan, zoom, strokeColor, lineWidth, opacity, fontSize, shapes, pushHistory]);

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a"); a.href = url; a.download = `metre-${Date.now()}.png`; a.click();
  }, []);

  const ajusterVueAuxBornes = useCallback((minX: number, minY: number, maxX: number, maxY: number) => {
    const container = containerRef.current;
    if (!container) return;
    const largeur = Math.max(1, maxX - minX);
    const hauteur = Math.max(1, maxY - minY);
    const z = Math.max(0.02, Math.min(10, Math.min(container.clientWidth / largeur, container.clientHeight / hauteur) * 0.9));
    setZoom(z);
    setPan({ x: container.clientWidth / 2 - ((minX + maxX) / 2) * z, y: container.clientHeight / 2 - ((minY + maxY) / 2) * z });
  }, []);

  const importFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setNouveauFichier(file);
    setFichierNom(file.name);
    setPdfUrl(null); setBgImage(null); setDxfEntites(null);

    const nomBas = file.name.toLowerCase();
    if (nomBas.endsWith(".dxf")) {
      file.text().then(texte => {
        const { entites } = parseDxf(texte);
        setDxfEntites(entites);
        setScalePxPerMm(DXF_PX_PER_MM);
        const b = bornesDxf(entites);
        ajusterVueAuxBornes(b.minX, b.minY, b.maxX, b.maxY);
      }).catch(() => {
        alert("Fichier DXF illisible.");
      });
    } else if (file.type === "application/pdf") {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setScalePxPerMm(null);
    } else {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => setBgImage(img);
      img.src = url;
      setScalePxPerMm(null);
    }
  }, [ajusterVueAuxBornes]);

  // ── Lignes de métré ──────────────────────────────────────────────────────

  const shapeSelectionnee = shapes.find(s => s.id === selectedId) ?? null;
  const peutAjouterDepuisShape = !!shapeSelectionnee && (shapeSelectionnee.type === "dimension" || shapeSelectionnee.type === "rect") && !!scalePxPerMm;

  function valeurMmDepuisShape(shape: Shape): { type: TypeLigne; valeurMm: number } | null {
    if (!scalePxPerMm) return null;
    if (shape.type === "dimension") {
      const pxLen = dist(shape.x, shape.y, shape.x2 ?? shape.x, shape.y2 ?? shape.y);
      return { type: "LONGUEUR", valeurMm: pxLen / scalePxPerMm };
    }
    if (shape.type === "rect") {
      const wMm = (shape.w ?? 0) / scalePxPerMm;
      const hMm = (shape.h ?? 0) / scalePxPerMm;
      return { type: "SURFACE", valeurMm: Math.abs(wMm * hMm) };
    }
    return null;
  }

  function ouvrirAjoutDepuisShape() {
    if (!shapeSelectionnee) return;
    const info = valeurMmDepuisShape(shapeSelectionnee);
    if (!info) return;
    setAjoutLigne({ visible: true, designation: "", uniteCible: info.type === "SURFACE" ? "m2" : "ml" });
  }

  function confirmerAjoutDepuisShape() {
    if (!shapeSelectionnee || !ajoutLigne || !ajoutLigne.designation.trim()) return;
    const info = valeurMmDepuisShape(shapeSelectionnee);
    if (!info) return;
    setMetreLignes(l => [...l, { id: `local-${uid()}`, designation: ajoutLigne.designation.trim(), type: info.type, valeurMm: info.valeurMm, uniteCible: ajoutLigne.uniteCible }]);
    setAjoutLigne(null);
  }

  function ajouterLigneManuelle() {
    const valeur = parseFloat(manuelle.valeur.replace(",", "."));
    if (!manuelle.designation.trim() || isNaN(valeur) || valeur <= 0) return;
    setMetreLignes(l => [...l, { id: `local-${uid()}`, designation: manuelle.designation.trim(), type: "QUANTITE", valeurMm: valeur, uniteCible: "u" }]);
    setManuelle({ designation: "", valeur: "" });
  }

  function supprimerLigne(id: string) {
    setMetreLignes(l => l.filter(x => x.id !== id));
    setLignesSelectionnees(s => { const n = new Set(s); n.delete(id); return n; });
  }

  function afficherValeurLigne(l: LigneMetreLocale) {
    if (l.type === "QUANTITE") return `${l.valeurMm.toLocaleString("fr-FR")} u`;
    if (l.type === "SURFACE") return `${(l.valeurMm / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 2 })} m²`;
    return formatLongueur(l.valeurMm, uniteAffichage);
  }

  const lignesEnvoyables = metreLignes.filter(l => lignesSelectionnees.has(l.id) && !estIdLocal(l.id));
  const aDesLignesLocalesSelectionnees = [...lignesSelectionnees].some(id => estIdLocal(id));

  // Synchronise les ids réels renvoyés par le serveur après un enregistrement réussi.
  useEffect(() => {
    if (saveState?.success && saveState.lignes) {
      setMetreLignes(saveState.lignes as LigneMetreLocale[]);
      setLignesSelectionnees(new Set());
    }
  }, [saveState]);

  const toolGroups = [
    [
      { id: "select" as Tool, icon: <MousePointer2 size={15} />, label: "Sélection (déplacer)" },
      { id: "hand" as Tool, icon: <Hand size={15} />, label: "Déplacer la vue" },
    ],
    [
      { id: "pencil" as Tool, icon: <Pencil size={15} />, label: "Crayon libre (traçage)" },
      { id: "line" as Tool, icon: <Minus size={15} />, label: "Ligne droite" },
      { id: "arrow" as Tool, icon: <ArrowRight size={15} />, label: "Flèche" },
    ],
    [
      { id: "rect" as Tool, icon: <Square size={15} />, label: "Rectangle (surface)" },
      { id: "circle" as Tool, icon: <Circle size={15} />, label: "Cercle" },
    ],
    [
      { id: "text" as Tool, icon: <Type size={15} />, label: "Texte / étiquette" },
      { id: "dimension" as Tool, icon: <Ruler size={15} />, label: "Cote / mesure (longueur)" },
    ],
    [
      { id: "eraser" as Tool, icon: <Eraser size={15} />, label: "Gomme" },
    ],
  ];

  const cursorMap: Record<Tool, string> = {
    select: "default", pencil: "crosshair", line: "crosshair", rect: "crosshair",
    circle: "crosshair", arrow: "crosshair", text: "text", dimension: "crosshair",
    eraser: "cell", hand: panRef.current ? "grabbing" : "grab", calibrate: "crosshair",
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Calibration modal */}
      {calibInput.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-80 rounded-xl bg-white p-5 shadow-xl">
            <h3 className="mb-1 font-bold text-brand-navy">Calibrer l&apos;échelle</h3>
            <p className="mb-3 text-sm text-slate-500">
              La ligne que vous avez tracée fait combien dans la réalité ?
            </p>
            <div className="mb-3 flex items-center gap-2">
              <input
                autoFocus
                type="number"
                min="0.01"
                step="0.01"
                value={calibInput.value}
                onChange={e => setCalibInput(c => ({ ...c, value: e.target.value }))}
                placeholder="ex. 3.5"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                onKeyDown={e => { if (e.key === "Enter") confirmCalibration(); if (e.key === "Escape") { setCalibInput({ value: "", visible: false }); setCalibrating(false); setCalibLine(null); } }}
              />
              <select
                value={uniteAffichage}
                onChange={e => setUniteAffichage(e.target.value as UniteAffichage)}
                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={confirmCalibration} className="flex-1 rounded-lg bg-brand-blue py-2 text-sm font-medium text-white hover:bg-brand-blue-dark">
                <CheckCircle2 className="inline mr-1 h-4 w-4" /> Valider
              </button>
              <button onClick={() => { setCalibInput({ value: "", visible: false }); setCalibrating(false); setCalibLine(null); }} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                <XCircle className="inline h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ajout au métré depuis une forme sélectionnée */}
      {ajoutLigne?.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-80 rounded-xl bg-white p-5 shadow-xl">
            <h3 className="mb-3 font-bold text-brand-navy">Ajouter au métré</h3>
            <label className="mb-2 block text-xs font-medium text-slate-600">Désignation</label>
            <input
              autoFocus
              type="text"
              value={ajoutLigne.designation}
              onChange={e => setAjoutLigne(a => a && { ...a, designation: e.target.value })}
              placeholder="ex. Mur cloison salon"
              className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              lang="fr" spellCheck
            />
            <label className="mb-2 block text-xs font-medium text-slate-600">Unité d&apos;ouvrage</label>
            <select
              value={ajoutLigne.uniteCible}
              onChange={e => setAjoutLigne(a => a && { ...a, uniteCible: e.target.value as UniteCible })}
              className="mb-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option value="ml">ml (mètre linéaire)</option>
              <option value="m2">m² (mètre carré)</option>
            </select>
            <div className="flex gap-2">
              <button onClick={confirmerAjoutDepuisShape} className="flex-1 rounded-lg bg-brand-blue py-2 text-sm font-medium text-white hover:bg-brand-blue-dark">
                Ajouter
              </button>
              <button onClick={() => setAjoutLigne(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200" style={{ height: "70vh" }}>
        {/* Left toolbar */}
        <div className="flex flex-col gap-0.5 border-r border-slate-200 bg-white p-1 shadow-sm" style={{ minWidth: 44 }}>
          {toolGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? "mt-1 border-t border-slate-100 pt-1" : ""}>
              {group.map(({ id, icon, label }) => (
                <ToolBtn key={id} active={tool === id} onClick={() => { setTool(id); setCalibrating(false); }} title={label}>
                  {icon}
                </ToolBtn>
              ))}
            </div>
          ))}
          {!dxfEntites && (
            <div className="mt-1 border-t border-slate-100 pt-1">
              <ToolBtn
                active={calibrating || tool === "calibrate"}
                onClick={() => { setCalibrating(true); setTool("calibrate"); }}
                title="Calibrer l'échelle (tracer une ligne de référence)"
              >
                <ScanLine size={15} />
              </ToolBtn>
            </div>
          )}
        </div>

        {/* PDF panel (side by side when PDF uploaded) */}
        {pdfUrl && (
          <div className="flex w-1/2 flex-col border-r border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-1.5">
              <span className="text-xs font-medium text-slate-600">
                <Layers className="mr-1 inline h-3 w-3" /> Plan PDF (référence)
              </span>
              <span className="text-xs text-slate-400">Tracez à droite →</span>
            </div>
            <iframe src={pdfUrl} className="flex-1 border-0" title="Plan PDF" />
          </div>
        )}

        {/* Main area */}
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-1.5">
            <label className="flex items-center gap-1 text-xs text-slate-600">
              Unité
              <select value={uniteAffichage} onChange={e => setUniteAffichage(e.target.value as UniteAffichage)} className="rounded border border-slate-200 px-1 py-0.5 text-xs">
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="m">m</option>
              </select>
            </label>

            <label className="flex items-center gap-1 text-xs text-slate-600">
              Trait
              <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} className="h-5 w-5 cursor-pointer rounded border border-slate-200" />
            </label>

            {bgImage && (
              <label className="flex items-center gap-1 text-xs text-slate-600">
                Opacité fond {bgOpacity}%
                <input type="range" min={5} max={100} value={bgOpacity} onChange={e => setBgOpacity(Number(e.target.value))} className="w-16" />
              </label>
            )}

            <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
              <Grid size={12} />
              <input type="checkbox" checked={gridEnabled} onChange={e => setGridEnabled(e.target.checked)} />
              Grille
            </label>

            {scalePxPerMm ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Échelle : {dxfEntites ? "DXF (auto)" : `1 ${uniteAffichage} = ${(scalePxPerMm * uniteVersMm(1, uniteAffichage)).toFixed(1)} px`}
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Échelle non calibrée</span>
            )}

            <div className="ml-auto flex items-center gap-1">
              <button title="Annuler" onClick={handleUndo} disabled={!history.length} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><Undo2 size={14} /></button>
              <button title="Rétablir" onClick={handleRedo} disabled={!future.length} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><Redo2 size={14} /></button>
              <button title="Tout effacer" onClick={() => { if (!shapes.length) return; if (!confirm("Effacer tout le tracé ?")) return; pushHistory(shapes); setShapes([]); }} className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>

              <div className="mx-1 h-4 w-px bg-slate-200" />

              <ToolBtn onClick={ouvrirAjoutDepuisShape} disabled={!peutAjouterDepuisShape} title="Ajouter au métré la cote/surface sélectionnée">
                <PlusCircle size={15} />
              </ToolBtn>

              <label title="Importer un plan (image, PDF ou DXF)" className="cursor-pointer rounded px-2 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue/10">
                <Settings2 className="mr-1 inline h-3.5 w-3.5" />
                Changer le plan
                <input ref={inputRef} type="file" accept="image/*,application/pdf,.dxf" className="sr-only" onChange={importFile} />
              </label>

              <button title="Exporter en PNG" onClick={exportPng} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Download size={14} /></button>

              <div className="mx-1 h-4 w-px bg-slate-200" />

              <button title="Zoom +" onClick={() => setZoom(z => Math.min(10, z * 1.2))} className="rounded p-1 text-slate-500 hover:bg-slate-100"><ZoomIn size={14} /></button>
              <span className="w-10 text-center text-xs text-slate-500">{(zoom * 100).toFixed(zoom < 1 ? 1 : 0)}%</span>
              <button title="Zoom -" onClick={() => setZoom(z => Math.max(0.02, z * 0.85))} className="rounded p-1 text-slate-500 hover:bg-slate-100"><ZoomOut size={14} /></button>
              <button title="Réinitialiser la vue" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Maximize size={14} /></button>
            </div>
          </div>

          {/* Canvas */}
          <div ref={containerRef} className="relative flex-1 overflow-hidden bg-[#f0f0f0]">
            <canvas
              ref={canvasRef}
              style={{ cursor: calibrating ? "crosshair" : cursorMap[tool] }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              className="absolute inset-0 touch-none select-none"
            />

            {textInput.visible && (
              <input
                autoFocus type="text" value={textInput.value}
                onChange={e => setTextInput(t => ({ ...t, value: e.target.value }))}
                onBlur={commitText}
                onKeyDown={e => { if (e.key === "Enter") commitText(); if (e.key === "Escape") setTextInput(t => ({ ...t, visible: false, value: "" })); }}
                style={{ position: "absolute", left: textInput.x, top: textInput.y - fontSize, fontSize: `${fontSize}px`, color: strokeColor, background: "rgba(255,255,255,0.9)", border: "1px dashed #3B82F6", outline: "none", minWidth: 80, padding: "0 2px" }}
              />
            )}

            <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-2">
              {calibrating && (
                <span className="rounded-md bg-orange-500/90 px-2 py-1 text-xs font-medium text-white">
                  Tracez une ligne de référence, puis relâchez
                </span>
              )}
              <span className="rounded-md bg-white/80 px-2 py-1 text-xs text-slate-400 shadow-sm">
                {(zoom * 100).toFixed(zoom < 1 ? 1 : 0)}% · {shapes.length} forme{shapes.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enregistrer */}
      <form action={saveFormAction} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <input type="hidden" name="lignes" value={JSON.stringify(metreLignes.map(({ designation, type, valeurMm, uniteCible }) => ({ designation, type, valeurMm, uniteCible })))} />
        <input type="hidden" name="donneesCanvas" value={JSON.stringify({ shapes, scalePxPerMm })} />
        <input type="hidden" name="uniteAffichage" value={uniteAffichage} />
        {nouveauFichier && <input type="file" name="fichier" className="hidden" ref={el => { if (el) { const dt = new DataTransfer(); dt.items.add(nouveauFichier); el.files = dt.files; } }} />}
        {fichierNom && <span className="text-xs text-slate-400">Plan : {fichierNom}</span>}
        {saveState?.error && <span className="text-sm text-red-600">{saveState.error}</span>}
        {saveState?.success && <span className="text-sm text-emerald-600">Métré enregistré.</span>}
        <button type="submit" className="ml-auto rounded-lg bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue-dark">
          Enregistrer le métré
        </button>
      </form>

      {/* Lignes de métré */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-brand-navy">Lignes de métré</h3>
        </div>

        {metreLignes.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            Tracez une cote ou une surface, puis cliquez sur « Ajouter au métré » — ou ajoutez une ligne manuelle ci-dessous.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="w-8 px-4 py-2"></th>
                <th className="px-4 py-2">Désignation</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2 text-right">Valeur</th>
                <th className="w-8 px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metreLignes.map(l => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <input
                      type="checkbox"
                      checked={lignesSelectionnees.has(l.id)}
                      onChange={e => setLignesSelectionnees(s => { const n = new Set(s); if (e.target.checked) n.add(l.id); else n.delete(l.id); return n; })}
                    />
                  </td>
                  <td className="px-4 py-2 text-slate-700">{l.designation}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{l.type}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-700">{afficherValeurLigne(l)}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => supprimerLigne(l.id)} className="text-slate-400 hover:text-red-500"><Trash size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Ajout manuel */}
        <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 px-4 py-3">
          <div className="flex-1 min-w-[160px]">
            <label className="mb-1 block text-xs text-slate-500">Désignation (ligne manuelle, ex. « Porte intérieure »)</label>
            <input type="text" value={manuelle.designation} onChange={e => setManuelle(m => ({ ...m, designation: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" lang="fr" spellCheck />
          </div>
          <div className="w-28">
            <label className="mb-1 block text-xs text-slate-500">Quantité (u)</label>
            <input type="number" min="0" step="1" value={manuelle.valeur} onChange={e => setManuelle(m => ({ ...m, valeur: e.target.value }))} className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
          </div>
          <button onClick={ajouterLigneManuelle} className="rounded-lg border border-brand-blue px-3 py-1.5 text-sm font-medium text-brand-blue hover:bg-brand-blue/10">
            <PlusCircle className="mr-1 inline h-4 w-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Envoyer vers un devis */}
      {devisOptions.length > 0 && (
        <form action={envoyerFormAction} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <input type="hidden" name="metreLigneIds" value={JSON.stringify(lignesEnvoyables.map(l => l.id))} />
          <div className="flex-1 min-w-[200px]">
            <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Envoyer les lignes sélectionnées vers le devis</label>
            <select name="devisId" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {devisOptions.map(d => <option key={d.id} value={d.id}>{d.numero}</option>)}
            </select>
          </div>
          {aDesLignesLocalesSelectionnees && (
            <p className="text-xs text-amber-600">Enregistrez le métré avant d&apos;envoyer ces lignes.</p>
          )}
          {envoyerState?.error && <p className="text-sm text-red-600">{envoyerState.error}</p>}
          {envoyerState?.success && <p className="text-sm text-emerald-600">Lignes envoyées vers le devis.</p>}
          <button type="submit" disabled={lignesEnvoyables.length === 0} className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-medium text-white hover:bg-brand-orange-dark disabled:opacity-40">
            <Send className="mr-1 inline h-4 w-4" /> Envoyer ({lignesEnvoyables.length})
          </button>
        </form>
      )}
    </div>
  );
}
