export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UserForm } from "@/components/utilisateurs/user-form";
import { updateUser, deleteUser } from "@/lib/actions/utilisateurs";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import {
  isFullAccessRole,
  ROLE_LABELS,
  ROLE_BADGE_TONES,
  getDefaultPermissions,
} from "@/lib/permissions";

export default async function UtilisateurDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const current = await getUser();
  if (!isFullAccessRole(current.role)) redirect("/acces-refuse");

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) notFound();

  let userPermissions: string[] = [];
  try {
    userPermissions = JSON.parse(user.permissions || "[]");
  } catch {
    userPermissions = [];
  }
  if (userPermissions.length === 0 && !isFullAccessRole(user.role)) {
    userPermissions = getDefaultPermissions(user.role);
  }

  const action = updateUser.bind(null, id);
  const isCurrentUser = id === current.id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/utilisateurs" className="text-sm text-brand-blue hover:underline">
            ← Retour aux utilisateurs
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{user.name}</h2>
            <Badge
              tone={
                (ROLE_BADGE_TONES[user.role] as
                  | "blue"
                  | "navy"
                  | "orange"
                  | "green"
                  | "gray") ?? "gray"
              }
            >
              {ROLE_LABELS[user.role] ?? user.role}
            </Badge>
            {isFullAccessRole(user.role) ? (
              <Badge tone="navy">Accès total</Badge>
            ) : (
              <Badge tone="orange">Accès restreint</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-500">{user.email}</p>
        </div>
        {!isCurrentUser && (
          <DeleteButton
            action={deleteUser.bind(null, id)}
            confirmMessage={`Supprimer le compte de ${user.name} ? Cette action est irréversible.`}
          />
        )}
      </div>

      <UserForm
        action={action}
        defaultValues={{
          name: user.name,
          email: user.email,
          role: user.role,
          permissions: userPermissions,
          titre: (user as { titre?: string | null }).titre ?? null,
          telephone: (user as { telephone?: string | null }).telephone ?? null,
        }}
        isEdit
      />
    </div>
  );
}
