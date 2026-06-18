import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { creerFicheAutocontrole } from "@/lib/actions/qualite";

const statutTones: Record<string, BadgeTone> = {
  EN_COURS: "orange",
  CONFORME: "green",
  NON_CONFORME: "red",
  AVEC_RESERVES: "orange",
};

const statutLabels: Record<string, string> = {
  EN_COURS: "En cours",
  CONFORME: "Conforme",
  NON_CONFORME: "Non conforme",
  AVEC_RESERVES: "Avec réserves",
};

export default async function FichesAutocontrolePage() {
  const [fiches, chantiers, clients] = await Promise.all([
    prisma.ficheAutocontrole.findMany({
      include: {
        chantier: { select: { nom: true } },
        client: { select: { nom: true } },
        _count: { select: { points: true } },
      },
      orderBy: { numero: "desc" },
    }),
    prisma.chantier.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, prenom: true } }),
  ]);

  const total = fiches.length;
  const conforme = fiches.filter((f) => f.statut === "CONFORME").length;
  const nonConforme = fiches.filter((f) => f.statut === "NON_CONFORME").length;
  const avecReserves = fiches.filter((f) => f.statut === "AVEC_RESERVES").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500">
        <span>Qualité Chantier</span>
        <span className="mx-1.5">›</span>
        <span className="font-medium text-slate-700">Fiches d&apos;autocontrôle</span>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-brand-navy">Fiches d&apos;autocontrôle</h2>
        <p className="mt-1 text-sm text-slate-500">
          Contrôle qualité des ouvrages — points de vérification et conformité.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: total, color: "text-brand-navy" },
          { label: "Conformes", value: conforme, color: "text-green-600" },
          { label: "Non conformes", value: nonConforme, color: "text-red-600" },
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
        <h3 className="mb-3 font-semibold text-slate-700">Nouvelle fiche d&apos;autocontrôle</h3>
        <form action={creerFicheAutocontrole} className="flex flex-wrap gap-3">
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
            name="lot"
            placeholder="Lot"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          />
          <input
            name="ouvrage"
            placeholder="Ouvrage"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          />
          <input
            name="controleurNom"
            placeholder="Contrôleur"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange/90"
          >
            + Nouvelle fiche
          </button>
        </form>
      </div>

      {/* Tableau */}
      {fiches.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-2xl">✅</p>
          <p className="mt-2 font-medium text-slate-600">Aucune fiche d&apos;autocontrôle</p>
          <p className="mt-1 text-sm text-slate-400">
            Créez votre première fiche via le formulaire ci-dessus.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Numéro</th>
                  <th className="px-4 py-3">Lot</th>
                  <th className="px-4 py-3">Ouvrage</th>
                  <th className="px-4 py-3">Contrôleur</th>
                  <th className="px-4 py-3 text-center">Nb points</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fiches.map((fac) => (
                  <tr key={fac.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/qualite/autocontrole/${fac.id}`}
                        className="font-mono text-xs font-medium text-brand-blue hover:underline"
                      >
                        {fac.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{fac.lot ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{fac.ouvrage ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{fac.controleurNom ?? "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                        {fac._count.points}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(fac.dateControle)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statutTones[fac.statut] ?? "gray"}>
                        {statutLabels[fac.statut] ?? fac.statut}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/qualite/autocontrole/${fac.id}`}
                        className="text-xs font-medium text-brand-blue hover:underline"
                      >
                        Ouvrir →
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
