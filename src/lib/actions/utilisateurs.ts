"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { isFullAccessRole, getDefaultPermissions } from "@/lib/permissions";

// Vérifie que l'utilisateur connecté a un rôle à accès total
async function requireFullAccess() {
  const current = await getUser();
  if (!isFullAccessRole(current.role)) {
    throw new Error("Accès refusé");
  }
  return current;
}

const createSchema = z.object({
  name: z.string().min(2, "Le nom doit comporter au moins 2 caractères."),
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().min(8, "Le mot de passe doit comporter au moins 8 caractères."),
  role: z.string().min(1, "Le rôle est requis."),
  permissions: z.string().default("[]"),
});

const updateSchema = z.object({
  name: z.string().min(2, "Le nom doit comporter au moins 2 caractères."),
  email: z.string().email("Adresse e-mail invalide."),
  password: z.string().optional(),
  role: z.string().min(1, "Le rôle est requis."),
  permissions: z.string().default("[]"),
});

export type UserState =
  | { errors?: Record<string, string[]>; message?: string } | undefined;

export async function createUser(
  _prev: UserState,
  formData: FormData,
): Promise<UserState> {
  await requireFullAccess();

  const raw = Object.fromEntries(formData.entries());
  const perms = buildPermissionsFromForm(formData, raw.role as string);
  const validated = createSchema.safeParse({ ...raw, permissions: JSON.stringify(perms) });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, password, role, permissions } = validated.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { errors: { email: ["Cette adresse e-mail est déjà utilisée."] } };
  }

  const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, password: hash, role, permissions },
  });

  revalidatePath("/utilisateurs");
  redirect("/utilisateurs");
}

export async function updateUser(
  id: string,
  _prev: UserState,
  formData: FormData,
): Promise<UserState> {
  const current = await requireFullAccess();

  const raw = Object.fromEntries(formData.entries());
  const perms = buildPermissionsFromForm(formData, raw.role as string);
  const validated = updateSchema.safeParse({ ...raw, permissions: JSON.stringify(perms) });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { name, email, password, role, permissions } = validated.data;

  // Empêche de rétrograder son propre accès
  if (id === current.id && !isFullAccessRole(role)) {
    return { errors: { role: ["Vous ne pouvez pas modifier votre propre rôle vers un accès restreint."] } };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing && existing.id !== id) {
    return { errors: { email: ["Cette adresse e-mail est déjà utilisée."] } };
  }

  const data: {
    name: string;
    email: string;
    role: string;
    permissions: string;
    password?: string;
  } = { name, email, role, permissions };

  if (password && password.length > 0) {
    data.password = await bcrypt.hash(password, 10);
  }

  await prisma.user.update({ where: { id }, data });
  revalidatePath("/utilisateurs");
  redirect(`/utilisateurs/${id}`);
}

export async function deleteUser(id: string): Promise<void> {
  const current = await requireFullAccess();
  if (id === current.id) throw new Error("Impossible de supprimer votre propre compte.");
  await prisma.user.delete({ where: { id } });
  revalidatePath("/utilisateurs");
  redirect("/utilisateurs");
}

// Construit le tableau de permissions depuis les checkboxes du formulaire
function buildPermissionsFromForm(formData: FormData, role: string): string[] {
  if (isFullAccessRole(role)) return [];
  const checked = formData.getAll("perm") as string[];
  return checked.length > 0 ? checked : getDefaultPermissions(role);
}
