import Link from "next/link";
import { createContratMutuelle } from "@/lib/actions/mutuelle";
import { ContratMutuellForm } from "@/components/mutuelle/contrat-mutuelle-form";

export default function NouveauContratMutuellePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/mutuelle" className="text-sm text-brand-blue hover:underline">
          ← Retour à la mutuelle
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouveau contrat mutuelle</h2>
        <p className="mt-1 text-sm text-slate-500">
          Enregistrez les informations de votre complémentaire santé collective.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ContratMutuellForm action={createContratMutuelle} />
      </div>
    </div>
  );
}
