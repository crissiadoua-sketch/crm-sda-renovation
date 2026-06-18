import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { inputClasses } from "@/components/ui/fields";
import { CLIENT_TYPE_LABELS } from "@/lib/reference";

const statutTones: Record<string, BadgeTone> = {
  ACTIF: "green",
  PROSPECT: "orange",
  ARCHIVE: "gray",
};

const statutLabels: Record<string, string> = {
  ACTIF: "Actif",
  PROSPECT: "Prospect",
  ARCHIVE: "Archivé",
};

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const clients = await prisma.client.findMany({
    where: q
      ? {
          OR: [
            { nom: { contains: q } },
            { prenom: { contains: q } },
            { raisonSociale: { contains: q } },
            { ville: { contains: q } },
            { email: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher un client…"
            className={`${inputClasses} pl-9`}
          />
        </form>
        <LinkButton href="/clients/nouveau">
          <Plus className="h-4 w-4" />
          Nouveau client
        </LinkButton>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Nom / Raison sociale</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/clients/${client.id}`} className="font-medium text-brand-navy hover:underline">
                    {client.type === "PA"
                      ? `${client.civilite ? client.civilite + " " : ""}${client.prenom ? client.prenom + " " : ""}${client.nom}`
                      : client.raisonSociale || client.nom}
                  </Link>
                  {client.email && <p className="text-xs text-slate-400">{client.email}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {CLIENT_TYPE_LABELS[client.type] ?? client.type}
                </td>
                <td className="px-4 py-3 text-slate-600">{client.ville ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{client.telephone ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge tone={statutTones[client.statut] ?? "gray"}>
                    {statutLabels[client.statut] ?? client.statut}
                  </Badge>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Aucun client trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
