import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { createDepense } from "@/lib/actions/depenses";
import { DepenseForm } from "@/components/depenses/depense-form";
import { CompanyHeader } from "@/components/ui/company-header";

export default async function NouvelleDepensePage() {
  const [chantiers, fournisseurs] = await Promise.all([
    prisma.chantier.findMany({
      where: { statut: { in: ["EN_COURS", "PROSPECT", "DEVIS_ENVOYE"] } },
      select: { id: true, nom: true, reference: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.fournisseur.findMany({
      select: { id: true, nom: true },
      orderBy: { nom: "asc" },
    }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/depenses" className="text-sm text-brand-blue hover:underline">
          ← Retour aux dépenses
        </Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">Nouvelle dépense</h2>
        <p className="mt-1 text-sm text-slate-500">
          Charges fixes, variables, amortissements, investissements — alimentation du Compte de résultat.
        </p>
      </div>

      <CompanyHeader typeDocument="Dépense" warnIfNoAffaire />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <DepenseForm
          action={createDepense}
          chantiers={chantiers}
          fournisseurs={fournisseurs}
        />
      </div>
    </div>
  );
}
