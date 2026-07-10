export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/fields";
import { couleurParDefaut } from "@/lib/intervenant-couleur";

function formatEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

export default async function SousTraitantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const sousTraitants = await prisma.sousTraitant.findMany({
    where: q
      ? {
          OR: [
            { reference: { contains: q } },
            { nom: { contains: q } },
            { specialite: { contains: q } },
            { contact: { contains: q } },
          ],
        }
      : undefined,
    orderBy: [{ specialite: "asc" }, { nom: "asc" }],
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
            placeholder="Rechercher un sous-traitant…"
            className={`${inputClasses} pl-9`}
          />
        </form>
        <LinkButton href="/sous-traitants/nouveau">
          <Plus className="h-4 w-4" />
          Nouveau sous-traitant
        </LinkButton>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Spécialité</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Téléphone</th>
              <th className="px-4 py-3">Taux horaire</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sousTraitants.map((st) => (
              <tr key={st.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-blue">
                  {st.reference ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/sous-traitants/${st.id}`} className="flex items-center gap-2 font-medium text-brand-navy hover:underline">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: st.couleur ?? couleurParDefaut(st.id) }}
                    />
                    {st.nom}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{st.specialite ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{st.contact ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{st.telephone ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  {st.tauxHoraire != null ? `${formatEuros(st.tauxHoraire)}/h` : "—"}
                </td>
              </tr>
            ))}
            {sousTraitants.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Aucun sous-traitant trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
