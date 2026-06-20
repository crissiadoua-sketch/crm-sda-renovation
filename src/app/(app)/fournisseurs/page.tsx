import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { inputClasses } from "@/components/ui/fields";
import { CORPS_ETAT_LABELS, type CorpsEtatCode } from "@/lib/corps-etat";

function corpsMetierLabel(code: string | null) {
  if (!code) return "Non renseigné";
  if (code === "TOUS") return "Grossiste / négoce généraliste (tous corps d'état)";
  return CORPS_ETAT_LABELS[code as CorpsEtatCode] ?? code;
}

export default async function FournisseursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const fournisseurs = await prisma.fournisseur.findMany({
    where: q
      ? {
          OR: [
            { reference: { contains: q } },
            { nom: { contains: q } },
            { ville: { contains: q } },
            { contact: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { nom: "asc" },
  });

  const groupes = new Map<string, typeof fournisseurs>();
  for (const f of fournisseurs) {
    const label = corpsMetierLabel(f.corpsMetier);
    groupes.set(label, [...(groupes.get(label) ?? []), f]);
  }
  // Grossiste et Non renseigné toujours en dernier
  const entries = [...groupes.entries()].sort((a, b) => {
    const aLast = a[0].startsWith("Grossiste") || a[0] === "Non renseigné";
    const bLast = b[0].startsWith("Grossiste") || b[0] === "Non renseigné";
    if (aLast && !bLast) return 1;
    if (!aLast && bLast) return -1;
    return a[0].localeCompare(b[0]);
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
            placeholder="Rechercher un fournisseur…"
            className={`${inputClasses} pl-9`}
          />
        </form>
        <LinkButton href="/fournisseurs/nouveau">
          <Plus className="h-4 w-4" />
          Nouveau fournisseur
        </LinkButton>
      </div>

      {fournisseurs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-400 shadow-sm">
          Aucun fournisseur trouvé.
        </div>
      ) : (
        entries.map(([label, items]) => (
          <div key={label} className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-navy">
                {label} <span className="text-slate-400 font-normal">({items.length})</span>
              </p>
            </div>
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Nom</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Ville</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">E-mail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-blue">
                      {f.reference ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/fournisseurs/${f.id}`} className="font-medium text-brand-navy hover:underline">
                        {f.nom}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{f.contact ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{f.ville ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{f.telephone ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{f.email ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
