import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { ROLE_LABELS, ROLE_BADGE_TONES, isFullAccessRole } from "@/lib/permissions";
import { formatDate } from "@/lib/format";
import { redirect } from "next/navigation";

export default async function UtilisateursPage() {
  const current = await getUser();
  if (!isFullAccessRole(current.role)) redirect("/acces-refuse");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Gestion des utilisateurs</h2>
          <p className="mt-1 text-sm text-slate-500">
            Créez et gérez les comptes d'accès au CRM pour chaque collaborateur.
          </p>
        </div>
        <LinkButton href="/utilisateurs/nouveau">+ Nouveau compte</LinkButton>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Nom
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                E-mail / Identifiant
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Profil
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Accès
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                Créé le
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/utilisateurs/${u.id}`}
                    className="font-medium text-brand-blue hover:underline"
                  >
                    {u.name}
                    {u.id === current.id && (
                      <span className="ml-2 text-xs text-slate-400">(vous)</span>
                    )}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3">
                  <Badge
                    tone={
                      (ROLE_BADGE_TONES[u.role] as
                        | "blue"
                        | "navy"
                        | "orange"
                        | "green"
                        | "gray") ?? "gray"
                    }
                  >
                    {ROLE_LABELS[u.role] ?? u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  {isFullAccessRole(u.role) ? (
                    <Badge tone="navy">Accès total</Badge>
                  ) : (
                    <Badge tone="orange">Accès restreint</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="py-12 text-center text-slate-400">Aucun utilisateur trouvé.</p>
        )}
      </div>
    </div>
  );
}
