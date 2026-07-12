export const dynamic = "force-dynamic";

import Link from "next/link";
import {
  Building2,
  FileText,
  ReceiptEuro,
  Wallet,
  CalendarClock,
  ClipboardCheck,
  ShieldAlert,
  ShoppingCart,
  Calculator,
  AlertTriangle,
  TrendingUp,
  Clock,
  Zap,
  Users,
  Package,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";

function formatEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatDateShort(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(date);
}

export default async function DashboardPage() {
  const user = await getUser();

  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);
  const debutMoisPrecedent = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const finMoisPrecedent = new Date(now.getFullYear(), now.getMonth(), 0);
  const dans7j = new Date(now.getTime() + 7 * 86400000);
  const isComptable = user?.role === "EXPERT_COMPTABLE";

  const [
    chantiersEnCours,
    devisEnAttente,
    facturesImpayees,
    paiementsMois,
    paiementsMoisPrecedent,
    prochainsEvenements,
    ficheInterventionEnCours,
    ncOuvertes,
    ncCritiques,
    bonsTravauxEnCours,
    etudesDS,
    demandesApproEnAttente,
    // Alertes urgentes
    facturesEnRetard,
    devisExpirantBientot,
    bcConfirmesNonRecus,
    tachesEnRetard,
    retenuesALiberer,
  ] = await Promise.all([
    prisma.chantier.count({ where: { statut: "EN_COURS" } }),
    prisma.devis.count({ where: { statut: "ENVOYE" } }),
    prisma.facture.findMany({
      where: { statut: { in: ["ENVOYEE", "PAYEE_PARTIELLE", "EN_RETARD"] } },
      select: { totalTTC: true, montantPaye: true },
    }),
    prisma.paiement.aggregate({
      where: { date: { gte: debutMois } },
      _sum: { montant: true },
    }),
    prisma.paiement.aggregate({
      where: { date: { gte: debutMoisPrecedent, lte: finMoisPrecedent } },
      _sum: { montant: true },
    }),
    isComptable
      ? Promise.resolve([])
      : prisma.evenement.findMany({
          where: { dateDebut: { gte: now } },
          orderBy: { dateDebut: "asc" },
          take: 5,
          include: { chantier: { select: { id: true, nom: true, reference: true } } },
        }),
    isComptable ? Promise.resolve(0) : prisma.ficheIntervention.count({ where: { statut: { in: ["EN_COURS", "BROUILLON"] } } }),
    isComptable ? Promise.resolve(0) : prisma.ficheNonConformite.count({ where: { statut: { notIn: ["CLOTUREE", "ANNULEE"] } } }),
    isComptable ? Promise.resolve(0) : prisma.ficheNonConformite.count({ where: { statut: { notIn: ["CLOTUREE", "ANNULEE"] }, gravite: "CRITIQUE" } }),
    isComptable ? Promise.resolve(0) : prisma.bonTravaux.count({ where: { statut: { in: ["EN_COURS", "EN_ATTENTE"] } } }),
    isComptable ? Promise.resolve(0) : prisma.etudeDebourse.count(),
    isComptable ? Promise.resolve(0) : prisma.demandeApprovisionnement.count({ where: { statut: { in: ["BROUILLON", "EN_ATTENTE"] } } }),
    // Alertes
    prisma.facture.findMany({
      where: { statut: "EN_RETARD" },
      select: { id: true, numero: true, totalTTC: true, montantPaye: true, dateEcheance: true, client: { select: { nom: true, raisonSociale: true, prenom: true } } },
      orderBy: { dateEcheance: "asc" },
      take: 5,
    }),
    prisma.devis.findMany({
      where: { statut: "ENVOYE", dateValidite: { gte: now, lte: dans7j } },
      select: { id: true, numero: true, totalTTC: true, dateValidite: true, client: { select: { nom: true, prenom: true, raisonSociale: true } } },
      orderBy: { dateValidite: "asc" },
      take: 5,
    }),
    isComptable ? Promise.resolve(0) : prisma.bonCommande.count({
      where: { statut: "CONFIRME", updatedAt: { lte: new Date(now.getTime() - 14 * 86400000) } },
    }),
    isComptable ? Promise.resolve(0) : prisma.tache.count({
      where: { statut: { in: ["A_FAIRE", "EN_COURS"] }, dateEcheance: { lt: now } },
    }).catch(() => 0),
    // Contrats sous-traitance avec retenue de garantie (non annulés)
    prisma.contratSousTraitance.findMany({
      where: { retenueGarantie: { gt: 0 }, statut: { notIn: ["ANNULE", "RESILIE"] } },
      select: { id: true, numero: true, retenueGarantie: true, sousTraitant: { select: { nom: true } }, chantier: { select: { nom: true } } },
      take: 3,
      orderBy: { createdAt: "asc" },
    }).catch(() => []),
  ]);

  const totalImpaye = facturesImpayees.reduce((acc, f) => acc + (f.totalTTC - f.montantPaye), 0);
  const encaisseMois = paiementsMois._sum.montant ?? 0;
  const encaisseMoisPrec = paiementsMoisPrecedent._sum.montant ?? 0;
  const evolutionMensuelle = encaisseMoisPrec > 0 ? ((encaisseMois - encaisseMoisPrec) / encaisseMoisPrec) * 100 : null;

  const nbAlertes = facturesEnRetard.length + devisExpirantBientot.length + retenuesALiberer.length;

  const kpis = [
    { label: "Chantiers en cours", value: chantiersEnCours.toString(), href: "/chantiers?statut=EN_COURS", icon: Building2, color: "text-brand-blue" },
    { label: "Devis en attente", value: devisEnAttente.toString(), href: "/devis?statut=ENVOYE", icon: FileText, color: "text-violet-600" },
    { label: "À encaisser", value: formatEuros(totalImpaye), href: "/factures?statut=ENVOYEE", icon: ReceiptEuro, color: "text-brand-orange" },
    { label: "Encaissé ce mois", value: formatEuros(encaisseMois), href: "/finances", icon: Wallet, color: "text-green-600", sub: evolutionMensuelle !== null ? `${evolutionMensuelle >= 0 ? "+" : ""}${evolutionMensuelle.toFixed(0)}% vs mois préc.` : undefined },
  ];

  const clientDisplayName = (c: { nom: string; prenom?: string | null; raisonSociale?: string | null } | null) => {
    if (!c) return "—";
    return c.raisonSociale || (c.prenom ? `${c.prenom} ${c.nom}` : c.nom);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-blue to-brand-blue-dark p-6 text-white shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">
              Bonjour, {user.name.replace(/^(M\.?|Mr|Mme|Mlle|Monsieur|Madame)\s+/i, "").split(" ")[0]} 👋
            </h2>
            <p className="mt-1 text-sm text-white/80">
              Tableau de bord SDA Rénovation · {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          {nbAlertes > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold">
              <AlertTriangle className="h-4 w-4 text-yellow-300" />
              {nbAlertes} alerte{nbAlertes > 1 ? "s" : ""} à traiter
            </div>
          )}
        </div>
      </div>

      {/* KPIs principaux */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link
              key={kpi.label}
              href={kpi.href}
              className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-blue/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500">{kpi.label}</span>
                <Icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <span className="text-2xl font-bold text-brand-navy">{kpi.value}</span>
              {kpi.sub && (
                <span className={`text-xs font-medium ${kpi.sub.startsWith("+") ? "text-green-600" : "text-red-500"}`}>{kpi.sub}</span>
              )}
            </Link>
          );
        })}
      </div>

      {/* ── ALERTES URGENTES ── */}
      {(facturesEnRetard.length > 0 || devisExpirantBientot.length > 0 || retenuesALiberer.length > 0 || (bcConfirmesNonRecus as number) > 0 || (tachesEnRetard as number) > 0) && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-red-800">Alertes urgentes</h3>
          </div>
          <div className="flex flex-col gap-3">

            {/* Factures EN_RETARD */}
            {facturesEnRetard.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-red-600">
                  {facturesEnRetard.length} facture{facturesEnRetard.length > 1 ? "s" : ""} en retard de paiement
                </p>
                <div className="flex flex-col gap-1">
                  {facturesEnRetard.map((f) => (
                    <Link key={f.id} href={`/factures/${f.id}`}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-red-50 border border-red-100">
                      <span className="font-medium text-slate-700">{f.numero} · {clientDisplayName(f.client as Parameters<typeof clientDisplayName>[0])}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-red-600">{formatEuros(f.totalTTC - f.montantPaye)}</span>
                        {f.dateEcheance && <span className="text-xs text-slate-400">éch. {formatDateShort(f.dateEcheance)}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Devis expirant dans 7 jours */}
            {devisExpirantBientot.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-amber-600">
                  {devisExpirantBientot.length} devis expire{devisExpirantBientot.length > 1 ? "nt" : ""} dans moins de 7 jours
                </p>
                <div className="flex flex-col gap-1">
                  {devisExpirantBientot.map((d) => (
                    <Link key={d.id} href={`/devis/${d.id}`}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-amber-50 border border-amber-100">
                      <span className="font-medium text-slate-700">{d.numero} · {clientDisplayName(d.client as Parameters<typeof clientDisplayName>[0])}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-slate-700">{formatEuros(d.totalTTC)}</span>
                        {d.dateValidite && <span className="text-xs font-semibold text-amber-600">exp. {formatDateShort(d.dateValidite)}</span>}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Retenues à libérer */}
            {retenuesALiberer.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-blue-600">
                  Retenues de garantie ST à libérer ({retenuesALiberer.length})
                </p>
                <div className="flex flex-col gap-1">
                  {retenuesALiberer.map((r) => (
                    <Link key={r.id} href={`/contrats-sous-traitance/${r.id}`}
                      className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm hover:bg-blue-50 border border-blue-100">
                      <span className="font-medium text-slate-700">
                        {r.numero} · {r.sousTraitant?.nom ?? "—"}{r.chantier ? ` — ${r.chantier.nom}` : ""}
                      </span>
                      <span className="font-bold text-blue-700">{formatEuros(r.retenueGarantie ?? 0)} retenue</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* BC non reçus */}
            {(bcConfirmesNonRecus as number) > 0 && (
              <Link href="/bons-commande?statut=CONFIRME"
                className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm border border-amber-100 hover:bg-amber-50">
                <Package className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-slate-700">{bcConfirmesNonRecus} BC confirmé{(bcConfirmesNonRecus as number) > 1 ? "s" : ""} en attente de réception depuis &gt;14 jours</span>
              </Link>
            )}

            {/* Tâches en retard */}
            {(tachesEnRetard as number) > 0 && (
              <Link href="/taches"
                className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 text-sm border border-red-100 hover:bg-red-50">
                <Clock className="h-4 w-4 text-red-400" />
                <span className="font-medium text-slate-700">{tachesEnRetard} tâche{(tachesEnRetard as number) > 1 ? "s" : ""} en retard</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ── ACTIONS RAPIDES ── */}
      {!isComptable && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-orange" />
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Actions rapides</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "Nouveau devis", href: "/devis/nouveau", color: "bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100" },
              { label: "Nouvelle facture", href: "/factures/nouveau", color: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100" },
              { label: "Nouveau chantier", href: "/chantiers/nouveau", color: "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100" },
              { label: "Nouveau BC", href: "/bons-commande", color: "bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100" },
              { label: "Nouvelle tâche", href: "/taches/nouveau", color: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100" },
              { label: "Nouveau client", href: "/clients/nouveau", color: "bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100" },
            ].map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className={`flex items-center justify-center rounded-xl border px-3 py-3 text-center text-sm font-semibold transition ${action.color}`}
              >
                {action.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Exploitation & Chantiers ── */}
      {!isComptable && (
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Exploitation &amp; Chantiers
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <Link href="/exploitation/fiches-intervention"
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "#29ABE220" }}>
                  <ClipboardCheck className="h-5 w-5" style={{ color: "#29ABE2" }} />
                </div>
                <span className="text-2xl font-black text-slate-800">{ficheInterventionEnCours}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">Interventions en cours</p>
            </Link>

            <Link href="/exploitation/non-conformites"
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: ncCritiques > 0 ? "#F7941E20" : "#64748b20" }}>
                  <ShieldAlert className="h-5 w-5" style={{ color: ncCritiques > 0 ? "#F7941E" : "#64748b" }} />
                </div>
                <span className="text-2xl font-black text-slate-800">{ncOuvertes}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">NC ouvertes</p>
              {ncCritiques > 0 && <p className="mt-1 text-xs font-semibold text-red-500">{ncCritiques} critique(s)</p>}
            </Link>

            <Link href="/exploitation/bons-travaux"
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "#1E2F6E20" }}>
                  <ClipboardCheck className="h-5 w-5" style={{ color: "#1E2F6E" }} />
                </div>
                <span className="text-2xl font-black text-slate-800">{bonsTravauxEnCours}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">Travaux en cours</p>
            </Link>

            <Link href="/exploitation/demandes-appro"
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <ShoppingCart className="h-5 w-5 text-slate-500" />
                </div>
                <span className="text-2xl font-black text-slate-800">{demandesApproEnAttente}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">Appros en attente</p>
            </Link>

            <Link href="/etude-prix/debourses-secs"
              className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                  <Calculator className="h-5 w-5 text-slate-500" />
                </div>
                <span className="text-2xl font-black text-slate-800">{etudesDS}</span>
              </div>
              <p className="text-sm font-medium text-slate-600">Études déboursés</p>
            </Link>
          </div>
        </div>
      )}

      {/* ── Prochains rendez-vous ── */}
      {!isComptable && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-brand-blue" />
              <h3 className="font-semibold text-brand-navy">Prochains rendez-vous</h3>
            </div>
            <Link href="/planning" className="text-xs font-medium text-brand-blue hover:underline">Planning complet →</Link>
          </div>
          {prochainsEvenements.length === 0 ? (
            <p className="text-sm text-slate-500">Aucun événement à venir.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {prochainsEvenements.map((evt) => (
                <li key={evt.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <p className="font-medium text-slate-700">{evt.titre}</p>
                    {evt.chantier && (
                      <Link href={`/chantiers/${evt.chantier.id}`} className="text-xs text-brand-blue hover:underline">
                        {evt.chantier.reference} — {evt.chantier.nom}
                      </Link>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-medium text-brand-blue-dark">
                    {formatDate(evt.dateDebut)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Performance mensuelle ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Link href="/factures?statut=EN_RETARD"
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-blue/30 transition">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <TrendingUp className="h-5 w-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Factures EN RETARD</p>
            <p className="text-lg font-bold text-red-600">{facturesEnRetard.length}</p>
          </div>
        </Link>
        <Link href="/rh"
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-blue/30 transition">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-blue/10">
            <Users className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Ressources humaines</p>
            <p className="text-sm font-semibold text-brand-navy">Gérer l&apos;équipe →</p>
          </div>
        </Link>
        <Link href="/comptabilite/rapprochement"
          className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-blue/30 transition">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
            <Wallet className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-slate-400">Rapprochement bancaire</p>
            <p className="text-sm font-semibold text-brand-navy">Vérifier les comptes →</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
