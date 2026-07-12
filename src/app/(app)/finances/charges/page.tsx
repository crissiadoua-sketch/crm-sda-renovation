export const dynamic = "force-dynamic";

import Link from "next/link";
import { BarChart3, ChevronRight, Settings2, TrendingDown, TrendingUp } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BudgetChargesEditor } from "@/components/finances/budget-charges-editor";
import { formatEuros } from "@/lib/format";
import type { BudgetLigne } from "@/lib/actions/budget-charges";

export default async function BudgetChargesPage({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string }>;
}) {
  const { annee: anneeParam } = await searchParams;
  const annee = parseInt(anneeParam ?? "") || new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => annee - 2 + i);

  const debut = new Date(annee, 0, 1);
  const fin = new Date(annee, 11, 31, 23, 59, 59);
  const periodMonths = Array.from({ length: 12 }, (_, i) =>
    `${annee}-${String(i + 1).padStart(2, "0")}`
  );

  const [lignes, depenses, bonsCommande, contratsSTR, interimaires, bulletins, adhesions, notesFrais] = await Promise.all([
    prisma.budgetChargesSociete.findMany({
      where: { annee },
      orderBy: [{ type: "asc" }, { categorie: "asc" }, { label: "asc" }],
    }),
    prisma.depense.findMany({
      where: { date: { gte: debut, lte: fin }, type: "REEL" },
      select: { montant: true, categorie: true },
    }),
    prisma.bonCommande.findMany({
      where: { dateCreation: { gte: debut, lte: fin }, statut: { in: ["CONFIRME", "RECU_PARTIEL", "RECU"] } },
      select: { totalHT: true },
    }),
    prisma.contratSousTraitance.findMany({
      where: { createdAt: { gte: debut, lte: fin }, statut: { in: ["SIGNE", "EN_COURS", "TERMINE"] } },
      select: { montantHT: true },
    }),
    prisma.suiviHeureInterimaire.findMany({
      where: { createdAt: { gte: debut, lte: fin } },
      select: { coutTotalHT: true },
    }),
    prisma.bulletinDePaie.findMany({
      where: { periode: { in: periodMonths }, statut: { in: ["VALIDE", "PAYE"] } },
      select: { totalBrut: true, cotisationsPatronales: true },
    }),
    prisma.adhesionMutuelle.findMany({
      where: { actif: true, dateAdhesion: { lte: fin } },
      include: { formuleMutuelle: { select: { cotisationPatronale: true } } },
    }),
    prisma.noteDeFrais.findMany({
      where: { date: { gte: debut, lte: fin }, statut: "REMBOURSEE" },
      select: { montant: true },
    }),
  ]);

  const data: BudgetLigne[] = lignes.map((l) => ({
    id: l.id,
    label: l.label,
    categorie: l.categorie,
    type: l.type as "FIXE" | "VARIABLE",
    montantAnnuel: l.montantAnnuel,
  }));

  // Calcul des réels par catégorie
  const dep = (cat: string) => depenses.filter((d) => d.categorie === cat).reduce((s, d) => s + d.montant, 0);
  const reelByCat: Record<string, number> = {
    SALAIRES: bulletins.reduce((s, b) => s + b.totalBrut + b.cotisationsPatronales, 0)
      + adhesions.reduce((s, a) => s + a.formuleMutuelle.cotisationPatronale * 12, 0),
    LOYER: dep("LOYER"),
    ASSURANCE: dep("ASSURANCE"),
    ADMINISTRATIF: dep("ADMINISTRATIF"),
    IMPOT_TAXE: dep("IMPOT_TAXE"),
    AMORTISSEMENT: dep("AMORTISSEMENT"),
    INVESTISSEMENT: dep("INVESTISSEMENT"),
    AUTRE_FIXE: dep("AUTRE"),
    MATERIAUX: bonsCommande.reduce((s, b) => s + b.totalHT, 0) + dep("MATERIAUX"),
    SOUS_TRAITANCE: contratsSTR.reduce((s, c) => s + (c.montantHT ?? 0), 0) + dep("SOUS_TRAITANCE"),
    TRANSPORT: dep("TRANSPORT"),
    MAIN_OEUVRE: dep("MAIN_OEUVRE"),
    INTERIM: interimaires.reduce((s, h) => s + h.coutTotalHT, 0),
    AUTRE: dep("AUTRE") + notesFrais.reduce((s, n) => s + n.montant, 0),
  };

  // Totaux budget et réel
  const totalBudgetFixe = data.filter(l => l.type === "FIXE").reduce((s, l) => s + l.montantAnnuel, 0);
  const totalBudgetVariable = data.filter(l => l.type === "VARIABLE").reduce((s, l) => s + l.montantAnnuel, 0);
  const totalReelFixe = Object.entries(reelByCat)
    .filter(([k]) => ["SALAIRES","LOYER","ASSURANCE","ADMINISTRATIF","IMPOT_TAXE","AMORTISSEMENT","INVESTISSEMENT","AUTRE_FIXE"].includes(k))
    .reduce((s, [, v]) => s + v, 0);
  const totalReelVariable = Object.entries(reelByCat)
    .filter(([k]) => ["MATERIAUX","SOUS_TRAITANCE","TRANSPORT","MAIN_OEUVRE","INTERIM","AUTRE"].includes(k))
    .reduce((s, [, v]) => s + v, 0);

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

      {/* ── Comparatif Budget vs Réel (transactionnel) ── */}
      {data.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-brand-navy px-5 py-3 flex items-center justify-between">
            <h3 className="font-semibold text-white">Budget vs Réel transactionnel — {annee}</h3>
            <span className="text-xs text-white/60">Données issues des modules du CRM</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
                  <th className="px-4 py-2.5 text-left">Catégorie</th>
                  <th className="px-4 py-2.5 text-right">Budget annuel</th>
                  <th className="px-4 py-2.5 text-right">Réel {annee}</th>
                  <th className="px-4 py-2.5 text-right">Écart</th>
                  <th className="px-4 py-2.5 text-left w-36">Consommé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {[
                  { cat: "SALAIRES", label: "Salaires & charges sociales", type: "FIXE" as const },
                  { cat: "LOYER", label: "Loyer & charges locatives", type: "FIXE" as const },
                  { cat: "ASSURANCE", label: "Assurances", type: "FIXE" as const },
                  { cat: "ADMINISTRATIF", label: "Frais administratifs", type: "FIXE" as const },
                  { cat: "IMPOT_TAXE", label: "Impôts & taxes", type: "FIXE" as const },
                  { cat: "AMORTISSEMENT", label: "Amortissements", type: "FIXE" as const },
                  { cat: "MATERIAUX", label: "Achats matériaux (BC + dépenses)", type: "VARIABLE" as const },
                  { cat: "SOUS_TRAITANCE", label: "Sous-traitance", type: "VARIABLE" as const },
                  { cat: "TRANSPORT", label: "Transport & déplacement", type: "VARIABLE" as const },
                  { cat: "MAIN_OEUVRE", label: "Main-d'œuvre directe", type: "VARIABLE" as const },
                  { cat: "INTERIM", label: "Intérimaires", type: "VARIABLE" as const },
                  { cat: "AUTRE", label: "Autres charges & notes de frais", type: "VARIABLE" as const },
                ]
                  .filter(({ cat, type }) => {
                    const budget = data.filter(l => l.categorie === cat && l.type === type).reduce((s, l) => s + l.montantAnnuel, 0);
                    const reel = reelByCat[cat] ?? 0;
                    return budget > 0 || reel > 0;
                  })
                  .map(({ cat, label, type }) => {
                    const budget = data.filter(l => l.categorie === cat && l.type === type).reduce((s, l) => s + l.montantAnnuel, 0);
                    const reel = reelByCat[cat] ?? 0;
                    const ecart = reel - budget;
                    const pctConso = budget > 0 ? Math.min(200, (reel / budget) * 100) : null;
                    const surBudget = budget > 0 && reel > budget;
                    return (
                      <tr key={cat} className="hover:bg-slate-50/50">
                        <td className="px-4 py-2 text-slate-700">
                          <span className={`mr-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${type === "FIXE" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                            {type === "FIXE" ? "Fixe" : "Variable"}
                          </span>
                          {label}
                        </td>
                        <td className="px-4 py-2 text-right text-slate-500">{budget > 0 ? formatEuros(budget) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2 text-right font-medium">{reel > 0 ? formatEuros(reel) : <span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-2 text-right">
                          {budget > 0 && (
                            <span className={`text-xs font-medium ${surBudget ? "text-red-600" : "text-emerald-600"}`}>
                              {ecart > 0 ? "+" : ""}{formatEuros(ecart)}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {pctConso !== null && (
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${surBudget ? "bg-red-400" : "bg-emerald-400"}`}
                                  style={{ width: `${Math.min(100, pctConso)}%` }}
                                />
                              </div>
                              <span className={`text-[10px] font-medium w-8 text-right ${surBudget ? "text-red-600" : "text-slate-500"}`}>
                                {Math.round(pctConso)}%
                              </span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-xs font-semibold">
                <tr>
                  <td className="px-4 py-3 text-slate-700">Total charges fixes</td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatEuros(totalBudgetFixe)}</td>
                  <td className="px-4 py-3 text-right">{formatEuros(totalReelFixe)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={totalReelFixe > totalBudgetFixe ? "text-red-600" : "text-emerald-600"}>
                      {totalReelFixe - totalBudgetFixe > 0 ? "+" : ""}{formatEuros(totalReelFixe - totalBudgetFixe)}
                    </span>
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-slate-700">Total charges variables</td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatEuros(totalBudgetVariable)}</td>
                  <td className="px-4 py-3 text-right">{formatEuros(totalReelVariable)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={totalReelVariable > totalBudgetVariable ? "text-red-600" : "text-emerald-600"}>
                      {totalReelVariable - totalBudgetVariable > 0 ? "+" : ""}{formatEuros(totalReelVariable - totalBudgetVariable)}
                    </span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Éditeur */}
      <BudgetChargesEditor annee={annee} lignes={data} />
    </div>
  );
}
