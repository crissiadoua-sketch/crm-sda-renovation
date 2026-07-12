export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ChantierForm } from "@/components/chantiers/chantier-form";
import { ChecklistDocuments } from "@/components/chantiers/checklist-documents";
import { updateChantier, deleteChantier } from "@/lib/actions/chantiers";
import { DeleteButton } from "@/components/ui/delete-button";
import { LinkButton } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";

const chantierStatutTones: Record<string, BadgeTone> = {
  PROSPECT: "orange",
  DEVIS_ENVOYE: "blue",
  EN_COURS: "navy",
  TERMINE: "green",
  ANNULE: "gray",
};

const chantierStatutLabels: Record<string, string> = {
  PROSPECT: "Prospect",
  DEVIS_ENVOYE: "Devis envoyé",
  EN_COURS: "En cours",
  TERMINE: "Terminé",
  ANNULE: "Annulé",
};

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

const evenementTypeLabels: Record<string, string> = {
  VISITE: "Visite",
  INTERVENTION: "Intervention",
  LIVRAISON: "Livraison",
  REUNION: "Réunion",
  AUTRE: "Autre",
};

const depenseCategorieLabels: Record<string, string> = {
  MATERIAUX: "Matériaux",
  MAIN_OEUVRE: "Main d'œuvre",
  SOUS_TRAITANCE: "Sous-traitance",
  TRANSPORT: "Transport",
  ADMINISTRATIF: "Administratif",
  AUTRE: "Autre",
};

export default async function ChantierDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;

  const [chantier, clients] = await Promise.all([
    prisma.chantier.findUnique({
      where: { id },
      include: {
        client: true,
        devis: { orderBy: { dateCreation: "desc" } },
        factures: { orderBy: { dateEmission: "desc" } },
        bonsCommande: { orderBy: { createdAt: "desc" } },
        bonsLivraison: { orderBy: { createdAt: "desc" } },
        bonsCommandeBeton: { orderBy: { createdAt: "desc" } },
        documents: { orderBy: { createdAt: "desc" } },
        evenements: { orderBy: { dateDebut: "asc" } },
        depenses: { orderBy: { date: "desc" } },
        sousTraitants: { include: { sousTraitant: true } },
        contrats: { orderBy: { createdAt: "desc" } },
        ordresMission: { orderBy: { createdAt: "desc" } },
        checklistDocuments: true,
        livretAccueil: { select: { id: true } },
      },
    }),
    prisma.client.findMany({ orderBy: { createdAt: "desc" } }),
  ]);

  if (!chantier) notFound();

  // -- Synthèse financière -----------------------------------------------
  const totalFactureHT = chantier.factures.reduce((sum, f) => sum + f.totalHT, 0);
  const totalFactureTTC = chantier.factures.reduce((sum, f) => sum + f.totalTTC, 0);
  const totalEncaisse = chantier.factures.reduce((sum, f) => sum + f.montantPaye, 0);
  const resteAEncaisser = totalFactureTTC - totalEncaisse;
  const totalDepenses = chantier.depenses.reduce((sum, d) => sum + d.montant, 0);
  // Coût des approvisionnements engagés (BC + BCB)
  const totalBC = chantier.bonsCommande.reduce((sum, bc) => sum + bc.totalHT, 0);
  const totalBCB = chantier.bonsCommandeBeton.reduce(
    (sum, bcb) => sum + (bcb.prixM3 != null ? bcb.prixM3 * bcb.qteTotale : 0),
    0,
  );
  const totalCommandes = totalBC + totalBCB;
  const margeBrute = totalFactureHT - totalDepenses;
  const margePourcentage = totalFactureHT > 0 ? (margeBrute / totalFactureHT) * 100 : null;

  const now = new Date();
  const prochainEvenement = chantier.evenements.find((e) => e.dateDebut >= now);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/chantiers" className="text-sm text-brand-blue hover:underline">
            ← Retour aux chantiers
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{chantier.nom}</h2>
            <Badge tone={chantierStatutTones[chantier.statut] ?? "gray"}>
              {chantierStatutLabels[chantier.statut] ?? chantier.statut}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {chantier.reference} ·{" "}
            <Link href={`/clients/${chantier.client.id}`} className="text-brand-blue hover:underline">
              {clientDisplayName(chantier.client)}
            </Link>
            {chantier.ville ? ` · ${chantier.ville}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/chantiers/${chantier.id}/livret-accueil`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            📋 Livret d&apos;accueil
          </Link>
          <a
            href={`/apercu/livret-accueil/${chantier.id}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
          >
            👁 Aperçu livret
          </a>
          <DeleteButton
            action={deleteChantier.bind(null, chantier.id)}
            confirmMessage={`Supprimer le chantier « ${chantier.nom} » ? Cette action est irréversible.`}
          />
        </div>
      </div>

      {erreur === "suppression" && (
        <div className="rounded-lg bg-brand-orange-dark/10 px-4 py-3 text-sm text-brand-orange-dark">
          Impossible de supprimer ce chantier : des devis, factures, documents ou autres éléments y sont encore liés.
        </div>
      )}

      {/* Synthèse financière */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-7">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Budget estimé</p>
          <p className="mt-1 text-lg font-bold text-brand-navy">
            {chantier.budgetEstime != null ? formatEuros(chantier.budgetEstime) : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Facturé HT</p>
          <p className="mt-1 text-lg font-bold text-brand-navy">{formatEuros(totalFactureHT)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Facturé TTC</p>
          <p className="mt-1 text-lg font-bold text-brand-navy">{formatEuros(totalFactureTTC)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reste à encaisser</p>
          <p className={`mt-1 text-lg font-bold ${resteAEncaisser > 0 ? "text-brand-orange-dark" : "text-brand-navy"}`}>
            {formatEuros(resteAEncaisser)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Commandes HT</p>
          <p className="mt-1 text-lg font-bold text-brand-navy">{formatEuros(totalCommandes)}</p>
          <p className="text-[10px] text-slate-400">BC + BCB engagés</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dépenses</p>
          <p className="mt-1 text-lg font-bold text-brand-navy">{formatEuros(totalDepenses)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Marge brute</p>
          <p className={`mt-1 text-lg font-bold ${margeBrute >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatEuros(margeBrute)}
            {margePourcentage != null && (
              <span className="ml-1 text-sm font-medium text-slate-400">
                ({margePourcentage.toFixed(1)} %)
              </span>
            )}
          </p>
        </div>
      </div>

      {prochainEvenement && (
        <div className="rounded-lg bg-brand-blue/10 px-4 py-3 text-sm text-brand-blue-dark">
          Prochain événement : <strong>{prochainEvenement.titre}</strong> le {formatDate(prochainEvenement.dateDebut)}
        </div>
      )}

      {/* Tableau de bord suivi documents */}
      <ChecklistDocuments chantier={chantier} />

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <ChantierForm chantier={chantier} clients={clients} action={updateChantier.bind(null, chantier.id)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Devis */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-brand-navy">Devis</h3>
            <div className="flex items-center gap-2">
              <LinkButton href={`/devis/nouveau?chantierId=${chantier.id}`} variant="secondary" className="px-2.5 py-1 text-xs">
                + Nouveau devis
              </LinkButton>
            </div>
          </div>

          {/* Bandeau comparaison automatique dès 2 variantes en brouillon */}
          {(() => {
            const brouillons = chantier.devis.filter((d) => d.statut === "BROUILLON" && d.type === "INITIAL");
            if (brouillons.length < 2) return null;
            return (
              <Link
                href={`/devis/comparer/${chantier.id}`}
                className="mb-3 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-100 transition"
              >
                <span className="text-base">🔀</span>
                <span>Comparer les {brouillons.length} variantes en brouillon</span>
                <span className="ml-auto text-xs font-normal text-violet-500">Tableau comparatif →</span>
              </Link>
            );
          })()}

          {chantier.devis.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun devis.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {chantier.devis.map((devis) => (
                <li key={devis.id}>
                  <Link
                    href={`/devis/${devis.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">
                        {devis.numero}
                        {devis.type === "AVENANT" && (
                          <Badge tone="orange" className="ml-2">
                            Avenant
                          </Badge>
                        )}
                      </p>
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

        {/* Factures */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-brand-navy">Factures</h3>
            <LinkButton href={`/factures/nouveau?chantierId=${chantier.id}`} variant="secondary" className="px-2.5 py-1 text-xs">
              + Nouvelle facture
            </LinkButton>
          </div>
          {chantier.factures.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune facture.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {chantier.factures.map((facture) => (
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

        {/* Planning */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-brand-navy">Planning</h3>
            <div className="flex items-center gap-3">
              <Link
                href={`/chantiers/${chantier.id}/planning`}
                className="text-sm text-brand-blue hover:underline"
              >
                Voir le planning prévisionnel →
              </Link>
              <Link
                href={`/chantiers/${chantier.id}/metre`}
                className="text-sm text-brand-blue hover:underline"
              >
                Métré →
              </Link>
            </div>
          </div>
          {chantier.evenements.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun événement planifié.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {chantier.evenements.map((evenement) => (
                <li
                  key={evenement.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-700">{evenement.titre}</p>
                    <p className="text-xs text-slate-400">{formatDate(evenement.dateDebut)}</p>
                  </div>
                  <Badge tone="blue">{evenementTypeLabels[evenement.type] ?? evenement.type}</Badge>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Dépenses */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Dépenses</h3>
          {chantier.depenses.length === 0 ? (
            <p className="text-sm text-slate-400">Aucune dépense enregistrée.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {chantier.depenses.map((depense) => (
                <li
                  key={depense.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-700">{depense.libelle}</p>
                    <p className="text-xs text-slate-400">{formatDate(depense.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-700">{formatEuros(depense.montant)}</p>
                    <Badge tone="gray">{depenseCategorieLabels[depense.categorie] ?? depense.categorie}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sous-traitants */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Sous-traitants intervenants</h3>
          {chantier.sousTraitants.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun sous-traitant affecté.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {chantier.sousTraitants.map((cs) => (
                <li key={cs.id}>
                  <Link
                    href={`/sous-traitants/${cs.sousTraitant.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">{cs.sousTraitant.nom}</p>
                      <p className="text-xs text-slate-400">{cs.sousTraitant.specialite}</p>
                    </div>
                    {cs.role && <Badge tone="blue">{cs.role}</Badge>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Contrats de sous-traitance + Ordres de mission */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Contrats &amp; ordres de mission</h3>
          {chantier.contrats.length === 0 && chantier.ordresMission.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun contrat ni ordre de mission.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {chantier.contrats.map((contrat) => (
                <li key={contrat.id}>
                  <Link
                    href={`/contrats-sous-traitance/${contrat.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <p className="font-medium text-slate-700">Contrat {contrat.numero}</p>
                    <Badge tone="blue">{contrat.statut}</Badge>
                  </Link>
                </li>
              ))}
              {chantier.ordresMission.map((om) => (
                <li key={om.id}>
                  <Link
                    href={`/ordres-mission/${om.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <p className="font-medium text-slate-700">Ordre {om.numero}</p>
                    <Badge tone="blue">{om.statut}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bons de commande / livraison */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold text-brand-navy">Approvisionnements &amp; livraisons</h3>
            <div className="flex gap-2">
              <Link href={`/previsionnel?chantierId=${chantier.id}`} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-brand-blue hover:bg-blue-50">Prévisionnel →</Link>
              <Link href={`/bons-commande/beton?chantierId=${chantier.id}&creer=1`} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">+ BC Béton</Link>
              <Link href={`/bons-commande?chantierId=${chantier.id}&creer=1`} className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50">+ BC</Link>
            </div>
          </div>
          {chantier.bonsCommande.length === 0 && chantier.bonsLivraison.length === 0 && chantier.bonsCommandeBeton.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun bon de commande ni de livraison.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {chantier.bonsCommandeBeton.map((bcb) => (
                <li key={bcb.id}>
                  <Link
                    href={`/bons-commande/beton/${bcb.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <div>
                      <p className="font-medium text-slate-700">🧱 {bcb.numero}</p>
                      <p className="text-xs text-slate-400">{bcb.classeResistance ?? "Béton"}{bcb.qteTotale ? ` · ${bcb.qteTotale} m³` : ""}</p>
                    </div>
                    <div className="text-right">
                      {bcb.prixM3 != null && bcb.qteTotale ? (
                        <p className="font-medium text-slate-700">{formatEuros(bcb.prixM3 * bcb.qteTotale)}</p>
                      ) : null}
                      <Badge tone="blue">{bcb.statut}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
              {chantier.bonsCommande.map((bc) => (
                <li key={bc.id}>
                  <Link
                    href={`/bons-commande/${bc.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <p className="font-medium text-slate-700">🛒 Commande {bc.numero}</p>
                    <div className="text-right">
                      <p className="font-medium text-slate-700">{formatEuros(bc.totalTTC)}</p>
                      <Badge tone="blue">{bc.statut}</Badge>
                    </div>
                  </Link>
                </li>
              ))}
              {chantier.bonsLivraison.map((bl) => (
                <li key={bl.id}>
                  <Link
                    href={`/bons-livraison/${bl.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                  >
                    <p className="font-medium text-slate-700">🚚 Livraison {bl.numero}</p>
                    <Badge tone="blue">{bl.statut}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Documents */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Documents</h3>
          {chantier.documents.length === 0 ? (
            <p className="text-sm text-slate-400">Aucun document attaché.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {chantier.documents.map((document) => (
                <li
                  key={document.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <p className="font-medium text-slate-700">{document.nom}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
