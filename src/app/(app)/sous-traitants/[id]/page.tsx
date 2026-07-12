export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { SousTraitantForm } from "@/components/sous-traitants/sous-traitant-form";
import { updateSousTraitant, deleteSousTraitant } from "@/lib/actions/sous-traitants";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatEuros } from "@/lib/format";

export default async function SousTraitantDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;

  const sousTraitant = await prisma.sousTraitant.findUnique({
    where: { id },
    include: {
      interventions: { include: { chantier: { select: { id: true, nom: true, reference: true } } } },
      contrats: {
        include: { chantier: { select: { id: true, nom: true, statut: true, reference: true } } },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      ordresMission: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!sousTraitant) notFound();

  const totalCommande = sousTraitant.contrats.reduce((sum, c) => sum + (c.montantHT ?? 0), 0);
  const nbChantiers = new Set([
    ...sousTraitant.interventions.map(i => i.chantierId),
    ...sousTraitant.contrats.map(c => c.chantierId).filter(Boolean),
  ]).size;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/sous-traitants" className="text-sm text-brand-blue hover:underline">
            ← Retour aux sous-traitants
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">{sousTraitant.nom}</h2>
        </div>
        <DeleteButton
          action={deleteSousTraitant.bind(null, sousTraitant.id)}
          confirmMessage={`Supprimer le sous-traitant « ${sousTraitant.nom} » ?`}
        />
      </div>

      {erreur === "suppression" && (
        <div className="rounded-lg bg-brand-orange-dark/10 px-4 py-3 text-sm text-brand-orange-dark">
          Impossible de supprimer ce sous-traitant : des contrats, ordres de mission ou interventions y sont liés.
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Total commandé</p>
          <p className="mt-1 text-2xl font-bold text-brand-navy">{formatEuros(totalCommande)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Contrats ST</p>
          <p className="mt-1 text-2xl font-bold text-brand-blue">{sousTraitant.contrats.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Chantiers</p>
          <p className="mt-1 text-2xl font-bold text-brand-orange">{nbChantiers}</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <SousTraitantForm sousTraitant={sousTraitant} action={updateSousTraitant.bind(null, sousTraitant.id)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Chantiers</h3>
          {sousTraitant.interventions.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune intervention.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sousTraitant.interventions.map((i) => (
                <li key={i.id}>
                  <Link
                    href={`/chantiers/${i.chantier.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{i.chantier.nom}</p>
                      <p className="text-xs text-slate-400">{i.chantier.reference}</p>
                    </div>
                    {i.role && <Badge tone="blue">{i.role}</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-brand-navy">Contrats de sous-traitance</h3>
            <Link
              href={`/contrats-sous-traitance/nouveau?sousTraitantId=${sousTraitant.id}`}
              className="rounded-lg bg-brand-orange px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-orange/90"
            >
              + Nouveau contrat
            </Link>
          </div>
          {sousTraitant.contrats.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun contrat.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sousTraitant.contrats.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/contrats-sous-traitance/${c.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{c.numero}</p>
                      {c.chantier && (
                        <p className="text-xs text-slate-400">{c.chantier.nom}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone="blue">{c.statut}</Badge>
                      {c.montantHT != null && (
                        <span className="text-xs font-medium text-slate-600">{formatEuros(c.montantHT)}</span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Ordres de mission</h3>
          {sousTraitant.ordresMission.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun ordre de mission.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sousTraitant.ordresMission.map((om) => (
                <li key={om.id}>
                  <Link
                    href={`/ordres-mission/${om.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{om.numero}</p>
                      <p className="text-xs text-slate-400">{om.titre}</p>
                    </div>
                    <Badge tone="blue">{om.statut}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
