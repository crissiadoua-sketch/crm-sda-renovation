import DrawingCanvas from "@/components/conception/drawing-canvas";

export default function DessinerPage() {
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div>
          <h2 className="font-bold text-brand-navy">Dessin — Plan de conception</h2>
          <p className="text-xs text-slate-500">Outil de dessin 2D simplifié pour plans d&apos;agencement</p>
        </div>
        <a href="/conception" className="text-sm text-brand-blue hover:underline">
          ← Retour à la conception
        </a>
      </div>
      <DrawingCanvas />
    </div>
  );
}
