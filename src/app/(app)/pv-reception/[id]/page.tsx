export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/dal";
import { PvReceptionEditor } from "./pv-editor";
import { envoyerPvReceptionParEmail } from "@/lib/actions/email-documents";
import { formatDate } from "@/lib/format";
import { SdaSignaturePad } from "./sda-signature-pad";

export default async function PvReceptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, pvr, fournisseurs, chantiers, clients, sousTraitants, contratsSTR] = await Promise.all([
    getUser(),
    prisma.pvReception.findUnique({
      where: { id },
      include: {
        fournisseur:  { select: { id: true, nom: true, siret: true, adresse: true, codePostal: true, ville: true, telephone: true, email: true } },
        sousTraitant: { select: { id: true, nom: true, specialite: true, contact: true, email: true, telephone: true, siret: true, adresse: true, representant: true, qualiteRepresentant: true } },
        chantier:     { select: { id: true, nom: true, adresse: true, reference: true, clientId: true } },
        client:       { select: { id: true, nom: true, prenom: true, raisonSociale: true, adresse: true, codePostal: true, ville: true, telephone: true, email: true, siret: true } },
        lignes:       { orderBy: { ordre: "asc" } },
        reserves:     { orderBy: { ordre: "asc" } },
      },
    }),
    prisma.fournisseur.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, email: true, telephone: true, contact: true },
    }),
    prisma.chantier.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, nom: true, prenom: true, raisonSociale: true, email: true, telephone: true, adresse: true, codePostal: true, ville: true } },
        devis: {
          where: { statut: { not: "ANNULE" } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            numero: true,
            objet: true,
            lignes: {
              where: { type: "LIGNE" },
              orderBy: { ordre: "asc" },
              select: { designation: true, unite: true, quantite: true, codeArticle: true },
            },
          },
        },
        bonsCommande: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { numero: true },
        },
      },
    }),
    prisma.client.findMany({ orderBy: { nom: "asc" }, select: { id: true, nom: true, raisonSociale: true } }),
    prisma.sousTraitant.findMany({
      orderBy: { nom: "asc" },
      select: { id: true, nom: true, specialite: true, contact: true, email: true, telephone: true, representant: true, qualiteRepresentant: true },
    }),
    prisma.contratSousTraitance.findMany({
      where: { statut: { in: ["SIGNE", "EN_COURS"] } },
      orderBy: { createdAt: "desc" },
      include: {
        sousTraitant: { select: { id: true, nom: true } },
        chantier: { select: { id: true, nom: true } },
      },
    }),
  ]);

  if (!pvr) notFound();

  const toDateStr = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

  const ROLE_LABELS: Record<string, string> = {
    DIRIGEANT: "Dirigeant",
    CONDUCTEUR_TRAVAUX: "Conducteur de travaux",
    RESPONSABLE_COMMERCIAL: "Responsable commercial",
    ASSISTANT_DIRECTION: "Assistante de Direction",
    ADMIN: "Administrateur",
  };

  const isTravauxClient = pvr.categorie === "TRAVAUX_CLIENT";

  // Détecter qui a signé
  const externalSigned = isTravauxClient ? !!pvr.dateSignatureMO : !!pvr.dateSignaturePrestataire;
  const sdaSigned      = isTravauxClient ? !!pvr.dateSignaturePrestataire : !!pvr.dateSignatureMO;
  const bothSigned     = externalSigned && sdaSigned;

  const externalNom      = isTravauxClient ? pvr.repMO     : pvr.repPrestataire;
  const externalDate     = isTravauxClient ? pvr.dateSignatureMO : pvr.dateSignaturePrestataire;
  const sdaNom           = isTravauxClient ? pvr.repPrestataire : pvr.repMO;
  const sdaDate          = isTravauxClient ? pvr.dateSignaturePrestataire : pvr.dateSignatureMO;
  const externalLabel    = isTravauxClient ? "Client (MO)" : "Prestataire / Sous-traitant";

  const apercuUrl = `/apercu/pv-reception/${pvr.id}`;
  const dlUrl     = pvr.shareToken ? `/api/pv-reception/${pvr.id}/dl?token=${pvr.shareToken}` : null;

  return (
    <div className="flex flex-col gap-4">

    {/* ── Bandeau de statut signatures ── */}
    {(externalSigned || bothSigned) && (
      <div className={`rounded-xl border p-4 flex flex-wrap gap-4 items-start ${
        bothSigned ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"
      }`}>
        {bothSigned ? (
          <>
            <p className="w-full text-sm font-semibold text-emerald-800">✅ PV signé par les deux parties — Document disponible</p>
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">{externalLabel}</p>
              <p className="text-sm text-emerald-700">{externalNom ?? "—"}</p>
              <p className="text-xs text-emerald-600">{externalDate ? formatDate(externalDate) : "—"}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide">SDA Rénovation</p>
              <p className="text-sm text-emerald-700">{sdaNom ?? "—"}</p>
              <p className="text-xs text-emerald-600">{sdaDate ? formatDate(sdaDate) : "—"}</p>
            </div>
            {pvr.premiereOuvertureSigneAt && (
              <p className="w-full text-xs text-emerald-600 font-medium">
                📥 PDF téléchargé par le client le {formatDate(pvr.premiereOuvertureSigneAt)}
              </p>
            )}
            <div className="w-full flex gap-3">
              <a
                href={apercuUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E2F6E] text-white px-4 py-2 text-xs font-semibold hover:bg-[#1B3F94] transition"
              >
                📄 Aperçu / Imprimer
              </a>
              {dlUrl && (
                <a
                  href={dlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 text-white px-4 py-2 text-xs font-semibold hover:bg-emerald-700 transition"
                >
                  📥 Lien client (PDF signé)
                </a>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">
                ✍️ Signature reçue du {externalLabel.toLowerCase()} — En attente de votre signature
              </p>
              <p className="text-xs text-amber-700 mt-1">
                {externalNom ?? "—"} a signé le {externalDate ? formatDate(externalDate) : "—"}.
                Signez à votre tour pour finaliser le PV.
              </p>
            </div>
            <div className="w-full">
              <SdaSignaturePad pvId={pvr.id} pvNumero={pvr.numero} defaultNom={user.name} />
            </div>
          </>
        )}
      </div>
    )}
    <PvReceptionEditor
      pvr={{
        ...pvr,
        dateReception: toDateStr(pvr.dateReception),
        periodeDebut:  toDateStr(pvr.periodeDebut),
        periodeFin:    toDateStr(pvr.periodeFin),
        dateEffet:     toDateStr(pvr.dateEffet),
        dateFinParfaitAchevement: toDateStr(pvr.dateFinParfaitAchevement),
        dateFinBiennale:          toDateStr(pvr.dateFinBiennale),
        dateFinDecennale:         toDateStr(pvr.dateFinDecennale),
        reserves: pvr.reserves.map(r => ({
          ...r,
          delaiLevee: toDateStr(r.delaiLevee),
          dateLevee:  toDateStr(r.dateLevee),
        })),
      }}
      fournisseurs={fournisseurs}
      chantiers={chantiers}
      clients={clients}
      sousTraitants={sousTraitants}
      contratsSTR={contratsSTR.map(c => ({
        id: c.id,
        reference: c.numero,
        objet: c.objet,
        sousTraitantId: c.sousTraitantId,
        chantierId: c.chantierId,
        montantHT: c.montantHT,
        sousTraitant: c.sousTraitant,
        chantier: c.chantier,
      }))}
      currentUser={{
        name: user.name,
        role: ROLE_LABELS[user.role] ?? user.role,
        email: user.email,
      }}
      envoyerParEmail={envoyerPvReceptionParEmail.bind(null, pvr.id)}
    />
    </div>
  );
}
