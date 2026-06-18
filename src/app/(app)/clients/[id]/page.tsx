import Link from "next/link";
import { notFound } from "next/navigation";
import { ClientForm } from "@/components/clients/client-form";
import { updateClient, deleteClient } from "@/lib/actions/clients";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

function formatEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/clients" className="text-sm text-brand-blue hover:underline">
            ← Retour aux clients
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">{displayName}</h2>
        </div>
        <DeleteButton
          action={deleteClient.bind(null, client.id)}
          confirmMessage={`Supprimer le client « ${displayName} » ? Cette action est irréversible.`}
        />
      </div>

      {erreur === "suppression" && (
        <div className="rounded-lg bg-brand-orange-dark/10 px-4 py-3 text-sm text-brand-orange-dark">
          Impossible de supprimer ce client : des chantiers, devis ou factures y sont encore liés.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ClientForm client={client} action={updateClient.bind(null, client.id)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Chantiers</h3>
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
          <h3 className="mb-3 font-semibold text-brand-navy">Devis</h3>
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
          <h3 className="mb-3 font-semibold text-brand-navy">Factures</h3>
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
