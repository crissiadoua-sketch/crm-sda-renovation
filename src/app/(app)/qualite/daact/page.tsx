import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { creerDAACT } from "@/lib/actions/qualite";

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  SOUMIS: "blue",
  ACCEPTE: "green",
  AVEC_RESERVES: "orange",
};

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  SOUMIS: "Soumis",
  ACCEPTE: "Accepté",
  AVEC_RESERVES: "Avec réserves",
};

export default async function DAACTPage() {
  const [daacts, chantiers, clients] = await Promise.all([
    prisma.dAACT.findMany({
      include: {
        chantier: { select: { nom: true } },
        client: { select: { nom: true } },
      },
      orderBy: { numero: "desc" },
    }),
    prisma.chantier.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, prenom: true } }),
  ]);

  const total = daacts.length;
  const soumis = daacts.filter((d) => d.statut === "SOUMIS").length;
  const accepte = daacts.filter((d) => d.statut === "ACCEPTE").length;
  const avecReserves = daacts.filter((d) => d.statut === "AVEC_RESERVES").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500">
        <span>Qualité Chantier</span>
        <span className="mx-1.5">›</span>
        <span className="font-medium text-slate-700">DAACT</span>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-brand-navy">DAACT</h2>
        <p className="mt-1 text-sm text-slate-500">
          Déclarations d&apos;Achèvement et de Conformité des Travaux.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: total, color: "text-brand-navy" },
          { label: "Soumis", value: soumis, color: "text-brand-blue" },
          { label: "Acceptés", value: accepte, color: "text-green-600" },
          { label: "Avec réserves", value: avecReserves, color: "text-orange-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-700">Nouvelle DAACT</h3>
        <form action={creerDAACT} className="flex flex-wrap gap-3">
          <select
            name="chantierId"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          >
            <option value="">— Chantier (optionnel) —</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <select
            name="clientId"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          >
            <option value="">— Client (optionnel) —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.prenom ? `${c.prenom} ${c.nom}` : c.nom}
              </option>
            ))}
          </select>
          <input
            name="natureTravaux"
            placeholder="Nature des travaux"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          />
          <input
            name="nomDeclarant"
            placeholder="Nom du déclarant"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange/90"
          >
            + Nouvelle DAACT
          </button>
        </form>
      </div>

      {/* Tableau */}
      {daacts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-2xl">📄</p>
          <p className="mt-2 font-medium text-slate-600">Aucune DAACT</p>
          <p className="mt-1 text-sm text-slate-400">
            Créez votre première DAACT via le formulaire ci-dessus.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Numéro</th>
                  <th className="px-4 py-3">Chantier</th>
                  <th className="px-4 py-3">Nature travaux</th>
                  <th className="px-4 py-3">Déclarant</th>
                  <th className="px-4 py-3">Date ach.</th>
                  <th className="px-4 py-3">Date dépôt</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {daacts.map((daact) => (
                  <tr key={daact.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/qualite/daact/${daact.id}`}
                        className="font-mono text-xs font-medium text-brand-blue hover:underline"
                      >
                        {daact.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{daact.chantier?.nom ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{daact.natureTravaux ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{daact.nomDeclarant ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(daact.dateAchevement)}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(daact.dateDepot)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statutTones[daact.statut] ?? "gray"}>
                        {statutLabels[daact.statut] ?? daact.statut}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/qualite/daact/${daact.id}`}
                        className="text-xs font-medium text-brand-blue hover:underline"
                      >
                        Modifier →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
