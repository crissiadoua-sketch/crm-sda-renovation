import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { updateCodifications } from "@/lib/actions/parametres";
import { CodificationsForm } from "./codifications-form";

export default async function CodificationsPage() {
  const codifications = await prisma.codification.findMany({
    orderBy: [{ categorie: "asc" }, { code: "asc" }],
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/parametres" className="text-sm text-brand-blue hover:underline">
          ← Paramètres
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Codifications</h2>
        <p className="mt-1 text-sm text-slate-500">
          Configurez les préfixes et la largeur de numérotation de chaque type de document, client et tiers.
          Les codes soumis au gel légal (Devis, Facture) ne prennent effet qu'au 1er janvier de l'exercice suivant.
        </p>
      </div>

      <CodificationsForm codifications={codifications} action={updateCodifications} />
    </div>
  );
}
