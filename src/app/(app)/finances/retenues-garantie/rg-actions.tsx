"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Calendar } from "lucide-react";
import { libererRG, setDateReceptionCST } from "@/lib/actions/relance-facture";

export function RGActions({
  cstId,
  action,
}: {
  cstId: string;
  action: "liberer" | "dateReception";
}) {
  const [pending, startTransition] = useTransition();
  const [showDate, setShowDate] = useState(false);
  const [date, setDate] = useState("");

  if (action === "liberer") {
    return (
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => libererRG(cstId))}
        className="flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition"
      >
        <CheckCircle2 className="h-3 w-3" />
        {pending ? "…" : "Libérer"}
      </button>
    );
  }

  if (!showDate) {
    return (
      <button
        type="button"
        onClick={() => setShowDate(true)}
        className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-100 transition"
      >
        <Calendar className="h-3 w-3" />
        Saisir date
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="rounded border border-slate-200 px-1.5 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-blue"
      />
      <button
        type="button"
        disabled={!date || pending}
        onClick={() => startTransition(async () => {
          await setDateReceptionCST(cstId, date);
          setShowDate(false);
        })}
        className="rounded bg-brand-blue px-2 py-1 text-[10px] font-semibold text-white hover:bg-brand-navy disabled:opacity-40 transition"
      >
        {pending ? "…" : "OK"}
      </button>
    </div>
  );
}
