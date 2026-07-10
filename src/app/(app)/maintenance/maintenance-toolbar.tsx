"use client";

import { useState, useTransition, useRef } from "react";
import {
  Maximize2, Minimize2, Printer, FileDown, Mail, Save, X, Check, Loader2,
} from "lucide-react";
import { genererRapportMensuel, envoyerRapportMaintenanceEmail } from "@/lib/actions/maintenance";

export function MaintenanceToolbar() {
  const [pleinEcran, setPleinEcran] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [emailResult, setEmailResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [sendingEmail, startEmail] = useTransition();
  const emailRef = useRef<HTMLInputElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleSave = () => {
    startSave(async () => {
      await genererRapportMensuel();
    });
  };

  const handleEmail = () => {
    const to = emailRef.current?.value?.trim();
    if (!to) return;
    const fd = new FormData();
    fd.set("to", to);
    startEmail(async () => {
      const result = await envoyerRapportMaintenanceEmail(fd);
      setEmailResult(result);
      if (result.ok) {
        setTimeout(() => { setShowEmail(false); setEmailResult(null); }, 2000);
      }
    });
  };

  return (
    <>
      {/* Barre d'outils */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Plein écran */}
        <button
          type="button"
          onClick={() => setPleinEcran(v => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
          title={pleinEcran ? "Quitter le plein écran" : "Plein écran"}
        >
          {pleinEcran ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          {pleinEcran ? "Quitter" : "Plein écran"}
        </button>

        {/* Enregistrer rapport */}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "Génération…" : "Enregistrer rapport"}
        </button>

        {/* Impression */}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <Printer className="h-3.5 w-3.5" />
          Imprimer
        </button>

        {/* Aperçu PDF = impression vers PDF */}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <FileDown className="h-3.5 w-3.5" />
          Aperçu PDF
        </button>

        {/* Envoyer par email */}
        <button
          type="button"
          onClick={() => { setShowEmail(true); setEmailResult(null); }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90 transition shadow-sm"
        >
          <Mail className="h-3.5 w-3.5" />
          Envoyer par mail
        </button>
      </div>

      {/* Modal email */}
      {showEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-brand-navy">Envoyer le rapport par email</h3>
              <button type="button" onClick={() => setShowEmail(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {emailResult ? (
              <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm ${emailResult.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                {emailResult.ok ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                {emailResult.message}
              </div>
            ) : (
              <>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Destinataire</label>
                <input
                  ref={emailRef}
                  type="email"
                  placeholder="contact@exemple.fr"
                  className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20"
                  defaultValue="contact@sda-renovation.com"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEmail(false)}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleEmail}
                    disabled={sendingEmail}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                    {sendingEmail ? "Envoi…" : "Envoyer"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Overlay plein écran géré par le parent via prop */}
      {pleinEcran && (
        <style>{`
          body > * { display: none !important; }
          #maintenance-fullscreen { display: block !important; position: fixed; inset: 0; z-index: 50; overflow-y: auto; background: #f8fafc; padding: 24px; }
        `}</style>
      )}
    </>
  );
}
