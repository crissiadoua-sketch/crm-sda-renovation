/**
 * Alba-ayla IA — Système de sécurité multi-agents
 *
 * Agent Vigil     → surveillance des tentatives de connexion
 * Agent Bouclier  → blocage automatique des IPs suspectes
 * Agent Trace     → journal d'audit de toutes les actions CRM
 * Agent Sentinelle→ détection d'anomalies et génération d'alertes
 * Agent Verrou    → sessions JWT sécurisées (géré dans session.ts)
 */

import "server-only";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

// ---------------------------------------------------------------------------
// Utilitaire — extraction IP réelle
// ---------------------------------------------------------------------------

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    "127.0.0.1"
  );
}

export async function getUserAgent(): Promise<string | undefined> {
  const h = await headers();
  return h.get("user-agent") ?? undefined;
}

// ---------------------------------------------------------------------------
// Agent Bouclier — vérification IP bloquée
// ---------------------------------------------------------------------------

export async function verifierIpBloquee(ip: string): Promise<boolean> {
  const bloc = await prisma.ipBloquer.findUnique({ where: { ip } });
  if (!bloc || !bloc.actif) return false;

  // Si le blocage a une date d'expiration dépassée → débloquer automatiquement
  if (bloc.debloqueAt && new Date() > bloc.debloqueAt) {
    await prisma.ipBloquer.update({ where: { ip }, data: { actif: false } });
    return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Agent Vigil — enregistrement d'une tentative de connexion
// ---------------------------------------------------------------------------

export async function enregistrerTentative(
  email: string,
  ip: string,
  succes: boolean,
  userId?: string,
  userAgent?: string
): Promise<void> {
  await prisma.loginAttempt.create({
    data: { email, ip, succes, userId, userAgent },
  });
}

// ---------------------------------------------------------------------------
// Agent Bouclier — détection brute force + blocage automatique
//
// Règle : 5 échecs depuis la même IP en 15 minutes → blocage 24h
// ---------------------------------------------------------------------------

export async function detecterEtBloquer(ip: string, email: string): Promise<void> {
  const fenetre = new Date(Date.now() - 15 * 60 * 1000); // 15 min

  const echecsCette15min = await prisma.loginAttempt.count({
    where: { ip, succes: false, createdAt: { gte: fenetre } },
  });

  if (echecsCette15min < 5) return;

  // Déjà bloqué ? Mettre à jour le compteur
  const existant = await prisma.ipBloquer.findUnique({ where: { ip } });
  const debloqueAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // +24h

  if (existant) {
    await prisma.ipBloquer.update({
      where: { ip },
      data: {
        actif: true,
        tentatives: existant.tentatives + 1,
        debloqueAt,
        raison: `Brute force détecté — ${echecsCette15min} tentatives en 15 min`,
      },
    });
  } else {
    await prisma.ipBloquer.create({
      data: {
        ip,
        tentatives: echecsCette15min,
        debloqueAt,
        raison: `Brute force détecté — ${echecsCette15min} tentatives en 15 min`,
      },
    });
  }

  // Agent Sentinelle — génère une alerte CRITIQUE
  await creerAlerte({
    type: "BRUTE_FORCE",
    niveau: "CRITIQUE",
    titre: `Attaque brute force détectée depuis ${ip}`,
    details: `${echecsCette15min} tentatives échouées en 15 min sur l'email ${email}. IP bloquée 24h.`,
    ip,
  });
}

// ---------------------------------------------------------------------------
// Agent Trace — journal d'audit
// ---------------------------------------------------------------------------

export async function journaliser(params: {
  userId?: string;
  userName?: string;
  action: string;
  entite?: string;
  entiteId?: string;
  details?: string;
  ip?: string;
  userAgent?: string;
}): Promise<void> {
  await prisma.auditLog.create({ data: params });
}

// ---------------------------------------------------------------------------
// Agent Sentinelle — création d'alertes de sécurité
// ---------------------------------------------------------------------------

export async function creerAlerte(params: {
  type: string;
  niveau?: string;
  titre: string;
  details?: string;
  ip?: string;
  userId?: string;
}): Promise<void> {
  await prisma.alerteSecurite.create({
    data: {
      type: params.type,
      niveau: params.niveau ?? "MOYEN",
      titre: params.titre,
      details: params.details,
      ip: params.ip,
      userId: params.userId,
    },
  });
}

// ---------------------------------------------------------------------------
// Agent Sentinelle — détection connexion inhabituelle
// (horaire nocturne : 23h-5h)
// ---------------------------------------------------------------------------

export async function detecterConnexionInhabituelle(
  userId: string,
  userName: string,
  ip: string
): Promise<void> {
  const heure = new Date().getHours();
  if (heure >= 23 || heure < 5) {
    await creerAlerte({
      type: "CONNEXION_INHABITUELLE",
      niveau: "ELEVE",
      titre: `Connexion nocturne détectée — ${userName}`,
      details: `Connexion à ${new Date().toLocaleTimeString("fr-FR")} depuis IP ${ip}`,
      ip,
      userId,
    });
  }
}
