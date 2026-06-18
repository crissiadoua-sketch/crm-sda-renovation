import { SousTraitantForm } from "@/components/sous-traitants/sous-traitant-form";
import { createSousTraitant } from "@/lib/actions/sous-traitants";

export default function NouveauSousTraitantPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-brand-navy">Nouveau sous-traitant</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SousTraitantForm action={createSousTraitant} />
      </div>
    </div>
  );
}
