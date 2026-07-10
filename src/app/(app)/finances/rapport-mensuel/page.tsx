export const dynamic = "force-dynamic";

import Link from "next/link";
import { redirect } from "next/navigation";
import { SelectRedirect } from "@/components/ui/select-redirect";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Users,
  Building2,
  ShoppingCart,
  Receipt,
  Heart,
  UserCheck,
  Banknote,
  Scale,
  BarChart3,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Shield,
  Target,
  Activity,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";
import { getUser } from "@/lib/dal";
import { isFullAccessRole } from "@/lib/permissions";

function computeIS(resultat: number): number {
  if (resultat <= 0) return 0;
  return Math.min(resultat, 42500) * 0.15 + Math.max(0, resultat - 42500) * 0.25;
}

function getPeriodMonths(debut: Date, fin: Date): string[] {
  const months: string[] = [];
  const c = new Date(debut.getFullYear(), debut.getMonth(), 1);
  const e = new Date(fin.getFullYear(), fin.getMonth(), 1);
  while (c <= e) {
    months.push(`${c.getFullYear()}-${String(c.getMonth() + 1).padStart(2, "0")}`);
    c.setMonth(c.getMonth() + 1);
  }
  return months;
}

function delta(current: number, previous: number): { pct: number; dir: "up" | "down" | "flat" } {
  if (previous === 0) return { pct: 0, dir: "flat" };
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  return { pct, dir: pct > 1 ? "up" : pct < -1 ? "down" : "flat" };
}

export default async function RapportMensuelPage({
  searchParams,
}: {
  searchParams: Promise<{ mois?: string }>;
}) {
  // Restriction Dirigeant uniquement
  const user = await getUser();
  if (user.role !== "DIRIGEANT" && user.role !== "DAF" && !isFullAccessRole(user.role)) {
    redirect("/acces-refuse");
  }

  const { mois: moisParam } = await searchParams;
  const now = new Date();

  // Période courante
  let y: number, m: number;
  if (moisParam && /^\d{4}-\d{2}$/.test(moisParam)) {
    [y, m] = moisParam.split("-").map(Number);
    m -= 1; // 0-indexed
  } else {
    y = now.getFullYear();
    m = now.getMonth();
  }

  const debutM = new Date(y, m, 1);
  const finM = new Date(y, m + 1, 0, 23, 59, 59);
  const periodM = [`${y}-${String(m + 1).padStart(2, "0")}`];

  // Période précédente (M-1)
  const debutM1 = new Date(y, m - 1, 1);
  const finM1 = new Date(y, m, 0, 23, 59, 59);
  const periodM1 = [`${new Date(y, m - 1, 1).getFullYear()}-${String(new Date(y, m - 1, 1).getMonth() + 1).padStart(2, "0")}`];

  // Cumul YTD (janvier → fin du mois)
  const debutYTD = new Date(y, 0, 1);
  const periodYTD = getPeriodMonths(debutYTD, finM);

  const labelMois = debutM.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  const labelMoisPrec = debutM1.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  // ──────────────────────────────────────────────
  // DONNÉES MOIS COURANT
  // ──────────────────────────────────────────────
  const [
    paiementsM,
    facturesM,
    depensesM,
    bulletinsM,
    notesM,
    heuresM,
    bonsCommandeM,
    contratsSTRM,
    adhesionsMutuelle,
    facturesEnAttente,
    chantiersEnCours,
    devisEnCours,
    // M-1
    paiementsM1,
    facturesM1,
    depensesM1,
    bulletinsM1,
  ] = await Promise.all([
    // M courant
    prisma.paiement.findMany({
      where: { date: { gte: debutM, lte: finM } },
      select: { montant: true },
    }),
    prisma.facture.findMany({
      where: { dateEmission: { gte: debutM, lte: finM }, statut: { notIn: ["BROUILLON", "ANNULEE"] } },
      select: { totalHT: true, totalTVA: true, statut: true },
    }),
    prisma.depense.findMany({
      where: { date: { gte: debutM, lte: finM } },
      select: { montant: true, categorie: true },
    }),
    prisma.bulletinDePaie.findMany({
      where: { periode: { in: periodM }, statut: { in: ["VALIDE", "PAYE"] } },
      select: { totalBrut: true, cotisationsPatronales: true, netAPayer: true },
    }),
    prisma.noteDeFrais.findMany({
      where: { date: { gte: debutM, lte: finM }, statut: "REMBOURSEE" },
      select: { montant: true },
    }),
    prisma.suiviHeureInterimaire.findMany({
      where: { createdAt: { gte: debutM, lte: finM } },
      select: { coutTotalHT: true },
    }),
    prisma.bonCommande.findMany({
      where: { dateCreation: { gte: debutM, lte: finM }, statut: { in: ["CONFIRME", "RECU", "RECU_PARTIEL"] } },
      select: { totalHT: true },
    }),
    prisma.contratSousTraitance.findMany({
      where: { createdAt: { gte: debutM, lte: finM }, statut: { in: ["SIGNE", "EN_COURS"] } },
      select: { montantHT: true },
    }),
    prisma.adhesionMutuelle.findMany({
      where: { actif: true },
      select: { formuleMutuelle: { select: { cotisationPatronale: true } } },
    }),
    prisma.facture.findMany({
      where: { statut: { in: ["EN_RETARD", "ENVOYEE", "PAYEE_PARTIELLE"] } },
      include: { client: { select: { nom: true, prenom: true, raisonSociale: true, type: true } } },
      orderBy: { dateEcheance: "asc" },
    }),
    prisma.chantier.findMany({
      where: { statut: "EN_COURS" },
      include: {
        factures: { select: { totalHT: true, montantPaye: true, statut: true } },
        depenses: { where: { date: { gte: debutYTD } }, select: { montant: true } },
        client: { select: { nom: true, prenom: true, raisonSociale: true, type: true } },
      },
    }),
    prisma.devis.findMany({
      where: { statut: { in: ["BROUILLON", "ENVOYE"] } },
      select: { totalHT: true, statut: true },
    }),
    // M-1
    prisma.paiement.findMany({
      where: { date: { gte: debutM1, lte: finM1 } },
      select: { montant: true },
    }),
    prisma.facture.findMany({
      where: { dateEmission: { gte: debutM1, lte: finM1 }, statut: { notIn: ["BROUILLON", "ANNULEE"] } },
      select: { totalHT: true },
    }),
    prisma.depense.findMany({
      where: { date: { gte: debutM1, lte: finM1 } },
      select: { montant: true },
    }),
    prisma.bulletinDePaie.findMany({
      where: { periode: { in: periodM1 }, statut: { in: ["VALIDE", "PAYE"] } },
      select: { totalBrut: true, cotisationsPatronales: true },
    }),
  ]);

  // ──────────────────────────────────────────────
  // CALCULS MOIS COURANT
  // ──────────────────────────────────────────────
  const caEncaisseM = paiementsM.reduce((s, p) => s + p.montant, 0);
  const caFactureM = facturesM.reduce((s, f) => s + f.totalHT, 0);

  const achatsBCM = bonsCommandeM.reduce((s, b) => s + b.totalHT, 0);
  const achatsMateriauxM = depensesM.filter((d) => d.categorie === "MATERIAUX").reduce((s, d) => s + d.montant, 0);
  const totalAchatsM = achatsBCM + achatsMateriauxM;
  const margeBruteM = caFactureM - totalAchatsM;
  const txMargeBruteM = caFactureM > 0 ? (margeBruteM / caFactureM) * 100 : 0;

  const salairesBrutsM = bulletinsM.reduce((s, b) => s + b.totalBrut, 0);
  const chargesPatM = bulletinsM.reduce((s, b) => s + b.cotisationsPatronales, 0);
  const mutuellePatM = adhesionsMutuelle.reduce((s, a) => s + a.formuleMutuelle.cotisationPatronale, 0);
  const interimairesCoutM = heuresM.reduce((s, h) => s + h.coutTotalHT, 0);
  const totalPersonnelM = salairesBrutsM + chargesPatM + mutuellePatM + interimairesCoutM;

  const strM = contratsSTRM.reduce((s, c) => s + (c.montantHT ?? 0), 0);
  const strDepM = depensesM.filter((d) => d.categorie === "SOUS_TRAITANCE").reduce((s, d) => s + d.montant, 0);
  const totalSTRM = strM + strDepM;

  const depVariablesM =
    depensesM.filter((d) => ["TRANSPORT", "MAIN_OEUVRE", "AUTRE"].includes(d.categorie)).reduce((s, d) => s + d.montant, 0) +
    notesM.reduce((s, n) => s + n.montant, 0);

  const depFixesM = depensesM
    .filter((d) => ["ADMINISTRATIF", "LOYER", "ASSURANCE", "IMPOT_TAXE"].includes(d.categorie))
    .reduce((s, d) => s + d.montant, 0);

  const amortissementsM = depensesM.filter((d) => d.categorie === "AMORTISSEMENT").reduce((s, d) => s + d.montant, 0);

  const totalChargesM = totalAchatsM + totalPersonnelM + totalSTRM + depVariablesM + depFixesM;
  const resultatExploitM = caFactureM - totalChargesM;
  const resultatAvantISM = resultatExploitM - amortissementsM;
  const isM = computeIS(resultatAvantISM);
  const resultatNetM = resultatAvantISM - isM;
  const txMargeNetteM = caFactureM > 0 ? (resultatNetM / caFactureM) * 100 : 0;

  // ──────────────────────────────────────────────
  // CALCULS M-1 (comparaison)
  // ──────────────────────────────────────────────
  const caEncaisseM1 = paiementsM1.reduce((s, p) => s + p.montant, 0);
  const caFactureM1 = facturesM1.reduce((s, f) => s + f.totalHT, 0);
  const depensesM1Total = depensesM1.reduce((s, d) => s + d.montant, 0);
  const salairesM1 = bulletinsM1.reduce((s, b) => s + b.totalBrut + b.cotisationsPatronales, 0);
  const totalChargesM1 = depensesM1Total + salairesM1;
  const resultatNetM1 = caFactureM1 - totalChargesM1;

  // Déltas
  const dCA = delta(caFactureM, caFactureM1);
  const dEncaisse = delta(caEncaisseM, caEncaisseM1);
  const dResultat = delta(resultatNetM, resultatNetM1);

  // ──────────────────────────────────────────────
  // SCORE DE SANTÉ FINANCIÈRE (0-100)
  // ──────────────────────────────────────────────
  let healthScore = 0;
  const criteres: { label: string; ok: boolean; valeur: string; detail: string }[] = [];

  // Taux encaissement (poids 20)
  const tauxEnc = caFactureM > 0 ? (caEncaisseM / caFactureM) * 100 : 0;
  const encOk = tauxEnc >= 70;
  healthScore += encOk ? 20 : Math.round((tauxEnc / 70) * 20);
  criteres.push({
    label: "Taux d'encaissement",
    ok: encOk,
    valeur: `${tauxEnc.toFixed(1)} %`,
    detail: "Objectif ≥ 70 % du CA facturé",
  });

  // Marge brute (poids 20)
  const margeBruteOk = txMargeBruteM >= 25;
  healthScore += margeBruteOk ? 20 : Math.round((txMargeBruteM / 25) * 20);
  criteres.push({
    label: "Marge brute",
    ok: margeBruteOk,
    valeur: `${txMargeBruteM.toFixed(1)} %`,
    detail: "Objectif ≥ 25 % du CA (BTP rénovation)",
  });

  // Résultat net positif (poids 20)
  const resultatOk = resultatNetM >= 0;
  healthScore += resultatOk ? 20 : 0;
  criteres.push({
    label: "Résultat net",
    ok: resultatOk,
    valeur: formatEuros(resultatNetM),
    detail: "Objectif : positif",
  });

  // Factures en retard (poids 20)
  const facturesEnRetard = facturesEnAttente.filter((f) => f.statut === "EN_RETARD");
  const retardOk = facturesEnRetard.length <= 2;
  healthScore += retardOk ? 20 : Math.max(0, 20 - facturesEnRetard.length * 5);
  criteres.push({
    label: "Factures en retard",
    ok: retardOk,
    valeur: `${facturesEnRetard.length} facture${facturesEnRetard.length > 1 ? "s" : ""}`,
    detail: "Objectif : ≤ 2",
  });

  // CA en hausse vs M-1 (poids 20)
  const caDynamiqueOk = caFactureM >= caFactureM1;
  healthScore += caDynamiqueOk ? 20 : 10;
  criteres.push({
    label: "CA vs mois précédent",
    ok: caDynamiqueOk,
    valeur: `${dCA.pct >= 0 ? "+" : ""}${dCA.pct.toFixed(1)} %`,
    detail: "Objectif : en progression",
  });

  healthScore = Math.min(100, Math.max(0, Math.round(healthScore)));

  const healthColor =
    healthScore >= 80
      ? { text: "text-emerald-700", bg: "bg-emerald-500", label: "Excellent", badge: "bg-emerald-100 text-emerald-700" }
      : healthScore >= 60
      ? { text: "text-amber-700", bg: "bg-amber-400", label: "Satisfaisant", badge: "bg-amber-100 text-amber-700" }
      : healthScore >= 40
      ? { text: "text-orange-700", bg: "bg-orange-400", label: "À surveiller", badge: "bg-orange-100 text-orange-700" }
      : { text: "text-red-700", bg: "bg-red-500", label: "Critique", badge: "bg-red-100 text-red-700" };

  // ──────────────────────────────────────────────
  // ALERTES
  // ──────────────────────────────────────────────
  const alertes: { niveau: "critique" | "attention" | "info"; message: string }[] = [];

  const totalCreances = facturesEnAttente.reduce((s, f) => s + Math.max(0, f.totalTTC - f.montantPaye), 0);
  if (facturesEnRetard.length > 0) {
    const montRetard = facturesEnRetard.reduce((s, f) => s + Math.max(0, f.totalTTC - f.montantPaye), 0);
    alertes.push({
      niveau: "critique",
      message: `${facturesEnRetard.length} facture${facturesEnRetard.length > 1 ? "s" : ""} en retard — ${formatEuros(montRetard)} à recouvrer d'urgence`,
    });
  }
  if (txMargeBruteM > 0 && txMargeBruteM < 20) {
    alertes.push({
      niveau: "critique",
      message: `Marge brute très faible (${txMargeBruteM.toFixed(1)} %) — vérifier les coûts matériaux et achats fournisseurs`,
    });
  }
  if (resultatNetM < 0) {
    alertes.push({
      niveau: "critique",
      message: `Résultat net négatif (${formatEuros(resultatNetM)}) — les charges excèdent le CA facturé`,
    });
  }
  if (totalPersonnelM / caFactureM > 0.4 && caFactureM > 0) {
    alertes.push({
      niveau: "attention",
      message: `Masse salariale élevée (${Math.round((totalPersonnelM / caFactureM) * 100)} % du CA) — seuil de vigilance à 40 %`,
    });
  }
  if (caFactureM < caFactureM1 * 0.85 && caFactureM1 > 0) {
    alertes.push({
      niveau: "attention",
      message: `CA en baisse de ${Math.round(((caFactureM1 - caFactureM) / caFactureM1) * 100)} % par rapport au mois précédent`,
    });
  }
  if (totalCreances > caFactureM * 0.5 && caFactureM > 0) {
    alertes.push({
      niveau: "attention",
      message: `Créances clients importantes (${formatEuros(totalCreances)}) — ${Math.round((totalCreances / caFactureM) * 100)} % du CA mensuel`,
    });
  }
  if (devisEnCours.length > 0) {
    const pipeHT = devisEnCours.reduce((s, d) => s + d.totalHT, 0);
    alertes.push({
      niveau: "info",
      message: `Pipeline commercial actif : ${devisEnCours.length} devis en cours (${formatEuros(pipeHT)} HT potentiels)`,
    });
  }

  // ──────────────────────────────────────────────
  // TOP CHANTIERS (par CA facturé YTD)
  // ──────────────────────────────────────────────
  const chantiersRentabilite = chantiersEnCours
    .map((c) => {
      const caFact = c.factures.reduce((s, f) => s + f.totalHT, 0);
      const caEnc = c.factures.reduce((s, f) => s + f.montantPaye, 0);
      const dep = c.depenses.reduce((s, d) => s + d.montant, 0);
      const nomClient =
        c.client.type === "PA"
          ? `${c.client.prenom ? c.client.prenom + " " : ""}${c.client.nom}`
          : c.client.raisonSociale || c.client.nom;
      return {
        nom: c.nom,
        client: nomClient,
        caFact,
        caEnc,
        dep,
        marge: caFact - dep,
        txMarge: caFact > 0 ? ((caFact - dep) / caFact) * 100 : 0,
      };
    })
    .sort((a, b) => b.caFact - a.caFact)
    .slice(0, 5);

  // ──────────────────────────────────────────────
  // PRÉVISION TRÉSORERIE 3 MOIS
  // ──────────────────────────────────────────────
  const chargesFixesMensuellesEstimee = depFixesM + totalPersonnelM;
  const previsions = [1, 2, 3].map((offset) => {
    const date = new Date(y, m + offset, 1);
    return {
      label: date.toLocaleDateString("fr-FR", { month: "long" }),
      entreesEstimees: caEncaisseM * 1.02 ** offset, // légère progression estimée
      sortiesEstimees: chargesFixesMensuellesEstimee,
      soldePrevisionnel: caEncaisseM * 1.02 ** offset - chargesFixesMensuellesEstimee,
    };
  });

  // Mois disponibles pour le sélecteur
  const moisDispo = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
      label: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
    };
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/finances" className="text-sm text-brand-blue hover:underline">← Finances</Link>
          </div>
          <h1 className="mt-1 text-xl font-bold text-brand-navy">
            Rapport mensuel — {labelMois}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analyse financière réservée au Dirigeant · SDA Rénovation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SelectRedirect
            options={moisDispo}
            defaultValue={`${y}-${String(m + 1).padStart(2, "0")}`}
            paramName="mois"
          />
        </div>
      </div>

      {/* Score de santé */}
      <div className="rounded-xl border-2 border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-brand-navy">Score de santé financière</h2>
            <p className="text-xs text-slate-400 mt-0.5">{labelMois}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="relative h-20 w-20">
                <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                  <path
                    className="text-slate-100"
                    stroke="currentColor"
                    strokeWidth="3"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={healthColor.text.replace("text-", "text-")}
                    stroke={healthScore >= 80 ? "#10b981" : healthScore >= 60 ? "#f59e0b" : healthScore >= 40 ? "#f97316" : "#ef4444"}
                    strokeWidth="3"
                    strokeDasharray={`${healthScore}, 100`}
                    strokeLinecap="round"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-2xl font-bold ${healthColor.text}`}>{healthScore}</span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
              </div>
            </div>
            <div>
              <span className={`inline-flex rounded-full px-3 py-1 text-sm font-bold ${healthColor.badge}`}>
                {healthColor.label}
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-5">
          {criteres.map((c) => (
            <div key={c.label} className={`rounded-lg p-3 ${c.ok ? "bg-emerald-50" : "bg-red-50"}`}>
              <div className="flex items-center gap-1.5">
                {c.ok ? (
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                )}
                <span className="text-xs font-medium text-slate-700">{c.label}</span>
              </div>
              <p className={`mt-1 text-sm font-bold ${c.ok ? "text-emerald-700" : "text-red-600"}`}>{c.valeur}</p>
              <p className="text-xs text-slate-400">{c.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="flex flex-col gap-2">
          {alertes.map((a, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 rounded-xl border p-3 text-sm ${
                a.niveau === "critique"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : a.niveau === "attention"
                  ? "border-amber-200 bg-amber-50 text-amber-800"
                  : "border-blue-200 bg-blue-50 text-blue-800"
              }`}
            >
              <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${
                a.niveau === "critique" ? "text-red-500" : a.niveau === "attention" ? "text-amber-500" : "text-blue-500"
              }`} />
              <div>
                <span className="font-semibold capitalize">{a.niveau}</span> — {a.message}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KPIs avec comparaison M-1 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "CA Facturé HT", value: caFactureM, prev: caFactureM1, d: dCA,
            icon: <Receipt className="h-4 w-4 text-emerald-600" />, color: "text-emerald-600",
          },
          {
            label: "CA Encaissé", value: caEncaisseM, prev: caEncaisseM1, d: dEncaisse,
            icon: <TrendingUp className="h-4 w-4 text-brand-blue" />, color: "text-brand-blue",
          },
          {
            label: "Résultat net", value: resultatNetM, prev: resultatNetM1, d: dResultat,
            icon: <Scale className="h-4 w-4 text-brand-navy" />, color: resultatNetM >= 0 ? "text-emerald-600" : "text-red-600",
          },
          {
            label: "Marge brute", value: margeBruteM, prev: 0, d: { pct: txMargeBruteM, dir: "flat" as const },
            icon: <Target className="h-4 w-4 text-brand-orange" />, color: txMargeBruteM >= 25 ? "text-emerald-600" : "text-red-600",
          },
        ].map(({ label, value, prev, d, icon, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
              {icon}
            </div>
            <p className={`mt-2 text-xl font-bold ${color}`}>{formatEuros(value)}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {d.dir === "up" ? (
                <ArrowUpRight className="h-3 w-3 text-emerald-500" />
              ) : d.dir === "down" ? (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              ) : (
                <Minus className="h-3 w-3 text-slate-400" />
              )}
              <span className={`text-xs ${d.dir === "up" ? "text-emerald-600" : d.dir === "down" ? "text-red-600" : "text-slate-400"}`}>
                {d.pct >= 0 ? "+" : ""}{d.pct.toFixed(1)} % vs {labelMoisPrec}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Compte de résultat synthétique */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-brand-navy">Compte de résultat — {labelMois}</h3>
          <p className="text-xs text-slate-400">Comparaison avec {labelMoisPrec}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-2 text-left">Indicateur</th>
                <th className="px-5 py-2 text-right">{labelMois}</th>
                <th className="px-5 py-2 text-right">{labelMoisPrec}</th>
                <th className="px-5 py-2 text-right">Var.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[
                { label: "CA Facturé HT", m: caFactureM, m1: caFactureM1, bold: false, isPositif: true },
                { label: "Achats matériaux", m: -totalAchatsM, m1: 0, bold: false, isPositif: false },
                { label: "MARGE BRUTE", m: margeBruteM, m1: 0, bold: true, isPositif: margeBruteM >= 0 },
                { label: "Charges de personnel", m: -totalPersonnelM, m1: -(bulletinsM1.reduce((s, b) => s + b.totalBrut + b.cotisationsPatronales, 0) + mutuellePatM + interimairesCoutM), bold: false, isPositif: false },
                { label: "Sous-traitance", m: -totalSTRM, m1: 0, bold: false, isPositif: false },
                { label: "Charges variables", m: -depVariablesM, m1: 0, bold: false, isPositif: false },
                { label: "Charges fixes", m: -depFixesM, m1: 0, bold: false, isPositif: false },
                { label: "Résultat d'exploitation", m: resultatExploitM, m1: 0, bold: true, isPositif: resultatExploitM >= 0 },
                { label: "Amortissements", m: -amortissementsM, m1: 0, bold: false, isPositif: false },
                { label: "IS estimé", m: -isM, m1: 0, bold: false, isPositif: false },
                { label: "RÉSULTAT NET", m: resultatNetM, m1: resultatNetM1, bold: true, isPositif: resultatNetM >= 0 },
              ].map(({ label, m: mv, m1: m1v, bold, isPositif }) => {
                const d = delta(Math.abs(mv), Math.abs(m1v));
                return (
                  <tr key={label} className={bold ? "bg-slate-50" : ""}>
                    <td className={`px-5 py-2 ${bold ? "font-bold text-brand-navy" : "text-slate-600"}`}>
                      {bold && <span className="mr-1.5 font-mono text-slate-400">=</span>}
                      {label}
                    </td>
                    <td className={`px-5 py-2 text-right font-mono ${bold ? "font-bold text-base " : ""} ${isPositif ? "text-emerald-600" : "text-red-600"}`}>
                      {formatEuros(mv)}
                    </td>
                    <td className="px-5 py-2 text-right font-mono text-slate-400">
                      {m1v !== 0 ? formatEuros(m1v) : "—"}
                    </td>
                    <td className="px-5 py-2 text-right">
                      {m1v !== 0 ? (
                        <span className={`text-xs font-medium ${d.dir === "up" ? (mv > 0 ? "text-emerald-600" : "text-red-600") : d.dir === "down" ? (mv > 0 ? "text-red-600" : "text-emerald-600") : "text-slate-400"}`}>
                          {d.pct >= 0 ? "+" : ""}{d.pct.toFixed(1)} %
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top chantiers */}
      {chantiersRentabilite.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-brand-blue" />
              <h3 className="font-semibold text-brand-navy">Chantiers en cours — rentabilité</h3>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-2 text-left">Chantier</th>
                  <th className="px-5 py-2 text-left">Client</th>
                  <th className="px-5 py-2 text-right">CA Facturé</th>
                  <th className="px-5 py-2 text-right">Encaissé</th>
                  <th className="px-5 py-2 text-right">Dépenses</th>
                  <th className="px-5 py-2 text-right">Marge</th>
                  <th className="px-5 py-2 text-right">Taux</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chantiersRentabilite.map((c) => (
                  <tr key={c.nom} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-700">{c.nom}</td>
                    <td className="px-5 py-2.5 text-slate-500 text-xs">{c.client}</td>
                    <td className="px-5 py-2.5 text-right text-slate-700">{formatEuros(c.caFact)}</td>
                    <td className="px-5 py-2.5 text-right text-emerald-600">{formatEuros(c.caEnc)}</td>
                    <td className="px-5 py-2.5 text-right text-red-600">{formatEuros(c.dep)}</td>
                    <td className={`px-5 py-2.5 text-right font-semibold ${c.marge >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {formatEuros(c.marge)}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.txMarge >= 20 ? "bg-emerald-100 text-emerald-700" : c.txMarge >= 10 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>
                        {c.txMarge.toFixed(1)} %
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Prévision trésorerie 3 mois */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-blue" />
            <h3 className="font-semibold text-brand-navy">Prévision de trésorerie — 3 mois</h3>
            <span className="text-xs text-slate-400">(estimation basée sur les tendances)</span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-0 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {previsions.map((p, i) => (
            <div key={i} className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 capitalize">{p.label}</p>
              <div className="mt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Entrées estimées</span>
                  <span className="font-medium text-emerald-600">{formatEuros(p.entreesEstimees)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Sorties estimées</span>
                  <span className="font-medium text-red-600">{formatEuros(p.sortiesEstimees)}</span>
                </div>
                <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-sm font-semibold">
                  <span className="text-slate-700">Solde prévisionnel</span>
                  <span className={p.soldePrevisionnel >= 0 ? "text-emerald-700" : "text-red-700"}>
                    {formatEuros(p.soldePrevisionnel)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-100 px-5 py-2.5">
          <p className="text-xs text-slate-400">
            Prévision basée sur l&apos;encaissement du mois courant. Charges fixes estimées à {formatEuros(chargesFixesMensuellesEstimee)}/mois.
            Ajuster les paramètres dans le module Trésorerie pour affiner.
          </p>
        </div>
      </div>

      {/* Factures en retard */}
      {facturesEnRetard.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-white shadow-sm">
          <div className="border-b border-red-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <h3 className="font-semibold text-red-700">
                Factures en retard — action requise
              </h3>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {facturesEnRetard.map((f) => {
              const reste = Math.max(0, f.totalTTC - f.montantPaye);
              const joursRetard = f.dateEcheance
                ? Math.floor((now.getTime() - new Date(f.dateEcheance).getTime()) / 86400000)
                : 0;
              return (
                <div key={f.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <Link href={`/factures/${f.id}`} className="font-medium text-red-700 hover:underline">
                      {f.numero}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {f.client.type === "PA"
                        ? `${f.client.prenom ? f.client.prenom + " " : ""}${f.client.nom}`
                        : f.client.raisonSociale || f.client.nom}
                      {f.dateEcheance && ` · Éch. ${new Date(f.dateEcheance).toLocaleDateString("fr-FR")}`}
                      {joursRetard > 0 && (
                        <span className="ml-1 text-red-500 font-medium">({joursRetard}j de retard)</span>
                      )}
                    </p>
                  </div>
                  <span className="font-bold text-red-600">{formatEuros(reste)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Note légale */}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-5 py-3">
        <p className="text-xs text-slate-400">
          <Shield className="inline h-3 w-3 mr-1" />
          Rapport confidentiel — accès réservé au Dirigeant et au DAF.
          IS calculé selon le barème PME (15 % ≤ 42 500 € / 25 % au-delà) — estimation indicative, calcul définitif par votre expert-comptable.
          Prévisions basées sur les données du CRM — ne constituent pas un engagement financier.
        </p>
      </div>
    </div>
  );
}
