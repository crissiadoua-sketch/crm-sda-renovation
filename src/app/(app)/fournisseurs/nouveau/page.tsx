export const dynamic = "force-dynamic";

import { FournisseurForm } from "@/components/fournisseurs/fournisseur-form";
import { createFournisseur } from "@/lib/actions/fournisseurs";

export default function NouveauFournisseurPage() {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-brand-navy">Nouveau fournisseur</h2>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <FournisseurForm action={createFournisseur} />
      </div>
    </div>
  );
}
