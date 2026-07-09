import Link from "next/link";
import {
  TrendingUp, TrendingDown, ChevronRight, BarChart3, Settings2,
  ArrowRight, AlertTriangle, CheckCircle2, Wallet, Target,
  Receipt, ShoppingCart, Users, Building2, Truck, Scale,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";

function computeIS(r: number) {
  if (r <= 0) return 0;
  return Math.min(r, 42500) * 0.15 + Math.max(0, r - 42500) * 0.25;
}

function pct(val: number, base: number) {
  if (base === 0) return 0;
  return Math.round((val / base) * 1000) / 10;
}

function ecart(reel: number, budget: number) {
  return reel - budget;
}

function EcartBadge({ reel, budget, inverser = false }: { reel: number; budget: number; inverser?: boolean }) {
  const diff = reel - budget;
  if (Math.abs(diff) < 0.5) return <span className="text-xs text-slate-400">—</span>;
  const positif = inverser ? diff < 0 : diff > 0;
  return (
    <span className={`text-xs font-medium ${positif ? "text-emerald-600" : "text-red-500"}`}>
      {diff > 0 ? "+" : ""}{formatEuros(diff)}
    </span>
  );
}

export default async function RentabilitePage({
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

  const [
    factures,
    depenses,
    bulletins,
    adhesions,
    interimaires,
    bonsCommande,
    contratsSTR,
    notesFrais,
    budgets,
  ] = await Promise.all([
    prisma.facture.findMany({
      where: { dateEmission: { gte: debut, lte: fin }, statut: { notIn: ["BROUILLON", "ANNULEE"] } },
      select: { totalHT: true, totalTVA: true },
    }),
    prisma.depense.findMany({
      where: { date: { gte: debut, lte: fin }, type: "REEL" },
      select: { montant: true, categorie: true },
    }),
    prisma.bulletinDePaie.findMany({
      where: { periode: { in: periodMonths }, statut: { in: ["VALIDE", "PAYE"] } },
      select: { totalBrut: true, cotisationsPatronales: true, netAPayer: true },
    }),
    prisma.adhesionMutuelle.findMany({
      where: { actif: true, dateAdhesion: { lte: fin } },
      include: { formuleMutuelle: { select: { cotisationPatronale: true } } },
    }),
    prisma.suiviHeureInterimaire.findMany({
      where: { createdAt: { gte: debut, lte: fin } },
      select: { coutTotalHT: true },
    }),
    prisma.bonCommande.findMany({
      where: {
        dateCreation: { gte: debut, lte: fin },
        statut: { in: ["CONFIRME", "RECU_PARTIEL", "RECU"] },
      },
      select: { totalHT: true },
    }),
    prisma.contratSousTraitance.findMany({
      where: { createdAt: { gte: debut, lte: fin }, statut: { in: ["SIGNE", "EN_COURS", "TERMINE"] } },
      select: { montantHT: true },
    }),
    prisma.noteDeFrais.findMany({
      where: { date: { gte: debut, lte: fin }, statut: "REMBOURSEE" },
      select: { montant: true },
    }),
    prisma.budgetChargesSociete.findMany({
      where: { annee },
      orderBy: [{ type: "asc" }, { categorie: "asc" }],
    }),
  ]);

  // ── CA ───────────────────────────────────────────────────────────
  const caHT = factures.reduce((s, f) => s + f.totalHT, 0);

  // ── CHARGES VARIABLES RÉELLES ────────────────────────────────────
  const dep = (cat: string) => depenses.filter((d) => d.categorie === cat).reduce((s, d) => s + d.montant, 0);

  const rMat = bonsCommande.reduce((s, b) => s + b.totalHT, 0) + dep("MATERIAUX");
  const rST = contratsSTR.reduce((s, c) => s + (c.montantHT ?? 0), 0) + dep("SOUS_TRAITANCE");
  const rTransport = dep("TRANSPORT");
  const rMO = dep("MAIN_OEUVRE");
  const rInterim = interimaires.reduce((s, h) => s + h.coutTotalHT, 0);
  const rNotesFrais = notesFrais.reduce((s, n) => s + n.montant, 0);
  const rAutreVar = dep("AUTRE");
  const totalCVReelles = rMat + rST + rTransport + rMO + rInterim + rNotesFrais + rAutreVar;
  const mcvReelle = caHT - totalCVReelles;
  const txMCVReelle = pct(mcvReelle, caHT);

  // ── CHARGES FIXES RÉELLES ────────────────────────────────────────
  const rSalaires = bulletins.reduce((s, b) => s + b.totalBrut + b.cotisationsPatronales, 0)
    + adhesions.reduce((s, a) => s + a.formuleMutuelle.cotisationPatronale * 12, 0);
  const rLoyer = dep("LOYER");
  const rAssurance = dep("ASSURANCE");
  const rAdmin = dep("ADMINISTRATIF");
  const rImpots = dep("IMPOT_TAXE");
  const rAmort = dep("AMORTISSEMENT");
  const rInvest = dep("INVESTISSEMENT");
  const rAutreFixe = 0; // AUTRE est classé en variable
  const totalCFReelles = rSalaires + rLoyer + rAssurance + rAdmin + rImpots + rAmort + rInvest + rAutreFixe;

  const resultatExploitationReel = mcvReelle - totalCFReelles;
  const isReel = computeIS(resultatExploitationReel - rAmort);
  const resultatNetReel = resultatExploitationReel - rAmort - isReel;

  // ── BUDGETS ──────────────────────────────────────────────────────
  const budgetByCat = (cat: string, type: "FIXE" | "VARIABLE") =>
    budgets.filter((b) => b.categorie === cat && b.type === type).reduce((s, b) => s + b.montantAnnuel, 0);
  const budgetByType = (type: "FIXE" | "VARIABLE") =>
    budgets.filter((b) => b.type === type).reduce((s, b) => s + b.montantAnnuel, 0);

  const bMat = budgetByCat("MATERIAUX", "VARIABLE");
  const bST = budgetByCat("SOUS_TRAITANCE", "VARIABLE");
  const bTransport = budgetByCat("TRANSPORT", "VARIABLE");
  const bMO = budgetByCat("MAIN_OEUVRE", "VARIABLE");
  const bInterim = budgetByCat("INTERIM", "VARIABLE");
  const bAutreVar = budgetByCat("AUTRE", "VARIABLE");
  const bNotesFrais = 0; // pas de catégorie budget pour notes de frais
  const totalCVBudget = budgetByType("VARIABLE");

  const bSalaires = budgetByCat("SALAIRES", "FIXE");
  const bLoyer = budgetByCat("LOYER", "FIXE");
  const bAssurance = budgetByCat("ASSURANCE", "FIXE");
  const bAdmin = budgetByCat("ADMINISTRATIF", "FIXE");
  const bImpots = budgetByCat("IMPOT_TAXE", "FIXE");
  const bAmort = budgetByCat("AMORTISSEMENT", "FIXE");
  const bInvest = budgetByCat("INVESTISSEMENT", "FIXE");
  const totalCFBudget = budgetByType("FIXE");

  // CA budget (total charges budget + résultat cible 0 = seuil)
  const caBudget = 0; // pas de budget CA saisi

  const mcvBudget = totalCVBudget > 0 ? (caBudget > 0 ? caBudget - totalCVBudget : 0) : 0;
  const txMCVBudget = caBudget > 0 && totalCVBudget > 0
    ? pct(caBudget - totalCVBudget, caBudget)
    : txMCVReelle; // on utilise le taux réel si pas de budget CA

  // ── SEUIL DE RENTABILITÉ ─────────────────────────────────────────
  const tauxMCVPourSR = txMCVReelle / 100; // on utilise le taux réel comme référence
  const seuilRentabilite = tauxMCVPourSR > 0 ? totalCFReelles / tauxMCVPourSR : 0;
  const seuilBudget = txMCVBudget > 0 && totalCFBudget > 0 ? totalCFBudget / (txMCVBudget / 100) : 0;

  // Mois restants pour atteindre le SR (CA mensuel moyen)
  const caMoisMoyen = caHT / 12;
  const moisPourSR = caMoisMoyen > 0 ? Math.ceil(seuilRentabilite / caMoisMoyen) : 0;

  const hasBudget = budgets.length > 0;

  const moisLabels = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Link href="/finances" className="hover:text-brand-blue">Finances</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-slate-600">Tableau de rentabilité</span>
          </nav>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-violet-600" />
            <h2 className="text-xl font-bold text-brand-navy">Rentabilité société — {annee}</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Compte de résultat analytique · Marge sur coût variable · Seuil de rentabilité
          </p>
        </div>

        {/* Sélecteur année */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden shadow-sm">
            {years.map((y) => (
              <Link
                key={y}
                href={`/finances/rentabilite?annee=${y}`}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  y === annee ? "bg-brand-navy text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {y}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Liens inter-modules */}
      <div className="flex flex-wrap gap-2">
        {[
          { href: "/tresorerie", label: "Trésorerie", icon: Wallet },
          { href: "/finances", label: "Dépenses", icon: TrendingDown },
          { href: "/factures", label: "Factures", icon: Receipt },
          { href: "/marge-rentabilite", label: "Rentabilité chantiers", icon: TrendingUp },
          { href: `/comptabilite/bilan?annee=${annee}`, label: "Bilan comptable", icon: Scale },
          { href: `/finances/charges?annee=${annee}`, label: "Budget des charges", icon: Settings2 },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:border-brand-blue/40 hover:bg-blue-50 hover:text-brand-blue transition"
          >
            <Icon className="h-3 w-3" />
            {label}
          </Link>
        ))}
      </div>

      {/* Alerte si pas de budget */}
      {!hasBudget && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>
            Aucun budget de charges saisi pour {annee}. Le seuil de rentabilité est calculé uniquement sur les coûts réels.{" "}
            <Link href={`/finances/charges?annee=${annee}`} className="font-semibold underline">
              Saisir les budgets →
            </Link>
          </span>
        </div>
      )}

      {/* ── KPI CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          title="Chiffre d'affaires"
          value={formatEuros(caHT)}
          sub={`${factures.length} facture${factures.length > 1 ? "s" : ""} émises`}
          color="blue"
          icon={<Receipt className="h-5 w-5" />}
        />
        <KpiCard
          title="Marge sur coût variable"
          value={formatEuros(mcvReelle)}
          sub={`Taux : ${txMCVReelle.toFixed(1)} %`}
          color={mcvReelle >= 0 ? "green" : "red"}
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <KpiCard
          title="Résultat d'exploitation"
          value={formatEuros(resultatExploitationReel)}
          sub={`${pct(resultatExploitationReel, caHT).toFixed(1)} % du CA`}
          color={resultatExploitationReel >= 0 ? "green" : "red"}
          icon={<Target className="h-5 w-5" />}
        />
        <KpiCard
          title="Résultat net estimé"
          value={formatEuros(resultatNetReel)}
          sub={`IS estimé : ${formatEuros(isReel)}`}
          color={resultatNetReel >= 0 ? "green" : "red"}
          icon={<Wallet className="h-5 w-5" />}
        />
      </div>

      {/* ── SEUIL DE RENTABILITÉ ──────────────────────────────────── */}
      <div className="rounded-xl border border-violet-200 bg-violet-50 p-5 shadow-sm">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-violet-800">
          <Target className="h-5 w-5" />
          Seuil de rentabilité (point mort)
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-violet-600">Taux de marge sur coût variable</p>
            <p className="text-2xl font-bold text-violet-800">{txMCVReelle.toFixed(1)} %</p>
          </div>
          <div>
            <p className="text-xs text-violet-600">Seuil de rentabilité (CA minimum)</p>
            <p className="text-2xl font-bold text-violet-800">{formatEuros(seuilRentabilite)}</p>
            <p className="text-xs text-violet-500">= Charges fixes ÷ Taux MCV</p>
          </div>
          <div>
            <p className="text-xs text-violet-600">CA réel {annee} / SR</p>
            {seuilRentabilite > 0 ? (
              <>
                <p className={`text-2xl font-bold ${caHT >= seuilRentabilite ? "text-emerald-700" : "text-red-600"}`}>
                  {pct(caHT, seuilRentabilite).toFixed(0)} %
                </p>
                <p className="text-xs text-violet-500">
                  {caHT >= seuilRentabilite
                    ? `✓ Seuil atteint (+${formatEuros(caHT - seuilRentabilite)})`
                    : `⚠ Manque ${formatEuros(seuilRentabilite - caHT)}`}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">—</p>
            )}
          </div>
        </div>
        {/* Barre de progression vers le seuil */}
        {seuilRentabilite > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-violet-600 mb-1">
              <span>0 €</span>
              <span className="font-medium">SR : {formatEuros(seuilRentabilite)}</span>
              {caHT > seuilRentabilite && <span className="font-medium text-emerald-700">CA : {formatEuros(caHT)}</span>}
            </div>
            <div className="relative h-4 rounded-full bg-violet-200 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${caHT >= seuilRentabilite ? "bg-emerald-500" : "bg-red-400"}`}
                style={{ width: `${Math.min(100, pct(caHT, seuilRentabilite))}%` }}
              />
              {/* Ligne seuil */}
              <div className="absolute top-0 bottom-0 w-0.5 bg-violet-700" style={{ left: "100%" }} />
            </div>
          </div>
        )}
      </div>

      {/* ── COMPTE DE RÉSULTAT ──────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-brand-navy px-5 py-3 flex items-center justify-between">
          <h3 className="font-semibold text-white">Compte de résultat analytique — {annee}</h3>
          {hasBudget && (
            <div className="flex items-center gap-4 text-xs text-white/70">
              <span>Budget</span>
              <span>Réel</span>
              <span>Écart</span>
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-50">
              <th className="px-5 py-2.5 text-left">Poste</th>
              {hasBudget && <th className="px-4 py-2.5 text-right w-36">Budget</th>}
              <th className="px-4 py-2.5 text-right w-36">Réel</th>
              {hasBudget && <th className="px-4 py-2.5 text-right w-36">Écart</th>}
            </tr>
          </thead>
          <tbody>

            {/* ── CA ── */}
            <SectionHeader label="Chiffre d'affaires HT" />
            <DataRow
              label="Factures émises (hors brouillon / annulées)"
              icon={<Receipt className="h-3.5 w-3.5 text-emerald-500" />}
              budget={caBudget || undefined}
              reel={caHT}
              hasBudget={hasBudget}
              link="/factures"
              inverse
            />

            {/* ── CHARGES VARIABLES ── */}
            <SectionHeader label="Charges variables" color="orange" />
            <DataRow label="Achats matériaux (BC + dépenses)" icon={<ShoppingCart className="h-3.5 w-3.5 text-slate-400" />}
              budget={bMat || undefined} reel={rMat} hasBudget={hasBudget} link="/bons-commande" />
            <DataRow label="Sous-traitance (contrats + dépenses)" icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
              budget={bST || undefined} reel={rST} hasBudget={hasBudget} link="/contrats-sous-traitance" />
            <DataRow label="Transport & déplacement" icon={<Truck className="h-3.5 w-3.5 text-slate-400" />}
              budget={bTransport || undefined} reel={rTransport} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Main-d'œuvre directe" icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
              budget={bMO || undefined} reel={rMO} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Intérimaires" icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
              budget={bInterim || undefined} reel={rInterim} hasBudget={hasBudget} link="/finances" />
            <DataRow label="Notes de frais" icon={<Receipt className="h-3.5 w-3.5 text-slate-400" />}
              budget={undefined} reel={rNotesFrais} hasBudget={hasBudget} link="/notes-de-frais" />
            {rAutreVar > 0 && (
              <DataRow label="Autres charges variables" budget={bAutreVar || undefined} reel={rAutreVar} hasBudget={hasBudget} link="/depenses" />
            )}
            <TotalRow
              label="= Marge sur coût variable"
              value={mcvReelle}
              budget={hasBudget && totalCVBudget > 0 ? (caBudget > 0 ? caBudget - totalCVBudget : undefined) : undefined}
              taux={txMCVReelle}
              hasBudget={hasBudget}
              positive
            />

            {/* ── CHARGES FIXES ── */}
            <SectionHeader label="Charges fixes" color="blue" />
            <DataRow label="Personnel (salaires + charges + mutuelle)" icon={<Users className="h-3.5 w-3.5 text-slate-400" />}
              budget={bSalaires || undefined} reel={rSalaires} hasBudget={hasBudget} link="/rh/bulletins" />
            <DataRow label="Loyer & charges locatives" icon={<Building2 className="h-3.5 w-3.5 text-slate-400" />}
              budget={bLoyer || undefined} reel={rLoyer} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Assurances" icon={<Building2 className="h-3.5 w-3.5 text-slate-400" />}
              budget={bAssurance || undefined} reel={rAssurance} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Frais administratifs" budget={bAdmin || undefined} reel={rAdmin} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Impôts & taxes" budget={bImpots || undefined} reel={rImpots} hasBudget={hasBudget} link="/depenses" />
            <DataRow label="Amortissements" budget={bAmort || undefined} reel={rAmort} hasBudget={hasBudget} link="/depenses" />
            {rInvest > 0 && (
              <DataRow label="Investissements" budget={bInvest || undefined} reel={rInvest} hasBudget={hasBudget} link="/depenses" />
            )}
            <TotalRow
              label="= Résultat d'exploitation (EBE)"
              value={resultatExploitationReel}
              taux={pct(resultatExploitationReel, caHT)}
              hasBudget={hasBudget}
            />

            {/* ── IS & RÉSULTAT NET ── */}
            <SectionHeader label="Résultat net" color="slate" />
            <DataRow label="IS estimé (15 % ≤ 42 500 € / 25 % au-delà)" reel={-isReel} hasBudget={hasBudget} link="/comptabilite" />
            <TotalRow
              label="= Résultat net"
              value={resultatNetReel}
              taux={pct(resultatNetReel, caHT)}
              hasBudget={hasBudget}
              bold
            />

          </tbody>
        </table>
      </div>

      {/* Lien vers budget */}
      <div className="flex justify-center">
        <Link
          href={`/finances/charges?annee=${annee}`}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-600 shadow-sm hover:border-brand-blue/40 hover:text-brand-blue transition"
        >
          <Settings2 className="h-4 w-4" />
          {hasBudget ? "Modifier le budget des charges" : "Saisir le budget des charges pour activer la comparaison"}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function KpiCard({
  title, value, sub, color, icon,
}: {
  title: string; value: string; sub: string;
  color: "blue" | "green" | "red" | "orange";
  icon: React.ReactNode;
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-600",
    green: "bg-emerald-50 border-emerald-200 text-emerald-600",
    red: "bg-red-50 border-red-200 text-red-600",
    orange: "bg-orange-50 border-orange-200 text-orange-600",
  };
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium opacity-80">{title}</p>
        <span className="opacity-60">{icon}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </div>
  );
}

function SectionHeader({ label, color = "slate" }: { label: string; color?: "orange" | "blue" | "slate" }) {
  const bg = color === "orange" ? "bg-brand-orange/8" : color === "blue" ? "bg-brand-blue/8" : "bg-slate-50";
  const text = color === "orange" ? "text-brand-orange-dark" : color === "blue" ? "text-brand-navy" : "text-slate-600";
  return (
    <tr className={`border-t border-b border-slate-100 ${bg}`}>
      <td colSpan={4} className={`px-5 py-2 text-xs font-bold uppercase tracking-wider ${text}`}>
        {label}
      </td>
    </tr>
  );
}

function DataRow({
  label, icon, budget, reel, hasBudget, link, inverse = false,
}: {
  label: string;
  icon?: React.ReactNode;
  budget?: number;
  reel: number;
  hasBudget: boolean;
  link?: string;
  inverse?: boolean;
}) {
  return (
    <tr className="hover:bg-slate-50/50 border-b border-slate-50">
      <td className="px-5 py-2 text-slate-600">
        {link ? (
          <Link href={link} className="flex items-center gap-2 hover:text-brand-blue group">
            {icon}
            {label}
            <ArrowRight className="ml-auto h-3 w-3 text-slate-300 group-hover:text-brand-blue" />
          </Link>
        ) : (
          <span className="flex items-center gap-2">{icon}{label}</span>
        )}
      </td>
      {hasBudget && (
        <td className="px-4 py-2 text-right text-slate-400 text-xs">
          {budget != null && budget !== 0 ? formatEuros(budget) : "—"}
        </td>
      )}
      <td className={`px-4 py-2 text-right font-medium ${reel < 0 ? "text-red-600" : "text-slate-700"}`}>
        {formatEuros(Math.abs(reel))}
      </td>
      {hasBudget && (
        <td className="px-4 py-2 text-right">
          {budget != null && budget !== 0
            ? <EcartBadge reel={reel} budget={budget} inverser={inverse} />
            : <span className="text-xs text-slate-300">—</span>
          }
        </td>
      )}
    </tr>
  );
}

function TotalRow({
  label, value, budget, taux, hasBudget, positive = false, bold = false,
}: {
  label: string; value: number; budget?: number; taux: number; hasBudget: boolean;
  positive?: boolean; bold?: boolean;
}) {
  const positive_ = positive ? value >= 0 : value >= 0;
  const color = positive_ ? "text-emerald-700" : "text-red-600";
  const bg = positive_ ? "bg-emerald-50/60" : "bg-red-50/60";

  return (
    <tr className={`border-t-2 border-slate-200 ${bg}`}>
      <td className={`px-5 py-3 text-sm ${bold ? "font-bold" : "font-semibold"} text-slate-800`}>
        {label}
        <span className="ml-2 text-xs font-normal text-slate-500">({taux.toFixed(1)} % du CA)</span>
      </td>
      {hasBudget && (
        <td className="px-4 py-3 text-right text-sm font-medium text-slate-500">
          {budget != null ? formatEuros(budget) : "—"}
        </td>
      )}
      <td className={`px-4 py-3 text-right text-sm ${bold ? "font-bold" : "font-semibold"} ${color}`}>
        {formatEuros(value)}
      </td>
      {hasBudget && (
        <td className="px-4 py-3 text-right">
          {budget != null ? <EcartBadge reel={value} budget={budget} inverser={positive} /> : "—"}
        </td>
      )}
    </tr>
  );
}
