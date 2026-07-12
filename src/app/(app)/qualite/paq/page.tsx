export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { creerPAQ } from "@/lib/actions/qualite";

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  EN_VIGUEUR: "green",
  ARCHIVE: "gray",
};

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  EN_VIGUEUR: "En vigueur",
  ARCHIVE: "Archivé",
};

export default async function PAQPage({
  searchParams,
}: {
  searchParams: Promise<{ chantierId?: string }>;
}) {
  const { chantierId } = await searchParams;

  const [paqs, chantiers, clients] = await Promise.all([
    prisma.planAssuranceQualite.findMany({
      where: chantierId ? { chantierId } : undefined,
      include: {
        chantier: { select: { nom: true } },
        client: { select: { nom: true } },
      },
      orderBy: { dateEmission: "desc" },
    }),
    prisma.chantier.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true } }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, prenom: true } }),
  ]);

  const total = paqs.length;
  const enVigueur = paqs.filter((p) => p.statut === "EN_VIGUEUR").length;
  const brouillons = paqs.filter((p) => p.statut === "BROUILLON").length;
  const archives = paqs.filter((p) => p.statut === "ARCHIVE").length;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-500">
        <span>Qualité Chantier</span>
        <span className="mx-1.5">›</span>
        <span className="font-medium text-slate-700">Plans d&apos;Assurance Qualité</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">Plans d&apos;Assurance Qualité</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gestion des PAQ — procédures qualité, plan de contrôle et enregistrements.
          </p>
        </div>
        {/* Filtre par chantier */}
        <form method="get" className="flex items-center gap-2">
          <select
            name="chantierId"
            defaultValue={chantierId ?? ""}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/30"
          >
            <option value="">Tous les chantiers</option>
            {chantiers.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            Filtrer
          </button>
          {chantierId && (
            <Link
              href="/qualite/paq"
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition"
            >
              ✕
            </Link>
          )}
        </form>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total", value: total, color: "text-brand-navy" },
          { label: "En vigueur", value: enVigueur, color: "text-green-600" },
          { label: "Brouillons", value: brouillons, color: "text-slate-600" },
          { label: "Archivés", value: archives, color: "text-slate-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Formulaire création */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 font-semibold text-slate-700">Nouveau Plan d&apos;Assurance Qualité</h3>
        <form action={creerPAQ} className="flex flex-wrap gap-3">
          <select
            name="chantierId"
            defaultValue={chantierId ?? ""}
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
            name="objetMarche"
            placeholder="Objet du marché"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          />
          <input
            name="redacteurNom"
            placeholder="Rédacteur"
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/50"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand-orange px-4 py-2 text-sm font-semibold text-white hover:bg-brand-orange/90"
          >
            + Nouveau PAQ
          </button>
        </form>
      </div>

      {/* Tableau */}
      {paqs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-2xl">📋</p>
          <p className="mt-2 font-medium text-slate-600">
            {chantierId ? "Aucun PAQ pour ce chantier" : "Aucun Plan d’Assurance Qualité"}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {chantierId
              ? "Créez un PAQ pour ce chantier via le formulaire ci-dessus."
              : "Créez votre premier PAQ via le formulaire ci-dessus."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Numéro</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Statut</th>
                  <th className="px-4 py-3">Chantier</th>
                  <th className="px-4 py-3">Objet marché</th>
                  <th className="px-4 py-3">Rédacteur</th>
                  <th className="px-4 py-3">Date émission</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paqs.map((paq) => (
                  <tr key={paq.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/qualite/paq/${paq.id}`}
                        className="font-mono text-xs font-medium text-brand-blue hover:underline"
                      >
                        {paq.numero}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{paq.version}</td>
                    <td className="px-4 py-3">
                      <Badge tone={statutTones[paq.statut] ?? "gray"}>
                        {statutLabels[paq.statut] ?? paq.statut}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {paq.chantierId ? (
                        <Link
                          href={`/chantiers/${paq.chantierId}`}
                          className="text-slate-600 hover:text-brand-blue hover:underline"
                        >
                          {paq.chantier?.nom ?? paq.chantierId}
                        </Link>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{paq.objetMarche ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{paq.redacteurNom ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDate(paq.dateEmission)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/qualite/paq/${paq.id}`}
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
