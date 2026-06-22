import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { TYPE_ELEMENT_LABELS, MATERIAU_LABELS } from "@/lib/calcul-structurel/pre-dimensionnement";

export default async function PreDimensionnementListePage() {
  const pdims = await prisma.preDimensionnement.findMany({
    include: { chantier: { select: { reference: true, nom: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Pré-dimensionnement structurel</h2>
          <p className="mt-1 text-sm text-slate-500">
            Estimation rapide des sections (poutre, dalle, poteau) par ratios forfaitaires — avant calcul détaillé.
          </p>
        </div>
        <LinkButton href="/etude-prix/pre-dimensionnement/nouveau">+ Nouveau calcul</LinkButton>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        ⚠️ Ces résultats sont des ordres de grandeur destinés au pré-dimensionnement. Pour tout usage réel (permis de
        construire, exécution), chaque note doit être contre-vérifiée et contre-signée par un ingénieur structure
        indépendant.
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Numéro</th>
              <th className="px-4 py-3">Titre</th>
              <th className="px-4 py-3">Élément</th>
              <th className="px-4 py-3">Matériau</th>
              <th className="px-4 py-3">Résultat</th>
              <th className="px-4 py-3">Chantier</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pdims.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs text-slate-500">
                  <Link href={`/etude-prix/pre-dimensionnement/${p.id}`} className="text-brand-blue hover:underline">
                    {p.numero}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-700">{p.titre || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{TYPE_ELEMENT_LABELS[p.typeElement as keyof typeof TYPE_ELEMENT_LABELS] ?? p.typeElement}</td>
                <td className="px-4 py-3 text-slate-600">{MATERIAU_LABELS[p.materiau as keyof typeof MATERIAU_LABELS] ?? p.materiau}</td>
                <td className="px-4 py-3 font-medium text-brand-navy">{p.resultatLabel}</td>
                <td className="px-4 py-3 text-slate-500">{p.chantier ? `${p.chantier.reference} — ${p.chantier.nom}` : "—"}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(p.createdAt)}</td>
              </tr>
            ))}
            {pdims.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  Aucun calcul de pré-dimensionnement pour le moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
