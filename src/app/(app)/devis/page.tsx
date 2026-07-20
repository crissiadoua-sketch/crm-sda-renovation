export const dynamic = "force-dynamic";

import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { inputClasses } from "@/components/ui/fields";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  ENVOYE: "blue",
  ACCEPTE: "green",
  REFUSE: "red",
  EXPIRE: "gray",
};

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
};

export default async function DevisPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let devisList: any[] = [];
  let dbError = false;
  try {
    devisList = await prisma.devis.findMany({
      where: q
        ? {
            OR: [
              { numero: { contains: q } },
              { objet: { contains: q } },
              { chantier: { nom: { contains: q } } },
              { client: { nom: { contains: q } } },
              { client: { raisonSociale: { contains: q } } },
            ],
          }
        : undefined,
      include: { chantier: true, client: true },
      orderBy: { dateCreation: "desc" },
    });
  } catch {
    dbError = true;
  }

  // Détection des groupes de variantes (plusieurs BROUILLON sur le même chantier)
  const brouillonParChantier = new Map<string, number>();
  for (const d of devisList) {
    if (d.statut === "BROUILLON" && d.type === "INITIAL") {
      brouillonParChantier.set(d.chantierId, (brouillonParChantier.get(d.chantierId) ?? 0) + 1);
    }
  }
  const chantiersVariantes = new Set(
    [...brouillonParChantier.entries()].filter(([, n]) => n > 1).map(([id]) => id)
  );

  if (dbError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <p className="text-lg font-bold text-slate-700">Connexion temporairement indisponible</p>
        <p className="text-sm text-slate-400">La base de données ne répond pas. Actualisez la page.</p>
        <a href="/devis" className="rounded-lg bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue/90 transition">
          Actualiser
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <form className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher un devis…"
            className={`${inputClasses} pl-9`}
          />
        </form>
        <LinkButton href="/devis/nouveau">
          <Plus className="h-4 w-4" />
          Nouveau devis
        </LinkButton>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-4 py-3">Numéro</th>
              <th className="px-4 py-3">Chantier</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Total TTC</th>
              <th className="px-4 py-3">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devisList.map((devis) => (
              <tr key={devis.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/devis/${devis.id}`} className="font-medium text-brand-navy hover:underline">
                    {devis.numero}
                  </Link>
                  {devis.type === "AVENANT" && (
                    <Badge tone="orange" className="ml-2">Avenant</Badge>
                  )}
                  {chantiersVariantes.has(devis.chantierId) && devis.statut === "BROUILLON" && devis.type === "INITIAL" && (
                    <Link
                      href={`/devis/comparer/${devis.chantierId}`}
                      className="ml-2 inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700 hover:bg-violet-100 transition"
                    >
                      🔀 {brouillonParChantier.get(devis.chantierId)} variantes — Comparer
                    </Link>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/chantiers/${devis.chantierId}`} className="text-slate-600 hover:text-brand-blue hover:underline">
                    {devis.chantier.nom}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/clients/${devis.clientId}`} className="text-slate-600 hover:text-brand-blue hover:underline">
                    {clientDisplayName(devis.client)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{formatDate(devis.dateCreation)}</td>
                <td className="px-4 py-3 text-slate-600">{formatEuros(devis.totalTTC)}</td>
                <td className="px-4 py-3">
                  <Badge tone={statutTones[devis.statut] ?? "gray"}>
                    {statutLabels[devis.statut] ?? devis.statut}
                  </Badge>
                </td>
              </tr>
            ))}
            {devisList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  Aucun devis trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
