import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empêche webpack de bundler ces packages en SSR / Vercel.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist", "@react-pdf/renderer"],
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
