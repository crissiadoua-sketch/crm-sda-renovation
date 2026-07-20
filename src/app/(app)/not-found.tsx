"use client";

import Link from "next/link";
import { RefreshCw, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
        <RefreshCw className="h-7 w-7 text-amber-500" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-700">Page temporairement indisponible</p>
        <p className="mt-1 text-sm text-slate-400">
          La connexion à la base de données a été interrompue. Actualisez la page.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue/90 transition"
        >
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
        >
          <Home className="h-4 w-4" />
          Accueil
        </Link>
      </div>
    </div>
  );
}
