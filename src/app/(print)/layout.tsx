export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            /* Marges réduites au strict minimum imprimable (la plupart des
               imprimantes ne peuvent pas aller en dessous de 4-5 mm) */
            margin: 5mm 6mm;
          }

          /* Taille de base réduite : tous les rem Tailwind (padding, margin,
             gap, font-size…) scalent proportionnellement → gain ~31 % vs 16px */
          html { font-size: 11px !important; }

          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
            /* Interligne serré pour densifier le texte sans nuire à la lisibilité */
            line-height: 1.25 !important;
          }

          /* Supprime les décorations inutiles à l'impression */
          * { box-shadow: none !important; }

          /* Aucun espace parasite autour des éléments de bloc courants */
          p, h1, h2, h3, h4, h5, h6 {
            margin-top: 0 !important;
            margin-bottom: 0.1em !important;
          }

          table { border-collapse: collapse; }
          tr    { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-100 print:bg-white">
        {children}
      </div>
    </>
  );
}
