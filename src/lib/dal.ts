import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/session";

export const verifySession = cache(async () => {
  const cookieStore = await cookies();
  const session = await decrypt(cookieStore.get("session")?.value);

  if (!session?.userId) {
    redirect("/login");
  }

  return { isAuth: true, userId: session.userId };
});

export const getUser = cache(async () => {
  const session = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      permissions: true,
      passwordChangedAt: true,
      createdAt: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  let permissions: string[] = [];
  try {
    permissions = JSON.parse(user.permissions || "[]");
  } catch {
    permissions = [];
  }

  return { ...user, permissions };
});
