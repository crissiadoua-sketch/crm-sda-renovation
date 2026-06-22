import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { canAccess } from "@/lib/permissions";

// Routes accessibles sans connexion
const publicRoutes = ["/login"];
const publicRoutePatterns = [
  /^\/devis\/sign\//,
  /^\/contrats\/sign\//,
  /^\/pv-public\//,
];

// Cette route nécessite une session mais est exemptée du contrôle de permissions
const ACCES_REFUSE_PATH = "/acces-refuse";

function isPublicRoute(path: string) {
  return (
    publicRoutes.includes(path) ||
    publicRoutePatterns.some((pattern) => pattern.test(path))
  );
}

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isPublic = isPublicRoute(path);

  const cookie = (await cookies()).get("session")?.value;
  const session = await decrypt(cookie);

  if (!isPublic && !session?.userId) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (path === "/login" && session?.userId) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  // Contrôle des permissions pour les routes protégées
  if (session?.userId && path !== ACCES_REFUSE_PATH && !isPublic) {
    const role = session.role ?? "";
    const permissions: string[] = Array.isArray(session.permissions)
      ? session.permissions
      : [];
    if (!canAccess(role, permissions, path)) {
      return NextResponse.redirect(new URL(ACCES_REFUSE_PATH, req.nextUrl));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)"],
};
