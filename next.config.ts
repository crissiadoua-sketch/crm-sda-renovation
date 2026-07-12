import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse et pdfjs-dist ne doivent pas être bundlés par webpack :
  // pdfjs-dist cherche pdf.worker.mjs via un chemin relatif invalide dans les chunks SSR Vercel.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
