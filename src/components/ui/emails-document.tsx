import { cookies } from "next/headers";
import { decrypt } from "@/lib/session";
import { COMPANY } from "@/lib/company";

/**
 * Affiche l'email de contact + l'email du profil connecté.
 * Si pas de session active, affiche contact + facturation.
 */
export async function EmailsDocument({ separator = " · " }: { separator?: string }) {
  let userEmail: string | undefined;
  try {
    const cookieStore = await cookies();
    const session = await decrypt(cookieStore.get("session")?.value);
    if (session?.email && session.email !== COMPANY.email) {
      userEmail = session.email;
    }
  } catch {}

  if (userEmail) {
    return <>{COMPANY.email}{separator}{userEmail}</>;
  }
  return <>{COMPANY.email}{separator}{COMPANY.emailFacturation}</>;
}
