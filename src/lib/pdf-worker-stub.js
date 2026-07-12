// Stub vide — empêche pdfjs-dist de chercher pdf.worker.mjs sur Vercel/Turbopack.
// pdfjs-dist utilise un "fake worker" (mono-thread) côté serveur Node.js ;
// ce stub évite l'erreur "Cannot find module pdf.worker.mjs".
export default {};
