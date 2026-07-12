export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background: white !important;
          }
          /* Supprime les ombres et marges extérieures inutiles */
          * { box-shadow: none !important; }
          /* Tables : regles communes à tous les aperçus */
          table { border-collapse: collapse; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          thead { display: table-header-group; }
          /* Le contenu doit remplir la largeur de la page */
          .print-page { width: 100% !important; max-width: 100% !important; margin: 0 !important; }
        }
      `}</style>
      <div className="min-h-screen bg-slate-100 print:bg-white">
        {children}
      </div>
    </>
  );
}
