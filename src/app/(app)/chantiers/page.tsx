import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { inputClasses } from "@/components/ui/fields";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";

const statutTones: Record<string, BadgeTone> = {
  PROSPECT: "orange",
  DEVIS_ENVOYE: "blue",
  EN_COURS: "navy",
  TERMINE: "green",
  ANNULE: "gray",
};

const statutLabels: Record<string, string> = {
  PROSPECT: "Prospect",
  DEVIS_ENVOYE: "Devis envoyé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

export default async function ChantiersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const chantiers = await prisma.chantier.findMany({
    where: q
      ? {
          OR: [
            { reference: { contains: q } },
            { nom: { contains: q } },
            { ville: { contains: q } },
            { client: { nom: { contains: q } } },
            { client: { raisonSociale: { contains: q } } },
          ],
        }
      : undefined,
    include: { client: true },
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
            placeholder="Rechercher un chantier…"
            className={`${inputClasses} pl-9`}
          />
        </form>
        <LinkButton href="/chantiers/nouveau">
          <Plus className="h-4 w-4" />
          Nouveau chantier
        </LinkButton>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Chantier</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Ville</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Budget estimé</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {chantiers.map((chantier) => (
              <tr key={chantier.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{chantier.reference}</td>
                <td className="px-4 py-3">
                  <Link href={`/chantiers/${chantier.id}`} className="font-medium text-brand-navy hover:underline">
                    {chantier.nom}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{clientDisplayName(chantier.client)}</td>
                <td className="px-4 py-3 text-slate-600">{chantier.ville ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {chantier.dateDebut ? formatDate(chantier.dateDebut) : "—"}
                  {chantier.dateFin ? ` → ${formatDate(chantier.dateFin)}` : ""}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {chantier.budgetEstime != null ? formatEuros(chantier.budgetEstime) : "—"}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statutTones[chantier.statut] ?? "gray"}>
                    {statutLabels[chantier.statut] ?? chantier.statut}
                  </Badge>
                </td>
              </tr>
            ))}
            {chantiers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  Aucun chantier trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
