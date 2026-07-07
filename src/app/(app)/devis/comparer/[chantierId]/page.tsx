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

  // Ordre de tri : ECONOMIQUE → OPTIMISEE → COMPLETE → PREMIUM → autres → par prix
  function offreRank(objet: string | null): number {
    const o = (objet ?? "").toUpperCase();
    if (o.includes("ECONOMIQUE") || o.includes("ECO")) return 1;
    if (o.includes("OPTIMISEE") || o.includes("OPTIMISE")) return 2;
    if (o.includes("COMPLETE")) return 3;
    if (o.includes("PREMIUM")) return 4;
    return 5;
  }

  function typeLabel(objet: string | null): { label: string; color: string } {
    const o = (objet ?? "").toUpperCase();
    if (o.includes("ECONOMIQUE") || o.includes("ECO")) return { label: "Économique", color: "bg-emerald-100 text-emerald-700" };
    if (o.includes("OPTIMISEE") || o.includes("OPTIMISE")) return { label: "Optimisée", color: "bg-blue-100 text-blue-700" };
    if (o.includes("COMPLETE")) return { label: "Complète", color: "bg-violet-100 text-violet-700" };
    if (o.includes("PREMIUM")) return { label: "Premium ✦", color: "bg-amber-100 text-amber-700" };
    return { label: "—", color: "bg-slate-100 text-slate-500" };
  }

  const [chantier, variantesRaw] = await Promise.all([
    prisma.chantier.findUnique({ where: { id: chantierId }, include: { client: true } }),
    prisma.devis.findMany({
      where: { chantierId, statut: "BROUILLON", type: "INITIAL" },
      include: { lignes: { orderBy: { ordre: "asc" } } },
      orderBy: { totalTTC: "asc" },
    }),
  ]);

  // Tri par type d'offre puis par prix
  const variantes = [...variantesRaw].sort((a, b) => {
    const rankDiff = offreRank(a.objet) - offreRank(b.objet);
    if (rankDiff !== 0) return rankDiff;
    return a.totalTTC - b.totalTTC;
  });

  if (!chantier || variantes.length === 0) notFound();

  // ── Mode chapitres ───────────────────────────────────────────────────────
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

  // ── Mode lignes plates (pas de CHAPITRE) ──────────────────────────────────
  const hasChapitres = allChapitres.length > 0;

  type LigneComp = { designation: string; montantsParVariante: (number | null)[] };
  let flatLignesVariables: LigneComp[] = [];
  let flatCommunTotal = 0;

  if (!hasChapitres) {
    // Collecter tous les ordres de lignes (LIGNE uniquement)
    const ordres = Array.from(
      new Set(
        variantes.flatMap((v) =>
          v.lignes.filter((l) => l.type === "LIGNE").map((l) => l.ordre)
        )
      )
    ).sort((a, b) => a - b);

    for (const ordre of ordres) {
      const montants = variantes.map(
        (v) => v.lignes.find((l) => l.ordre === ordre && l.type === "LIGNE")?.totalHT ?? null
      );
      const refMontant = montants[0];
      const allSame = montants.every((m) => m === refMontant);
      const desig =
        variantes[0].lignes
          .find((l) => l.ordre === ordre && l.type === "LIGNE")
          ?.designation?.split("\n")[0]
          ?.replace(/<[^>]*>/g, "")
          .trim() ?? `Ligne ${ordre}`;

      if (allSame) {
        flatCommunTotal += refMontant ?? 0;
      } else {
        flatLignesVariables.push({ designation: desig, montantsParVariante: montants });
      }
    }
  }

  const variantesSummary = variantes.map((v, vi) => ({
    id: v.id,
    numero: v.numero,
    dateCreation: v.dateCreation.toISOString(),
    objet: v.objet,
    typeLabel: typeLabel(v.objet),
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
              {variantes.map((v) => {
                const tl = typeLabel(v.objet);
                return (
                  <th key={v.id} className="px-4 py-3 text-right font-semibold text-xs min-w-[150px]">
                    <div className="font-bold">{v.numero}</div>
                    <div className="font-normal opacity-75 text-[10px] mb-1">{formatDate(v.dateCreation)}</div>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold ${tl.color}`}>
                      {tl.label}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {hasChapitres ? (
              // ── Mode chapitres ─────────────────────────────────────────────
              allChapitres.map((chap) => (
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
              ))
            ) : (
              // ── Mode lignes plates ─────────────────────────────────────────
              <>
                {/* Prestations communes (identiques sur toutes les variantes) */}
                {flatCommunTotal > 0 && (
                  <tr className="bg-slate-50/80">
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-500 italic">
                      Prestations communes (main d'œuvre, pose, fixation, logistique…)
                    </td>
                    {variantes.map((v) => (
                      <td key={v.id} className="px-4 py-2.5 text-right text-xs text-slate-500">
                        {formatEuros(flatCommunTotal)}
                      </td>
                    ))}
                  </tr>
                )}
                {/* Lignes variables (différentes entre variantes) */}
                {flatLignesVariables.map((ligne, i) => (
                  <tr key={i} className="hover:bg-violet-50/20 bg-white">
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-700 max-w-[240px]">
                      <span className="line-clamp-2">{ligne.designation}</span>
                    </td>
                    {ligne.montantsParVariante.map((m, vi) => (
                      <td key={vi} className="px-4 py-2.5 text-right text-xs font-semibold text-violet-700">
                        {m !== null ? formatEuros(m) : <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </>
            )}
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
