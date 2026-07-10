export const dynamic = "force-dynamic";

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";

const statutTones: Record<string, BadgeTone> = {
  EN_COURS: "gray",
  SIGNE: "blue",
  LEVE: "green",
};

const statutLabels: Record<string, string> = {
  EN_COURS: "En cours",
  SIGNE: "Signé",
  LEVE: "Réserves levées",
};

export default async function EtatsReservesPage() {
  const etats = await prisma.etatReserves.findMany({
    orderBy: { dateDocument: "desc" },
    include: { chantier: true, client: true },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-brand-navy">États des réserves</h2>
          <p className="mt-1 text-sm text-slate-500">
            Réception des travaux — réserves constatées et constats de levée.
          </p>
        </div>
        <LinkButton href="/etats-reserves/nouveau">+ Nouvel état des réserves</LinkButton>
      </div>

      {etats.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
          <p className="text-2xl">📋</p>
          <p className="mt-2 font-medium text-slate-600">Aucun état des réserves</p>
          <p className="mt-1 text-sm text-slate-400">
            Créez votre premier document lors d&apos;une réception de travaux.
          </p>
          <LinkButton href="/etats-reserves/nouveau" className="mt-4">
            + Nouvel état des réserves
          </LinkButton>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">N°</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Chantier</th>
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Statut</th>
                <th className="px-4 py-3">Levée le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {etats.map((etat) => (
                <tr key={etat.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/etats-reserves/${etat.id}`}
                      className="font-mono text-xs font-medium text-brand-blue hover:underline"
                    >
                      {etat.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(etat.dateDocument)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {etat.chantier ? (
                      <Link href={`/chantiers/${etat.chantier.id}`} className="hover:underline">
                        {etat.chantier.reference}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {etat.client
                      ? etat.client.type === "ENTREPRISE"
                        ? etat.client.raisonSociale ?? etat.client.nom
                        : `${etat.client.prenom ?? ""} ${etat.client.nom}`.trim()
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={statutTones[etat.statut] ?? "gray"}>
                      {statutLabels[etat.statut] ?? etat.statut}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {etat.dateLevee ? formatDate(etat.dateLevee) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
