import Link from "next/link";
import {
  TrendingUp, TrendingDown, Wallet, Receipt, AlertTriangle, CheckCircle2,
  ShieldCheck, FileText, BarChart3, Settings2, Clock, ArrowRight,
  Target, Building2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";

export default async function FinanceDashboardPage() {
  const today = new Date();
  const debutAnnee = new Date(today.getFullYear(), 0, 1);
  const finAnnee = new Date(today.getFullYear(), 11, 31, 23, 59, 59);
  const debutMois = new Date(today.getFullYear(), today.getMonth(), 1);

  const [
    factures,
    facturesMois,
    impayes,
    depenses,
    bonsCommande,
    contratsSTR,
    bulletins,
    budgets,
    retentionsRG,
    relancesRecentes,
  ] = await Promise.all([
    // CA YTD
    prisma.facture.findMany({
      where: { dateEmission: { gte: debutAnnee, lte: finAnnee }, statut: { notIn: ["BROUILLON", "ANNULEE"] } },
      select: { totalHT: true, totalTVA: true },
    }),
    // CA ce mois
    prisma.facture.findMany({
      where: { dateEmission: { gte: debutMois, lte: today }, statut: { notIn: ["BROUILLON", "ANNULEE"] } },
      select: { totalHT: true },
    }),
    // Impayés
    prisma.facture.findMany({
      where: { statut: { in: ["ENVOYEE", "PAYEE_PARTIELLE", "EN_RETARD"] }, dateEcheance: { lt: today } },
      select: { totalTTC: true, montantPaye: true, dateEcheance: true, client: { select: { nom: true } } },
    }),
    // Dépenses YTD
    prisma.depense.findMany({
      where: { date: { gte: debutAnnee, lte: finAnnee }, type: "REEL" },
      select: { montant: true },
    }),
    // Achats BC YTD
    prisma.bonCommande.findMany({
      where: { dateCreation: { gte: debutAnnee, lte: finAnnee }, statut: { in: ["CONFIRME", "RECU_PARTIEL", "RECU"] } },
      select: { totalHT: true },
    }),
    // Sous-traitance YTD
    prisma.contratSousTraitance.findMany({
      where: { createdAt: { gte: debutAnnee, lte: finAnnee }, statut: { in: ["SIGNE", "EN_COURS", "TERMINE"] } },
      select: { montantHT: true },
    }),
    // Salaires
    prisma.bulletinDePaie.findMany({
      where: { statut: { in: ["VALIDE", "PAYE"] }, createdAt: { gte: debutAnnee, lte: finAnnee } },
      select: { totalBrut: true, cotisationsPatronales: true },
    }),
    // Budget
    prisma.budgetChargesSociete.findMany({ where: { annee: today.getFullYear() } }),
    // RG à libérer
    prisma.contratSousTraitance.findMany({
      where: { retenueGarantie: { gt: 0 }, rgLiberee: false, statut: { in: ["SIGNE", "EN_COURS", "TERMINE"] } },
      select: { montantHT: true, retenueGarantie: true, dateReception: true, dateFin: true },
    }),
    // Dernières relances
    prisma.relanceFacture.findMany({
      orderBy: { date: "desc" },
      take: 5,
      include: { facture: { select: { numero: true, client: { select: { nom: true } } } } },
    }),
  ]);

  // Calculs
  const caHT = factures.reduce((s, f) => s + f.totalHT, 0);
  const caMois = facturesMois.reduce((s, f) => s + f.totalHT, 0);
  const totalImpayes = impayes.reduce((s, f) => s + (f.totalTTC - f.montantPaye), 0);
  const totalDepenses = depenses.reduce((s, d) => s + d.montant, 0);
  const totalBC = bonsCommande.reduce((s, b) => s + b.totalHT, 0);
  const totalST = contratsSTR.reduce((s, c) => s + (c.montantHT ?? 0), 0);
  const totalSalaires = bulletins.reduce((s, b) => s + b.totalBrut + b.cotisationsPatronales, 0);
  const totalCharges = totalDepenses + totalBC + totalST + totalSalaires;
  const mcv = caHT - (totalBC + totalST + totalDepenses);
  const txMCV = caHT > 0 ? (mcv / caHT) * 100 : 0;
  const resultat = caHT - totalCharges;

  const budgetChargesFixes = budgets.filter((b) => b.type === "FIXE").reduce((s, b) => s + b.montantAnnuel, 0);
  const tauxMCVPourSR = txMCV / 100;
  const seuilRent = tauxMCVPourSR > 0 ? budgetChargesFixes / tauxMCVPourSR : 0;

  const totalRGEnAttente = retentionsRG.reduce((s, c) => s + (c.montantHT ?? 0) * ((c.retenueGarantie ?? 0) / 100), 0);

  const rgALiberer = retentionsRG.filter((c) => {
    const dateRef = c.dateReception ?? c.dateFin;
    if (!dateRef) return false;
    const lib = new Date(dateRef);
    lib.setFullYear(lib.getFullYear() + 1);
    return lib <= today;
  });

  const annee = today.getFullYear();

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Tableau de bord Finance — {annee}</h2>
          <p className="mt-1 text-sm text-slate-500">Vue consolidée · Alertes · Raccourcis</p>
        </div>
        <span className="text-xs text-slate-400">{today.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
      </div>

      {/* Alertes */}
      {(totalImpayes > 0 || rgALiberer.length > 0) && (
        <div className="flex flex-col gap-2">
          {totalImpayes > 0 && (
            <Link href="/finances/impayes" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 hover:bg-red-100 transition">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span><strong>{formatEuros(totalImpayes)}</strong> d'impayés sur {impayes.length} facture{impayes.length > 1 ? "s" : ""} échues</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          )}
          {rgALiberer.length > 0 && (
            <Link href="/finances/retenues-garantie" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 hover:bg-amber-100 transition">
              <ShieldCheck className="h-5 w-5 shrink-0" />
              <span><strong>{rgALiberer.length} retenue{rgALiberer.length > 1 ? "s" : ""} de garantie</strong> à libérer (délai dépassé)</span>
              <ArrowRight className="h-4 w-4 ml-auto" />
            </Link>
          )}
        </div>
      )}

      {/* KPIs principaux */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={<Receipt className="h-5 w-5" />} label={`CA HT ${annee}`} value={formatEuros(caHT)}
          sub={`Ce mois : ${formatEuros(caMois)}`} color="blue" href="/factures" />
        <KpiCard icon={<TrendingUp className="h-5 w-5" />} label="MCV" value={`${txMCV.toFixed(1)} %`}
          sub={formatEuros(mcv)} color={mcv >= 0 ? "green" : "red"} href="/finances/rentabilite" />
        <KpiCard icon={<Target className="h-5 w-5" />} label="Résultat YTD" value={formatEuros(resultat)}
          sub={seuilRent > 0 ? `SR : ${formatEuros(seuilRent)}` : "Aucun budget"} color={resultat >= 0 ? "green" : "red"} href="/finances/rentabilite" />
        <KpiCard icon={<AlertTriangle className="h-5 w-5" />} label="Impayés" value={formatEuros(totalImpayes)}
          sub={`${impayes.length} facture${impayes.length > 1 ? "s" : ""} échues`} color={totalImpayes > 0 ? "red" : "green"} href="/finances/impayes" />
      </div>

      {/* Ligne 2 : charges et RG */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard icon={<TrendingDown className="h-5 w-5" />} label="Achats BC" value={formatEuros(totalBC)}
          sub="Bons confirmés" color="orange" href="/bons-commande" />
        <KpiCard icon={<TrendingDown className="h-5 w-5" />} label="Sous-traitance" value={formatEuros(totalST)}
          sub="Contrats signés" color="orange" href="/contrats-sous-traitance" />
        <KpiCard icon={<Wallet className="h-5 w-5" />} label="Salaires + charges" value={formatEuros(totalSalaires)}
          sub="Bulletins de paie" color="orange" href="/rh/bulletins" />
        <KpiCard icon={<ShieldCheck className="h-5 w-5" />} label="RG en attente" value={formatEuros(totalRGEnAttente)}
          sub={`${retentionsRG.length} contrat${retentionsRG.length > 1 ? "s" : ""}`} color="violet" href="/finances/retenues-garantie" />
      </div>

      {/* Modules */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-brand-navy px-5 py-3">
          <h3 className="font-semibold text-white">Accès rapide — Finance & Comptabilité</h3>
        </div>
        <div className="grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          {[
            { href: "/finances/rentabilite", icon: BarChart3, label: "Rentabilité société", desc: "P&L, MCV, seuil", color: "text-violet-600" },
            { href: "/finances/tva", icon: Receipt, label: "Suivi TVA / CA3", desc: "Collectée, déductible, auto-liq", color: "text-emerald-600" },
            { href: "/finances/impayes", icon: AlertTriangle, label: "Impayés & Relances", desc: "Vieillissement, suivi relances", color: "text-red-500" },
            { href: "/finances/retenues-garantie", icon: ShieldCheck, label: "Retenues de garantie", desc: "RG sous-traitants, libérations", color: "text-amber-600" },
            { href: "/finances/tresorerie-hebdo", icon: Clock, label: "Trésorerie 13 semaines", desc: "Cash flow prévisionnel", color: "text-brand-blue" },
            { href: "/finances/charges", icon: Settings2, label: "Budget des charges", desc: "Fixes et variables annuels", color: "text-brand-navy" },
            { href: "/tresorerie", icon: Wallet, label: "Trésorerie & P&L", desc: "Vue mensuelle", color: "text-brand-navy" },
            { href: "/comptabilite/fec", icon: FileText, label: "Export FEC", desc: "Fichier écritures comptables", color: "text-slate-600" },
            { href: "/marge-rentabilite", icon: Building2, label: "Rentabilité chantiers", desc: "Top chantiers, marges", color: "text-brand-orange" },
          ].map(({ href, icon: Icon, label, desc, color }) => (
            <Link key={href} href={href} className="flex items-start gap-3 p-4 hover:bg-slate-50 transition group">
              <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${color}`} />
              <div>
                <p className="text-sm font-medium text-slate-700 group-hover:text-brand-blue">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-brand-blue ml-auto mt-1 shrink-0" />
            </Link>
          ))}
        </div>
      </div>

      {/* Dernières relances */}
      {relancesRecentes.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-4">
          <h3 className="font-semibold text-brand-navy mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Dernières relances enregistrées
          </h3>
          <div className="flex flex-col gap-2">
            {relancesRecentes.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">{r.type}</span>
                <span className="font-medium">{r.facture.numero}</span>
                <span className="text-slate-400">–</span>
                <span className="text-slate-500">{r.facture.client.nom}</span>
                <span className="ml-auto text-xs text-slate-400">{new Date(r.date).toLocaleDateString("fr-FR")}</span>
              </div>
            ))}
          </div>
          <Link href="/finances/impayes" className="mt-3 text-xs text-brand-blue hover:underline flex items-center gap-1">
            Voir tous les impayés <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color, href }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  color: "blue" | "green" | "red" | "orange" | "violet";
  href: string;
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    green: "bg-emerald-50 border-emerald-200 text-emerald-700",
    red: "bg-red-50 border-red-200 text-red-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
    violet: "bg-violet-50 border-violet-200 text-violet-700",
  };
  return (
    <Link href={href} className={`rounded-xl border p-4 shadow-sm hover:opacity-90 transition ${colors[color]}`}>
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-medium opacity-80">{label}</p>
        <span className="opacity-60">{icon}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-70 mt-0.5">{sub}</p>
    </Link>
  );
}
