"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  MousePointer2, Pencil, Minus, Square, Circle, Eraser, Hand, Type,
  Ruler, ArrowRight, Undo2, Redo2, Trash2, Download, ZoomIn, ZoomOut,
  Maximize, Grid, Layers, ScanLine, CheckCircle2, XCircle, Settings2,
} from "lucide-react";

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

function uid() { return Math.random().toString(36).slice(2, 10); }
function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}
function snapToGrid(val: number, size: number) { return Math.round(val / size) * size; }

// ─── Draw ──────────────────────────────────────────────────────────────────

function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  scalePx: number | null,
  scaleUnit: string
) {
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
      const label = scalePx && scalePx > 0
        ? `${(pxLen / scalePx).toFixed(2)} ${scaleUnit}`
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

function ToolBtn({ active, onClick, title, children }: { active?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return (
    <button title={title} onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${active ? "bg-brand-blue text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"}`}>
      {children}
    </button>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

interface VectorisationCanvasProps {
  initialFile?: File | null;
}

export default function VectorisationCanvas({ initialFile }: VectorisationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: "" });

  // Scale calibration
  const [scalePx, setScalePx] = useState<number | null>(null);
  const [scaleUnit, setScaleUnit] = useState<"cm" | "m">("m");
  const [calibrating, setCalibrating] = useState(false);
  const [calibLine, setCalibLine] = useState<{ x: number; y: number; x2: number; y2: number } | null>(null);
  const [calibInput, setCalibInput] = useState<{ value: string; visible: boolean }>({ value: "", visible: false });

  // Style
  const [strokeColor, setStrokeColor] = useState("#1e2f6e");
  const [fillColor, setFillColor] = useState("none");
  const [lineWidth, setLineWidth] = useState(2);
  const [opacity, setOpacity] = useState(100);
  const [fontSize, setFontSize] = useState(16);

  // Cartouche (title block)
  const [showCartouche, setShowCartouche] = useState(true);
  const [showCartouchePanel, setShowCartouchePanel] = useState(false);
  const [cartouche, setCartouche] = useState({
    projet: "",
    affaire: "",
    echelle: "1:50",
    etabliPar: "SDA Rénovation",
    feuille: "1/1",
    date: new Date().toLocaleDateString("fr-FR"),
  });

  const dragRef = useRef<{ startX: number; startY: number; shapeX: number; shapeY: number; shapeX2?: number; shapeY2?: number; active: boolean } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  // Load initial file
  useEffect(() => {
    if (!initialFile) return;
    if (initialFile.type === "application/pdf") {
      const url = URL.createObjectURL(initialFile);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (initialFile.type.startsWith("image/")) {
      const url = URL.createObjectURL(initialFile);
      const img = new Image();
      img.onload = () => setBgImage(img);
      img.src = url;
      return () => URL.revokeObjectURL(url);
    }
  }, [initialFile]);

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

    if (gridEnabled) {
      ctx.save(); ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 0.5;
      const w = canvas.width / zoom; const h = canvas.height / zoom;
      for (let gx = 0; gx <= w; gx += gridSize) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h); ctx.stroke(); }
      for (let gy = 0; gy <= h; gy += gridSize) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke(); }
      ctx.restore();
    }

    for (const shape of shapes) drawShape(ctx, shape, scalePx, scaleUnit);
    if (currentShape) drawShape(ctx, currentShape, scalePx, scaleUnit);

    // Calibration line preview
    if (calibrating && calibLine) {
      ctx.save();
      ctx.strokeStyle = "#f97316"; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      ctx.beginPath(); ctx.moveTo(calibLine.x, calibLine.y); ctx.lineTo(calibLine.x2, calibLine.y2); ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // Cartouche — dessinée en coordonnées écran (fixe, pas affectée par pan/zoom)
    if (showCartouche) {
      const cw = 300; const ch = 112; const margin = 12;
      const cx = canvas.width - cw - margin; const cy = canvas.height - ch - margin;
      ctx.save();
      // Fond blanc avec bordure
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#1e2f6e";
      ctx.lineWidth = 1.5;
      ctx.fillRect(cx, cy, cw, ch);
      ctx.strokeRect(cx, cy, cw, ch);
      // Ligne de séparation verticale
      ctx.beginPath(); ctx.moveTo(cx + 90, cy); ctx.lineTo(cx + 90, cy + ch); ctx.stroke();
      // Ligne de séparation horizontale (dans la partie droite)
      [24, 48, 72, 96].forEach(dy => {
        ctx.beginPath(); ctx.moveTo(cx + 90, cy + dy); ctx.lineTo(cx + cw, cy + dy); ctx.stroke();
      });
      // SDA Rénovation (colonne gauche)
      ctx.fillStyle = "#1e2f6e"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
      ctx.fillText("SDA Rénovation", cx + 45, cy + 16);
      ctx.fillStyle = "#374151"; ctx.font = "8.5px sans-serif";
      ctx.fillText("SIREN 988 681 672", cx + 45, cy + 30);
      ctx.fillText("Cugnaux · 31270", cx + 45, cy + 44);
      ctx.fillText("contact@sda-renovation.com", cx + 45, cy + 58);
      ctx.fillStyle = "#9ca3af"; ctx.font = "7px sans-serif";
      ctx.fillText("BTP · Rénovation", cx + 45, cy + 72);
      // Colonne droite — données affaire
      ctx.textAlign = "left";
      const labels = ["Projet :", "Affaire :", "Échelle :", "Établi par :", "Feuille :"];
      const vals = [
        cartouche.projet || "—",
        cartouche.affaire || "—",
        scalePx ? `1 ${scaleUnit} = ${scalePx.toFixed(1)} px · ${cartouche.echelle}` : cartouche.echelle,
        cartouche.etabliPar,
        `${cartouche.feuille} · ${cartouche.date}`,
      ];
      labels.forEach((lbl, i) => {
        const ry = cy + i * 24 + 14;
        ctx.fillStyle = "#6b7280"; ctx.font = "7.5px sans-serif";
        ctx.fillText(lbl, cx + 95, ry);
        ctx.fillStyle = "#111827"; ctx.font = "bold 8.5px sans-serif";
        ctx.fillText(vals[i].substring(0, 32), cx + 140, ry);
      });
      ctx.restore();
    }
  }, [shapes, currentShape, pan, zoom, gridEnabled, gridSize, bgImage, bgOpacity, scalePx, scaleUnit, calibrating, calibLine, showCartouche, cartouche]);

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
      setZoom(z => Math.max(0.1, Math.min(10, z * (e.deltaY > 0 ? 0.9 : 1.1))));
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

      // Calibration mode
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

      // Calibration drag
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
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      // End calibration → show input
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

  // Confirm calibration
  const confirmCalibration = useCallback(() => {
    const val = parseFloat(calibInput.value.replace(",", "."));
    if (!calibLine || isNaN(val) || val <= 0) return;
    const pxLen = dist(calibLine.x, calibLine.y, calibLine.x2, calibLine.y2);
    setScalePx(pxLen / val);
    setCalibrating(false); setCalibLine(null);
    setCalibInput({ value: "", visible: false });
    setTool("dimension");
  }, [calibInput, calibLine]);

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
    const a = document.createElement("a"); a.href = url; a.download = `plan-vectorise-${Date.now()}.png`; a.click();
  }, []);

  const importFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (file.type === "application/pdf") {
      const url = URL.createObjectURL(file);
      setPdfUrl(url); setBgImage(null);
    } else {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { setBgImage(img); setPdfUrl(null); };
      img.src = url;
    }
  }, []);

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
      { id: "rect" as Tool, icon: <Square size={15} />, label: "Rectangle (mur, pièce)" },
      { id: "circle" as Tool, icon: <Circle size={15} />, label: "Cercle" },
    ],
    [
      { id: "text" as Tool, icon: <Type size={15} />, label: "Texte / étiquette" },
      { id: "dimension" as Tool, icon: <Ruler size={15} />, label: "Cote / mesure" },
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
    <div className="flex flex-col" style={{ height: "calc(100vh - 112px)" }}>
      {/* Calibration modal */}
      {calibInput.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-80 rounded-xl bg-white p-5 shadow-xl">
            <h3 className="mb-1 font-bold text-brand-navy">Calibrer l&apos;échelle</h3>
            <p className="mb-3 text-sm text-slate-500">
              La ligne que vous avez tracée fait combien de mètres (ou cm) dans la réalité ?
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
                value={scaleUnit}
                onChange={e => setScaleUnit(e.target.value as "cm" | "m")}
                className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm"
              >
                <option value="m">m</option>
                <option value="cm">cm</option>
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

      <div className="flex flex-1 overflow-hidden">
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

          <div className="mt-1 border-t border-slate-100 pt-1">
            <ToolBtn
              active={calibrating || tool === "calibrate"}
              onClick={() => { setCalibrating(true); setTool("calibrate"); }}
              title="Calibrer l'échelle (tracer une ligne de référence)"
            >
              <ScanLine size={15} />
            </ToolBtn>
          </div>
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
              Trait
              <input type="color" value={strokeColor} onChange={e => setStrokeColor(e.target.value)} className="h-5 w-5 cursor-pointer rounded border border-slate-200" />
            </label>

            <label className="flex items-center gap-1 text-xs text-slate-600">
              Épaisseur
              <select value={lineWidth} onChange={e => setLineWidth(Number(e.target.value))} className="rounded border border-slate-200 px-1 py-0.5 text-xs">
                {[1, 2, 3, 5, 8].map(w => <option key={w} value={w}>{w}px</option>)}
              </select>
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
              <select value={gridSize} onChange={e => setGridSize(Number(e.target.value))} disabled={!gridEnabled} className="rounded border border-slate-200 px-1 py-0.5 text-xs">
                {[10, 20, 50].map(g => <option key={g} value={g}>{g}px</option>)}
              </select>
            </label>

            {scalePx && (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                Échelle : 1 {scaleUnit} = {scalePx.toFixed(1)} px
              </span>
            )}

            <div className="ml-auto flex items-center gap-1">
              <button title="Annuler" onClick={handleUndo} disabled={!history.length} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><Undo2 size={14} /></button>
              <button title="Rétablir" onClick={handleRedo} disabled={!future.length} className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30"><Redo2 size={14} /></button>
              <button title="Tout effacer" onClick={() => { if (!shapes.length) return; if (!confirm("Effacer tout ?")) return; pushHistory(shapes); setShapes([]); }} className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-500"><Trash2 size={14} /></button>

              <div className="mx-1 h-4 w-px bg-slate-200" />

              {/* Cartouche */}
              <button
                title="Cartouche SDA Rénovation"
                onClick={() => setShowCartouchePanel(p => !p)}
                className={`rounded px-2 py-0.5 text-xs font-medium transition ${showCartouche ? "bg-brand-navy text-white" : "text-slate-500 hover:bg-slate-100"}`}
              >
                Cartouche
              </button>
              <button
                title={showCartouche ? "Masquer la cartouche" : "Afficher la cartouche"}
                onClick={() => setShowCartouche(v => !v)}
                className="rounded p-1 text-slate-500 hover:bg-slate-100 text-[10px]"
              >
                {showCartouche ? "🔲" : "⬜"}
              </button>

              {/* Import image ou PDF */}
              <label title="Importer un plan (image ou PDF)" className="cursor-pointer rounded px-2 py-1 text-xs font-medium text-brand-blue hover:bg-brand-blue/10">
                <Settings2 className="mr-1 inline h-3.5 w-3.5" />
                Changer le plan
                <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={importFile} />
              </label>

              <button title="Exporter en PNG" onClick={exportPng} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Download size={14} /></button>

              <div className="mx-1 h-4 w-px bg-slate-200" />

              <button title="Zoom +" onClick={() => setZoom(z => Math.min(10, z * 1.2))} className="rounded p-1 text-slate-500 hover:bg-slate-100"><ZoomIn size={14} /></button>
              <span className="w-8 text-center text-xs text-slate-500">{Math.round(zoom * 100)}%</span>
              <button title="Zoom -" onClick={() => setZoom(z => Math.max(0.1, z * 0.85))} className="rounded p-1 text-slate-500 hover:bg-slate-100"><ZoomOut size={14} /></button>
              <button title="Réinitialiser la vue" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} className="rounded p-1 text-slate-500 hover:bg-slate-100"><Maximize size={14} /></button>
            </div>
          </div>

          {/* Panneau cartouche */}
          {showCartouchePanel && (
            <div className="absolute right-0 top-0 z-40 w-72 rounded-bl-xl border-b border-l border-slate-200 bg-white p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-bold text-brand-navy">Cartouche du plan</h4>
                <button onClick={() => setShowCartouchePanel(false)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
              <div className="flex flex-col gap-2 text-xs">
                {([
                  ["projet", "Nom du projet"],
                  ["affaire", "N° d'affaire / dossier"],
                  ["echelle", "Échelle (ex. 1:50)"],
                  ["etabliPar", "Établi par"],
                  ["feuille", "N° de feuille (ex. 1/3)"],
                  ["date", "Date"],
                ] as [keyof typeof cartouche, string][]).map(([key, label]) => (
                  <label key={key}>
                    <span className="mb-0.5 block text-slate-500">{label}</span>
                    <input
                      type="text"
                      value={cartouche[key]}
                      onChange={e => setCartouche(c => ({ ...c, [key]: e.target.value }))}
                      className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:border-brand-blue focus:outline-none"
                      lang="fr"
                      spellCheck
                    />
                  </label>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-slate-400">
                SDA Rénovation · SIREN 988 681 672 · Cugnaux 31270
              </p>
            </div>
          )}

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

            {/* Status bar */}
            <div className="pointer-events-none absolute bottom-2 right-2 flex items-center gap-2">
              {calibrating && (
                <span className="rounded-md bg-orange-500/90 px-2 py-1 text-xs font-medium text-white">
                  Tracez une ligne de référence, puis relâchez
                </span>
              )}
              <span className="rounded-md bg-white/80 px-2 py-1 text-xs text-slate-400 shadow-sm">
                {Math.round(zoom * 100)}% · {shapes.length} forme{shapes.length !== 1 ? "s" : ""}
                {scalePx ? ` · Éch. 1${scaleUnit}=${scalePx.toFixed(1)}px` : " · Échelle non calibrée"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
