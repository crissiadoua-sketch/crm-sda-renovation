export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEuros } from "@/lib/format";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { CCN_LABELS } from "@/lib/ccn-batiment";
import { couleurParDefaut } from "@/lib/intervenant-couleur";

const statutTones: Record<string, BadgeTone> = {
  ACTIF: "green",
  CONGE: "blue",
  RUPTURE: "red",
  INACTIF: "gray",
};

const statutLabels: Record<string, string> = {
  ACTIF: "Actif",
  CONGE: "En congé",
  RUPTURE: "Rupture",
  INACTIF: "Inactif",
};

const statutFiltreLabels: { key: string; label: string }[] = [
  { key: "", label: "Tous" },
  { key: "ACTIF", label: "Actifs" },
  { key: "CONGE", label: "En congé / arrêt" },
  { key: "RUPTURE", label: "Rupture" },
  { key: "INACTIF", label: "Inactifs" },
];

export default async function RHPage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>;
}) {
  const { statut } = await searchParams;

  const tousSalaries = await prisma.salarie.findMany({
    orderBy: { nom: "asc" },
    include: { _count: { select: { bulletins: true } } },
  });

  const salaries = statut ? tousSalaries.filter((s) => s.statutRH === statut) : tousSalaries;

  const actifs = tousSalaries.filter((s) => s.statutRH === "ACTIF");
  const enConge = tousSalaries.filter((s) => s.statutRH === "CONGE").length;
  const masseSalariale = actifs.reduce((s, e) => s + e.salaireBase, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Ressources humaines</h2>
          <p className="mt-1 text-sm text-slate-500">
            Salariés, bulletins de paie — CCN Ouvriers, ETAM et Cadres du Bâtiment (Occitanie).
          </p>
        </div>
        <LinkButton href="/rh/nouveau">+ Nouveau salarié</LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Salariés actifs</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{actifs.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Masse salariale brute mensuelle</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{formatEuros(masseSalariale)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">En congé / arrêt</p>
          <p className={`mt-1 text-2xl font-bold ${enConge > 0 ? "text-brand-orange" : "text-brand-navy"}`}>{enConge}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-500">Total effectif</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{tousSalaries.length}</p>
          <p className="text-xs text-slate-400">{tousSalaries.length - actifs.length} inactif(s)</p>
        </div>
      </div>

      {/* Filtres statut */}
      <div className="flex flex-wrap gap-2">
        {statutFiltreLabels.map(({ key, label }) => (
          <Link
            key={key}
            href={key ? `/rh?statut=${key}` : "/rh"}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              (statut ?? "") === key
                ? "border-brand-navy bg-brand-navy text-white"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {salaries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-2xl">👷</p>
          <p className="mt-2 font-medium text-slate-600">Aucun salarié enregistré</p>
          <p className="mt-1 text-sm text-slate-400">
            Ajoutez votre premier salarié pour commencer à éditer des bulletins de paie.
          </p>
          <LinkButton href="/rh/nouveau" className="mt-4">+ Nouveau salarié</LinkButton>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Matricule</th>
                <th className="px-4 py-3">Salarié</th>
                <th className="px-4 py-3">CCN</th>
                <th className="px-4 py-3">Qualification</th>
                <th className="px-4 py-3 text-right">Salaire de base</th>
                <th className="px-4 py-3">Embauche</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Bulletins</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {salaries.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{s.matricule}</td>
                  <td className="px-4 py-3">
                    <Link href={`/rh/${s.id}`} className="flex items-center gap-2 font-medium text-brand-blue hover:underline">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: s.couleur ?? couleurParDefaut(s.id) }}
                      />
                      {s.prenom} {s.nom}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {s.typeCcn === "OUVRIERS" ? "Ouvriers" : s.typeCcn === "ETAM" ? "ETAM" : "Cadres"}
                    {s.coefficient && ` – Coeff. ${s.coefficient}`}
                    {s.position && ` – Pos. ${s.position}`}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{s.qualification || "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-brand-navy">
                    {formatEuros(s.salaireBase)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(s.dateEmbauche)}</td>
                  <td className="px-4 py-3">
                    <Badge tone={statutTones[s.statutRH] ?? "gray"}>
                      {statutLabels[s.statutRH] ?? s.statutRH}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center text-slate-500">{s._count.bulletins}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
