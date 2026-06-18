"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import {
  MousePointer2,
  Pencil,
  Minus,
  Square,
  Circle,
  Eraser,
  Hand,
  Type,
  Ruler,
  ArrowRight,
  Pentagon,
  Ellipsis,
  Undo2,
  Redo2,
  Trash2,
  ImageIcon,
  Download,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Shape = {
  id: string;
  type:
    | "pencil"
    | "line"
    | "rect"
    | "circle"
    | "ellipse"
    | "arrow"
    | "polygon"
    | "text"
    | "dimension";
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  w?: number;
  h?: number;
  r?: number;
  points?: { x: number; y: number }[];
  text?: string;
  color: string;
  fill: string;
  lineWidth: number;
  opacity: number;
  fontSize?: number;
  sides?: number;
  selected?: boolean;
};

type Tool =
  | "select"
  | "pencil"
  | "line"
  | "rect"
  | "circle"
  | "ellipse"
  | "arrow"
  | "polygon"
  | "text"
  | "dimension"
  | "eraser"
  | "hand";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function snapToGrid(val: number, size: number) {
  return Math.round(val / size) * size;
}

function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2);
}

// ─── Draw shape on canvas ctx ─────────────────────────────────────────────────

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape) {
  ctx.save();
  ctx.globalAlpha = shape.opacity / 100;
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.lineWidth;
  ctx.fillStyle = shape.fill === "none" ? "transparent" : shape.fill;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (shape.selected) {
    ctx.setLineDash([5, 4]);
  } else {
    ctx.setLineDash([]);
  }

  switch (shape.type) {
    case "pencil": {
      if (!shape.points || shape.points.length < 2) break;
      ctx.beginPath();
      ctx.moveTo(shape.points[0].x, shape.points[0].y);
      for (let i = 1; i < shape.points.length; i++) {
        ctx.lineTo(shape.points[i].x, shape.points[i].y);
      }
      ctx.stroke();
      break;
    }
    case "line": {
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(shape.x2 ?? shape.x, shape.y2 ?? shape.y);
      ctx.stroke();
      break;
    }
    case "rect": {
      const w = (shape.w ?? 0);
      const h = (shape.h ?? 0);
      ctx.beginPath();
      ctx.rect(shape.x, shape.y, w, h);
      if (shape.fill !== "none") ctx.fill();
      ctx.stroke();
      break;
    }
    case "circle": {
      const r = shape.r ?? 0;
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, r, 0, Math.PI * 2);
      if (shape.fill !== "none") ctx.fill();
      ctx.stroke();
      break;
    }
    case "ellipse": {
      const w = shape.w ?? 0;
      const h = shape.h ?? 0;
      ctx.beginPath();
      ctx.ellipse(
        shape.x + w / 2,
        shape.y + h / 2,
        Math.abs(w / 2),
        Math.abs(h / 2),
        0,
        0,
        Math.PI * 2
      );
      if (shape.fill !== "none") ctx.fill();
      ctx.stroke();
      break;
    }
    case "arrow": {
      const ex = shape.x2 ?? shape.x;
      const ey = shape.y2 ?? shape.y;
      const angle = Math.atan2(ey - shape.y, ex - shape.x);
      const headLen = 14 + shape.lineWidth * 2;
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      // arrowhead
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(
        ex - headLen * Math.cos(angle - Math.PI / 6),
        ey - headLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        ex - headLen * Math.cos(angle + Math.PI / 6),
        ey - headLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fillStyle = shape.color;
      ctx.fill();
      break;
    }
    case "polygon": {
      const sides = shape.sides ?? 6;
      const cx = shape.x;
      const cy = shape.y;
      const radius = dist(cx, cy, shape.x2 ?? cx + 50, shape.y2 ?? cy);
      ctx.beginPath();
      for (let i = 0; i < sides; i++) {
        const angle = (i / sides) * Math.PI * 2 - Math.PI / 2;
        const px = cx + radius * Math.cos(angle);
        const py = cy + radius * Math.sin(angle);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      if (shape.fill !== "none") ctx.fill();
      ctx.stroke();
      break;
    }
    case "text": {
      const fs = shape.fontSize ?? 16;
      ctx.font = `${fs}px sans-serif`;
      ctx.fillStyle = shape.color;
      ctx.fillText(shape.text ?? "", shape.x, shape.y);
      if (shape.selected) {
        const metrics = ctx.measureText(shape.text ?? "");
        ctx.strokeStyle = "#3B82F6";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(shape.x - 2, shape.y - fs, metrics.width + 4, fs + 4);
      }
      break;
    }
    case "dimension": {
      const ex = shape.x2 ?? shape.x + 100;
      const ey = shape.y2 ?? shape.y;
      const len = dist(shape.x, shape.y, ex, ey);
      const tickLen = 10;
      const angle = Math.atan2(ey - shape.y, ex - shape.x);
      const perp = angle + Math.PI / 2;

      // Main line
      ctx.beginPath();
      ctx.moveTo(shape.x, shape.y);
      ctx.lineTo(ex, ey);
      ctx.stroke();

      // Tick at start
      ctx.beginPath();
      ctx.moveTo(
        shape.x + tickLen * Math.cos(perp),
        shape.y + tickLen * Math.sin(perp)
      );
      ctx.lineTo(
        shape.x - tickLen * Math.cos(perp),
        shape.y - tickLen * Math.sin(perp)
      );
      ctx.stroke();

      // Tick at end
      ctx.beginPath();
      ctx.moveTo(
        ex + tickLen * Math.cos(perp),
        ey + tickLen * Math.sin(perp)
      );
      ctx.lineTo(
        ex - tickLen * Math.cos(perp),
        ey - tickLen * Math.sin(perp)
      );
      ctx.stroke();

      // Label
      const label = `${Math.round(len)} px`;
      const mx = (shape.x + ex) / 2;
      const my = (shape.y + ey) / 2;
      ctx.save();
      ctx.setLineDash([]);
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.translate(mx, my);
      ctx.rotate(angle);
      ctx.fillStyle = shape.color;
      ctx.fillText(label, 0, -6);
      ctx.restore();
      break;
    }
  }
  ctx.restore();
}

// ─── Hit testing ──────────────────────────────────────────────────────────────

function hitTest(shape: Shape, px: number, py: number): boolean {
  const tolerance = 8;
  switch (shape.type) {
    case "pencil": {
      if (!shape.points) return false;
      return shape.points.some((pt) => dist(pt.x, pt.y, px, py) < tolerance);
    }
    case "line":
    case "arrow":
    case "dimension": {
      const x2 = shape.x2 ?? shape.x;
      const y2 = shape.y2 ?? shape.y;
      const d = dist(shape.x, shape.y, x2, y2);
      if (d === 0) return dist(shape.x, shape.y, px, py) < tolerance;
      const t = Math.max(
        0,
        Math.min(
          1,
          ((px - shape.x) * (x2 - shape.x) + (py - shape.y) * (y2 - shape.y)) /
            (d * d)
        )
      );
      const cx = shape.x + t * (x2 - shape.x);
      const cy = shape.y + t * (y2 - shape.y);
      return dist(cx, cy, px, py) < tolerance;
    }
    case "rect":
    case "ellipse": {
      const w = shape.w ?? 0;
      const h = shape.h ?? 0;
      const minX = Math.min(shape.x, shape.x + w);
      const maxX = Math.max(shape.x, shape.x + w);
      const minY = Math.min(shape.y, shape.y + h);
      const maxY = Math.max(shape.y, shape.y + h);
      return px >= minX - tolerance && px <= maxX + tolerance && py >= minY - tolerance && py <= maxY + tolerance;
    }
    case "circle": {
      const r = shape.r ?? 0;
      return dist(shape.x, shape.y, px, py) < r + tolerance;
    }
    case "polygon": {
      const r = dist(shape.x, shape.y, shape.x2 ?? shape.x + 50, shape.y2 ?? shape.y);
      return dist(shape.x, shape.y, px, py) < r + tolerance;
    }
    case "text": {
      const fs = shape.fontSize ?? 16;
      return px >= shape.x - 4 && py >= shape.y - fs - 4 && py <= shape.y + 4;
    }
    default:
      return false;
  }
}

// ─── Toolbar item ─────────────────────────────────────────────────────────────

function ToolBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
        active
          ? "bg-brand-blue text-white shadow-sm"
          : "text-slate-600 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DrawingCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [history, setHistory] = useState<Shape[][]>([]);
  const [future, setFuture] = useState<Shape[][]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentShape, setCurrentShape] = useState<Shape | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [gridEnabled, setGridEnabled] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [textInput, setTextInput] = useState({ visible: false, x: 0, y: 0, value: "" });

  // Props panel
  const [strokeColor, setStrokeColor] = useState("#1e293b");
  const [fillColor, setFillColor] = useState("none");
  const [lineWidth, setLineWidth] = useState(2);
  const [opacity, setOpacity] = useState(100);
  const [fontSize, setFontSize] = useState(16);
  const [sides, setSides] = useState(6);

  // Drag for select/move
  const dragRef = useRef<{
    startX: number;
    startY: number;
    shapeX: number;
    shapeY: number;
    shapeX2?: number;
    shapeY2?: number;
    active: boolean;
  } | null>(null);

  // Pan drag
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  // ── Canvas coordinate helpers ───────────────────────────────────────────────

  const toCanvas = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      let x = (e.clientX - rect.left - pan.x) / zoom;
      let y = (e.clientY - rect.top - pan.y) / zoom;
      if (gridEnabled) {
        x = snapToGrid(x, gridSize);
        y = snapToGrid(y, gridSize);
      }
      return { x, y };
    },
    [pan, zoom, gridEnabled, gridSize]
  );

  // ── Redraw ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    // Background image
    if (bgImage) {
      ctx.globalAlpha = 0.4;
      ctx.drawImage(bgImage, 0, 0);
      ctx.globalAlpha = 1;
    }

    // Grid
    if (gridEnabled) {
      ctx.save();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 0.5;
      const w = canvas.width / zoom;
      const h = canvas.height / zoom;
      for (let gx = 0; gx <= w; gx += gridSize) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 0; gy <= h; gy += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Shapes
    for (const shape of shapes) {
      drawShape(ctx, shape);
    }

    // Current (live preview)
    if (currentShape) {
      drawShape(ctx, currentShape);
    }

    ctx.restore();
  }, [shapes, currentShape, pan, zoom, gridEnabled, gridSize, bgImage]);

  // ── Canvas resize ──────────────────────────────────────────────────────────

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    });
    ro.observe(container);
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    return () => ro.disconnect();
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
      if (e.ctrlKey && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId) {
          pushHistory(shapes);
          setShapes((s) => s.filter((sh) => sh.id !== selectedId));
          setSelectedId(null);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, selectedId]);

  // ── Wheel zoom ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.max(0.1, Math.min(10, z * delta)));
    };
    canvas.addEventListener("wheel", handler, { passive: false });
    return () => canvas.removeEventListener("wheel", handler);
  }, []);

  // ── History ────────────────────────────────────────────────────────────────

  const pushHistory = useCallback((prev: Shape[]) => {
    setHistory((h) => [...h, prev]);
    setFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setFuture((f) => [shapes, ...f]);
      setShapes(prev);
      return h.slice(0, -1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes]);

  const handleRedo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f[0];
      setHistory((h) => [...h, shapes]);
      setShapes(next);
      return f.slice(1);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes]);

  // ── Mouse handlers ─────────────────────────────────────────────────────────

  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button !== 0) return;
      const { x, y } = toCanvas(e);

      if (tool === "hand") {
        panRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
        return;
      }

      if (tool === "select") {
        // Check for hit
        const hit = [...shapes].reverse().find((s) => hitTest(s, x, y));
        if (hit) {
          setSelectedId(hit.id);
          setShapes((s) =>
            s.map((sh) => ({ ...sh, selected: sh.id === hit.id }))
          );
          dragRef.current = {
            startX: x,
            startY: y,
            shapeX: hit.x,
            shapeY: hit.y,
            shapeX2: hit.x2,
            shapeY2: hit.y2,
            active: true,
          };
        } else {
          setSelectedId(null);
          setShapes((s) => s.map((sh) => ({ ...sh, selected: false })));
        }
        setIsDrawing(true);
        return;
      }

      if (tool === "eraser") {
        const hit = [...shapes].reverse().find((s) => hitTest(s, x, y));
        if (hit) {
          pushHistory(shapes);
          setShapes((s) => s.filter((sh) => sh.id !== hit.id));
        }
        return;
      }

      if (tool === "text") {
        const rect = canvasRef.current!.getBoundingClientRect();
        setTextInput({
          visible: true,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          value: "",
        });
        return;
      }

      setIsDrawing(true);
      const base: Shape = {
        id: uid(),
        type: tool as Shape["type"],
        x,
        y,
        x2: x,
        y2: y,
        color: strokeColor,
        fill: fillColor,
        lineWidth,
        opacity,
        fontSize,
        sides,
      };

      if (tool === "pencil") {
        base.points = [{ x, y }];
      }
      if (tool === "circle") {
        base.r = 0;
      }

      setCurrentShape(base);
    },
    [tool, shapes, pan, toCanvas, strokeColor, fillColor, lineWidth, opacity, fontSize, sides, pushHistory]
  );

  const onMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = toCanvas(e);

      // Pan
      if (tool === "hand" && panRef.current) {
        const dx = e.clientX - panRef.current.startX;
        const dy = e.clientY - panRef.current.startY;
        setPan({ x: panRef.current.panX + dx, y: panRef.current.panY + dy });
        return;
      }

      // Move selected shape
      if (tool === "select" && isDrawing && dragRef.current?.active && selectedId) {
        const dx = x - dragRef.current.startX;
        const dy = y - dragRef.current.startY;
        setShapes((s) =>
          s.map((sh) => {
            if (sh.id !== selectedId) return sh;
            const updated: Shape = {
              ...sh,
              x: dragRef.current!.shapeX + dx,
              y: dragRef.current!.shapeY + dy,
            };
            if (sh.x2 !== undefined && dragRef.current!.shapeX2 !== undefined) {
              updated.x2 = dragRef.current!.shapeX2 + dx;
            }
            if (sh.y2 !== undefined && dragRef.current!.shapeY2 !== undefined) {
              updated.y2 = dragRef.current!.shapeY2 + dy;
            }
            if (sh.points) {
              updated.points = sh.points.map((pt) => ({
                x: pt.x + dx,
                y: pt.y + dy,
              }));
            }
            return updated;
          })
        );
        return;
      }

      if (!isDrawing || !currentShape) return;

      const updated = { ...currentShape };

      switch (tool) {
        case "pencil":
          updated.points = [...(currentShape.points ?? []), { x, y }];
          break;
        case "line":
        case "arrow":
        case "dimension":
        case "polygon":
          updated.x2 = x;
          updated.y2 = y;
          break;
        case "rect":
        case "ellipse":
          updated.w = x - currentShape.x;
          updated.h = y - currentShape.y;
          break;
        case "circle":
          updated.r = dist(currentShape.x, currentShape.y, x, y);
          break;
      }

      setCurrentShape(updated);
    },
    [tool, isDrawing, currentShape, selectedId, toCanvas]
  );

  const onMouseUp = useCallback(() => {
    if (tool === "hand") {
      panRef.current = null;
      return;
    }

    if (tool === "select") {
      setIsDrawing(false);
      if (dragRef.current?.active) {
        pushHistory(shapes);
        dragRef.current = null;
      }
      return;
    }

    if (!isDrawing || !currentShape) return;
    setIsDrawing(false);

    // Only save if shape has meaningful size
    let valid = true;
    if (tool === "pencil") {
      valid = (currentShape.points?.length ?? 0) > 2;
    } else if (tool === "rect" || tool === "ellipse") {
      valid = Math.abs(currentShape.w ?? 0) > 3 && Math.abs(currentShape.h ?? 0) > 3;
    } else if (tool === "circle") {
      valid = (currentShape.r ?? 0) > 3;
    } else if (tool === "line" || tool === "arrow" || tool === "dimension") {
      valid =
        dist(
          currentShape.x,
          currentShape.y,
          currentShape.x2 ?? currentShape.x,
          currentShape.y2 ?? currentShape.y
        ) > 5;
    } else if (tool === "polygon") {
      valid =
        dist(
          currentShape.x,
          currentShape.y,
          currentShape.x2 ?? currentShape.x,
          currentShape.y2 ?? currentShape.y
        ) > 5;
    }

    if (valid) {
      pushHistory(shapes);
      setShapes((s) => [...s, currentShape]);
    }
    setCurrentShape(null);
  }, [tool, isDrawing, currentShape, shapes, pushHistory]);

  // ── Text commit ─────────────────────────────────────────────────────────────

  const commitText = useCallback(() => {
    if (!textInput.value.trim()) {
      setTextInput((t) => ({ ...t, visible: false }));
      return;
    }
    const canvas = canvasRef.current!;
    const { x, y } = {
      x: (textInput.x - pan.x) / zoom,
      y: (textInput.y - pan.y) / zoom,
    };
    const shape: Shape = {
      id: uid(),
      type: "text",
      x,
      y,
      text: textInput.value,
      color: strokeColor,
      fill: "none",
      lineWidth,
      opacity,
      fontSize,
      sides,
    };
    pushHistory(shapes);
    setShapes((s) => [...s, shape]);
    setTextInput((t) => ({ ...t, visible: false, value: "" }));
  }, [textInput, pan, zoom, strokeColor, lineWidth, opacity, fontSize, sides, shapes, pushHistory]);

  // ── Export PNG ──────────────────────────────────────────────────────────────

  const exportPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `plan-conception-${Date.now()}.png`;
    a.click();
  }, []);

  // ── Import background ───────────────────────────────────────────────────────

  const importBg = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setBgImage(img);
    img.src = url;
  }, []);

  // ─── Cursor ────────────────────────────────────────────────────────────────

  const cursorMap: Record<Tool, string> = {
    select: "default",
    pencil: "crosshair",
    line: "crosshair",
    rect: "crosshair",
    circle: "crosshair",
    ellipse: "crosshair",
    arrow: "crosshair",
    polygon: "crosshair",
    text: "text",
    dimension: "crosshair",
    eraser: "cell",
    hand: panRef.current ? "grabbing" : "grab",
  };

  const toolGroups = [
    [
      { id: "select" as Tool, icon: <MousePointer2 size={16} />, label: "Sélection" },
      { id: "hand" as Tool, icon: <Hand size={16} />, label: "Déplacer vue" },
    ],
    [
      { id: "pencil" as Tool, icon: <Pencil size={16} />, label: "Crayon" },
      { id: "line" as Tool, icon: <Minus size={16} />, label: "Ligne" },
      { id: "arrow" as Tool, icon: <ArrowRight size={16} />, label: "Flèche" },
    ],
    [
      { id: "rect" as Tool, icon: <Square size={16} />, label: "Rectangle" },
      { id: "circle" as Tool, icon: <Circle size={16} />, label: "Cercle" },
      { id: "ellipse" as Tool, icon: <Ellipsis size={16} />, label: "Ellipse" },
      { id: "polygon" as Tool, icon: <Pentagon size={16} />, label: "Polygone" },
    ],
    [
      { id: "text" as Tool, icon: <Type size={16} />, label: "Texte" },
      { id: "dimension" as Tool, icon: <Ruler size={16} />, label: "Cote" },
    ],
    [
      { id: "eraser" as Tool, icon: <Eraser size={16} />, label: "Gomme" },
    ],
  ];

  return (
    <div className="flex flex-1 overflow-hidden" style={{ height: "calc(100vh - 112px)" }}>
      {/* Left toolbar */}
      <div className="flex flex-col gap-1 border-r border-slate-200 bg-white p-1.5 shadow-sm">
        {toolGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-1 border-t border-slate-100 pt-1" : ""}>
            {group.map(({ id, icon, label }) => (
              <ToolBtn key={id} active={tool === id} onClick={() => setTool(id)} title={label}>
                {icon}
              </ToolBtn>
            ))}
          </div>
        ))}
      </div>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top properties bar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
          {/* Stroke color */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Trait</span>
            <input
              type="color"
              value={strokeColor}
              onChange={(e) => setStrokeColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border border-slate-200 p-0"
            />
          </label>

          {/* Fill color */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Remplissage</span>
            <div className="flex items-center gap-1">
              <input
                type="color"
                value={fillColor === "none" ? "#ffffff" : fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                className="h-6 w-6 cursor-pointer rounded border border-slate-200 p-0"
                disabled={fillColor === "none"}
              />
              <button
                title={fillColor === "none" ? "Activer le remplissage" : "Désactiver le remplissage"}
                onClick={() => setFillColor((f) => (f === "none" ? "#ffffff" : "none"))}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium border transition-colors ${
                  fillColor === "none"
                    ? "border-slate-200 bg-slate-50 text-slate-400"
                    : "border-brand-blue bg-brand-blue/10 text-brand-blue"
                }`}
              >
                {fillColor === "none" ? "aucun" : "actif"}
              </button>
            </div>
          </label>

          {/* Line width */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Épaisseur</span>
            <select
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="rounded border border-slate-200 px-1.5 py-0.5 text-xs"
            >
              {[1, 2, 3, 5, 8].map((w) => (
                <option key={w} value={w}>
                  {w}px
                </option>
              ))}
            </select>
          </label>

          {/* Opacity */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Opacité {opacity}%</span>
            <input
              type="range"
              min={10}
              max={100}
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-20"
            />
          </label>

          {/* Font size (text) */}
          {tool === "text" && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Taille</span>
              <input
                type="number"
                min={8}
                max={120}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
              />
            </label>
          )}

          {/* Polygon sides */}
          {tool === "polygon" && (
            <label className="flex items-center gap-1.5 text-xs text-slate-600">
              <span>Côtés</span>
              <input
                type="number"
                min={3}
                max={12}
                value={sides}
                onChange={(e) => setSides(Number(e.target.value))}
                className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
              />
            </label>
          )}

          {/* Grid */}
          <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
            <Grid size={13} />
            <input
              type="checkbox"
              checked={gridEnabled}
              onChange={(e) => setGridEnabled(e.target.checked)}
            />
            <span>Grille</span>
            <select
              value={gridSize}
              onChange={(e) => setGridSize(Number(e.target.value))}
              className="rounded border border-slate-200 px-1 py-0.5 text-xs"
              disabled={!gridEnabled}
            >
              {[10, 20, 50].map((g) => (
                <option key={g} value={g}>
                  {g}px
                </option>
              ))}
            </select>
          </label>

          <div className="ml-auto flex items-center gap-1.5">
            {/* Undo */}
            <button
              title="Annuler (Ctrl+Z)"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              <Undo2 size={15} />
            </button>

            {/* Redo */}
            <button
              title="Rétablir (Ctrl+Y)"
              onClick={handleRedo}
              disabled={future.length === 0}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              <Redo2 size={15} />
            </button>

            {/* Clear */}
            <button
              title="Tout effacer"
              onClick={() => {
                if (shapes.length === 0) return;
                if (!confirm("Effacer tout le dessin ?")) return;
                pushHistory(shapes);
                setShapes([]);
                setSelectedId(null);
              }}
              className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-500"
            >
              <Trash2 size={15} />
            </button>

            <div className="mx-1 h-4 w-px bg-slate-200" />

            {/* Import BG */}
            <label title="Importer une image de fond" className="cursor-pointer rounded p-1.5 text-slate-500 hover:bg-slate-100">
              <ImageIcon size={15} />
              <input type="file" accept="image/*" className="sr-only" onChange={importBg} />
            </label>

            {/* Export PNG */}
            <button title="Exporter en PNG" onClick={exportPng} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
              <Download size={15} />
            </button>

            <div className="mx-1 h-4 w-px bg-slate-200" />

            {/* Zoom */}
            <button
              title="Zoom +"
              onClick={() => setZoom((z) => Math.min(10, z * 1.2))}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <ZoomIn size={15} />
            </button>
            <span className="w-10 text-center text-xs text-slate-500">
              {Math.round(zoom * 100)}%
            </span>
            <button
              title="Zoom -"
              onClick={() => setZoom((z) => Math.max(0.1, z * 0.85))}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <ZoomOut size={15} />
            </button>
            <button
              title="Réinitialiser la vue"
              onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
            >
              <Maximize size={15} />
            </button>
          </div>
        </div>

        {/* Canvas area */}
        <div ref={containerRef} className="relative flex-1 overflow-hidden bg-slate-100">
          <canvas
            ref={canvasRef}
            style={{ cursor: cursorMap[tool] }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            className="absolute inset-0 touch-none select-none"
          />

          {/* Text input overlay */}
          {textInput.visible && (
            <input
              autoFocus
              type="text"
              value={textInput.value}
              onChange={(e) => setTextInput((t) => ({ ...t, value: e.target.value }))}
              onBlur={commitText}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitText();
                if (e.key === "Escape") setTextInput((t) => ({ ...t, visible: false, value: "" }));
              }}
              style={{
                position: "absolute",
                left: textInput.x,
                top: textInput.y - fontSize,
                fontSize: `${fontSize}px`,
                color: strokeColor,
                background: "rgba(255,255,255,0.85)",
                border: "1px dashed #3B82F6",
                outline: "none",
                minWidth: 80,
                padding: "0 2px",
                lineHeight: 1,
              }}
            />
          )}

          {/* Zoom indicator overlay */}
          <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-white/80 px-2 py-1 text-xs text-slate-400 shadow-sm">
            {Math.round(zoom * 100)}% · {shapes.length} forme{shapes.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
