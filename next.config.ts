import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empêche webpack de bundler pdf-parse et pdfjs-dist (chemin worker cassé dans SSR Vercel).
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  turbopack: {
    // Alias Turbopack : remplace le worker pdfjs par un stub vide.
    // Vercel utilise Turbopack pour next build — le worker est cherché au mauvais chemin sinon.
    resolveAlias: {
      "pdfjs-dist/legacy/build/pdf.worker.mjs": "./src/lib/pdf-worker-stub.js",
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
