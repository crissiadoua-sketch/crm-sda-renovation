export const dynamic = "force-dynamic";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, Database, FileWarning, Shield, ShieldCheck, Trash2, Users, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { collecterStatsCRM, declencherSauvegarde, nettoyerDocumentsOrphelins, genererRapportMensuel } from "@/lib/actions/maintenance";
import { LinkButton } from "@/components/ui/button";

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { onglet = "integrite" } = await searchParams;

  const stats = await collecterStatsCRM();
  const { conformite, activiteParUser } = stats;

  const derniereSauvegarde = await prisma.sauvegardeLog.findFirst({
    orderBy: { date: "desc" },
  });

  const dernierRapport = await prisma.rapportMensuel.findFirst({
    orderBy: { createdAt: "desc" },
  });

  const ONGLETS = [
    { id: "integrite", label: "Intégrité des données", icon: Database },
    { id: "processus", label: "Conformité des processus", icon: Shield },
    { id: "activite", label: "Activité par profil", icon: Users },
    { id: "sauvegardes", label: "Sauvegardes", icon: Database },
  ];

  const ROLE_LABELS: Record<string, string> = {
    DIRIGEANT: "Dirigeant",
    ASSISTANT_DIRECTION: "Assist. Direction",
    DAF: "DAF",
    CONDUCTEUR_TRAVAUX: "Conducteur Travaux",
    COMMERCIAL: "Commercial",
    COMPTABLE: "Comptable",
    OUVRIER: "Ouvrier",
    ADMIN: "Admin",
  };

  const scoreConformite =
    conformite.chantiersAnalyses > 0
      ? Math.round(
          ((conformite.chantiersAnalyses - conformite.chantiersNonConformes.length) /
            conformite.chantiersAnalyses) *
            100
        )
      : 100;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">
            Maintenance & Contrôle qualité CRM
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Analyse effectuée le {formatDate(new Date(stats.collecteAt))} · Période :{" "}
            <strong>{stats.periode}</strong>
          </p>
        </div>
        <div className="flex gap-2">
          <LinkButton href="/maintenance/rapports" variant="secondary">
            Rapports mensuels
          </LinkButton>
          <form
            action={async () => {
              "use server";
              await genererRapportMensuel();
            }}
          >
            <button
              type="submit"
              className="rounded-xl bg-brand-orange px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-orange-dark"
            >
              Générer rapport mensuel
            </button>
          </form>
        </div>
      </div>

      {/* KPIs globaux */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div
          className={`rounded-xl border p-4 shadow-sm ${
            stats.stats.documents.doublons > 0
              ? "border-amber-200 bg-amber-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Doublons fichiers
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              stats.stats.documents.doublons > 0 ? "text-amber-700" : "text-emerald-700"
            }`}
          >
            {stats.stats.documents.doublons}
          </p>
        </div>
        <div
          className={`rounded-xl border p-4 shadow-sm ${
            conformite.chantiersNonConformes.length > 0
              ? "border-red-200 bg-red-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Non-conformités
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              conformite.chantiersNonConformes.length > 0
                ? "text-red-700"
                : "text-emerald-700"
            }`}
          >
            {conformite.chantiersNonConformes.length}
          </p>
        </div>
        <div
          className={`rounded-xl border p-4 shadow-sm ${
            stats.stats.factures.enRetard > 0
              ? "border-red-200 bg-red-50"
              : "border-emerald-200 bg-emerald-50"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Factures en retard
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              stats.stats.factures.enRetard > 0 ? "text-red-700" : "text-emerald-700"
            }`}
          >
            {stats.stats.factures.enRetard}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Score processus
          </p>
          <p
            className={`mt-1 text-2xl font-bold ${
              scoreConformite >= 80
                ? "text-emerald-600"
                : scoreConformite >= 60
                ? "text-amber-600"
                : "text-red-600"
            }`}
          >
            {scoreConformite} %
          </p>
        </div>
      </div>

      {/* Navigation par onglets */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
        {ONGLETS.map((o) => {
          const Icon = o.icon;
          return (
            <Link
              key={o.id}
              href={`/maintenance?onglet=${o.id}`}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                onglet === o.id
                  ? "bg-white text-brand-navy shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{o.label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Onglet 1 : Intégrité des données ─────────────────────────────────── */}
      {onglet === "integrite" && (
        <div className="flex flex-col gap-4">
          {/* Doublons */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-brand-navy">Fichiers en doublon</h3>
              {stats.stats.documents.doublons === 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> Aucun doublon
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                  <AlertTriangle className="h-3 w-3" /> {stats.stats.documents.doublons} doublon(s)
                </span>
              )}
            </div>
            {stats.stats.documents.groupesDoublons.length === 0 ? (
              <p className="text-sm text-slate-400">Aucun fichier en doublon détecté.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                      <th className="pb-2">Nom du fichier</th>
                      <th className="pb-2 text-right">Copies</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {stats.stats.documents.groupesDoublons.map((g) => (
                      <tr key={g.nom}>
                        <td className="py-2 text-slate-700">{g.nom}</td>
                        <td className="py-2 text-right font-medium text-amber-600">{g.count}×</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Documents orphelins */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-brand-navy">Documents orphelins</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Documents sans lien vers un client, chantier, devis ou facture
                </p>
              </div>
              {stats.stats.documents.orphelins === 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" /> OK
                </span>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
                    <FileWarning className="h-3 w-3" /> {stats.stats.documents.orphelins} orphelin(s)
                  </span>
                  <form
                    action={async () => {
                      "use server";
                      await nettoyerDocumentsOrphelins();
                    }}
                  >
                    <button
                      type="submit"
                      className="flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition"
                    >
                      <Trash2 className="h-3 w-3" /> Nettoyer
                    </button>
                  </form>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-brand-navy">{stats.stats.documents.total}</p>
                <p className="text-xs text-slate-500">Documents total</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-brand-navy">{stats.stats.documents.orphelins}</p>
                <p className="text-xs text-slate-500">Orphelins</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-brand-navy">{stats.stats.documents.doublons}</p>
                <p className="text-xs text-slate-500">Doublons</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-emerald-600">
                  {stats.stats.documents.total - stats.stats.documents.orphelins - stats.stats.documents.doublons}
                </p>
                <p className="text-xs text-slate-500">Valides</p>
              </div>
            </div>
          </section>

          {/* Alertes globales */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-brand-navy">Alertes données</h3>
            <div className="flex flex-col gap-2">
              {[
                {
                  ok: stats.stats.factures.enRetard === 0,
                  msg: `${stats.stats.factures.enRetard} facture(s) en retard de paiement`,
                  okMsg: "Aucune facture en retard",
                },
                {
                  ok: stats.stats.taches.enRetard === 0,
                  msg: `${stats.stats.taches.enRetard} tâche(s) échue(s) non résolue(s)`,
                  okMsg: "Aucune tâche échue",
                },
                {
                  ok: stats.stats.documents.orphelins === 0,
                  msg: `${stats.stats.documents.orphelins} document(s) orphelin(s)`,
                  okMsg: "Aucun document orphelin",
                },
                {
                  ok: stats.stats.documents.doublons === 0,
                  msg: `${stats.stats.documents.doublons} doublon(s) détecté(s)`,
                  okMsg: "Aucun doublon de fichier",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm ${
                    item.ok
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {item.ok ? (
                    <ShieldCheck className="h-4 w-4 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0" />
                  )}
                  <span>{item.ok ? item.okMsg : item.msg}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Onglet 2 : Conformité des processus ──────────────────────────────── */}
      {onglet === "processus" && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-4 rounded-xl border border-brand-blue/20 bg-brand-blue/5 px-5 py-4">
            <div
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white ${
                scoreConformite >= 80
                  ? "bg-emerald-500"
                  : scoreConformite >= 60
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
            >
              {scoreConformite}%
            </div>
            <div>
              <p className="font-semibold text-brand-navy">Score de conformité des processus</p>
              <p className="text-sm text-slate-500">
                {conformite.chantiersAnalyses - conformite.chantiersNonConformes.length} /{" "}
                {conformite.chantiersAnalyses} chantiers conformes aux processus établis
              </p>
            </div>
          </div>

          {/* Chantiers non conformes */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-brand-navy">Chantiers non conformes</h3>
            {conformite.chantiersNonConformes.length === 0 ? (
              <div className="flex items-center gap-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                Tous les chantiers en cours respectent les processus établis.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {conformite.chantiersNonConformes.map((c, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-red-100 bg-red-50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <p className="font-medium text-red-800">{c.nom}</p>
                      <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        {c.statut}
                      </span>
                    </div>
                    <ul className="mt-2 flex flex-col gap-1">
                      {c.problemes.map((p, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-red-700">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Processus BTP standard */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-brand-navy">Processus établis par le Dirigeant</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-2 text-left">Étape</th>
                    <th className="pb-2 text-left">Service responsable</th>
                    <th className="pb-2 text-left">Déclencheur</th>
                    <th className="pb-2 text-left">Document attendu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {[
                    ["1. Prospection", "Commercial", "Prospect reçu", "Fiche client + Devis"],
                    ["2. Devis accepté", "Commercial", "Signature client", "Contrat ST si sous-traitants"],
                    ["3. Ouverture chantier", "Conducteur Travaux", "Statut EN_COURS", "Planning + Ordre de mission"],
                    ["4. Facturation acompte", "Comptable", "Démarrage travaux", "Facture d'acompte"],
                    ["5. Situations d'avancement", "Comptable", "Avancement >30%", "Facture de situation"],
                    ["6. Réception", "Conducteur Travaux", "Fin travaux", "PV de réception"],
                    ["7. Solde", "Comptable", "PV signé", "Facture de solde"],
                    ["8. Clôture dossier", "Assistant Direction", "Facture payée", "Checklist 100%"],
                  ].map(([etape, service, declencheur, doc]) => (
                    <tr key={etape}>
                      <td className="py-2 font-medium text-brand-navy">{etape}</td>
                      <td className="py-2">{service}</td>
                      <td className="py-2 text-slate-500">{declencheur}</td>
                      <td className="py-2">{doc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ── Onglet 3 : Activité par profil ───────────────────────────────────── */}
      {onglet === "activite" && (
        <div className="flex flex-col gap-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-brand-navy">Activité par profil utilisateur</h3>
            <p className="mb-4 text-xs text-slate-400">
              Basé sur les tâches internes (gestion des tâches CRM). Pour une analyse complète, générez le rapport mensuel Alba-Ayla.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <th className="pb-2 text-left">Utilisateur</th>
                    <th className="pb-2 text-left">Rôle</th>
                    <th className="pb-2 text-right">Tâches créées</th>
                    <th className="pb-2 text-right">Terminées</th>
                    <th className="pb-2 text-right">En cours</th>
                    <th className="pb-2 text-right">En retard</th>
                    <th className="pb-2 text-right">Taux réalisation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {activiteParUser.map((u) => {
                    const total = u.tachesTerminees + u.tachesEnCours + u.tachesEnRetard;
                    const taux = total > 0 ? Math.round((u.tachesTerminees / total) * 100) : 100;
                    return (
                      <tr key={u.id}>
                        <td className="py-2 font-medium text-slate-700">{u.name}</td>
                        <td className="py-2 text-slate-500">
                          {ROLE_LABELS[u.role] ?? u.role}
                        </td>
                        <td className="py-2 text-right">{u.tachesCrees}</td>
                        <td className="py-2 text-right font-medium text-emerald-600">
                          {u.tachesTerminees}
                        </td>
                        <td className="py-2 text-right text-amber-600">{u.tachesEnCours}</td>
                        <td className="py-2 text-right font-medium text-red-600">
                          {u.tachesEnRetard}
                        </td>
                        <td className="py-2 text-right">
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                              taux >= 80
                                ? "bg-emerald-100 text-emerald-700"
                                : taux >= 50
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {taux} %
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Stats CRM globales */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-brand-navy">Statistiques CRM — période {stats.periode}</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Clients actifs", val: stats.stats.clients.actifs, total: stats.stats.clients.total },
                { label: "Chantiers en cours", val: stats.stats.chantiers.enCours, total: stats.stats.chantiers.total },
                { label: "Devis du mois", val: stats.stats.devis.mois },
                { label: "Factures du mois", val: stats.stats.factures.mois },
                { label: "Tâches créées", val: stats.stats.taches.total },
                { label: "Tâches terminées", val: stats.stats.taches.terminees },
                { label: "Documents", val: stats.stats.documents.total },
                { label: "Achats du mois", val: stats.stats.achats.bonsCommandeMois },
              ].map((item, i) => (
                <div key={i} className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xl font-bold text-brand-navy">
                    {item.val}
                    {item.total !== undefined && (
                      <span className="text-sm font-normal text-slate-400">/{item.total}</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{item.label}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Onglet 4 : Sauvegardes ───────────────────────────────────────────── */}
      {onglet === "sauvegardes" && (
        <div className="flex flex-col gap-4">
          {/* Statut dernière sauvegarde */}
          <div
            className={`flex items-center justify-between rounded-xl border p-5 ${
              !derniereSauvegarde
                ? "border-amber-200 bg-amber-50"
                : derniereSauvegarde.statut === "OK"
                ? "border-emerald-200 bg-emerald-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <div className="flex items-center gap-3">
              {!derniereSauvegarde ? (
                <AlertTriangle className="h-6 w-6 text-amber-500" />
              ) : derniereSauvegarde.statut === "OK" ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <XCircle className="h-6 w-6 text-red-500" />
              )}
              <div>
                <p className="font-semibold text-slate-700">
                  {!derniereSauvegarde
                    ? "Aucune sauvegarde effectuée"
                    : `Dernière sauvegarde : ${formatDate(derniereSauvegarde.date)}`}
                </p>
                {derniereSauvegarde && (
                  <p className="text-xs text-slate-500">
                    {derniereSauvegarde.tailleMo} Mo · {derniereSauvegarde.destination.split(/[/\\]/).pop()}
                  </p>
                )}
              </div>
            </div>
            <form
              action={async () => {
                "use server";
                await declencherSauvegarde();
              }}
            >
              <button
                type="submit"
                className="rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue-dark"
              >
                Sauvegarder maintenant
              </button>
            </form>
          </div>

          {/* Informations sauvegarde automatique */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-brand-navy">Sauvegarde automatique (toutes les 30 min)</h3>
            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p className="font-medium text-brand-navy mb-2">
                📁 Votre base de données est automatiquement synchronisée sur OneDrive
              </p>
              <p className="mb-3 text-xs text-slate-500">
                Le projet est hébergé dans <code className="bg-slate-200 px-1 rounded">OneDrive\Bureau\CRM SDA Rénovation</code>.
                OneDrive synchronise automatiquement tous les fichiers, y compris la base de données SQLite.
              </p>
              <p className="font-medium text-slate-700 mb-1">Pour activer la sauvegarde automatique toutes les 30 min :</p>
              <ol className="ml-4 list-decimal space-y-1 text-xs">
                <li>Ouvrir le <strong>Planificateur de tâches Windows</strong> (rechercher "Planificateur" dans le menu Démarrer)</li>
                <li>Créer une tâche de base → Nom : "CRM SDA Backup"</li>
                <li>Déclencheur : Toutes les 30 minutes</li>
                <li>
                  Action : Démarrer un programme →{" "}
                  <code className="bg-slate-200 px-1 rounded">powershell.exe</code> avec l'argument :{" "}
                  <code className="bg-slate-200 px-1 rounded">-File "C:\Users\Utilisateur\OneDrive\Bureau\CRM SDA Rénovation\scripts\backup-crm.ps1"</code>
                </li>
              </ol>
            </div>
          </section>

          {/* Historique */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 font-semibold text-brand-navy">Historique des sauvegardes</h3>
            <SauvegardeHistorique />
          </section>
        </div>
      )}
    </div>
  );
}

async function SauvegardeHistorique() {
  const logs = await prisma.sauvegardeLog.findMany({
    orderBy: { date: "desc" },
    take: 20,
  });

  if (logs.length === 0) {
    return <p className="text-sm text-slate-400">Aucune sauvegarde enregistrée.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <th className="pb-2 text-left">Date</th>
            <th className="pb-2 text-left">Type</th>
            <th className="pb-2 text-left">Fichier</th>
            <th className="pb-2 text-right">Taille</th>
            <th className="pb-2 text-right">Statut</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="py-2 text-slate-700">{new Date(log.date).toLocaleString("fr-FR")}</td>
              <td className="py-2">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                  {log.type}
                </span>
              </td>
              <td className="py-2 font-mono text-xs text-slate-500">
                {log.destination.split(/[/\\]/).pop()}
              </td>
              <td className="py-2 text-right text-slate-500">
                {log.tailleMo != null ? `${log.tailleMo} Mo` : "—"}
              </td>
              <td className="py-2 text-right">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    log.statut === "OK"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {log.statut}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
