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

export default async function DashboardPage() {
  const user = await getUser();

  const now = new Date();
  const debutMois = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    chantiersEnCours,
    devisEnAttente,
    facturesImpayees,
    paiementsMois,
    prochainsEvenements,
    ficheInterventionEnCours,
    ncOuvertes,
    ncCritiques,
    bonsTravauxEnCours,
    etudesDS,
    demandesApproEnAttente,
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
    user?.role === "EXPERT_COMPTABLE"
      ? Promise.resolve([])
      : prisma.evenement.findMany({
          where: { dateDebut: { gte: now } },
          orderBy: { dateDebut: "asc" },
          take: 5,
          include: { chantier: { select: { nom: true, reference: true } } },
        }),
    prisma.ficheIntervention.count({
      where: { statut: { in: ["EN_COURS", "BROUILLON"] } },
    }),
    prisma.ficheNonConformite.count({
      where: { statut: { notIn: ["CLOTUREE", "ANNULEE"] } },
    }),
    prisma.ficheNonConformite.count({
      where: { statut: { notIn: ["CLOTUREE", "ANNULEE"] }, gravite: "CRITIQUE" },
    }),
    prisma.bonTravaux.count({
      where: { statut: { in: ["EN_COURS", "EN_ATTENTE"] } },
    }),
    prisma.etudeDebourse.count(),
    prisma.demandeApprovisionnement.count({
      where: { statut: { in: ["BROUILLON", "EN_ATTENTE"] } },
    }),
  ]);

  const totalImpaye = facturesImpayees.reduce(
    (acc, f) => acc + (f.totalTTC - f.montantPaye),
    0,
  );

  const kpis = [
    {
      label: "Chantiers en cours",
      value: chantiersEnCours.toString(),
      href: "/chantiers",
      icon: Building2,
    },
    {
      label: "Devis en attente",
      value: devisEnAttente.toString(),
      href: "/devis",
      icon: FileText,
    },
    {
      label: "Factures impayées",
      value: `${facturesImpayees.length} (${formatEuros(totalImpaye)})`,
      href: "/factures",
      icon: ReceiptEuro,
    },
    {
      label: "Encaissé ce mois",
      value: formatEuros(paiementsMois._sum.montant ?? 0),
      href: "/finances",
      icon: Wallet,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl bg-gradient-to-r from-brand-blue to-brand-blue-dark p-6 text-white shadow-sm">
        <h2 className="text-xl font-bold">
          Bonjour, {user.name.replace(/^(M\.?|Mr|Mme|Mlle|Monsieur|Madame)\s+/i, "").split(" ")[0]} 👋
        </h2>
        <p className="mt-1 text-sm text-white/80">
          Voici un aperçu de l&apos;activité de SDA Rénovation.
        </p>
      </div>

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
                <Icon className="h-5 w-5 text-brand-orange" />
              </div>
              <span className="text-2xl font-bold text-brand-navy">{kpi.value}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Exploitation & Chantiers ── */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Exploitation &amp; Chantiers
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card 1 — Fiches d'intervention */}
          <Link
            href="/exploitation/fiches-intervention"
            className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: "#29ABE220" }}
              >
                <ClipboardCheck className="h-5 w-5" style={{ color: "#29ABE2" }} />
              </div>
              <span className="text-2xl font-black text-slate-800">{ficheInterventionEnCours}</span>
            </div>
            <p className="text-sm font-medium text-slate-600">Interventions en cours</p>
          </Link>

          {/* Card 2 — Non-conformités */}
          <Link
            href="/exploitation/non-conformites"
            className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: ncCritiques > 0 ? "#F7941E20" : "#64748b20" }}
              >
                <ShieldAlert
                  className="h-5 w-5"
                  style={{ color: ncCritiques > 0 ? "#F7941E" : "#64748b" }}
                />
              </div>
              <span className="text-2xl font-black text-slate-800">{ncOuvertes}</span>
            </div>
            <p className="text-sm font-medium text-slate-600">NC ouvertes</p>
            {ncCritiques > 0 && (
              <p className="mt-1 text-xs font-semibold text-red-500">{ncCritiques} critique(s)</p>
            )}
          </Link>

          {/* Card 3 — Bons de travaux */}
          <Link
            href="/exploitation/bons-travaux"
            className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: "#1E2F6E20" }}
              >
                <ClipboardCheck className="h-5 w-5" style={{ color: "#1E2F6E" }} />
              </div>
              <span className="text-2xl font-black text-slate-800">{bonsTravauxEnCours}</span>
            </div>
            <p className="text-sm font-medium text-slate-600">Travaux en cours</p>
          </Link>

          {/* Card 4 — Demandes appro */}
          <Link
            href="/exploitation/demandes-appro"
            className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <ShoppingCart className="h-5 w-5 text-slate-500" />
              </div>
              <span className="text-2xl font-black text-slate-800">{demandesApproEnAttente}</span>
            </div>
            <p className="text-sm font-medium text-slate-600">Appros en attente</p>
          </Link>

          {/* Card 5 — Études déboursés */}
          <Link
            href="/etude-prix/debourses-secs"
            className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
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

      {user?.role !== "EXPERT_COMPTABLE" && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-brand-blue" />
            <h3 className="font-semibold text-brand-navy">Prochains rendez-vous</h3>
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
                      <p className="text-xs text-slate-400">
                        {evt.chantier.reference} — {evt.chantier.nom}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-medium text-brand-blue-dark">
                    {formatDate(evt.dateDebut)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/planning"
            className="mt-3 inline-block text-sm font-medium text-brand-blue hover:underline"
          >
            Voir le planning complet →
          </Link>
        </div>
      )}
    </div>
  );
}
