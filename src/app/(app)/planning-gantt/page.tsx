import Link from "next/link";
import { Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { inputClasses } from "@/components/ui/fields";
import { formatDate, clientDisplayName } from "@/lib/format";

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

export default async function PlanningGanttIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const chantiers = await prisma.chantier.findMany({
    where: {
      statut: { not: "ANNULE" },
      ...(q
        ? {
            OR: [
              { reference: { contains: q } },
              { nom: { contains: q } },
              { client: { nom: { contains: q } } },
              { client: { raisonSociale: { contains: q } } },
            ],
          }
        : {}),
    },
    include: {
      client: true,
      _count: { select: { tachesGantt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold text-brand-navy">Planning prévisionnel — Gantt</h2>
        <p className="mt-1 text-sm text-slate-500">
          Choisissez un chantier pour ouvrir son planning d&apos;exécution (tâches, dépendances, chemin critique).
        </p>
      </div>

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

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Référence</th>
              <th className="px-4 py-3">Chantier</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Dates</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3 text-center">Tâches planifiées</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {chantiers.map((chantier) => (
              <tr key={chantier.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-500">{chantier.reference}</td>
                <td className="px-4 py-3 font-medium text-brand-navy">{chantier.nom}</td>
                <td className="px-4 py-3 text-slate-600">{clientDisplayName(chantier.client)}</td>
                <td className="px-4 py-3 text-slate-600">
                  {chantier.dateDebut ? formatDate(chantier.dateDebut) : "—"}
                  {chantier.dateFin ? ` → ${formatDate(chantier.dateFin)}` : ""}
                </td>
                <td className="px-4 py-3">
                  <Badge tone={statutTones[chantier.statut] ?? "gray"}>
                    {statutLabels[chantier.statut] ?? chantier.statut}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-center text-slate-600">{chantier._count.tachesGantt}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/chantiers/${chantier.id}/planning`}
                    className="text-sm font-medium text-brand-blue hover:underline"
                  >
                    Ouvrir le planning →
                  </Link>
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
