export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertCircle,
  Calendar,
  Plug,
  Info,
  Users,
  ShoppingCart,
  UserCheck,
  Banknote,
  Building2,
  HardHat,
  Heart,
  ArrowRight,
  Scale,
  Receipt,
  ChevronRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";

type Periode = "semaine" | "mois" | "trimestre" | "semestre" | "annee";

const PERIODES: { value: Periode; label: string }[] = [
  { value: "semaine", label: "Cette semaine" },
  { value: "mois", label: "Ce mois" },
  { value: "trimestre", label: "Ce trimestre" },
  { value: "semestre", label: "Ce semestre" },
  { value: "annee", label: "Cette année" },
];

function getDateRange(periode: Periode): { debut: Date; fin: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (periode) {
    case "semaine": {
      const day = now.getDay() === 0 ? 6 : now.getDay() - 1;
      const debut = new Date(y, m, d - day);
      const fin = new Date(y, m, d - day + 6, 23, 59, 59);
      return {
        debut,
        fin,
        label: `Semaine du ${debut.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })} au ${fin.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}`,
      };
    }
    case "mois": {
      return {
        debut: new Date(y, m, 1),
        fin: new Date(y, m + 1, 0, 23, 59, 59),
        label: now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
      };
    }
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
    default: {
      return {
        debut: new Date(y, 0, 1),
        fin: new Date(y, 11, 31, 23, 59, 59),
        label: `Année ${y}`,
      };
    }
  }
}

function getPeriodMonths(debut: Date, fin: Date): string[] {
  const months: string[] = [];
  const current = new Date(debut.getFullYear(), debut.getMonth(), 1);
  const end = new Date(fin.getFullYear(), fin.getMonth(), 1);
  while (current <= end) {
    months.push(`${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`);
    current.setMonth(current.getMonth() + 1);
  }
  return months;
}

function getNbMois(debut: Date, fin: Date): number {
  return (fin.getFullYear() - debut.getFullYear()) * 12 + (fin.getMonth() - debut.getMonth()) + 1;
}

function computeIS(resultat: number): { is15: number; is25: number; total: number } {
  if (resultat <= 0) return { is15: 0, is25: 0, total: 0 };
  const is15 = Math.min(resultat, 42500) * 0.15;
  const is25 = Math.max(0, resultat - 42500) * 0.25;
  return { is15, is25, total: is15 + is25 };
}

const MOIS_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

export default async function TresoreiriePage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string }>;
}) {
  const { periode: periodeParam } = await searchParams;
  const periode: Periode =
    (["semaine", "mois", "trimestre", "semestre", "annee"] as Periode[]).includes(
      periodeParam as Periode
    )
      ? (periodeParam as Periode)
      : "mois";

  const { debut, fin, label: periodeLabel } = getDateRange(periode);
  const now = new Date();
  const debutAnnee = new Date(now.getFullYear(), 0, 1);
  const periodMonths = getPeriodMonths(debut, fin);
  const nbMois = getNbMois(debut, fin);

  const [
    paiements,
    facturesPeriode,
    facturesEnAttente,
    depenses,
    bulletins,
    notesFraisRemboursees,
    heuresInterimaires,
    bonsCommande,
    contratsSTR,
    adhesionsMutuelle,
    paiementsAnnee,
    depensesAnnee,
    bulletinsAnnee,
    paiementsFournisseurs,
  ] = await Promise.all([
    prisma.paiement.findMany({
      where: { date: { gte: debut, lte: fin } },
      include: {
        facture: {
          include: {
            client: { select: { nom: true, prenom: true, raisonSociale: true, type: true } },
          },
        },
      },
      orderBy: { date: "desc" },
    }),
    prisma.facture.findMany({
      where: {
        dateEmission: { gte: debut, lte: fin },
        statut: { notIn: ["BROUILLON", "ANNULEE"] },
      },
      select: { totalHT: true, totalTVA: true, totalTTC: true, statut: true },
    }),
    prisma.facture.findMany({
      where: {
        statut: { in: ["ENVOYEE", "PAYEE_PARTIELLE", "EN_RETARD"] },
        dateEcheance: { not: null },
      },
      include: {
        client: { select: { nom: true, prenom: true, raisonSociale: true, type: true } },
      },
      orderBy: { dateEcheance: "asc" },
      take: 12,
    }),
    prisma.depense.findMany({
      where: { date: { gte: debut, lte: fin } },
      include: {
        chantier: { select: { nom: true, reference: true } },
        fournisseur: { select: { nom: true } },
      },
      orderBy: { date: "desc" },
    }),
    prisma.bulletinDePaie.findMany({
      where: { periode: { in: periodMonths }, statut: { in: ["VALIDE", "PAYE"] } },
      include: { salarie: { select: { nom: true, prenom: true, matricule: true } } },
    }),
    prisma.noteDeFrais.findMany({
      where: { date: { gte: debut, lte: fin }, statut: "REMBOURSEE" },
    }),
    prisma.suiviHeureInterimaire.findMany({
      where: { createdAt: { gte: debut, lte: fin } },
      include: { interimaire: { select: { nom: true, prenom: true, agence: true } } },
    }),
    prisma.bonCommande.findMany({
      where: {
        dateCreation: { gte: debut, lte: fin },
        statut: { in: ["ENVOYE", "CONFIRME", "RECU_PARTIEL", "RECU"] },
      },
      include: {
        fournisseur: { select: { nom: true } },
        chantier: { select: { nom: true } },
      },
      orderBy: { dateCreation: "desc" },
    }),
    prisma.contratSousTraitance.findMany({
      where: {
        createdAt: { gte: debut, lte: fin },
        statut: { in: ["ENVOYE", "SIGNE", "EN_COURS"] },
      },
      include: { sousTraitant: { select: { nom: true } } },
    }),
    prisma.adhesionMutuelle.findMany({
      where: {
        actif: true,
        dateAdhesion: { lte: fin },
      },
      include: {
        formuleMutuelle: { select: { cotisationPatronale: true, cotisationSalarie: true, label: true } },
        salarie: { select: { nom: true, prenom: true } },
      },
    }),
    prisma.paiement.groupBy({
      by: ["date"],
      where: { date: { gte: debutAnnee, lte: now } },
      _sum: { montant: true },
    }),
    prisma.depense.groupBy({
      by: ["date"],
      where: { date: { gte: debutAnnee, lte: now } },
      _sum: { montant: true },
    }),
    prisma.bulletinDePaie.findMany({
      where: { statut: { in: ["VALIDE", "PAYE"] } },
      select: { periode: true, totalBrut: true, cotisationsPatronales: true },
    }),
    // Paiements versés aux fournisseurs sur la période (sorties de trésorerie réelles)
    prisma.paiementFournisseur.findMany({
      where: { date: { gte: debut, lte: fin } },
      include: {
        facture: {
          include: { fournisseur: { select: { nom: true } } },
        },
      },
      orderBy: { date: "desc" },
    }),
  ]);

  // ────────────────────────────────────────────────────────────────
  // TRÉSORERIE (flux de trésorerie réels)
  // ────────────────────────────────────────────────────────────────
  const caEncaisse = paiements.reduce((s, p) => s + p.montant, 0);
  const totalDepensesReelles = depenses.reduce((s, d) => s + d.montant, 0);
  const totalPaiementsFournisseurs = paiementsFournisseurs.reduce((s, p) => s + p.montant, 0);
  const totalDecaissements = totalDepensesReelles + totalPaiementsFournisseurs;
  const soldeTresorerie = caEncaisse - totalDecaissements;
  const totalCreances = facturesEnAttente.reduce(
    (s, f) => s + Math.max(0, f.totalTTC - f.montantPaye),
    0
  );

  // ────────────────────────────────────────────────────────────────
  // COMPTE DE RÉSULTAT (base engagement)
  // ────────────────────────────────────────────────────────────────

  // Chiffre d'affaires HT
  const caHT = facturesPeriode.reduce((s, f) => s + f.totalHT, 0);
  const caTVA = facturesPeriode.reduce((s, f) => s + f.totalTVA, 0);

  // Achats matériaux & fournitures
  const achatsBonCommande = bonsCommande
    .filter((b) => ["CONFIRME", "RECU_PARTIEL", "RECU"].includes(b.statut))
    .reduce((s, b) => s + b.totalHT, 0);
  const achatsMateriauxDepense = depenses
    .filter((d) => d.categorie === "MATERIAUX")
    .reduce((s, d) => s + d.montant, 0);
  const totalAchatsMat = achatsBonCommande + achatsMateriauxDepense;

  // Marge brute = CA - Achats matériaux (avant toutes autres charges)
  const margeBrute = caHT - totalAchatsMat;
  const txMargeBrute = caHT > 0 ? (margeBrute / caHT) * 100 : 0;

  // Charges de personnel
  const salairesBruts = bulletins.reduce((s, b) => s + b.totalBrut, 0);
  const chargesPatronalesRH = bulletins.reduce((s, b) => s + b.cotisationsPatronales, 0);
  const salairesNets = bulletins.reduce((s, b) => s + b.netAPayer, 0);
  const mutuellePatronale = adhesionsMutuelle.reduce(
    (s, a) => s + a.formuleMutuelle.cotisationPatronale * nbMois,
    0
  );
  const coutInterimaires = heuresInterimaires.reduce((s, h) => s + h.coutTotalHT, 0);
  const totalPersonnel = salairesBruts + chargesPatronalesRH + mutuellePatronale + coutInterimaires;

  // Sous-traitance
  const sousTraitanceContrats = contratsSTR.reduce((s, c) => s + (c.montantHT ?? 0), 0);
  const sousTraitanceDepenses = depenses
    .filter((d) => d.categorie === "SOUS_TRAITANCE")
    .reduce((s, d) => s + d.montant, 0);
  const totalSousTraitance = sousTraitanceContrats + sousTraitanceDepenses;

  // Charges variables
  const chargesTransport = depenses
    .filter((d) => d.categorie === "TRANSPORT")
    .reduce((s, d) => s + d.montant, 0);
  const chargesMainOeuvre = depenses
    .filter((d) => d.categorie === "MAIN_OEUVRE")
    .reduce((s, d) => s + d.montant, 0);
  const chargesNotesFrais = notesFraisRemboursees.reduce((s, n) => s + n.montant, 0);
  const chargesAutre = depenses
    .filter((d) => d.categorie === "AUTRE")
    .reduce((s, d) => s + d.montant, 0);
  const totalChargesVariables = chargesTransport + chargesMainOeuvre + chargesNotesFrais + chargesAutre;

  // Charges fixes
  const chargesAdministratif = depenses
    .filter((d) => d.categorie === "ADMINISTRATIF")
    .reduce((s, d) => s + d.montant, 0);
  const chargesLoyer = depenses
    .filter((d) => d.categorie === "LOYER")
    .reduce((s, d) => s + d.montant, 0);
  const chargesAssurances = depenses
    .filter((d) => d.categorie === "ASSURANCE")
    .reduce((s, d) => s + d.montant, 0);
  const chargesImpotsTaxes = depenses
    .filter((d) => d.categorie === "IMPOT_TAXE")
    .reduce((s, d) => s + d.montant, 0);
  const totalChargesFixes =
    chargesAdministratif + chargesLoyer + chargesAssurances + chargesImpotsTaxes;

  // Amortissements & investissements
  const totalAmortissements = depenses
    .filter((d) => d.categorie === "AMORTISSEMENT")
    .reduce((s, d) => s + d.montant, 0);
  const totalInvestissements = depenses
    .filter((d) => d.categorie === "INVESTISSEMENT")
    .reduce((s, d) => s + d.montant, 0);

  // Résultats
  const resultatExploitation =
    margeBrute - totalPersonnel - totalSousTraitance - totalChargesVariables - totalChargesFixes;
  const resultatAvantIS = resultatExploitation - totalAmortissements;
  const { is15, is25, total: isEstime } = computeIS(resultatAvantIS);
  const resultatNet = resultatAvantIS - isEstime;
  const txMargeNette = caHT > 0 ? (resultatNet / caHT) * 100 : 0;

  // Dettes fournisseurs (bons de commande engagés non reçus)
  const dettesFournisseurs = bonsCommande
    .filter((b) => ["ENVOYE", "CONFIRME"].includes(b.statut))
    .reduce((s, b) => s + b.totalTTC, 0);

  // Solde prévisionnel = trésorerie réelle + créances à encaisser - dettes fournisseurs engagées
  const soldeProvisionnel = soldeTresorerie + totalCreances - dettesFournisseurs;

  // Graphique annuel
  const moisData = Array.from({ length: 12 }, (_, i) => ({
    mois: i,
    encaisse: 0,
    charges: 0,
  }));
  for (const p of paiementsAnnee) {
    moisData[new Date(p.date).getMonth()].encaisse += p._sum.montant ?? 0;
  }
  for (const d of depensesAnnee) {
    moisData[new Date(d.date).getMonth()].charges += d._sum.montant ?? 0;
  }
  for (const b of bulletinsAnnee) {
    const parts = b.periode.split("-");
    if (parts.length === 2 && parseInt(parts[0]) === now.getFullYear()) {
      const mi = parseInt(parts[1]) - 1;
      if (mi >= 0 && mi < 12) {
        moisData[mi].charges += b.totalBrut + b.cotisationsPatronales;
      }
    }
  }
  const maxBar = Math.max(...moisData.map((m) => Math.max(m.encaisse, m.charges)), 1);

  // Regroupement dépenses par catégorie
  const catDepenses: Record<string, number> = {};
  for (const d of depenses) {
    catDepenses[d.categorie] = (catDepenses[d.categorie] ?? 0) + d.montant;
  }

  const DEPENSE_CAT_LABELS: Record<string, string> = {
    MATERIAUX: "Matériaux",
    MAIN_OEUVRE: "Main-d'œuvre",
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

  const METHODE_LABELS: Record<string, string> = {
    VIREMENT: "Virement",
    CHEQUE: "Chèque",
    CB: "Carte bancaire",
    ESPECES: "Espèces",
    EN_LIGNE: "En ligne",
    PRELEVEMENT: "Prélèvement",
  };

  const tauxEncaissement = caHT > 0 ? Math.round((caEncaisse / caHT) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Sélecteur de période */}
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

      {/* ─── FLUX DE TRÉSORERIE ─── */}
      <div>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Flux de trésorerie — {periodeLabel}
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Encaissé</span>
              <span className="rounded-full bg-emerald-50 p-1.5">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-emerald-600">{formatEuros(caEncaisse)}</p>
            <p className="text-xs text-slate-400">
              {paiements.length} paiement{paiements.length > 1 ? "s" : ""} · taux {tauxEncaissement} %
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Décaissé</span>
              <span className="rounded-full bg-red-50 p-1.5">
                <TrendingDown className="h-4 w-4 text-red-500" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-red-600">{formatEuros(totalDecaissements)}</p>
            <div className="text-xs text-slate-400 mt-0.5 space-y-0.5">
              {totalDepensesReelles > 0 && (
                <p>Dépenses : {formatEuros(totalDepensesReelles)}</p>
              )}
              {totalPaiementsFournisseurs > 0 && (
                <p>Paiements fourn. : {formatEuros(totalPaiementsFournisseurs)}</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Solde réel</span>
              <span className={`rounded-full p-1.5 ${soldeTresorerie >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
                <Wallet className={`h-4 w-4 ${soldeTresorerie >= 0 ? "text-emerald-600" : "text-red-600"}`} />
              </span>
            </div>
            <p className={`mt-2 text-2xl font-bold ${soldeTresorerie >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatEuros(soldeTresorerie)}
            </p>
            <p className="text-xs text-slate-400">Encaissé − tous décaissements</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">À encaisser</span>
              <span className="rounded-full bg-brand-orange/10 p-1.5">
                <AlertCircle className="h-4 w-4 text-brand-orange-dark" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-bold text-brand-orange-dark">{formatEuros(totalCreances)}</p>
            <p className="text-xs text-slate-400">
              {facturesEnAttente.length} facture{facturesEnAttente.length > 1 ? "s" : ""} en attente
            </p>
          </div>

          <div className={`rounded-xl border p-4 shadow-sm ${soldeProvisionnel >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold uppercase tracking-wider ${soldeProvisionnel >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                Solde prévisionnel
              </span>
              <span className={`rounded-full p-1.5 ${soldeProvisionnel >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
                <Scale className={`h-4 w-4 ${soldeProvisionnel >= 0 ? "text-emerald-700" : "text-red-700"}`} />
              </span>
            </div>
            <p className={`mt-2 text-2xl font-bold ${soldeProvisionnel >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {formatEuros(soldeProvisionnel)}
            </p>
            <p className={`text-xs mt-0.5 ${soldeProvisionnel >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              Réel + créances − dettes fourn.
            </p>
          </div>
        </div>
      </div>

      {/* ─── COMPTE DE RÉSULTAT ─── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-semibold text-brand-navy">Compte de résultat simplifié</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Base engagement (factures émises) — {periodeLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span
              className={`rounded-full px-2.5 py-1 ${
                resultatNet >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              }`}
            >
              Résultat net : {formatEuros(resultatNet)}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <tbody className="divide-y divide-slate-50">

              {/* CA */}
              <tr className="bg-brand-blue/5">
                <td className="px-5 py-2.5 text-sm font-semibold text-brand-navy">
                  <span className="mr-2 font-mono text-brand-blue/60">+</span>
                  Chiffre d&apos;affaires HT (travaux facturés)
                </td>
                <td className="px-5 py-2.5 text-right text-sm font-bold text-emerald-600">
                  {formatEuros(caHT)}
                </td>
              </tr>
              <tr>
                <td className="pl-10 pr-5 py-1.5 text-xs text-slate-400">
                  TVA collectée : {formatEuros(caTVA)}
                </td>
                <td className="px-5 py-1.5 text-right text-xs text-slate-400">
                  {facturesPeriode.length} facture{facturesPeriode.length > 1 ? "s" : ""}
                </td>
              </tr>

              {/* Achats matériaux */}
              <tr>
                <td className="px-5 py-2.5 text-sm text-slate-700">
                  <span className="mr-2 font-mono text-red-400">−</span>
                  Achats matériaux & fournitures
                </td>
                <td className="px-5 py-2.5 text-right text-sm font-medium text-red-600">
                  {formatEuros(totalAchatsMat)}
                </td>
              </tr>
              {achatsBonCommande > 0 && (
                <tr>
                  <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                    Bons de commande fournisseurs : {formatEuros(achatsBonCommande)}
                  </td>
                  <td />
                </tr>
              )}
              {achatsMateriauxDepense > 0 && (
                <tr>
                  <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                    Achats directs (dépenses) : {formatEuros(achatsMateriauxDepense)}
                  </td>
                  <td />
                </tr>
              )}

              {/* Marge brute */}
              <tr className="bg-emerald-50/60">
                <td className="px-5 py-3 text-sm font-bold text-brand-navy">
                  <span className="mr-2 font-mono text-slate-400">=</span>
                  MARGE BRUTE
                </td>
                <td
                  className={`px-5 py-3 text-right text-base font-bold ${
                    margeBrute >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatEuros(margeBrute)}{" "}
                  <span className="text-xs font-normal text-slate-500">
                    ({txMargeBrute >= 0 ? "+" : ""}{txMargeBrute.toFixed(1)} %)
                  </span>
                </td>
              </tr>

              {/* Charges de personnel */}
              <tr>
                <td className="px-5 py-2.5 text-sm font-semibold text-slate-700">
                  <span className="mr-2 font-mono text-red-400">−</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-brand-blue" />
                    Charges de personnel (fixes)
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right text-sm font-semibold text-red-600">
                  {formatEuros(totalPersonnel)}
                </td>
              </tr>
              {bulletins.length > 0 && (
                <>
                  <tr>
                    <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                      Salaires bruts : {formatEuros(salairesBruts)}
                      <span className="ml-2 text-slate-300">
                        · nets versés : {formatEuros(salairesNets)}
                      </span>
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                      Charges patronales sociales (URSSAF…) : {formatEuros(chargesPatronalesRH)}
                    </td>
                    <td />
                  </tr>
                  <tr>
                    <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Heart className="h-3 w-3 text-rose-400" />
                        Mutuelle patronale ({adhesionsMutuelle.length} salarié{adhesionsMutuelle.length > 1 ? "s" : ""} × {nbMois} mois) : {formatEuros(mutuellePatronale)}
                      </span>
                    </td>
                    <td />
                  </tr>
                </>
              )}
              {coutInterimaires > 0 && (
                <tr>
                  <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <UserCheck className="h-3 w-3 text-slate-400" />
                      Intérimaires ({heuresInterimaires.length} relevé{heuresInterimaires.length > 1 ? "s" : ""}) : {formatEuros(coutInterimaires)}
                    </span>
                  </td>
                  <td />
                </tr>
              )}

              {/* Sous-traitance */}
              {totalSousTraitance > 0 && (
                <>
                  <tr>
                    <td className="px-5 py-2.5 text-sm text-slate-700">
                      <span className="mr-2 font-mono text-red-400">−</span>
                      <span className="inline-flex items-center gap-1.5">
                        <HardHat className="h-3.5 w-3.5 text-brand-orange" />
                        Sous-traitance (variable)
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-sm font-medium text-red-600">
                      {formatEuros(totalSousTraitance)}
                    </td>
                  </tr>
                  {sousTraitanceContrats > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Contrats signés : {formatEuros(sousTraitanceContrats)}
                      </td>
                      <td />
                    </tr>
                  )}
                  {sousTraitanceDepenses > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Factures sous-traitants (dépenses) : {formatEuros(sousTraitanceDepenses)}
                      </td>
                      <td />
                    </tr>
                  )}
                </>
              )}

              {/* Charges variables */}
              {totalChargesVariables > 0 && (
                <>
                  <tr>
                    <td className="px-5 py-2.5 text-sm text-slate-700">
                      <span className="mr-2 font-mono text-red-400">−</span>
                      Charges variables d&apos;exploitation
                    </td>
                    <td className="px-5 py-2.5 text-right text-sm font-medium text-red-600">
                      {formatEuros(totalChargesVariables)}
                    </td>
                  </tr>
                  {chargesTransport > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Transport / carburant : {formatEuros(chargesTransport)}
                      </td>
                      <td />
                    </tr>
                  )}
                  {chargesMainOeuvre > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Main-d&apos;œuvre externe : {formatEuros(chargesMainOeuvre)}
                      </td>
                      <td />
                    </tr>
                  )}
                  {chargesNotesFrais > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        <span className="inline-flex items-center gap-1">
                          <Banknote className="h-3 w-3 text-slate-400" />
                          Notes de frais remboursées : {formatEuros(chargesNotesFrais)}
                        </span>
                      </td>
                      <td />
                    </tr>
                  )}
                  {chargesAutre > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Divers : {formatEuros(chargesAutre)}
                      </td>
                      <td />
                    </tr>
                  )}
                </>
              )}

              {/* Charges fixes */}
              {totalChargesFixes > 0 && (
                <>
                  <tr>
                    <td className="px-5 py-2.5 text-sm text-slate-700">
                      <span className="mr-2 font-mono text-red-400">−</span>
                      Charges fixes de structure
                    </td>
                    <td className="px-5 py-2.5 text-right text-sm font-medium text-red-600">
                      {formatEuros(totalChargesFixes)}
                    </td>
                  </tr>
                  {chargesAdministratif > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Administratif / secrétariat : {formatEuros(chargesAdministratif)}
                      </td>
                      <td />
                    </tr>
                  )}
                  {chargesLoyer > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Loyer & charges locatives : {formatEuros(chargesLoyer)}
                      </td>
                      <td />
                    </tr>
                  )}
                  {chargesAssurances > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Assurances (décennale, RC pro, flotte…) : {formatEuros(chargesAssurances)}
                      </td>
                      <td />
                    </tr>
                  )}
                  {chargesImpotsTaxes > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Impôts & taxes locales : {formatEuros(chargesImpotsTaxes)}
                      </td>
                      <td />
                    </tr>
                  )}
                </>
              )}

              {/* Résultat d'exploitation */}
              <tr className={`${resultatExploitation >= 0 ? "bg-emerald-50/40" : "bg-red-50/40"}`}>
                <td className="px-5 py-3 text-sm font-bold text-brand-navy">
                  <span className="mr-2 font-mono text-slate-400">=</span>
                  RÉSULTAT D&apos;EXPLOITATION (EBE)
                </td>
                <td
                  className={`px-5 py-3 text-right text-base font-bold ${
                    resultatExploitation >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatEuros(resultatExploitation)}
                </td>
              </tr>

              {/* Amortissements */}
              {totalAmortissements > 0 && (
                <tr>
                  <td className="px-5 py-2.5 text-sm text-slate-700">
                    <span className="mr-2 font-mono text-red-400">−</span>
                    Amortissements (véhicules, matériels, équipements)
                  </td>
                  <td className="px-5 py-2.5 text-right text-sm font-medium text-red-600">
                    {formatEuros(totalAmortissements)}
                  </td>
                </tr>
              )}

              {/* Résultat avant IS */}
              <tr className={`${resultatAvantIS >= 0 ? "bg-emerald-50/40" : "bg-red-50/40"}`}>
                <td className="px-5 py-2.5 text-sm font-semibold text-brand-navy">
                  <span className="mr-2 font-mono text-slate-400">=</span>
                  Résultat avant IS
                </td>
                <td
                  className={`px-5 py-2.5 text-right text-sm font-semibold ${
                    resultatAvantIS >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}
                >
                  {formatEuros(resultatAvantIS)}
                </td>
              </tr>

              {/* IS */}
              {isEstime > 0 && (
                <>
                  <tr>
                    <td className="px-5 py-2.5 text-sm text-slate-700">
                      <span className="mr-2 font-mono text-red-400">−</span>
                      Impôt sur les Sociétés (IS) — estimation
                    </td>
                    <td className="px-5 py-2.5 text-right text-sm font-medium text-red-600">
                      {formatEuros(isEstime)}
                    </td>
                  </tr>
                  {is15 > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Taux réduit 15 % (jusqu&apos;à 42 500 €) : {formatEuros(is15)}
                      </td>
                      <td />
                    </tr>
                  )}
                  {is25 > 0 && (
                    <tr>
                      <td className="pl-10 pr-5 py-1 text-xs text-slate-400">
                        Taux normal 25 % (au-delà de 42 500 €) : {formatEuros(is25)}
                      </td>
                      <td />
                    </tr>
                  )}
                </>
              )}

              {/* Résultat net */}
              <tr className={`border-t-2 ${resultatNet >= 0 ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                <td className="px-5 py-4 text-base font-bold text-brand-navy">
                  <span className="mr-2 font-mono text-slate-400">=</span>
                  RÉSULTAT NET ESTIMÉ
                </td>
                <td
                  className={`px-5 py-4 text-right text-xl font-bold ${
                    resultatNet >= 0 ? "text-emerald-700" : "text-red-700"
                  }`}
                >
                  {formatEuros(resultatNet)}{" "}
                  <span className="text-sm font-normal text-slate-500">
                    ({txMargeNette >= 0 ? "+" : ""}{txMargeNette.toFixed(1)} %)
                  </span>
                </td>
              </tr>

              {/* Investissements (hors exploitation) */}
              {totalInvestissements > 0 && (
                <tr className="opacity-70">
                  <td className="px-5 py-2 text-xs text-slate-500">
                    <span className="italic">
                      Investissements (hors P&L) : {formatEuros(totalInvestissements)}
                    </span>
                  </td>
                  <td />
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Légende charges fixes / variables */}
        <div className="border-t border-slate-100 px-5 py-3">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Charges :</span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded bg-blue-200" />
              Fixes (salaires, loyer, assurances)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-2 w-6 rounded bg-orange-200" />
              Variables (matériaux, sous-traitance, transport)
            </span>
            <span className="ml-auto text-slate-400 italic">
              IS estimé PME : 15 % ≤ 42 500 € / 25 % au-delà — calcul définitif par votre expert-comptable
            </span>
          </div>
        </div>
      </div>

      {/* ─── GRAPHIQUE ANNUEL ─── */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="font-semibold text-brand-navy">Flux annuels {now.getFullYear()}</h3>
          <span className="text-xs text-slate-400">(encaissements vs charges réelles + salaires)</span>
        </div>
        <div className="flex h-40 items-end gap-1">
          {moisData.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
              <div className="relative flex w-full flex-col-reverse gap-0.5" style={{ height: "140px" }}>
                <div
                  className="w-full rounded-t bg-red-200"
                  style={{
                    height: `${(m.charges / maxBar) * 130}px`,
                    minHeight: m.charges > 0 ? "2px" : "0",
                  }}
                  title={`Charges : ${formatEuros(m.charges)}`}
                />
                <div
                  className="w-full rounded-t bg-emerald-400"
                  style={{
                    height: `${(m.encaisse / maxBar) * 130}px`,
                    minHeight: m.encaisse > 0 ? "2px" : "0",
                  }}
                  title={`Encaissé : ${formatEuros(m.encaisse)}`}
                />
              </div>
              <span className="text-[10px] text-slate-400">{MOIS_LABELS[i]}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded bg-emerald-400" />
            Encaissé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-4 rounded bg-red-200" />
            Charges (dépenses + salaires)
          </span>
        </div>
      </div>

      {/* ─── DÉTAIL ENCAISSEMENTS + RÉPARTITION DÉPENSES ─── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-brand-navy">Encaissements — {periodeLabel}</h3>
          </div>
          {paiements.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-400">Aucun encaissement sur cette période.</p>
              <Link href="/factures" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-blue hover:underline">
                Gérer les factures <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {paiements.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">{p.facture.numero}</p>
                    <p className="text-xs text-slate-400">
                      {new Date(p.date).toLocaleDateString("fr-FR")} ·{" "}
                      {METHODE_LABELS[p.methode] ?? p.methode}
                      {p.reference ? ` · Réf. ${p.reference}` : ""}
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-600">+{formatEuros(p.montant)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-semibold text-brand-navy">Dépenses par catégorie</h3>
          </div>
          {Object.keys(catDepenses).length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-400">Aucune dépense sur cette période.</p>
              <Link href="/finances" className="mt-2 inline-flex items-center gap-1 text-xs text-brand-blue hover:underline">
                Module Finances <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 px-5">
              {Object.entries(catDepenses)
                .sort(([, a], [, b]) => b - a)
                .map(([cat, montant]) => (
                  <div key={cat} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-slate-600">{DEPENSE_CAT_LABELS[cat] ?? cat}</span>
                    <div className="text-right">
                      <span className="font-semibold text-red-600">{formatEuros(montant)}</span>
                      {totalDecaissements > 0 && (
                        <p className="text-xs text-slate-400">
                          {Math.round((montant / totalDecaissements) * 100)} %
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              <div className="flex items-center justify-between py-2.5 text-sm font-semibold">
                <span className="text-slate-700">Total décaissé</span>
                <span className="text-red-700">{formatEuros(totalDecaissements)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── PAIEMENTS FOURNISSEURS ─── */}
      {paiementsFournisseurs.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <h3 className="font-semibold text-brand-navy">
                Paiements fournisseurs — {periodeLabel}
              </h3>
            </div>
            <Link href="/finances/fournisseurs-echeancier" className="text-xs font-medium text-brand-blue hover:underline">
              Échéancier fournisseurs
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Fournisseur</th>
                  <th className="px-5 py-3">N° Facture</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Méthode</th>
                  <th className="px-5 py-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paiementsFournisseurs.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-700">
                      {p.facture.fournisseur.nom}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500 font-mono text-xs">{p.facture.numero}</td>
                    <td className="px-5 py-2.5 text-slate-500">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-5 py-2.5 text-slate-500">{p.methode}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-red-600">
                      −{formatEuros(p.montant)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={4} className="px-5 py-2.5 text-sm font-semibold text-slate-700">
                    Total paiements fournisseurs
                  </td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-red-700">
                    −{formatEuros(totalPaiementsFournisseurs)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── MASSE SALARIALE ─── */}
      {bulletins.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-brand-blue" />
              <h3 className="font-semibold text-brand-navy">
                Masse salariale — {periodeLabel}
              </h3>
            </div>
            <Link href="/rh" className="text-xs font-medium text-brand-blue hover:underline">
              Module RH
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Salarié</th>
                  <th className="px-5 py-3">Période</th>
                  <th className="px-5 py-3 text-right">Brut</th>
                  <th className="px-5 py-3 text-right">Charges pat.</th>
                  <th className="px-5 py-3 text-right">Net versé</th>
                  <th className="px-5 py-3 text-right">Coût employeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bulletins.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5 font-medium text-slate-700">
                      {b.salarie.prenom} {b.salarie.nom}
                    </td>
                    <td className="px-5 py-2.5 text-slate-500">{b.periode}</td>
                    <td className="px-5 py-2.5 text-right text-slate-700">{formatEuros(b.totalBrut)}</td>
                    <td className="px-5 py-2.5 text-right text-red-500">{formatEuros(b.cotisationsPatronales)}</td>
                    <td className="px-5 py-2.5 text-right text-emerald-600">{formatEuros(b.netAPayer)}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-700">
                      {formatEuros(b.totalBrut + b.cotisationsPatronales)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={2} className="px-5 py-2.5 text-sm font-semibold text-slate-700">
                    Total
                  </td>
                  <td className="px-5 py-2.5 text-right text-sm font-semibold">{formatEuros(salairesBruts)}</td>
                  <td className="px-5 py-2.5 text-right text-sm font-semibold text-red-600">{formatEuros(chargesPatronalesRH)}</td>
                  <td className="px-5 py-2.5 text-right text-sm font-semibold text-emerald-600">{formatEuros(salairesNets)}</td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-slate-800">
                    {formatEuros(salairesBruts + chargesPatronalesRH)}
                  </td>
                </tr>
                {mutuellePatronale > 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-1.5 text-xs text-slate-400">
                      <Heart className="inline h-3 w-3 text-rose-400 mr-1" />
                      Mutuelle patronale ({adhesionsMutuelle.length} salarié{adhesionsMutuelle.length > 1 ? "s" : ""}) : +{formatEuros(mutuellePatronale)}
                    </td>
                    <td className="px-5 py-1.5 text-right text-xs font-semibold text-red-500">
                      {formatEuros(mutuellePatronale)}
                    </td>
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── BONS DE COMMANDE ENGAGÉS ─── */}
      {bonsCommande.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-brand-orange" />
              <h3 className="font-semibold text-brand-navy">Achats fournisseurs engagés — {periodeLabel}</h3>
            </div>
            <Link href="/finances" className="text-xs font-medium text-brand-blue hover:underline">
              Tableau des achats
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">N° BC</th>
                  <th className="px-5 py-3">Fournisseur</th>
                  <th className="px-5 py-3">Chantier</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3 text-right">Montant HT</th>
                  <th className="px-5 py-3 text-right">TTC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bonsCommande.map((bc) => (
                  <tr key={bc.id} className="hover:bg-slate-50">
                    <td className="px-5 py-2.5">
                      <Link href={`/bons-commande/${bc.id}`} className="font-medium text-brand-navy hover:underline">
                        {bc.numero}
                      </Link>
                    </td>
                    <td className="px-5 py-2.5 text-slate-600">{bc.fournisseur.nom}</td>
                    <td className="px-5 py-2.5 text-slate-500">{bc.chantier?.nom ?? "—"}</td>
                    <td className="px-5 py-2.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          bc.statut === "RECU"
                            ? "bg-emerald-100 text-emerald-700"
                            : bc.statut === "CONFIRME"
                            ? "bg-blue-100 text-blue-700"
                            : bc.statut === "RECU_PARTIEL"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {bc.statut === "RECU"
                          ? "Reçu"
                          : bc.statut === "CONFIRME"
                          ? "Confirmé"
                          : bc.statut === "RECU_PARTIEL"
                          ? "Partiel"
                          : "Envoyé"}
                      </span>
                    </td>
                    <td className="px-5 py-2.5 text-right text-slate-700">{formatEuros(bc.totalHT)}</td>
                    <td className="px-5 py-2.5 text-right font-semibold text-slate-700">{formatEuros(bc.totalTTC)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={4} className="px-5 py-2.5 text-sm font-semibold text-slate-700">
                    Total engagé
                  </td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-slate-800">
                    {formatEuros(bonsCommande.reduce((s, b) => s + b.totalHT, 0))}
                  </td>
                  <td className="px-5 py-2.5 text-right text-sm font-bold text-slate-800">
                    {formatEuros(bonsCommande.reduce((s, b) => s + b.totalTTC, 0))}
                  </td>
                </tr>
                {dettesFournisseurs > 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-1.5 text-xs text-slate-400">
                      Dettes fournisseurs estimées (engagés non reçus) : {formatEuros(dettesFournisseurs)}
                    </td>
                    <td />
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── FACTURES À ENCAISSER ─── */}
      {facturesEnAttente.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-brand-orange" />
              <h3 className="font-semibold text-brand-navy">Factures à encaisser</h3>
            </div>
            <Link href="/factures?statut=ENVOYEE" className="text-xs font-medium text-brand-blue hover:underline">
              Voir toutes
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Facture</th>
                  <th className="px-5 py-3">Client</th>
                  <th className="px-5 py-3">Échéance</th>
                  <th className="px-5 py-3 text-right">Reste dû TTC</th>
                  <th className="px-5 py-3">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {facturesEnAttente.map((f) => {
                  const reste = Math.max(0, f.totalTTC - f.montantPaye);
                  const enRetard = f.dateEcheance && f.dateEcheance < now;
                  return (
                    <tr key={f.id} className={`${enRetard ? "bg-red-50/30" : "hover:bg-slate-50"}`}>
                      <td className="px-5 py-2.5">
                        <Link href={`/factures/${f.id}`} className="font-medium text-brand-navy hover:underline">
                          {f.numero}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-slate-600">
                        {f.client.type === "PA"
                          ? `${f.client.prenom ? f.client.prenom + " " : ""}${f.client.nom}`
                          : f.client.raisonSociale || f.client.nom}
                      </td>
                      <td
                        className={`px-5 py-2.5 ${enRetard ? "font-semibold text-red-600" : "text-slate-600"}`}
                      >
                        {f.dateEcheance ? new Date(f.dateEcheance).toLocaleDateString("fr-FR") : "—"}
                        {enRetard && " ⚠"}
                      </td>
                      <td className="px-5 py-2.5 text-right font-semibold text-red-600">
                        {formatEuros(reste)}
                      </td>
                      <td className="px-5 py-2.5">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            f.statut === "EN_RETARD"
                              ? "bg-red-100 text-red-700"
                              : f.statut === "PAYEE_PARTIELLE"
                              ? "bg-brand-orange/10 text-brand-orange-dark"
                              : "bg-brand-blue/10 text-brand-blue-dark"
                          }`}
                        >
                          {f.statut === "EN_RETARD"
                            ? "En retard"
                            : f.statut === "PAYEE_PARTIELLE"
                            ? "Partielle"
                            : "Envoyée"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <td colSpan={3} className="px-5 py-2 text-sm font-semibold text-slate-700">
                    Total créances clients
                  </td>
                  <td className="px-5 py-2 text-right text-sm font-bold text-red-600">
                    {formatEuros(totalCreances)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ─── CONNEXION BANCAIRE ─── */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
        <Plug className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
        <div>
          <p className="font-semibold">Connexion Crédit Agricole (Phase 2)</p>
          <p className="text-blue-700 text-sm mt-0.5">
            La synchronisation automatique des relevés de compte avec le Crédit Agricole nécessite un
            agrégateur bancaire agréé DSP2 (Bridge / Powens). En attendant, vous pouvez importer un
            relevé CSV depuis votre espace en ligne CA pour vérifier la concordance avec ce tableau.
          </p>
          <Link href="/parametres" className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-brand-blue hover:underline">
            Configurer vos coordonnées bancaires <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ─── NOTE ─── */}
      <div className="flex items-start gap-2 text-xs text-slate-400">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Trésorerie : encaissements = paiements clients enregistrés ; décaissements = dépenses saisies + paiements fournisseurs enregistrés.
          Solde prévisionnel = solde réel + créances à encaisser − dettes fournisseurs engagées (BCs confirmés/envoyés).
          Compte de résultat : base engagement — factures émises + bons de commande + bulletins de paie + notes de frais.
          IS estimé selon barème PME 2025 (15 % ≤ 42 500 € / 25 % au-delà) — calcul définitif établi par votre expert-comptable.
          Saisir amortissements, loyer, assurances et investissements via le module Dépenses (catégories dédiées).
        </p>
      </div>
    </div>
  );
}
