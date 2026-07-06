import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ImportStockClient } from "./import-client";

export default async function ImportStockPage() {
  const fournisseurs = await prisma.fournisseur.findMany({
    orderBy: { nom: "asc" },
    select: { id: true, nom: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/stock" className="text-sm text-brand-blue hover:underline">
          ← Retour au stock
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">
          Import depuis une facture / devis fournisseur
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Déposez une image ou un PDF — l&apos;IA extrait automatiquement les articles avec leurs prix.
        </p>
      </div>

      <ImportStockClient fournisseurs={fournisseurs} />
    </div>
  );
}
