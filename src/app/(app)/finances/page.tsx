import Link from "next/link";
import {
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Building2,
  Truck,
  Banknote,
  UserCheck,
  HardHat,
  Calendar,
  FileText,
  ChevronRight,
  AlertCircle,
  Info,
  PackageCheck,
  ArrowRight,
  Scale,
  BarChart3,
  Settings2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate } from "@/lib/format";

type Periode = "mois" | "trimestre" | "semestre" | "annee";

const PERIODES: { value: Periode; label: string }[] = [
  { value: "mois", label: "Ce mois" },
  { value: "trimestre", label: "Ce trimestre" },
  { value: "semestre", label: "Ce semestre" },
  { value: "annee", label: "Cette année" },
];

function getDateRange(periode: Periode): { debut: Date; fin: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  switch (periode) {
    case "mois":
      return {
        debut: new Date(y, m, 1),
        fin: new Date(y, m + 1, 0, 23, 59, 59),
        label: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      };
    case "trimestre": {
      const t = Math.floor(m / 3);
      return {
        debut: new Date(y, t * 3, 1),
        fin: new Date(y, t * 3 + 3, 0, 23, 59, 59),
        label: `T${t + 1} ${y}`,
      };
    }
    case "semestre": {
      const s = m < 6 ? 0 : 1;
      return {
        debut: new Date(y, s * 6, 1),
        fin: new Date(y, s * 6 + 6, 0, 23, 59, 59),
        label: `S${s + 1} ${y}`,
      };
    }
    case "annee":
    default:
      return {
        debut: new Date(y, 0, 1),
        fin: new Date(y, 11, 31, 23, 59, 59),
        label: `Année ${y}`,
      };
  }
}

const STATUT_LABELS: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  CONFIRME: "Confirmé",
  RECU_PARTIEL: "Reçu partiel",
  RECU: "Reçu",
  ANNULE: "Annulé",
};

const STATUT_COLORS: Record<string, string> = {
  BROUILLON: "bg-slate-100 text-slate-600",
  ENVOYE: "bg-blue-100 text-blue-700",
  CONFIRME: "bg-indigo-100 text-indigo-700",
  RECU_PARTIEL: "bg-orange-100 text-orange-700",
  RECU: "bg-emerald-100 text-emerald-700",
  ANNULE: "bg-red-100 text-red-600",
};

const NDF_CAT_LABELS: Record<string, string> = {
  REPAS: "Repas / Réception",
  DEPLACEMENT: "Déplacement",
  CARBURANT: "Carburant",
  HEBERGEMENT: "Hébergement",
  MATERIEL: "Matériel",
  SOUS_TRAITANCE: "Sous-traitance",
  AUTRE: "Autre",
};

const DEPENSE_CAT_LABELS: Record<string, string> = {
  MATERIAUX: "Matériaux & fournitures",
  MAIN_OEUVRE: "Main-d'œuvre externe",
  SOUS_TRAITANCE: "Sous-traitance",
  TRANSPORT: "Transport / carburant",
  ADMINISTRATIF: "Administratif",
  LOYER: "Loyer & charges",
  ASSURANCE: "Assurances",
  AMORTISSEMENT: "Amortissements",
  INVESTISSEMENT: "Investissements",
  IMPOT_TAXE: "Impôts & taxes",
  AUTRE: "Divers",
};

function ProgressBar({ value, max, color = "bg-brand-blue" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default async function FinancesPage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: periodeParam } = await searchParams;
  const periode: Periode =
    (["mois", "trimestre", "semestre", "annee"] as Periode[]).includes(periodeParam as Periode)
      ? (periodeParam as Periode)
      : "mois";

  const { debut, fin, label: periodeLabel } = getDateRange(periode);
  const now = new Date();

  const [
    bonsCommande,
    depenses,
    notesDeFrais,
    heuresInterimaires,
    contratsSTR,
    facturesPeriode,
  ] = await Promise.all([
    // Tous les bons de commande de la période
    prisma.bonCommande.findMany({
      where: { dateCreation: { gte: debut, lte: fin } },
      include: {
        fournisseur: { select: { nom: true, id: true } },
        chantier: { select: { nom: true, reference: true } },
        lignes: { select: { designation: true, quantite: true, prixUnitaireHT: true, totalHT: true, unite: true } },
      },
      orderBy: { dateCreation: "desc" },
    }),
    // Dépenses de la période
    prisma.depense.findMany({
      where: { date: { gte: debut, lte: fin } },
      include: {
        chantier: { select: { nom: true, reference: true } },
        fournisseur: { select: { nom: true } },
      },
      orderBy: { date: "desc" },
    }),
    // Notes de frais de la période
    prisma.noteDeFrais.findMany({
      where: { date: { gte: debut, lte: fin } },
      include: { chantier: { select: { nom: true } } },
      orderBy: { date: "desc" },
    }),
    // Heures intérimaires de la période
    prisma.suiviHeureInterimaire.findMany({
      where: { createdAt: { gte: debut, lte: fin } },
      include: {
        interimaire: { select: { nom: true, prenom: true, agence: true, corpsEtat: true } },
        chantier: { select: { nom: true } },
      },
    }),
    // Contrats sous-traitance de la période
    prisma.contratSousTraitance.findMany({
      where: { createdAt: { gte: debut, lte: fin } },
      include: {
        sousTraitant: { select: { nom: true, specialite: true } },
        chantier: { select: { nom: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // CA facturé pour le ratio achats/CA
    prisma.facture.findMany({
      where: {
        dateEmission: { gte: debut, lte: fin },
        statut: { notIn: ["BROUILLON", "ANNULEE"] },
      },
      select: { totalHT: true },
    }),
  ]);

  // ────────────────────────────────────────────────────────────────
  // CALCULS
  // ────────────────────────────────────────────────────────────────

  const caHT = facturesPeriode.reduce((s, f) => s + f.totalHT, 0);

  // Totaux bons de commande
  const totalBCHT = bonsCommande.reduce((s, b) => s + b.totalHT, 0);
  const totalBCTTC = bonsCommande.reduce((s, b) => s + b.totalTTC, 0);
  const bcConfirmes = bonsCommande.filter((b) =>
    ["CONFIRME", "RECU", "RECU_PARTIEL"].includes(b.statut)
  );
  const totalBCConfirmesHT = bcConfirmes.reduce((s, b) => s + b.totalHT, 0);

  // Totaux dépenses
  const totalDepensesHT = depenses.reduce((s, d) => s + d.montant, 0);

  // Totaux notes de frais
  const totalNDF = notesDeFrais.reduce((s, n) => s + n.montant, 0);
  const totalNDFRemboursees = notesDeFrais
    .filter((n) => n.statut === "REMBOURSEE")
    .reduce((s, n) => s + n.montant, 0);
  const totalNDFEnAttente = notesDeFrais
    .filter((n) => n.statut === "EN_ATTENTE")
    .reduce((s, n) => s + n.montant, 0);

  // Totaux intérimaires
  const totalInterimaires = heuresInterimaires.reduce((s, h) => s + h.coutTotalHT, 0);

  // Totaux sous-traitance
  const totalSTR = contratsSTR.reduce((s, c) => s + (c.montantHT ?? 0), 0);
  const totalSTRDepenses = depenses
    .filter((d) => d.categorie === "SOUS_TRAITANCE")
    .reduce((s, d) => s + d.montant, 0);

  // Total achats global
  const totalAchatsGlobal = totalBCConfirmesHT + totalDepensesHT + totalNDFRemboursees + totalInterimaires + totalSTR;

  // Ratio achats / CA
  const ratioAchatsCA = caHT > 0 ? (totalAchatsGlobal / caHT) * 100 : 0;

  // ─── RÉPARTITION PAR FOURNISSEUR (bons de commande) ───
  const parFournisseur: Record<string, { nom: string; totalHT: number; nbBC: number }> = {};
  for (const bc of bonsCommande) {
    const key = bc.fournisseur.id;
    if (!parFournisseur[key]) {
      parFournisseur[key] = { nom: bc.fournisseur.nom, totalHT: 0, nbBC: 0 };
    }
    parFournisseur[key].totalHT += bc.totalHT;
    parFournisseur[key].nbBC += 1;
  }
  const topFournisseurs = Object.values(parFournisseur).sort((a, b) => b.totalHT - a.totalHT);
  const maxFournisseur = topFournisseurs[0]?.totalHT ?? 1;

  // ─── RÉPARTITION PAR CHANTIER (bons de commande) ───
  const parChantier: Record<string, { nom: string; totalHT: number; nbBC: number }> = {};
  for (const bc of bonsCommande) {
    const key = bc.chantier?.nom ?? "—";
    if (!parChantier[key]) parChantier[key] = { nom: key, totalHT: 0, nbBC: 0 };
    parChantier[key].totalHT += bc.totalHT;
    parChantier[key].nbBC += 1;
  }
  const topChantiers = Object.values(parChantier).sort((a, b) => b.totalHT - a.totalHT);
  const maxChantier = topChantiers[0]?.totalHT ?? 1;

  // ─── RÉPARTITION DÉPENSES PAR CATÉGORIE ───
  const catDepenses: Record<string, number> = {};
  for (const d of depenses) {
    catDepenses[d.categorie] = (catDepenses[d.categorie] ?? 0) + d.montant;
  }

  // ─── RÉPARTITION NDF PAR CATÉGORIE ───
  const catNDF: Record<string, number> = {};
  for (const n of notesDeFrais) {
    catNDF[n.categorie] = (catNDF[n.categorie] ?? 0) + n.montant;
  }

  // ─── STATUTS BONS DE COMMANDE ───
  const statutsBC = bonsCommande.reduce<Record<string, number>>((acc, bc) => {
    acc[bc.statut] = (acc[bc.statut] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-brand-navy">Gestion financière — Tableau des achats</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Bons de commande · Dépenses · Notes de frais · Intérimaires · Sous-traitance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finances/rapport-mensuel" className="inline-flex items-center gap-1.5 rounded-lg border border-brand-navy/30 bg-brand-navy/5 px-3 py-1.5 text-xs font-medium text-brand-navy hover:bg-brand-navy/10">
            <Scale className="h-3.5 w-3.5" />
            Rapport mensuel Dirigeant
          </Link>
          <Link href="/tresorerie" className="inline-flex items-center gap-1.5 rounded-lg border border-brand-blue/30 bg-brand-blue/5 px-3 py-1.5 text-xs font-medium text-brand-blue hover:bg-brand-blue/10">
            <Scale className="h-3.5 w-3.5" />
            Trésorerie & P&L
          </Link>
          <Link href="/bons-commande/nouveau" className="inline-flex items-center gap-1.5 rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-orange-dark">
            <ShoppingCart className="h-3.5 w-3.5" />
            Nouveau bon de commande
          </Link>
        </div>
      </div>

      {/* Sélecteur période */}
      <div className="flex flex-wrap items-center gap-2">
        <Calendar className="h-4 w-4 shrink-0 text-brand-blue" />
        {PERIODES.map(({ value, label }) => (
          <Link
            key={value}
            href={`?periode=${value}`}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
              periode === value
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-brand-blue/40"
            }`}
          >
            {label}
          </Link>
        ))}
        <span className="ml-2 text-sm font-medium text-brand-navy">{periodeLabel}</span>
      </div>

      {/* Liens modules rentabilité */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href={`/finances/rentabilite?annee=${now.getFullYear()}`}
          className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-700 hover:bg-violet-100 transition"
        >
          <BarChart3 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Rentabilité société</p>
            <p className="text-xs text-violet-500">P&L, MCV, seuil de rentabilité {now.getFullYear()}</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4" />
        </Link>
        <Link
          href={`/finances/charges?annee=${now.getFullYear()}`}
          className="flex items-center gap-3 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-4 py-3 text-sm text-brand-blue hover:bg-brand-blue/10 transition"
        >
          <Settings2 className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Budget des charges</p>
            <p className="text-xs text-brand-blue/70">Charges fixes et variables {now.getFullYear()}</p>
          </div>
          <ChevronRight className="ml-auto h-4 w-4" />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Bons de commande</span>
            <span className="rounded-full bg-brand-orange/10 p-1.5">
              <ShoppingCart className="h-4 w-4 text-brand-orange-dark" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-brand-navy">{formatEuros(totalBCHT)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {bonsCommande.length} BC · {bcConfirmes.length} confirmés
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Dépenses saisies</span>
            <span className="rounded-full bg-red-50 p-1.5">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-red-600">{formatEuros(totalDepensesHT)}</p>
          <p className="text-xs text-slate-400 mt-0.5">{depenses.length} dépense{depenses.length > 1 ? "s" : ""}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Notes de frais</span>
            <span className="rounded-full bg-purple-50 p-1.5">
              <Banknote className="h-4 w-4 text-purple-600" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-bold text-purple-700">{formatEuros(totalNDF)}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {totalNDFRemboursees > 0 ? `${formatEuros(totalNDFRemboursees)} remb.` : "Aucun remboursement"}
            {totalNDFEnAttente > 0 && ` · ${formatEuros(totalNDFEnAttente)} en attente`}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Achats / CA</span>
            <span className={`rounded-full p-1.5 ${ratioAchatsCA < 60 ? "bg-emerald-50" : "bg-red-50"}`}>
              <TrendingUp className={`h-4 w-4 ${ratioAchatsCA < 60 ? "text-emerald-600" : "text-red-600"}`} />
            </span>
          </div>
          <p className={`mt-2 text-2xl font-bold ${ratioAchatsCA < 60 ? "text-emerald-600" : "text-red-600"}`}>
            {caHT > 0 ? `${ratioAchatsCA.toFixed(1)} %` : "—"}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            CA HT : {formatEuros(caHT)} · Objectif &lt; 60 %
          </p>
        </div>
      </div>

      {/* ─── SYNTHÈSE GLOBALE DES ACHATS ─── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-semibold text-brand-navy">Synthèse globale des achats & charges externes</h3>
          <p className="text-xs text-slate-400 mt-0.5">{periodeLabel}</p>
        </div>
        <div className="divide-y divide-slate-50">
          {[
            {
              label: "Achats matériaux & fournitures (bons de commande confirmés)",
              montant: totalBCConfirmesHT,
              icon: <PackageCheck className="h-4 w-4 text-brand-blue" />,
              link: null,
              sub: `${bcConfirmes.length} BC — dont ${formatEuros(totalBCTTC)} TTC total`,
            },
            {
              label: "Dépenses opérationnelles",
              montant: totalDepensesHT,
              icon: <TrendingDown className="h-4 w-4 text-red-500" />,
              link: null,
              sub: `${depenses.length} lignes saisies`,
            },
            {
              label: "Sous-traitance (contrats + factures)",
              montant: totalSTR + totalSTRDepenses,
              icon: <HardHat className="h-4 w-4 text-brand-orange" />,
              link: "/contrats-sous-traitance",
              sub: `${contratsSTR.length} contrat${contratsSTR.length > 1 ? "s" : ""} · ${formatEuros(totalSTR)} contrats + ${formatEuros(totalSTRDepenses)} factures`,
            },
            {
              label: "Intérimaires (agences)",
              montant: totalInterimaires,
              icon: <UserCheck className="h-4 w-4 text-slate-500" />,
              link: "/interimaires",
              sub: `${heuresInterimaires.length} relevé${heuresInterimaires.length > 1 ? "s" : ""} de semaine`,
            },
            {
              label: "Notes de frais remboursées",
              montant: totalNDFRemboursees,
              icon: <Banknote className="h-4 w-4 text-purple-500" />,
              link: "/notes-de-frais",
              sub: `${notesDeFrais.filter((n) => n.statut === "REMBOURSEE").length} / ${notesDeFrais.length} notes`,
            },
          ].map(({ label, montant, icon, link, sub }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="shrink-0">{icon}</span>
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  {sub && <p className="text-xs text-slate-400">{sub}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-800">{formatEuros(montant)}</span>
                {link && (
                  <Link href={link} className="text-xs text-brand-blue hover:underline">
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between bg-slate-50 px-5 py-3">
            <span className="text-sm font-bold text-brand-navy">TOTAL ACHATS & CHARGES EXTERNES</span>
            <span className="text-base font-bold text-red-600">{formatEuros(totalAchatsGlobal)}</span>
          </div>
          {caHT > 0 && (
            <div className="px-5 py-2">
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                <span>Part des achats dans le CA HT</span>
                <span className={`font-semibold ${ratioAchatsCA < 60 ? "text-emerald-600" : "text-red-600"}`}>
                  {ratioAchatsCA.toFixed(1)} %
                </span>
              </div>
              <ProgressBar
                value={totalAchatsGlobal}
                max={caHT}
                color={ratioAchatsCA < 60 ? "bg-emerald-400" : "bg-red-400"}
              />
              <p className="text-xs text-slate-400 mt-1">
                En BTP, un taux achats/CA sain se situe entre 40 % et 60 % selon l&apos;activité.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── TABLEAU DES BONS DE COMMANDE ─── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-brand-blue" />
            <h3 className="font-semibold text-brand-navy">
              Bons de commande fournisseurs — {periodeLabel}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            {Object.entries(statutsBC).map(([s, n]) => (
              <span key={s} className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_COLORS[s] ?? "bg-slate-100 text-slate-600"}`}>
                {STATUT_LABELS[s] ?? s} ({n})
              </span>
            ))}
            <Link href="/bons-commande" className="text-xs font-medium text-brand-blue hover:underline">
              Gérer
            </Link>
          </div>
        </div>

        {bonsCommande.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <ShoppingCart className="mx-auto h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">Aucun bon de commande sur cette période.</p>
            <Link href="/bons-commande/nouveau" className="mt-3 inline-flex items-center gap-1 text-xs text-brand-blue hover:underline">
              Créer un bon de commande <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">N° BC</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Fournisseur</th>
                  <th className="px-5 py-3">Chantier</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3 text-right">Montant HT</th>
                  <th className="px-5 py-3 text-right">TVA</th>
                  <th className="px-5 py-3 text-right">TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bonsCommande.map((bc) => (
                  <tr key={bc.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-2.5">
                      <Link href={`/bons-commande/${bc.id}`} className="font-medium text-brand-navy hover:underline">
                        {bc.numero}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {new Date(bc.dateCreation).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="text-slate-700">{bc.fournisseur.nom}</span>
                      </div>
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">
                      {bc.chantier ? (
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3 w-3 text-slate-400" />
                          {bc.chantier.nom}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-2.5">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUT_COLORS[bc.statut] ?? "bg-slate-100 text-slate-600"}`}>
                        {STATUT_LABELS[bc.statut] ?? bc.statut}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-slate-700">
                      {formatEuros(bc.totalHT)}
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-500">
                      {formatEuros(bc.totalTVA)}
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-800">
                      {formatEuros(bc.totalTTC)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50 text-sm font-semibold">
                <tr>
                  <td colSpan={5} className="px-5 py-3 text-slate-700">Total</td>
                  <td className="px-5 py-3 text-right text-slate-800">{formatEuros(totalBCHT)}</td>
                  <td className="px-5 py-3 text-right text-slate-600">
                    {formatEuros(bonsCommande.reduce((s, b) => s + b.totalTVA, 0))}
                  </td>
                  <td className="px-5 py-3 text-right text-slate-900">{formatEuros(totalBCTTC)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* ─── RÉPARTITIONS ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Top fournisseurs */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-brand-navy">Achats par fournisseur</h3>
          </div>
          {topFournisseurs.length === 0 ? (
            <p className="px-5 py-6 text-sm text-center text-slate-400">Aucun bon de commande.</p>
          ) : (
            <div className="divide-y divide-slate-50 px-5">
              {topFournisseurs.map((f) => (
                <div key={f.nom} className="py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{f.nom}</span>
                      <span className="text-xs text-slate-400">({f.nbBC} BC)</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{formatEuros(f.totalHT)}</span>
                  </div>
                  <ProgressBar value={f.totalHT} max={maxFournisseur} color="bg-brand-blue" />
                  <p className="text-xs text-slate-400 mt-0.5 text-right">
                    {totalBCHT > 0 ? `${Math.round((f.totalHT / totalBCHT) * 100)} % des achats` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achats par chantier */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-brand-navy">Achats par chantier</h3>
          </div>
          {topChantiers.length === 0 ? (
            <p className="px-5 py-6 text-sm text-center text-slate-400">Aucune répartition disponible.</p>
          ) : (
            <div className="divide-y divide-slate-50 px-5">
              {topChantiers.map((c) => (
                <div key={c.nom} className="py-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{c.nom}</span>
                      <span className="text-xs text-slate-400">({c.nbBC} BC)</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-800">{formatEuros(c.totalHT)}</span>
                  </div>
                  <ProgressBar value={c.totalHT} max={maxChantier} color="bg-brand-orange" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dépenses par catégorie */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-brand-navy">Dépenses par catégorie</h3>
              <p className="text-xs text-slate-400">
                Saisir via le module Dépenses (catégories : matériaux, loyer, assurances, amortissements…)
              </p>
            </div>
          </div>
          {depenses.length === 0 ? (
            <div className="px-5 py-6 text-center">
              <p className="text-sm text-slate-400">Aucune dépense sur cette période.</p>
              <p className="text-xs text-slate-300 mt-1">
                Saisissez vos dépenses (loyer, assurances, carburant, administratif…) pour enrichir l&apos;analyse.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 px-5">
              {Object.entries(catDepenses)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, montant]) => (
                  <div key={cat} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm text-slate-700">{DEPENSE_CAT_LABELS[cat] ?? cat}</p>
                      {(cat === "AMORTISSEMENT" || cat === "INVESTISSEMENT") && (
                        <span className="text-xs text-brand-blue/70">Hors exploitation</span>
                      )}
                      {(cat === "LOYER" || cat === "ASSURANCE" || cat === "ADMINISTRATIF") && (
                        <span className="text-xs text-slate-400">Charge fixe</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{formatEuros(montant)}</p>
                      {totalDepensesHT > 0 && (
                        <p className="text-xs text-slate-400">
                          {Math.round((montant / totalDepensesHT) * 100)} %
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              <div className="flex items-center justify-between py-2.5 font-semibold">
                <span className="text-sm text-slate-700">Total dépenses</span>
                <span className="text-sm text-red-700">{formatEuros(totalDepensesHT)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Notes de frais */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-brand-navy">Notes de frais</h3>
              <Link href="/notes-de-frais" className="text-xs text-brand-blue hover:underline">
                Gérer <ChevronRight className="inline h-3 w-3" />
              </Link>
            </div>
          </div>
          {notesDeFrais.length === 0 ? (
            <p className="px-5 py-6 text-sm text-center text-slate-400">Aucune note de frais sur cette période.</p>
          ) : (
            <div className="divide-y divide-slate-50 px-5">
              {Object.entries(catNDF)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, montant]) => (
                  <div key={cat} className="flex items-center justify-between py-2.5">
                    <span className="text-sm text-slate-700">{NDF_CAT_LABELS[cat] ?? cat}</span>
                    <span className="text-sm font-semibold text-purple-700">{formatEuros(montant)}</span>
                  </div>
                ))}
              <div className="grid grid-cols-3 gap-2 py-3 text-xs">
                <div className="text-center">
                  <p className="font-semibold text-slate-700">{formatEuros(totalNDF)}</p>
                  <p className="text-slate-400">Total</p>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-purple-600">{formatEuros(totalNDFRemboursees)}</p>
                  <p className="text-slate-400">Remboursées</p>
                </div>
                <div className="text-center">
                  <p className={`font-semibold ${totalNDFEnAttente > 0 ? "text-brand-orange-dark" : "text-slate-400"}`}>
                    {formatEuros(totalNDFEnAttente)}
                  </p>
                  <p className="text-slate-400">En attente</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── SOUS-TRAITANCE ─── */}
      {contratsSTR.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <HardHat className="h-4 w-4 text-brand-orange" />
              <h3 className="font-semibold text-brand-navy">Contrats de sous-traitance — {periodeLabel}</h3>
            </div>
            <Link href="/contrats-sous-traitance" className="text-xs font-medium text-brand-blue hover:underline">
              Voir tous
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Sous-traitant</th>
                  <th className="px-5 py-3">Spécialité</th>
                  <th className="px-5 py-3">Chantier</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3 text-right">Montant HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contratsSTR.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-700">{c.sousTraitant.nom}</td>
                    <td className="px-5 py-2.5 text-slate-500">{c.sousTraitant.specialite ?? "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500">{c.chantier?.nom ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          c.statut === "SIGNE"
                            ? "bg-emerald-100 text-emerald-700"
                            : c.statut === "EN_COURS"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.statut === "SIGNE" ? "Signé" : c.statut === "EN_COURS" ? "En cours" : c.statut}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-800">
                      {formatEuros(c.montantHT ?? 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={4} className="px-5 py-2.5 text-sm font-semibold text-slate-700">Total sous-traitance</td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-slate-800">{formatEuros(totalSTR)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── INTÉRIMAIRES ─── */}
      {heuresInterimaires.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-slate-500" />
              <h3 className="font-semibold text-brand-navy">Intérimaires — {periodeLabel}</h3>
            </div>
            <Link href="/interimaires" className="text-xs font-medium text-brand-blue hover:underline">
              Gérer
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Intérimaire</th>
                  <th className="px-5 py-3">Agence</th>
                  <th className="px-5 py-3">Chantier</th>
                  <th className="px-5 py-3">Semaine</th>
                  <th className="px-5 py-3 text-right">Heures</th>
                  <th className="px-5 py-3 text-right">Coût total HT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {heuresInterimaires.map((h) => (
                  <tr key={h.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-700">
                      {h.interimaire.prenom} {h.interimaire.nom}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">{h.interimaire.agence ?? "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500">{h.chantier?.nom ?? "—"}</td>
                    <td className="px-5 py-2.5 text-slate-500 font-mono text-xs">{h.semaine}</td>
                    <td className="px-5 py-2.5 text-right text-slate-600">
                      {h.heuresTravaillees + h.heuresSupp25 + h.heuresSupp50} h
                    </td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-800">
                      {formatEuros(h.coutTotalHT)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={5} className="px-5 py-2.5 text-sm font-semibold text-slate-700">Total intérimaires</td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-slate-800">{formatEuros(totalInterimaires)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── NOTE GUIDE CATÉGORIES ─── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <p className="font-semibold mb-1">Guide des catégories de dépenses — SDA Rénovation</p>
        <div className="grid grid-cols-1 gap-1 text-xs sm:grid-cols-2">
          <span>• <strong>MATERIAUX</strong> : achats de chantier hors bons de commande</span>
          <span>• <strong>LOYER</strong> : bureaux, entrepôt, parking Cugnaux</span>
          <span>• <strong>ASSURANCE</strong> : décennale, RC pro, flotte véhicules</span>
          <span>• <strong>TRANSPORT</strong> : carburant, péages, livraisons</span>
          <span>• <strong>ADMINISTRATIF</strong> : expert-comptable, logiciels, téléphonie</span>
          <span>• <strong>AMORTISSEMENT</strong> : véhicules, outillage, matériels</span>
          <span>• <strong>INVESTISSEMENT</strong> : achats de matériels durables, véhicules</span>
          <span>• <strong>IMPOT_TAXE</strong> : CFE, CVAE, taxe foncière pro, taxe véhicules</span>
        </div>
        <p className="text-xs text-amber-700 mt-2">
          Ces catégories alimentent directement le Compte de résultat (P&L) dans le module Trésorerie.
        </p>
      </div>

      {/* ─── LIENS ─── */}
      <div className="flex items-start gap-2 text-xs text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Les bons de commande fournisseurs représentent les achats engagés, pas nécessairement décaissés.
          Pour le tableau de flux de trésorerie complet (encaissements, solde, IS estimé, marge brute/nette),
          consultez le module <Link href="/tresorerie" className="text-brand-blue hover:underline">Trésorerie</Link>.
        </p>
      </div>
    </div>
  );
}
