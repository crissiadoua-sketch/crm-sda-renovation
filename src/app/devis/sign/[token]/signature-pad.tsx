"use client";

import { useRef, useState, useEffect } from "react";
import { signerDevis } from "@/lib/actions/devis";

interface Props {
  token: string;
  devisNumero: string;
}

export default function SignaturePad({ token, devisNumero }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [nom, setNom] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1E2F6E";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setDrawing(true);
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    e.preventDefault();
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSignature(true);
    e.preventDefault();
  }

  function stopDraw() {
    setDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function handleSubmit() {
    if (!hasSignature) { setError("Veuillez apposer votre signature."); return; }
    if (!nom.trim()) { setError("Veuillez saisir votre nom et prénom."); return; }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const imageSignature = canvas.toDataURL("image/png");

    setPending(true);
    setError(null);
    try {
      const result = await signerDevis(token, nom.trim(), imageSignature);
      if (result.ok) {
        setSuccess(true);
      } else {
        setError(result.error ?? "Erreur lors de la signature.");
      }
    } catch {
      setError("Une erreur inattendue s'est produite.");
    } finally {
      setPending(false);
    }
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

        {/* Canvas signature */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-600">
              Signature <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={clearCanvas}
              className="text-xs text-slate-400 hover:text-red-500 transition"
            >
              Effacer
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={600}
            height={160}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={stopDraw}
            onMouseLeave={stopDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={stopDraw}
            className="w-full rounded-xl border-2 border-dashed border-slate-200 cursor-crosshair bg-slate-50 hover:border-[#1E2F6E]/30 transition touch-none"
            style={{ height: 120 }}
          />
          {!hasSignature && (
            <p className="text-[11px] text-slate-400 mt-1 text-center">Signez ici en maintenant le bouton ou en posant votre doigt</p>
          )}
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
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
