import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";
import { computeSousTotaux, computeSectionClosures } from "@/lib/devis-subtotals";
import { retenirVariante, supprimerVariante, envoyerVariantes, genererLienVariantes } from "@/lib/actions/devis";
import { ComparaisonActions } from "./comparaison-actions";

export default async function ComparerVariantesPage({
  params,
}: {
  params: Promise<{ chantierId: string }>;
}) {
  const { chantierId } = await params;

  const [chantier, variantes] = await Promise.all([
    prisma.chantier.findUnique({ where: { id: chantierId }, include: { client: true } }),
    prisma.devis.findMany({
      where: { chantierId, statut: "BROUILLON", type: "INITIAL" },
      include: { lignes: { orderBy: { ordre: "asc" } } },
      orderBy: { dateCreation: "asc" },
    }),
  ]);

  if (!chantier || variantes.length === 0) notFound();

  // Sous-totaux par chapitre
  type ChapTotal = { designation: string; montant: number };
  const chapitresParVariante: ChapTotal[][] = variantes.map((v) => {
    const sousTotaux = computeSousTotaux(v.lignes, (l) =>
      l.type === "LIGNE" ? (l.totalHT ?? 0) : 0
    );
    const result: ChapTotal[] = [];
    v.lignes.forEach((l, i) => {
      if (l.type !== "CHAPITRE" || l.sousTotalMasque) return;
      const txt = l.designation?.replace(/<[^>]*>/g, "").trim() ?? "";
      result.push({ designation: txt, montant: l.sousTotalManuel ?? sousTotaux[i] ?? 0 });
    });
    return result;
  });

  const allChapitres = Array.from(
    new Set(chapitresParVariante.flatMap((v) => v.map((c) => c.designation)))
  );

  const variantesSummary = variantes.map((v, vi) => ({
    id: v.id,
    numero: v.numero,
    dateCreation: v.dateCreation.toISOString(),
    objet: v.objet,
    totalHT: v.totalHT,
    totalTVA: v.totalTVA,
    totalTTC: v.totalTTC,
    chapitres: chapitresParVariante[vi] ?? [],
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div>
        <Link href="/devis" className="text-sm text-brand-blue hover:underline">← Retour aux devis</Link>
        <h2 className="mt-1 text-xl font-bold text-brand-navy">
          Comparaison des variantes — {chantier.nom}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {clientDisplayName(chantier.client)} · {variantes.length} variantes en brouillon
        </p>
      </div>

      {/* Tableau comparatif */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-[#1E2F6E] text-white">
              <th className="px-4 py-3 text-left font-semibold text-xs w-48">Chapitre</th>
              {variantes.map((v) => (
                <th key={v.id} className="px-4 py-3 text-right font-semibold text-xs min-w-[150px]">
                  <div className="font-bold">{v.numero}</div>
                  <div className="font-normal opacity-75 text-[10px]">{formatDate(v.dateCreation)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allChapitres.map((chap) => (
              <tr key={chap} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-50/60">{chap}</td>
                {variantes.map((v, vi) => {
                  const found = chapitresParVariante[vi]?.find((c) => c.designation === chap);
                  return (
                    <td key={v.id} className="px-4 py-2.5 text-right text-xs text-slate-600">
                      {found ? formatEuros(found.montant) : <span className="text-slate-300">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-slate-100"><td colSpan={variantes.length + 1} className="py-1" /></tr>
            <tr className="bg-slate-50">
              <td className="px-4 py-2.5 text-xs font-semibold text-slate-500">Total HT</td>
              {variantes.map((v) => (
                <td key={v.id} className="px-4 py-2.5 text-right text-xs font-semibold text-slate-700">{formatEuros(v.totalHT)}</td>
              ))}
            </tr>
            <tr className="bg-slate-50">
              <td className="px-4 py-2.5 text-xs font-semibold text-slate-500">TVA</td>
              {variantes.map((v) => (
                <td key={v.id} className="px-4 py-2.5 text-right text-xs text-slate-600">{formatEuros(v.totalTVA)}</td>
              ))}
            </tr>
            <tr className="bg-[#1E2F6E]/5 border-t-2 border-[#1E2F6E]/20">
              <td className="px-4 py-3 text-sm font-bold text-[#1E2F6E]">TOTAL TTC</td>
              {variantes.map((v) => (
                <td key={v.id} className="px-4 py-3 text-right text-sm font-bold text-[#1E2F6E]">{formatEuros(v.totalTTC)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Actions (client component) */}
      <ComparaisonActions
        variantes={variantesSummary}
        chantierId={chantierId}
        tokenExistant={chantier.tokenVariantes}
        retenirAction={retenirVariante}
        supprimerAction={supprimerVariante}
        envoyerAction={envoyerVariantes}
        genererLienAction={genererLienVariantes}
      />
    </div>
  );
}
