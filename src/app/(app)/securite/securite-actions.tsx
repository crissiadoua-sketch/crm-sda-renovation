"use client";

import { useTransition } from "react";
import { ShieldOff, CheckCircle, Trash2, RefreshCw } from "lucide-react";
import { debloquerIp, resolveAlerte, supprimerLogsAnciens } from "@/lib/actions/securite";

export function BoutonDebloquerIp({ id, ip }: { id: string; ip: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => debloquerIp(id))}
      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
    >
      {pending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ShieldOff className="h-3 w-3" />}
      Débloquer
    </button>
  );
}

export function BoutonResolveAlerte({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => resolveAlerte(id))}
      className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
    >
      {pending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
      Résoudre
    </button>
  );
}

export function BoutonNettoyage() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("Supprimer tous les logs de sécurité de plus de 90 jours ?")) return;
        startTransition(() => supprimerLogsAnciens());
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
    >
      {pending ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      Purger logs &gt;90 jours
    </button>
  );
}
