"use client";

import { useRef, useState, useEffect } from "react";
import { signerDevis } from "@/lib/actions/devis";

interface Props {
  token: string;
  devisNumero: string;
}

type Mode = "draw" | "upload";

export default function SignaturePad({ token, devisNumero }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("draw");
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initCtx();
  }, []);

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
    if (!file.type.startsWith("image/")) {
      setError("Format non supporté. Importez une image PNG, JPG ou WebP.");
      return;
    }
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
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
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
    const imageSignature = canvas.toDataURL("image/png");
    setPending(true);
    setError(null);
    try {
      const result = await signerDevis(token, nom.trim(), imageSignature);
      if (result.ok) { setSuccess(true); } else { setError(result.error ?? "Erreur lors de la signature."); }
    } catch { setError("Une erreur inattendue s'est produite."); }
    finally { setPending(false); }
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-6 py-8 text-center">
        <p className="text-4xl mb-3">✅</p>
        <p className="text-emerald-700 font-bold text-xl">Devis signé avec succès !</p>
        <p className="text-emerald-600 text-sm mt-2">
          Votre signature pour le devis <span className="font-mono font-semibold">{devisNumero}</span> a été enregistrée.
          <br />SDA Rénovation a été notifié et vous contactera prochainement.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-[#1E2F6E]/5 px-5 py-3 border-b border-slate-100">
        <p className="text-xs font-bold uppercase tracking-widest text-[#1E2F6E]">Votre signature</p>
      </div>
      <div className="px-5 py-5 flex flex-col gap-4">
        {/* Nom signataire */}
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

        {/* Onglets mode */}
        <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
          <button
            type="button"
            onClick={() => switchMode("draw")}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition ${
              mode === "draw" ? "bg-[#1E2F6E] text-white" : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>
            </svg>
            Dessiner
          </button>
          <button
            type="button"
            onClick={() => switchMode("upload")}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-l border-slate-200 transition ${
              mode === "upload" ? "bg-[#1E2F6E] text-white" : "bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
            </svg>
            Importer une image
          </button>
        </div>

        {/* Zone signature */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-600">
              Signature <span className="text-red-500">*</span>
            </label>
            {hasSignature && (
              <button type="button" onClick={clearCanvas} className="text-xs text-slate-400 hover:text-red-500 transition">
                Effacer
              </button>
            )}
          </div>

          {/* Canvas unique — toujours dans le DOM ; caché en mode upload */}
          <canvas
            ref={canvasRef}
            width={600}
            height={160}
            onMouseDown={mode === "draw" ? startDraw : undefined}
            onMouseMove={mode === "draw" ? draw : undefined}
            onMouseUp={mode === "draw" ? stopDraw : undefined}
            onMouseLeave={mode === "draw" ? stopDraw : undefined}
            onTouchStart={mode === "draw" ? startDraw : undefined}
            onTouchMove={mode === "draw" ? draw : undefined}
            onTouchEnd={mode === "draw" ? stopDraw : undefined}
            className={`w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-[#1E2F6E]/30 transition touch-none ${
              mode === "draw" ? "cursor-crosshair" : "hidden"
            }`}
            style={{ height: 120 }}
          />

          {/* Mode upload : zone de dépôt ou aperçu */}
          {mode === "upload" && (
            uploadedPreview ? (
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 overflow-hidden" style={{ height: 120 }}>
                <img src={uploadedPreview} alt="Signature importée" className="w-full h-full object-contain p-2" />
              </div>
            ) : (
              <label
                className="flex flex-col items-center justify-center gap-2 w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 hover:border-[#1E2F6E]/40 hover:bg-[#1E2F6E]/5 cursor-pointer transition"
                style={{ height: 120 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
                </svg>
                <span className="text-[11px] text-slate-400 text-center px-4">
                  Cliquez pour choisir un fichier<br />
                  <span className="text-[10px]">PNG · JPG · JPEG · WebP</span>
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )
          )}

          {mode === "draw" && !hasSignature && (
            <p className="text-[11px] text-slate-400 mt-1 text-center">Signez ici en maintenant le bouton ou en posant votre doigt</p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={pending}
          className="w-full rounded-xl bg-gradient-to-r from-[#1E2F6E] to-[#1B3F94] text-white font-bold py-3 text-sm hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed shadow-md"
        >
          {pending ? "Signature en cours…" : "Signer le devis"}
        </button>

        <p className="text-[10px] text-slate-400 text-center">
          En cliquant sur "Signer le devis", vous acceptez les conditions et apposez votre signature électronique
          conformément à l'article 1367 du Code civil.
        </p>
      </div>
    </div>
  );
}
