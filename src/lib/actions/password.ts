"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";

export type PasswordState = {
  error?: string;
  success?: boolean;
};

export async function changePassword(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const user = await getUser();

  const ancienMdp = (formData.get("ancienMdp") as string | null) ?? "";
  const nouveauMdp = (formData.get("nouveauMdp") as string | null) ?? "";
  const confirmMdp = (formData.get("confirmMdp") as string | null) ?? "";

  if (!ancienMdp || !nouveauMdp || !confirmMdp) {
    return { error: "Tous les champs sont obligatoires." };
  }

  if (nouveauMdp !== confirmMdp) {
    return { error: "Le nouveau mot de passe et sa confirmation ne correspondent pas." };
  }

  if (nouveauMdp.length < 8) {
    return { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." };
  }

  // Vérifier la complexité : au moins une majuscule, un chiffre
  if (!/[A-Z]/.test(nouveauMdp) || !/[0-9]/.test(nouveauMdp)) {
    return { error: "Le mot de passe doit contenir au moins une majuscule et un chiffre." };
  }

  // Récupérer le hash actuel
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { password: true },
  });
  if (!dbUser) return { error: "Utilisateur introuvable." };

  const valid = await bcrypt.compare(ancienMdp, dbUser.password);
  if (!valid) {
    return { error: "L'ancien mot de passe est incorrect." };
  }

  // S'assurer que le nouveau mot de passe est différent de l'ancien
  const samePwd = await bcrypt.compare(nouveauMdp, dbUser.password);
  if (samePwd) {
    return { error: "Le nouveau mot de passe doit être différent de l'ancien." };
  }

  const hash = await bcrypt.hash(nouveauMdp, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hash,
      passwordChangedAt: new Date(),
    },
  });

  revalidatePath("/profil/mot-de-passe");
  redirect("/profil/mot-de-passe?ok=1");
}

// Pour les admins : forcer la réinitialisation du mot de passe d'un autre utilisateur
export async function adminResetPassword(
  userId: string,
  formData: FormData
): Promise<PasswordState> {
  const caller = await getUser();
  const isAdmin = ["DIRIGEANT", "ASSISTANT_DIRECTION", "DAF", "ADMIN"].includes(caller.role);
  if (!isAdmin) return { error: "Accès refusé." };

  const nouveauMdp = (formData.get("nouveauMdp") as string | null) ?? "";
  const confirmMdp = (formData.get("confirmMdp") as string | null) ?? "";

  if (!nouveauMdp || !confirmMdp) return { error: "Champs obligatoires." };
  if (nouveauMdp !== confirmMdp) return { error: "Les mots de passe ne correspondent pas." };
  if (nouveauMdp.length < 8) return { error: "Minimum 8 caractères." };

  const hash = await bcrypt.hash(nouveauMdp, 10);
  await prisma.user.update({
    where: { id: userId },
    data: {
      password: hash,
      passwordChangedAt: null, // Forcer l'utilisateur à changer à la prochaine connexion
    },
  });

  revalidatePath("/utilisateurs");
  return { success: true };
}
