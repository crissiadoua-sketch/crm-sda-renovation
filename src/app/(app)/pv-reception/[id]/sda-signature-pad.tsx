"use client";

import { useRef, useState, useEffect } from "react";
import { signerPvReceptionSDA } from "@/lib/actions/pv-reception";

interface Props {
  pvId: string;
  pvNumero: string;
  defaultNom?: string;
}

type Mode = "draw" | "upload";

export function SdaSignaturePad({ pvId, pvNumero, defaultNom = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [nom, setNom] = useState(defaultNom);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) setTimeout(initCtx, 50);
  }, [open]);

  function initCtx() {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1E2F6E";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return { x: (e.touches[0].clientX - rect.left) * scaleX, y: (e.touches[0].clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    setDrawing(true);
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault();
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
    e.preventDefault();
  }

  function stopDraw() { setDrawing(false); }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setUploadedPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function switchMode(m: Mode) {
    clearCanvas();
    setMode(m);
    if (m === "draw") setTimeout(initCtx, 0);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setError("Format non supporté."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const img = new window.Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const margin = 10;
        const scale = Math.min((canvas.width - margin * 2) / img.width, (canvas.height - margin * 2) / img.height);
        ctx.drawImage(img, (canvas.width - img.width * scale) / 2, (canvas.height - img.height * scale) / 2, img.width * scale, img.height * scale);
        setUploadedPreview(dataUrl);
        setHasSignature(true);
        setError(null);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!hasSignature) { setError("Veuillez apposer ou importer votre signature."); return; }
    if (!nom.trim()) { setError("Veuillez saisir votre nom et prénom."); return; }
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPending(true);
    setError(null);
    try {
      const result = await signerPvReceptionSDA(pvId, nom.trim(), canvas.toDataURL("image/png"));
      if (result.ok) {
        setSuccess(true);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(result.error ?? "Erreur lors de la signature.");
      }
    } catch { setError("Une erreur inattendue s'est produite."); }
    finally { setPending(false); }
  }

  if (success) {
    return (
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-4 text-center">
        <p className="text-2xl mb-1">✅</p>
        <p className="text-emerald-700 font-bold">PV signé ! Le document est maintenant disponible pour téléchargement.</p>
        <p className="text-emerald-500 text-xs mt-1">Actualisation en cours…</p>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-[#F7941E] text-white px-5 py-2.5 text-sm font-bold hover:bg-orange-500 transition shadow"
      >
        ✍️ Signer à notre tour
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 overflow-hidden">
      <div className="bg-[#F7941E] px-5 py-3 flex items-center justify-between">
        <p className="text-white text-sm font-bold">✍️ Signature SDA Rénovation — {pvNumero}</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-white/70 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>
      <div className="px-5 py-4 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Nom et prénom du signataire <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Jean Martin"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#F7941E] focus:ring-2 focus:ring-[#F7941E]/10 outline-none transition bg-white"
          />
        </div>

        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
          <button type="button" onClick={() => switchMode("draw")}
            className={`flex-1 py-2 transition ${mode === "draw" ? "bg-[#F7941E] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
            ✏️ Dessiner
          </button>
          <button type="button" onClick={() => switchMode("upload")}
            className={`flex-1 py-2 border-l border-slate-200 transition ${mode === "upload" ? "bg-[#F7941E] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
            📷 Importer
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-600">Signature <span className="text-red-500">*</span></label>
            {hasSignature && (
              <button type="button" onClick={clearCanvas} className="text-xs text-slate-400 hover:text-red-500 transition">Effacer</button>
            )}
          </div>
          <canvas
            ref={canvasRef}
            width={600} height={160}
            onMouseDown={mode === "draw" ? startDraw : undefined}
            onMouseMove={mode === "draw" ? draw : undefined}
            onMouseUp={mode === "draw" ? stopDraw : undefined}
            onMouseLeave={mode === "draw" ? stopDraw : undefined}
            onTouchStart={mode === "draw" ? startDraw : undefined}
            onTouchMove={mode === "draw" ? draw : undefined}
            onTouchEnd={mode === "draw" ? stopDraw : undefined}
            className={`w-full rounded-xl border-2 border-dashed border-orange-200 bg-white hover:border-[#F7941E]/50 transition touch-none ${mode === "draw" ? "cursor-crosshair" : "hidden"}`}
            style={{ height: 120 }}
          />
          {mode === "upload" && (
            uploadedPreview ? (
              <div className="w-full rounded-xl border border-slate-200 bg-white overflow-hidden" style={{ height: 120 }}>
                <img src={uploadedPreview} alt="Signature importée" className="w-full h-full object-contain p-2" />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-orange-200 bg-white hover:border-[#F7941E]/40 cursor-pointer transition" style={{ height: 120 }}>
                <span className="text-[11px] text-slate-400 text-center px-4">Cliquez pour choisir une image (PNG, JPG, WebP)</span>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFileChange} className="hidden" />
              </label>
            )
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="w-full rounded-xl bg-[#F7941E] text-white font-bold py-3 text-sm hover:bg-orange-500 transition disabled:opacity-60 disabled:cursor-not-allowed shadow"
        >
          {pending ? "Signature en cours…" : "✅ Valider et signer le PV"}
        </button>
        <p className="text-[10px] text-slate-400 text-center">
          En signant, le PV sera définitivement validé et le client sera notifié par email.
        </p>
      </div>
    </div>
  );
}
