export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import {
  Shield, ShieldAlert, ShieldCheck, Eye, Lock,
  Activity, AlertTriangle, Ban, FileText, Zap,
  CheckCircle, XCircle, Clock,
} from "lucide-react";
import { BoutonDebloquerIp, BoutonResolveAlerte, BoutonNettoyage } from "./securite-actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function niveauBadge(niveau: string) {
  const map: Record<string, string> = {
    FAIBLE:   "bg-blue-100 text-blue-700 border-blue-200",
    MOYEN:    "bg-amber-100 text-amber-700 border-amber-200",
    ELEVE:    "bg-orange-100 text-orange-700 border-orange-200",
    CRITIQUE: "bg-red-100 text-red-700 border-red-200",
  };
  return map[niveau] ?? "bg-slate-100 text-slate-600 border-slate-200";
}

function niveauLabel(niveau: string) {
  return { FAIBLE: "Faible", MOYEN: "Moyen", ELEVE: "Élevé", CRITIQUE: "Critique" }[niveau] ?? niveau;
}

function actionBadge(action: string) {
  const map: Record<string, string> = {
    LOGIN:         "bg-emerald-100 text-emerald-700",
    LOGOUT:        "bg-slate-100 text-slate-600",
    CREATE:        "bg-blue-100 text-blue-700",
    UPDATE:        "bg-amber-100 text-amber-700",
    DELETE:        "bg-red-100 text-red-700",
    EXPORT:        "bg-purple-100 text-purple-700",
    UPLOAD:        "bg-indigo-100 text-indigo-700",
    ACCES_REFUSE:  "bg-red-100 text-red-800",
  };
  return map[action] ?? "bg-slate-100 text-slate-600";
}

function formatDt(date: Date) {
  return new Date(date).toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

// ---------------------------------------------------------------------------
// Agents — définitions
// ---------------------------------------------------------------------------

const AGENTS = [
  {
    id: "vigil",
    nom: "Agent Vigil",
    role: "Surveillance des connexions",
    description: "Enregistre chaque tentative de connexion — email, IP, horodatage, résultat. Mémoire complète de tous les accès.",
    icon: Eye,
    couleur: "from-sky-500 to-blue-600",
  },
  {
    id: "bouclier",
    nom: "Agent Bouclier",
    role: "Anti-intrusion",
    description: "Bloque automatiquement les IPs après 5 tentatives échouées en 15 minutes. Protection active contre le brute force.",
    icon: Shield,
    couleur: "from-brand-blue to-brand-navy",
  },
  {
    id: "trace",
    nom: "Agent Trace",
    role: "Audit complet",
    description: "Journalise chaque action CRM : création, modification, suppression, export. Qui, quoi, quand, depuis où.",
    icon: FileText,
    couleur: "from-violet-500 to-purple-700",
  },
  {
    id: "sentinelle",
    nom: "Agent Sentinelle",
    role: "Détection d'anomalies",
    description: "Analyse les patterns suspects : brute force, connexion nocturne, IP inconnue. Génère des alertes classifiées FAIBLE → CRITIQUE.",
    icon: AlertTriangle,
    couleur: "from-orange-500 to-red-600",
  },
  {
    id: "verrou",
    nom: "Agent Verrou",
    role: "Sessions sécurisées",
    description: "Sessions JWT signées HS256, cookie HTTPOnly, SameSite=Lax. Expiration 7 jours. Renouvellement de mot de passe forcé pour experts.",
    icon: Lock,
    couleur: "from-emerald-500 to-teal-600",
  },
];

// ---------------------------------------------------------------------------
// Page principale
// ---------------------------------------------------------------------------

export default async function SecuritePage() {
  const now = new Date();
  const debutJour = new Date(now);
  debutJour.setHours(0, 0, 0, 0);

  // Stats globales
  const [
    tentativesTotal,
    tentativesEchouees,
    tentativesReussies,
    ipsBloquees,
    alertesActives,
    auditLogsAujourdhui,

    // Données pour les tables
    dernieresTentatives,
    ipsBloqueesList,
    derniersAuditLogs,
    alertesActiveListe,
  ] = await Promise.all([
    prisma.loginAttempt.count(),
    prisma.loginAttempt.count({ where: { succes: false } }),
    prisma.loginAttempt.count({ where: { succes: true } }),
    prisma.ipBloquer.count({ where: { actif: true } }),
    prisma.alerteSecurite.count({ where: { resolue: false } }),
    prisma.auditLog.count({ where: { createdAt: { gte: debutJour } } }),

    prisma.loginAttempt.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.ipBloquer.findMany({
      where: { actif: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.alerteSecurite.findMany({
      where: { resolue: false },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const tauxEchec = tentativesTotal > 0
    ? Math.round((tentativesEchouees / tentativesTotal) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6">

      {/* ── En-tête Alba-ayla IA ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-brand-navy via-[#1B3F94] to-brand-blue px-6 py-6 shadow-xl">
        {/* Fond décoratif */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 50%, #fff 1px, transparent 1px)", backgroundSize: "30px 30px" }}
        />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Alba-ayla IA
                </h1>
                <p className="text-sm font-medium text-blue-200">
                  Système de sécurité intelligent — CRM SDA Rénovation
                </p>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-blue-100">
              5 agents IA opèrent en continu pour protéger le CRM contre toute intrusion.
              Surveillance temps réel, détection automatique, blocage immédiat.
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-end gap-2">
            <div className="flex items-center gap-2 rounded-full bg-emerald-400/20 px-3 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-400/30">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              SYSTÈME ACTIF — 5/5 AGENTS EN LIGNE
            </div>
            <BoutonNettoyage />
          </div>
        </div>
      </div>

      {/* ── Grille des 5 agents ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          return (
            <div key={agent.id} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className={`bg-gradient-to-r ${agent.couleur} px-4 py-3`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-white" />
                    <span className="text-xs font-bold text-white">{agent.nom}</span>
                  </div>
                  <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                    ACTIF
                  </span>
                </div>
                <p className="mt-1 text-[10px] font-medium text-white/80">{agent.role}</p>
              </div>
              <div className="px-3 py-2.5">
                <p className="text-[11px] text-slate-500 leading-relaxed">{agent.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100">
              <Ban className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-brand-navy">{ipsBloquees}</p>
              <p className="text-xs text-slate-500">IPs bloquées actives</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
              <ShieldAlert className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-brand-navy">{alertesActives}</p>
              <p className="text-xs text-slate-500">Alertes non résolues</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-brand-navy">{tentativesTotal}</p>
              <p className="text-xs text-slate-500">
                Tentatives connexion ({tauxEchec}% échec)
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-black text-brand-navy">{auditLogsAujourdhui}</p>
              <p className="text-xs text-slate-500">Actions auditées aujourd'hui</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* ── Alertes actives ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <h3 className="font-semibold text-brand-navy text-sm">Alertes Agent Sentinelle</h3>
            </div>
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
              {alertesActiveListe.length}
            </span>
          </div>
          {alertesActiveListe.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <ShieldCheck className="mb-2 h-10 w-10 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-600">Aucune alerte active</p>
              <p className="text-xs text-slate-400">Le CRM est sécurisé</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alertesActiveListe.map((alerte) => (
                <div key={alerte.id} className="flex items-start gap-3 px-4 py-3">
                  <div className={`mt-0.5 rounded border px-1.5 py-0.5 text-[10px] font-bold ${niveauBadge(alerte.niveau)}`}>
                    {niveauLabel(alerte.niveau)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{alerte.titre}</p>
                    {alerte.details && (
                      <p className="text-xs text-slate-500 truncate">{alerte.details}</p>
                    )}
                    <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatDt(alerte.createdAt)}
                      {alerte.ip && <> · IP {alerte.ip}</>}
                    </p>
                  </div>
                  <BoutonResolveAlerte id={alerte.id} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── IPs bloquées ── */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <Ban className="h-4 w-4 text-red-500" />
              <h3 className="font-semibold text-brand-navy text-sm">IPs bloquées — Agent Bouclier</h3>
            </div>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
              {ipsBloqueesList.length}
            </span>
          </div>
          {ipsBloqueesList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10">
              <ShieldCheck className="mb-2 h-10 w-10 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-600">Aucune IP bloquée</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">IP</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Tentatives</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Bloquée le</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Jusqu'au</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {ipsBloqueesList.map((bloc) => (
                    <tr key={bloc.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs font-bold text-red-700">{bloc.ip}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">
                          {bloc.tentatives}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{formatDt(bloc.createdAt)}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">
                        {bloc.debloqueAt ? formatDt(bloc.debloqueAt) : "∞"}
                      </td>
                      <td className="px-4 py-2.5">
                        <BoutonDebloquerIp id={bloc.id} ip={bloc.ip} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Tentatives de connexion ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-sky-500" />
            <h3 className="font-semibold text-brand-navy text-sm">
              Tentatives de connexion — Agent Vigil
            </h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> {tentativesReussies} réussies
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3.5 w-3.5 text-red-500" /> {tentativesEchouees} échouées
            </span>
          </div>
        </div>
        {dernieresTentatives.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Aucune tentative enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Résultat</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Email</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">IP</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Horodatage</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Navigateur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {dernieresTentatives.map((t) => (
                  <tr key={t.id} className={`hover:bg-slate-50 ${!t.succes ? "bg-red-50/30" : ""}`}>
                    <td className="px-4 py-2.5">
                      {t.succes
                        ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700"><CheckCircle className="h-3 w-3" /> Succès</span>
                        : <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700"><XCircle className="h-3 w-3" /> Échec</span>
                      }
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-700">{t.email}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{t.ip}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{formatDt(t.createdAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400 max-w-48 truncate" title={t.userAgent ?? ""}>
                      {t.userAgent?.split(" ").slice(-1)[0] ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Journal d'audit ── */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center border-b border-slate-100 px-4 py-3 gap-2">
          <FileText className="h-4 w-4 text-violet-500" />
          <h3 className="font-semibold text-brand-navy text-sm">Journal d'audit — Agent Trace</h3>
          <span className="ml-auto text-xs text-slate-400">30 dernières actions</span>
        </div>
        {derniersAuditLogs.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Aucune action enregistrée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Action</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Utilisateur</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Entité</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Détails</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">IP</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-slate-500">Horodatage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {derniersAuditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${actionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{log.userName ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{log.entite ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500 max-w-52 truncate" title={log.details ?? ""}>{log.details ?? "—"}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-400">{log.ip ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{formatDt(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
