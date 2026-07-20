"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[AppError]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <div>
        <p className="text-lg font-bold text-slate-700">Une erreur est survenue</p>
        <p className="mt-1 text-sm text-slate-400">
          La page n&apos;a pas pu se charger. Cela arrive parfois lors d&apos;un redémarrage serveur.
        </p>
      </div>
      <button
        onClick={unstable_retry}
        className="inline-flex items-center gap-2 rounded-lg bg-brand-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-blue/90 transition"
      >
        <RefreshCw className="h-4 w-4" />
        Réessayer
      </button>
    </div>
  );
}
