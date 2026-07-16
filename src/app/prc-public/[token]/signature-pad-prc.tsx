"use client";

import { useRef, useState, useEffect } from "react";
import { signerPRC } from "@/lib/actions/pv-reunion-chantier";

interface Props {
  token: string;
  pvNumero: string;
  participantNom: string;
}

type Mode = "draw" | "upload";

export function SignaturePadPrc({ token, pvNumero, participantNom }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [nom, setNom] = useState(participantNom);
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { initCtx(); }, []);

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
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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
      const result = await signerPRC(token, nom.trim(), canvas.toDataURL("image/png"));
      if (result.ok) {
        setSuccess(true);
        setTimeout(() => window.location.reload(), 2500);
      } else {
        setError(result.error ?? "Erreur lors de la signature.");
      }
    } catch { setError("Une erreur inattendue s'est produite."); }
    finally { setPending(false); }
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-blue-50 border border-blue-200 px-6 py-8 text-center">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-blue-700 font-bold text-xl">Signature enregistrée !</p>
        <p className="text-blue-600 text-sm mt-2 max-w-sm mx-auto">
          Votre signature pour le PV <span className="font-mono font-semibold">{pvNumero}</span> a bien été reçue.
          <br /><br />
          <strong>SDA Rénovation doit maintenant apposer sa propre signature.</strong> Vous recevrez un email
          dès que le PV sera disponible au téléchargement.
        </p>
        <p className="text-blue-400 text-xs mt-3">Chargement en cours…</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-[#1E2F6E]/5 px-5 py-3 border-b border-slate-100">
        <p className="text-xs font-bold uppercase tracking-widest text-[#1E2F6E]">
          Votre signature
        </p>
      </div>
      <div className="px-5 py-5 flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">
            Nom et prénom du signataire <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Jean Dupont"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-[#1E2F6E] focus:ring-2 focus:ring-[#1E2F6E]/10 outline-none transition"
          />
        </div>

        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
          <button type="button" onClick={() => switchMode("draw")}
            className={`flex-1 py-2 transition ${mode === "draw" ? "bg-[#1E2F6E] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
            ✏️ Dessiner
          </button>
          <button type="button" onClick={() => switchMode("upload")}
            className={`flex-1 py-2 border-l border-slate-200 transition ${mode === "upload" ? "bg-[#1E2F6E] text-white" : "bg-white text-slate-500 hover:bg-slate-50"}`}>
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
            className={`w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-[#1E2F6E]/30 transition touch-none ${mode === "draw" ? "cursor-crosshair" : "hidden"}`}
            style={{ height: 120 }}
          />
          {mode === "upload" && (
            uploadedPreview ? (
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 overflow-hidden" style={{ height: 120 }}>
                <img src={uploadedPreview} alt="Signature importée" className="w-full h-full object-contain p-2" />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-[#1E2F6E]/40 cursor-pointer transition" style={{ height: 120 }}>
                <span className="text-[11px] text-slate-400 text-center px-4">Cliquez pour choisir une image (PNG, JPG, WebP)</span>
                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={handleFileChange} className="hidden" />
              </label>
            )
          )}
          {mode === "draw" && !hasSignature && (
            <p className="text-[11px] text-slate-400 mt-1 text-center">Signez ici en maintenant le bouton ou en posant votre doigt</p>
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="w-full rounded-xl bg-gradient-to-r from-[#1E2F6E] to-[#1B3F94] text-white font-bold py-3 text-sm hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
        >
          {pending ? "Signature en cours…" : "✍️ Signer le PV de Réunion"}
        </button>

        <p className="text-[10px] text-slate-400 text-center">
          Signature électronique conforme à l&apos;article 1367 du Code civil.
        </p>
      </div>
    </div>
  );
}
