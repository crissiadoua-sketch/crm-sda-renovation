export const dynamic = "force-dynamic";

import Link from "next/link";
import { OuvrageForm } from "@/components/ouvrages/ouvrage-form";
import { createOuvrage } from "@/lib/actions/ouvrages";

export default function NouvelOuvragePage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/ouvrages" className="text-sm text-brand-blue hover:underline">
          ← Retour à la bibliothèque
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouvel ouvrage</h2>
        <p className="mt-1 text-sm text-slate-500">
          Ajoutez un article à la bibliothèque des prix unitaires. Il sera disponible
          immédiatement dans l'éditeur de devis.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <OuvrageForm action={createOuvrage} />
      </div>
    </div>
  );
}
