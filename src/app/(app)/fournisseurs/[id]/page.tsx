export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { FournisseurForm } from "@/components/fournisseurs/fournisseur-form";
import { updateFournisseur, deleteFournisseur } from "@/lib/actions/fournisseurs";
import { DeleteButton } from "@/components/ui/delete-button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate } from "@/lib/format";

const FACTURE_STATUT_TONES: Record<string, "orange" | "green" | "red" | "blue" | "gray"> = {
  A_PAYER: "orange",
  PAYEE: "green",
  EN_RETARD: "red",
  PAYEE_PARTIELLE: "blue",
  ANNULEE: "gray",
};

const FACTURE_STATUT_LABELS: Record<string, string> = {
  A_PAYER: "À payer",
  PAYEE: "Payée",
  EN_RETARD: "En retard",
  PAYEE_PARTIELLE: "Payée partielle",
  ANNULEE: "Annulée",
};

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
      bonsLivraison: {
        orderBy: { dateLivraison: "desc" },
        take: 10,
        include: { bonCommande: { select: { numero: true } } },
      },
      facturesFournisseur: {
        orderBy: { dateReception: "desc" },
        take: 20,
        select: {
          id: true,
          numero: true,
          montantTTC: true,
          montantPaye: true,
          statut: true,
          dateReception: true,
          dateEcheance: true,
        },
      },
    },
  });

  if (!fournisseur) notFound();

  // Synthèse financière
  const totalCommandé = fournisseur.bonsCommande
    .filter((bc) => bc.statut !== "ANNULE")
    .reduce((sum, bc) => sum + bc.totalHT, 0);
  const totalFacturé = fournisseur.facturesFournisseur
    .reduce((sum, f) => sum + f.montantTTC, 0);
  const totalPayé = fournisseur.facturesFournisseur
    .reduce((sum, f) => sum + f.montantPaye, 0);
  const soldeÀPayer = totalFacturé - totalPayé;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/fournisseurs" className="text-sm text-brand-blue hover:underline">
            ← Retour aux fournisseurs
          </Link>
          <h2 className="mt-1 text-xl font-bold text-brand-navy">{fournisseur.nom}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/bons-commande?fournisseurId=${fournisseur.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-brand-blue px-3 py-2 text-xs font-semibold text-brand-blue hover:bg-brand-blue/5 transition"
          >
            + Nouveau BC
          </Link>
          <Link
            href={`/bons-commande/beton?fournisseurId=${fournisseur.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-brand-navy px-3 py-2 text-xs font-semibold text-brand-navy hover:bg-brand-navy/5 transition"
          >
            + Nouveau BC Béton
          </Link>
          <Link
            href={`/bons-commande/fournitures?fournisseurId=${fournisseur.id}`}
            className="flex items-center gap-1.5 rounded-lg border border-slate-400 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
          >
            + Nouveau BC Fournitures
          </Link>
          <DeleteButton
            action={deleteFournisseur.bind(null, fournisseur.id)}
            confirmMessage={`Supprimer le fournisseur « ${fournisseur.nom} » ?`}
          />
        </div>
      </div>

      {erreur === "suppression" && (
        <div className="rounded-lg bg-brand-orange-dark/10 px-4 py-3 text-sm text-brand-orange-dark">
          Impossible de supprimer ce fournisseur : des bons de commande ou de livraison y sont liés.
        </div>
      )}

      {/* KPIs financiers */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total commandé HT</p>
          <p className="mt-1 text-lg font-bold text-brand-navy">{formatEuros(totalCommandé)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total facturé TTC</p>
          <p className="mt-1 text-lg font-bold text-brand-navy">{formatEuros(totalFacturé)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total payé</p>
          <p className="mt-1 text-lg font-bold text-green-600">{formatEuros(totalPayé)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Solde à payer</p>
          <p className="mt-1 text-lg font-bold text-brand-orange-dark">{formatEuros(soldeÀPayer)}</p>
        </div>
      </div>

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
                      <p className="text-xs text-slate-400">
                        {bl.dateLivraison ? formatDate(bl.dateLivraison) : "—"}
                        {bl.bonCommande ? ` · BC ${bl.bonCommande.numero}` : ""}
                      </p>
                    </div>
                    <Badge tone="blue">{bl.statut}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Factures fournisseurs */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-brand-navy">Factures fournisseurs</h3>
        {fournisseur.facturesFournisseur.length === 0 ? (
          <p className="text-sm text-slate-400">Aucune facture fournisseur.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {fournisseur.facturesFournisseur.map((facture) => (
              <li key={facture.id}>
                <Link
                  href={`/finances/fournisseurs-echeancier`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-700">{facture.numero}</p>
                    <p className="text-xs text-slate-400">
                      Reçu le {formatDate(facture.dateReception)}
                      {facture.dateEcheance ? ` · Échéance ${formatDate(facture.dateEcheance)}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-700">{formatEuros(facture.montantTTC)}</p>
                    <Badge tone={FACTURE_STATUT_TONES[facture.statut] ?? "gray"}>
                      {FACTURE_STATUT_LABELS[facture.statut] ?? facture.statut}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
