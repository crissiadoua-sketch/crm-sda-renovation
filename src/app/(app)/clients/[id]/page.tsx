export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
import { updateClient, deleteClient } from "@/lib/actions/clients";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { LinkButton } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate } from "@/lib/format";

const devisStatutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  ENVOYE: "blue",
  ACCEPTE: "green",
  REFUSE: "red",
  EXPIRE: "gray",
};

const factureStatutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  ENVOYEE: "blue",
  PAYEE_PARTIELLE: "orange",
  PAYEE: "green",
  EN_RETARD: "red",
  ANNULEE: "gray",
};

const chantierStatutTones: Record<string, BadgeTone> = {
  PROSPECT: "orange",
  DEVIS_ENVOYE: "blue",
  EN_COURS: "navy",
  TERMINE: "green",
  ANNULE: "gray",
};

export default async function ClientDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      chantiers: { orderBy: { createdAt: "desc" } },
      devis: { orderBy: { dateCreation: "desc" } },
      factures: { orderBy: { dateEmission: "desc" } },
    },
  });

  if (!client) notFound();

  const displayName =
    client.type === "PA"
      ? `${client.civilite ? client.civilite + " " : ""}${client.prenom ? client.prenom + " " : ""}${client.nom}`
      : client.raisonSociale || client.nom;

  // ── Synthèse financière client ─────────────────────────────────────────
  const totalDevisTTC = client.devis
    .filter((d) => d.statut !== "REFUSE" && d.statut !== "EXPIRE")
    .reduce((s, d) => s + d.totalTTC, 0);
  const totalFactureTTC = client.factures
    .filter((f) => f.statut !== "ANNULEE")
    .reduce((s, f) => s + f.totalTTC, 0);
  const totalEncaisse = client.factures
    .filter((f) => f.statut !== "ANNULEE")
    .reduce((s, f) => s + f.montantPaye, 0);
  const resteAEncaisser = totalFactureTTC - totalEncaisse;
  const chantiersEnCours = client.chantiers.filter((c) => c.statut === "EN_COURS").length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/clients" className="text-sm text-brand-blue hover:underline">
            ← Retour aux clients
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">{displayName}</h2>
          {client.email && (
            <a href={`mailto:${client.email}`} className="text-sm text-brand-blue hover:underline">
              {client.email}
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href={`/chantiers/nouveau?clientId=${client.id}`} variant="secondary">
            + Nouveau chantier
          </LinkButton>
          <LinkButton href={`/devis/nouveau?clientId=${client.id}`} variant="secondary">
            + Nouveau devis
          </LinkButton>
          <DeleteButton
            action={deleteClient.bind(null, client.id)}
            confirmMessage={`Supprimer le client « ${displayName} » ? Cette action est irréversible.`}
          />
        </div>
      </div>

      {erreur === "suppression" && (
        <div className="rounded-lg bg-brand-orange-dark/10 px-4 py-3 text-sm text-brand-orange-dark">
          Impossible de supprimer ce client : des chantiers, devis ou factures y sont encore liés.
        </div>
      )}

      {/* ── Synthèse financière ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Devis actifs TTC</p>
          <p className="mt-1 text-lg font-bold text-brand-navy">{formatEuros(totalDevisTTC)}</p>
          <p className="text-[10px] text-slate-400">{client.devis.length} devis total</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Facturé TTC</p>
          <p className="mt-1 text-lg font-bold text-brand-navy">{formatEuros(totalFactureTTC)}</p>
          <p className="text-[10px] text-slate-400">{client.factures.length} facture{client.factures.length > 1 ? "s" : ""}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Encaissé</p>
          <p className="mt-1 text-lg font-bold text-green-600">{formatEuros(totalEncaisse)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reste à encaisser</p>
          <p className={`mt-1 text-lg font-bold ${resteAEncaisser > 0 ? "text-brand-orange-dark" : "text-brand-navy"}`}>
            {formatEuros(resteAEncaisser)}
          </p>
          {chantiersEnCours > 0 && (
            <p className="text-[10px] text-slate-400">{chantiersEnCours} chantier{chantiersEnCours > 1 ? "s" : ""} en cours</p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ClientForm client={client} action={updateClient.bind(null, client.id)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-brand-navy">Chantiers</h3>
            <LinkButton href={`/chantiers/nouveau?clientId=${client.id}`} variant="secondary" className="px-2.5 py-1 text-xs">
              + Nouveau
            </LinkButton>
          </div>
          {client.chantiers.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun chantier.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {client.chantiers.map((chantier) => (
                <li key={chantier.id}>
                  <Link
                    href={`/chantiers/${chantier.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{chantier.nom}</p>
                      <p className="text-xs text-slate-400">{chantier.reference}</p>
                    </div>
                    <Badge tone={chantierStatutTones[chantier.statut] ?? "gray"}>
                      {chantier.statut.replaceAll("_", " ")}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-brand-navy">Devis</h3>
            <LinkButton href={`/devis/nouveau?clientId=${client.id}`} variant="secondary" className="px-2.5 py-1 text-xs">
              + Nouveau
            </LinkButton>
          </div>
          {client.devis.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun devis.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {client.devis.map((devis) => (
                <li key={devis.id}>
                  <Link
                    href={`/devis/${devis.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{devis.numero}</p>
                      <p className="text-xs text-slate-400">{formatDate(devis.dateCreation)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-700">{formatEuros(devis.totalTTC)}</p>
                      <Badge tone={devisStatutTones[devis.statut] ?? "gray"}>{devis.statut}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-brand-navy">Factures</h3>
            <Link href={`/factures?clientId=${client.id}`} className="text-xs text-brand-blue hover:underline">
              Voir tout →
            </Link>
          </div>
          {client.factures.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune facture.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {client.factures.map((facture) => (
                <li key={facture.id}>
                  <Link
                    href={`/factures/${facture.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{facture.numero}</p>
                      <p className="text-xs text-slate-400">{formatDate(facture.dateEmission)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-700">{formatEuros(facture.totalTTC)}</p>
                      <Badge tone={factureStatutTones[facture.statut] ?? "gray"}>{facture.statut}</Badge>
                    </div>
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
