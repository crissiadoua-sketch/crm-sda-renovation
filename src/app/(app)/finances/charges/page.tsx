export const dynamic = "force-dynamic";

import Link from "next/link";
import { BarChart3, ChevronRight, Settings2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BudgetChargesEditor } from "@/components/finances/budget-charges-editor";
import type { BudgetLigne } from "@/lib/actions/budget-charges";

export default async function BudgetChargesPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee: anneeParam } = await searchParams;
  const annee = parseInt(anneeParam ?? "") || new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => annee - 2 + i);

  const lignes = await prisma.budgetChargesSociete.findMany({
    where: { annee },
    orderBy: [{ type: "asc" }, { categorie: "asc" }, { label: "asc" }],
  });

  const data: BudgetLigne[] = lignes.map((l) => ({
    id: l.id,
    label: l.label,
    categorie: l.categorie,
    type: l.type as "FIXE" | "VARIABLE",
    montantAnnuel: l.montantAnnuel,
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Budget des charges</span>
          </nav>
          <div className="flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-brand-blue" />
            <h2 className="text-xl font-bold text-brand-navy">Budget des charges — {annee}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Définissez vos charges fixes et variables annuelles pour calculer votre seuil de rentabilité.
          </p>
        </div>

        {/* Sélecteur année */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Année :</span>
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
            {years.map((y) => (
              <Link
                key={y}
                href={`/finances/charges?annee=${y}`}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  y === annee
                    ? "bg-brand-navy text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Lien vers le tableau de rentabilité */}
      <Link
        href={`/finances/rentabilite?annee=${annee}`}
        className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700 hover:bg-violet-100 transition"
      >
        <BarChart3 className="h-5 w-5 shrink-0" />
        <span className="font-medium">Voir le tableau de rentabilité {annee}</span>
        <ChevronRight className="ml-auto h-4 w-4" />
      </Link>

      {/* Éditeur */}
      <BudgetChargesEditor annee={annee} lignes={data} />
    </div>
  );
}
