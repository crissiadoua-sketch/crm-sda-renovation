export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Normalise les marges et les couleurs pour tous les aperçus PDF du CRM */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-100 print:bg-white">
        {children}
      </div>
    </>
  );
}
