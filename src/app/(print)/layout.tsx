export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          /* Réduit la taille de base : tous les rem Tailwind (padding, margin,
             font-size, gap…) scalent proportionnellement → contenu 20% plus compact */
          html { font-size: 13px !important; }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
          * { box-shadow: none !important; }
          table { border-collapse: collapse; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-100 print:bg-white">
        {children}
      </div>
    </>
  );
}
