export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { DevisForm } from "@/components/devis/devis-form";
import { DevisEntete } from "@/components/devis/devis-entete";
import { DevisLignesEditor } from "@/components/devis/devis-lignes-editor";
import { DevisCouverture } from "@/components/devis/devis-couverture";
import {
  updateDevisInfo,
  updateDevisLignes,
  deleteDevis,
  creerAvenant,
  updateMentionsDevis,
  genererLienSignature,
} from "@/lib/actions/devis";
import { creerFactureTotaleDepuisDevis } from "@/lib/actions/factures";
import { PlanificationFacturationModal } from "@/components/devis/planification-facturation-modal";
import { SignatureSection } from "@/components/devis/signature-section";
import { DeleteButton } from "@/components/ui/delete-button";
import { buttonClasses } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { PdfPreviewModal } from "@/components/ui/pdf-preview-modal";
import { FullscreenToggle } from "@/components/ui/fullscreen-toggle";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";
import {
  ShoppingCart,
  CalendarClock,
  GitCompare,
  Receipt,
  ArrowRight,
} from "lucide-react";
import { EnvoyerEmailModal } from "@/components/ui/envoyer-email-modal";
import { envoyerDevisParEmail } from "@/lib/actions/email-documents";

const statutTones: Record<string, BadgeTone> = {
  BROUILLON: "gray",
  ENVOYE: "blue",
  ACCEPTE: "green",
  REFUSE: "red",
  EXPIRE: "gray",
};

const statutLabels: Record<string, string> = {
  BROUILLON: "Brouillon",
  ENVOYE: "Envoyé",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  EXPIRE: "Expiré",
};

export default async function DevisDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erreur?: string }>;
}) {
  const { id } = await params;
  const { erreur } = await searchParams;

  const [devis, chantiers, parametres, ouvrages] = await Promise.all([
    prisma.devis.findUnique({
      where: { id },
      include: {
        chantier: true,
        client: true,
        lignes: { orderBy: { ordre: "asc" } },
        devisParent: true,
        avenants: { orderBy: { createdAt: "asc" } },
        signature: { select: { nomSignataire: true, dateSignature: true } },
        factures: {
          select: { id: true, numero: true, totalHT: true, totalTTC: true, statut: true, type: true, dateEmission: true },
          orderBy: { dateEmission: "asc" },
        },
      },
    }),
    prisma.chantier.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: { select: { nom: true, prenom: true, raisonSociale: true } } },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
    prisma.ouvrage.findMany({
      where: { actif: true },
      orderBy: [{ corpsEtat: "asc" }, { code: "asc" }],
      select: {
        id: true, code: true, corpsEtat: true, designation: true,
        unite: true, tauxTVA: true, description: true, styleTexte: true,
        clausesReserves: true,
        prixUnitaire: true, prixFourniture: true, prixPose: true,
        ecoPrixTotal: true, optPrixTotal: true, premPrixTotal: true,
      },
    }),
  ]);

  if (!devis) notFound();

  // Compte les autres variantes INITIAL non expirées sur le même chantier
  const nbVariantes = await prisma.devis.count({
    where: { chantierId: devis.chantierId, type: "INITIAL", statut: { notIn: ["REFUSE", "EXPIRE"] }, id: { not: id } },
  });

  const factureStatutTones: Record<string, BadgeTone> = {
    BROUILLON: "gray", ENVOYEE: "blue", PAYEE_PARTIELLE: "orange",
    PAYEE: "green", EN_RETARD: "red", ANNULEE: "gray",
  };
  const factureStatutLabels: Record<string, string> = {
    BROUILLON: "Brouillon", ENVOYEE: "Envoyée", PAYEE_PARTIELLE: "Payée partiellement",
    PAYEE: "Payée", EN_RETARD: "En retard", ANNULEE: "Annulée",
  };

  return (
    <FullscreenToggle>
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/devis" className="text-sm text-brand-blue hover:underline">
            ← Retour aux devis
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-brand-navy">{devis.numero}</h2>
            <Badge tone={statutTones[devis.statut] ?? "gray"}>{statutLabels[devis.statut] ?? devis.statut}</Badge>
            {devis.type === "AVENANT" && <Badge tone="orange">Avenant</Badge>}
          </div>
          <p className="mt-1 text-sm text-slate-500">
            <Link href={`/chantiers/${devis.chantier.id}`} className="text-brand-blue hover:underline">
              {devis.chantier.reference} — {devis.chantier.nom}
            </Link>
            {" · "}
            <Link href={`/clients/${devis.client.id}`} className="text-brand-blue hover:underline">
              {clientDisplayName(devis.client)}
            </Link>
          </p>
          {devis.devisParent && (
            <p className="mt-1 text-sm text-brand-orange-dark">
              Avenant au devis{" "}
              <Link href={`/devis/${devis.devisParent.id}`} className="hover:underline">
                {devis.devisParent.numero}
              </Link>
            </p>
          )}
          {/* Raccourcis inter-modules */}
          <div className="mt-2 flex flex-wrap gap-2">
            {nbVariantes > 0 && devis.type === "INITIAL" && (
              <Link
                href={`/devis/comparer/${devis.chantierId}`}
                className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 hover:bg-violet-100 transition"
              >
                <GitCompare className="h-3.5 w-3.5" />
                {nbVariantes + 1} variantes — Comparer
              </Link>
            )}
            <Link
              href={`/previsionnel?chantierId=${devis.chantierId}`}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
            >
              <CalendarClock className="h-3.5 w-3.5 text-brand-blue" />
              Prévisionnel
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-2xl font-bold text-brand-navy">{formatEuros(devis.totalTTC)}</p>
          {devis.statut === "BROUILLON" && (
            <DeleteButton
              action={deleteDevis.bind(null, devis.id)}
              confirmMessage={`Supprimer le devis ${devis.numero} ? Cette action est irréversible.`}
            />
          )}
        </div>
      </div>

      <DevisEntete devis={devis} client={devis.client} parametres={parametres} />

      {erreur === "suppression" && (
        <div className="rounded-lg bg-brand-orange-dark/10 px-4 py-3 text-sm text-brand-orange-dark">
          Impossible de supprimer ce devis : des factures ou avenants y sont encore liés.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <EnvoyerEmailModal
          action={envoyerDevisParEmail.bind(null, devis.id)}
          defaultTo={devis.client.email ?? ""}
          documentLabel={`devis ${devis.numero}`}
          defaultSubject={`Devis ${devis.numero}${devis.objet ? ` — ${devis.objet}` : ""} — SDA Rénovation`}
          vueOptions={[
            { value: "client",      label: "Vue client",       description: "Résumé + lien de consultation sécurisé",   icon: "✉️" },
            { value: "commerciale", label: "Vue commerciale",  description: "Détail complet avec prix ligne par ligne",  icon: "📋" },
            { value: "synthese",    label: "Vue synthèse",     description: "Totaux HT / TVA / TTC uniquement",          icon: "📊" },
            { value: "sans_prix",   label: "Sans prix",        description: "Désignations et quantités, sans montants",  icon: "🔒" },
          ]}
          defaultVue="client"
        />
        <PdfPreviewModal
          href={`/apercu/devis/${devis.id}`}
          label={`Aperçu PDF interne — ${devis.numero}`}
          buttonLabel="📄 PDF interne (avec prix)"
        />
        <PdfPreviewModal
          href={`/apercu/devis/${devis.id}?descriptif=1`}
          label={`Aperçu PDF descriptif — ${devis.numero}`}
          buttonLabel="📄 PDF descriptif (sous-totaux)"
        />
        <PdfPreviewModal
          href={`/apercu/devis/${devis.id}?synthese=1`}
          label={`Aperçu PDF synthèse — ${devis.numero}`}
          buttonLabel="📄 PDF synthèse (totaux)"
        />
        <PdfPreviewModal
          href={`/apercu/devis/${devis.id}?sansPrix=1`}
          label={`Aperçu PDF sans prix — ${devis.numero}`}
          buttonLabel="📄 PDF sans prix"
        />
        {devis.type === "INITIAL" && (
          <form action={creerAvenant.bind(null, devis.id)}>
            <button type="submit" className={buttonClasses("secondary")}>
              + Créer un avenant / devis de travaux supplémentaires
            </button>
          </form>
        )}
        <PlanificationFacturationModal
          devisId={devis.id}
          devisNumero={devis.numero}
          totalHT={devis.totalHT}
          totalTTC={devis.totalTTC}
          montantDéjàFacturéHT={devis.factures.reduce((s, f) => s + f.totalHT, 0)}
        />
        <Link
          href={`/bons-commande?chantierId=${devis.chantierId}&creer=1`}
          className={buttonClasses("secondary")}
        >
          <ShoppingCart className="h-4 w-4" />
          Créer BC matériaux
        </Link>
        <Link
          href={`/bons-commande/beton?chantierId=${devis.chantierId}&creer=1`}
          className={buttonClasses("secondary")}
        >
          <ShoppingCart className="h-4 w-4" />
          Créer BC Béton
        </Link>
        <form action={creerFactureTotaleDepuisDevis.bind(null, devis.id)}>
          <button
            type="submit"
            className={buttonClasses("secondary")}
            title="Crée une facture brouillon avec toutes les lignes de ce devis"
          >
            <Receipt className="h-4 w-4" />
            Facturer ce devis
          </button>
        </form>
      </div>

      {devis.avenants.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 font-semibold text-brand-navy">Avenants / travaux supplémentaires</h3>
          <ul className="flex flex-col gap-2">
            {devis.avenants.map((avenant) => (
              <li key={avenant.id}>
                <Link
                  href={`/devis/${avenant.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-brand-blue/40 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-700">{avenant.numero}</p>
                    <p className="text-xs text-slate-400">{formatDate(avenant.dateCreation)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-700">{formatEuros(avenant.totalTTC)}</p>
                    <Badge tone={statutTones[avenant.statut] ?? "gray"}>
                      {statutLabels[avenant.statut] ?? avenant.statut}
                    </Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Factures liées ── */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-brand-navy flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-400" />
            Factures créées depuis ce devis
          </h3>
          <PlanificationFacturationModal
            devisId={devis.id}
            devisNumero={devis.numero}
            totalHT={devis.totalHT}
            totalTTC={devis.totalTTC}
            montantDéjàFacturéHT={devis.factures.reduce((s, f) => s + f.totalHT, 0)}
          />
        </div>
        {devis.factures.length === 0 ? (
          <p className="text-sm text-slate-400">
            Aucune facture générée — utilisez &ldquo;Planifier la facturation&rdquo; ci-dessus.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {devis.factures.map((facture) => (
              <li key={facture.id}>
                <Link
                  href={`/factures/${facture.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm hover:border-emerald-200 hover:bg-emerald-50/30"
                >
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-700">{facture.numero}</p>
                        {facture.type !== "STANDARD" && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            facture.type === "ACOMPTE" ? "bg-blue-100 text-blue-700" :
                            facture.type === "SITUATION" ? "bg-orange-100 text-orange-700" :
                            facture.type === "SOLDE" ? "bg-green-100 text-green-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {facture.type === "ACOMPTE" ? "Acompte" : facture.type === "SITUATION" ? "Situation" : facture.type === "SOLDE" ? "Solde" : facture.type}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{formatDate(facture.dateEmission)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold text-emerald-700">{formatEuros(facture.totalTTC)}</p>
                      <p className="text-xs text-slate-400">{formatEuros(facture.totalHT)} HT</p>
                    </div>
                    <Badge tone={factureStatutTones[facture.statut] ?? "gray"}>
                      {factureStatutLabels[facture.statut] ?? facture.statut}
                    </Badge>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-brand-navy">Informations générales</h3>
        <DevisForm devis={devis} chantiers={chantiers} action={updateDevisInfo.bind(null, devis.id)} isSigne={!!devis.signature} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-5 font-semibold text-brand-navy">Page de garde</h3>
        <DevisCouverture devis={devis} />
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-brand-navy">Métré</h3>
        <DevisLignesEditor
          lignes={devis.lignes}
          action={updateDevisLignes.bind(null, devis.id)}
          ouvrages={ouvrages}
        />
      </div>

      <SignatureSection
        devisId={devis.id}
        devisNumero={devis.numero}
        signatureToken={devis.signatureToken ?? null}
        signature={devis.signature ? { nomSignataire: devis.signature.nomSignataire, dateSignature: devis.signature.dateSignature.toISOString() } : null}
        genererLien={genererLienSignature.bind(null, devis.id)}
      />

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-brand-navy">
          Mentions complémentaires &amp; Notes
        </h3>
        <form action={updateMentionsDevis.bind(null, id)}>
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Mentions libres{" "}
                <span className="text-xs font-normal text-slate-400">
                  (visibles dans le PDF — conditions particulières, garanties, délais…)
                </span>
              </label>
              <textarea
                name="mentionsLibres"
                rows={4}
                defaultValue={devis.mentionsLibres ?? ""}
                placeholder="Ex: Délai d'exécution : 3 semaines après accord du devis. Garantie décennale incluse. Paiement : 30% acompte à la commande…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Notes internes{" "}
                <span className="text-xs font-normal text-slate-400">
                  (non visibles dans le PDF)
                </span>
              </label>
              <textarea
                name="notesInternes"
                rows={3}
                defaultValue={devis.notesInternes ?? ""}
                placeholder="Notes pour l'équipe interne (non imprimées)…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blue-dark transition"
              >
                Enregistrer les mentions
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
    </FullscreenToggle>
  );
}
