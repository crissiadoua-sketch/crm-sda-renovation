"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createSession, deleteSession } from "@/lib/session";
import { getDefaultPermissions, isFullAccessRole } from "@/lib/permissions";
import {
  getClientIp,
  getUserAgent,
  verifierIpBloquee,
  enregistrerTentative,
  detecterEtBloquer,
  journaliser,
  detecterConnexionInhabituelle,
} from "@/lib/securite";

const loginSchema = z.object({
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(1, "Le mot de passe est requis."),
});

export type LoginState = {
  errors?: {
    email?: string[];
    password?: string[];
    global?: string[];
  };
} | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const ip = await getClientIp();
  const ua = await getUserAgent();

  // Agent Bouclier — vérifier si l'IP est bloquée
  const bloquee = await verifierIpBloquee(ip);
  if (bloquee) {
    return {
      errors: {
        global: [
          "Accès temporairement bloqué suite à trop de tentatives échouées. Réessayez dans 24h ou contactez l'administrateur.",
        ],
      },
    };
  }

  const password = (formData.get("password") as string) ?? "";

  // Déterminer le mode de connexion : prénom+nom ou email
  const prenom = (formData.get("prenom") as string | null)?.trim();
  const nom = (formData.get("nom") as string | null)?.trim();
  const usingNameLogin = !!(prenom && nom);

  let user: Awaited<ReturnType<typeof prisma.user.findFirst>> = null;
  let identifier: string;

  if (usingNameLogin) {
    if (!password) {
      return { errors: { password: ["Le mot de passe est requis."] } };
    }
    identifier = `${prenom} ${nom}`;
    // Recherche flexible : le name contient à la fois le prénom ET le nom,
    // quel que soit l'ordre ou la casse (ex. "Christopher Siadoua" ou "SIADOUA Christopher")
    user = await prisma.user.findFirst({
      where: {
        AND: [
          { name: { contains: prenom, mode: "insensitive" } },
          { name: { contains: nom,    mode: "insensitive" } },
        ],
      },
    });
  } else {
    const validated = loginSchema.safeParse({
      email: formData.get("email"),
      password,
    });
    if (!validated.success) {
      return { errors: validated.error.flatten().fieldErrors };
    }
    identifier = validated.data.email;
    user = await prisma.user.findUnique({ where: { email: identifier } });
  }

  if (!user) {
    // Agent Vigil — log tentative échouée (identifiant inconnu)
    await enregistrerTentative(identifier, ip, false, undefined, ua);
    await detecterEtBloquer(ip, identifier);
    return { errors: { global: ["Identifiants incorrects."] } };
  }

  const passwordMatch = await bcrypt.compare(password, user.password);

  if (!passwordMatch) {
    // Agent Vigil — log tentative échouée (mauvais mot de passe)
    await enregistrerTentative(identifier, ip, false, user.id, ua);
    await detecterEtBloquer(ip, identifier);
    return { errors: { global: ["Identifiants incorrects."] } };
  }

  // Agent Vigil — log connexion réussie
  await enregistrerTentative(identifier, ip, true, user.id, ua);

  // Agent Trace — audit de connexion
  await journaliser({
    userId: user.id,
    userName: user.name,
    action: "LOGIN",
    details: `Connexion réussie`,
    ip,
    userAgent: ua,
  });

  // Agent Sentinelle — détecter connexion nocturne
  await detecterConnexionInhabituelle(user.id, user.name, ip);

  // Résolution des permissions : celles stockées en base, ou les défauts du rôle
  let storedPermissions: string[] = [];
  try {
    storedPermissions = JSON.parse(user.permissions || "[]");
  } catch {
    storedPermissions = [];
  }
  const permissions =
    isFullAccessRole(user.role) || storedPermissions.length > 0
      ? storedPermissions
      : getDefaultPermissions(user.role);

  await createSession({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions,
  });

  // Pour l'expert-comptable : renouvellement obligatoire tous les 90 jours
  if (user.role === "EXPERT_COMPTABLE") {
    const EXPIRY_DAYS = 90;
    const refDate = user.passwordChangedAt ?? user.createdAt;
    const joursDepuis = Math.floor((Date.now() - new Date(refDate).getTime()) / 86_400_000);
    if (!user.passwordChangedAt || joursDepuis >= EXPIRY_DAYS) {
      redirect("/profil/mot-de-passe?force=1");
    }
  }

  redirect("/");
}

export async function logout() {
  const ip = await getClientIp();
  const ua = await getUserAgent();
  // Import getUser dynamically to avoid circular dep at module level
  try {
    const { getUser } = await import("@/lib/dal");
    const user = await getUser();
    await journaliser({
      userId: user.id,
      userName: user.name,
      action: "LOGOUT",
      ip,
      userAgent: ua,
    });
  } catch { /* ignore si session déjà expirée */ }
  await deleteSession();
  redirect("/login");
}
