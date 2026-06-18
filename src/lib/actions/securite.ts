"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { journaliser, getClientIp } from "@/lib/securite";

export async function debloquerIp(id: string) {
  const user = await getUser();
  const ip = await getClientIp();

  const bloc = await prisma.ipBloquer.findUnique({ where: { id } });
  if (!bloc) return;

  await prisma.ipBloquer.update({ where: { id }, data: { actif: false } });

  await journaliser({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entite: "IpBloquer",
    entiteId: id,
    details: `IP débloquée manuellement : ${bloc.ip}`,
    ip,
  });

  revalidatePath("/securite");
}

export async function resolveAlerte(id: string) {
  const user = await getUser();
  const ip = await getClientIp();

  await prisma.alerteSecurite.update({ where: { id }, data: { resolue: true } });

  await journaliser({
    userId: user.id,
    userName: user.name,
    action: "UPDATE",
    entite: "AlerteSecurite",
    entiteId: id,
    details: "Alerte marquée comme résolue",
    ip,
  });

  revalidatePath("/securite");
}

export async function supprimerLogsAnciens() {
  const user = await getUser();
  const ip = await getClientIp();

  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 jours

  const { count: countAttempts } = await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  const { count: countAudit } = await prisma.auditLog.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });

  await journaliser({
    userId: user.id,
    userName: user.name,
    action: "DELETE",
    entite: "SecurityLogs",
    details: `Nettoyage logs >90j : ${countAttempts} tentatives, ${countAudit} logs d'audit supprimés`,
    ip,
  });

  revalidatePath("/securite");
}
