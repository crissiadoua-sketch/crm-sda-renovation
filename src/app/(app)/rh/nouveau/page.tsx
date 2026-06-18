import Link from "next/link";
import { SalarieForm } from "@/components/rh/salarie-form";
import { createSalarie } from "@/lib/actions/rh";

export default function NouveauSalariePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/rh" className="text-sm text-brand-blue hover:underline">
          ← Retour aux salariés
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouveau salarié</h2>
        <p className="mt-1 text-sm text-slate-500">
          CCN Ouvriers, ETAM ou Cadres du Bâtiment (Occitanie — Haute-Garonne).
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <SalarieForm action={createSalarie} />
      </div>
    </div>
  );
}
