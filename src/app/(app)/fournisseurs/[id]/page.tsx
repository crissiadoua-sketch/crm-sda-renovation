import Link from "next/link";
import { notFound } from "next/navigation";
import { FournisseurForm } from "@/components/fournisseurs/fournisseur-form";
import { updateFournisseur, deleteFournisseur } from "@/lib/actions/fournisseurs";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";

function formatEuros(value: number) {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(date);
}

export default async function FournisseurDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;

  const fournisseur = await prisma.fournisseur.findUnique({
    where: { id },
    include: {
      bonsCommande: { orderBy: { dateCreation: "desc" } },
      bonsLivraison: { orderBy: { dateLivraison: "desc" } },
    },
  });

  if (!fournisseur) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/fournisseurs" className="text-sm text-brand-blue hover:underline">
            ← Retour aux fournisseurs
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">{fournisseur.nom}</h2>
        </div>
        <DeleteButton
          action={deleteFournisseur.bind(null, fournisseur.id)}
          confirmMessage={`Supprimer le fournisseur « ${fournisseur.nom} » ?`}
        />
      </div>

      {erreur === "suppression" && (
        <div className="rounded-lg bg-brand-orange-dark/10 px-4 py-3 text-sm text-brand-orange-dark">
          Impossible de supprimer ce fournisseur : des bons de commande ou de livraison y sont liés.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <FournisseurForm fournisseur={fournisseur} action={updateFournisseur.bind(null, fournisseur.id)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Bons de commande</h3>
          {fournisseur.bonsCommande.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun bon de commande.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {fournisseur.bonsCommande.map((bc) => (
                <li key={bc.id}>
                  <Link
                    href={`/bons-commande/${bc.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{bc.numero}</p>
                      <p className="text-xs text-slate-400">{formatDate(bc.dateCreation)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-slate-700">{formatEuros(bc.totalTTC)}</p>
                      <Badge tone="blue">{bc.statut}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Bons de livraison</h3>
          {fournisseur.bonsLivraison.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun bon de livraison.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {fournisseur.bonsLivraison.map((bl) => (
                <li key={bl.id}>
                  <Link
                    href={`/bons-livraison/${bl.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{bl.numero}</p>
                      <p className="text-xs text-slate-400">{formatDate(bl.dateLivraison)}</p>
                    </div>
                    <Badge tone="blue">{bl.statut}</Badge>
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
