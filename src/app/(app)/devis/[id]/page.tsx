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
  convertirDevisEnFacture,
  updateMentionsDevis,
  genererLienSignature,
} from "@/lib/actions/devis";
import { SignatureSection } from "@/components/devis/signature-section";
import { DeleteButton } from "@/components/ui/delete-button";
import { buttonClasses } from "@/components/ui/button";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { PdfPreviewModal } from "@/components/ui/pdf-preview-modal";
import { prisma } from "@/lib/prisma";
import { formatEuros, formatDate, clientDisplayName } from "@/lib/format";

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
      },
    }),
    prisma.chantier.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
    prisma.ouvrage.findMany({
      where: { actif: true },
      orderBy: [{ corpsEtat: "asc" }, { code: "asc" }],
      select: {
        id: true, code: true, corpsEtat: true, designation: true,
        unite: true, tauxTVA: true, description: true,
        prixUnitaire: true, prixFourniture: true, prixPose: true,
        ecoPrixTotal: true, optPrixTotal: true, premPrixTotal: true,
      },
    }),
  ]);

  if (!devis) notFound();

  return (
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
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-2xl font-bold text-brand-navy">{formatEuros(devis.totalTTC)}</p>
          <DeleteButton
            action={deleteDevis.bind(null, devis.id)}
            confirmMessage={`Supprimer le devis ${devis.numero} ? Cette action est irréversible.`}
          />
        </div>
      </div>

      <DevisEntete devis={devis} client={devis.client} parametres={parametres} />

      {erreur === "suppression" && (
        <div className="rounded-lg bg-brand-orange-dark/10 px-4 py-3 text-sm text-brand-orange-dark">
          Impossible de supprimer ce devis : des factures ou avenants y sont encore liés.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <PdfPreviewModal
          href={`/apercu/devis/${devis.id}`}
          label={`Aperçu PDF — ${devis.numero}`}
          buttonLabel="📄 Aperçu PDF"
        />
        {devis.type === "INITIAL" && (
          <form action={creerAvenant.bind(null, devis.id)}>
            <button type="submit" className={buttonClasses("secondary")}>
              + Créer un avenant / devis de travaux supplémentaires
            </button>
          </form>
        )}
        {devis.statut === "ACCEPTE" && (
          <form action={convertirDevisEnFacture.bind(null, devis.id)}>
            <button type="submit" className={buttonClasses("primary")}>
              Convertir en facture
            </button>
          </form>
        )}
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

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-semibold text-brand-navy">Informations générales</h3>
        <DevisForm devis={devis} chantiers={chantiers} action={updateDevisInfo.bind(null, devis.id)} />
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
  );
}
