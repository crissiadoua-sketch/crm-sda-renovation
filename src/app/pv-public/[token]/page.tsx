export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { SignaturePadPv } from "./signature-pad-pv";

function fmt(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(d));
}

const RESULTAT_CONFIG: Record<string, { label: string; cls: string }> = {
  ACCEPTE:          { label: "RÉCEPTION PRONONCÉE SANS RÉSERVE",  cls: "bg-green-600 text-white" },
  ACCEPTE_RESERVES: { label: "RÉCEPTION PRONONCÉE AVEC RÉSERVES", cls: "bg-amber-500 text-white" },
  REFUSE:           { label: "RÉCEPTION REFUSÉE",                  cls: "bg-red-600 text-white"  },
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-white border border-slate-200 shadow-sm px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">{title}</p>
      {children}
    </div>
  );
}

export default async function PvPublicPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const pvr = await prisma.pvReception.findUnique({
    where: { shareToken: token },
    include: {
      fournisseur:  { select: { nom: true, email: true } },
      sousTraitant: { select: { nom: true, email: true } },
      chantier:     { select: { nom: true } },
      client:       { select: { nom: true, prenom: true, raisonSociale: true, email: true } },
      lignes:       { orderBy: { ordre: "asc" } },
      reserves:     { orderBy: { ordre: "asc" } },
    },
  });

  if (!pvr) notFound();

  if (pvr.shareExpiry && pvr.shareExpiry < new Date()) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="rounded-2xl bg-white shadow-xl p-8 max-w-sm text-center">
          <p className="text-4xl mb-3">⏰</p>
          <h1 className="text-xl font-bold text-slate-700">Lien expiré</h1>
          <p className="text-sm text-slate-500 mt-2">
            Ce lien a expiré. Contactez SDA Rénovation pour obtenir un nouveau lien.
          </p>
          <p className="mt-3 text-sm text-[#1E2F6E]">{COMPANY.email}</p>
        </div>
      </div>
    );
  }

  const res = pvr.resultat ? RESULTAT_CONFIG[pvr.resultat] : null;

  const isTravauxClient = pvr.categorie === "TRAVAUX_CLIENT";
  const isTravauxST     = pvr.categorie === "TRAVAUX_SOUS_TRAITANT";

  // Qui est le signataire externe (celui qui signe via ce lien)
  const ext = isTravauxClient
    ? {
        role: "MO" as const,
        titrePartie: pvr.client?.raisonSociale
          ?? (pvr.client ? `${pvr.client.prenom ?? ""} ${pvr.client.nom}`.trim() : "Client"),
        labelPartie: "Maître d'ouvrage (Client)",
        repNom: pvr.repMO ?? "",
        repFonction: pvr.fonctionRepMO ?? "",
        signatureImage: pvr.signatureMO,
        dateSigne: pvr.dateSignatureMO,
        repSigneNom: pvr.repMO,
      }
    : {
        role: "PRESTATAIRE" as const,
        titrePartie: isTravauxST
          ? (pvr.sousTraitant?.nom ?? "Sous-traitant")
          : (pvr.fournisseur?.nom ?? "Prestataire"),
        labelPartie: isTravauxST ? "Sous-traitant" : "Prestataire / Fournisseur",
        repNom: pvr.repPrestataire ?? "",
        repFonction: pvr.fonctionPrestataire ?? "",
        signatureImage: pvr.signaturePrestataire,
        dateSigne: pvr.dateSignaturePrestataire,
        repSigneNom: pvr.repPrestataire,
      };

  const sdeLabel  = isTravauxClient ? "Entrepreneur (SDA Rénovation)" : "Maître d'ouvrage (SDA Rénovation)";
  const titreDoc  = isTravauxClient ? "PV de Réception de Travaux" : isTravauxST ? "PV de Réception — Sous-traitant" : "Procès-Verbal de Réception";

  // États du workflow de signature
  const externalSigned = !!ext.dateSigne;
  const sdaSigned      = isTravauxClient ? !!pvr.dateSignaturePrestataire : !!pvr.dateSignatureMO;
  const bothSigned     = externalSigned && sdaSigned;

  const apercuUrl = `/apercu/pv-reception/${pvr.id}`;
  const dlUrl     = `/api/pv-reception/${pvr.id}/dl?token=${pvr.shareToken}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50">
      {/* Bandeau */}
      <div className="bg-[#1E2F6E] px-6 py-3 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-[#29ABE2] to-[#1B3F94] flex items-center justify-center">
            <span className="text-white font-black text-sm">S</span>
          </div>
          <span className="text-white font-bold text-sm">SDA Rénovation</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white/60 text-xs font-mono">{pvr.numero}</span>
          {bothSigned && (
            <a
              href={dlUrl}
              className="rounded-lg bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-medium text-white transition"
            >
              📄 Télécharger PDF signé
            </a>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* En-tête */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-[#1E2F6E]">{titreDoc}</h1>
          <p className="text-[#F7941E] font-semibold uppercase tracking-wide mt-1">{pvr.numero}</p>
          {pvr.dateReception && (
            <p className="text-slate-500 text-sm mt-1">Date de réception : {fmt(pvr.dateReception)}</p>
          )}
          {pvr.chantier && (
            <p className="text-slate-500 text-sm mt-0.5">Chantier : {pvr.chantier.nom}</p>
          )}
        </div>

        {/* Résultat */}
        {res && (
          <div className={`rounded-xl px-6 py-4 text-center font-black text-sm tracking-wider uppercase mb-6 ${res.cls}`}>
            {res.label}
          </div>
        )}

        {/* Objet */}
        {pvr.objet && (
          <div className="rounded-xl bg-[#1E2F6E]/10 border border-[#1E2F6E]/20 px-4 py-3 mb-6">
            <p className="text-xs font-bold text-[#1E2F6E] uppercase tracking-wider mb-1">Objet des travaux / prestations</p>
            <p className="font-semibold text-[#1E2F6E]">{pvr.objet}</p>
          </div>
        )}

        {/* Parties */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-6">
          <Card title={sdeLabel}>
            <p className="font-bold text-[#1E2F6E]">{COMPANY.nom}</p>
            {(sdaSigned) && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                ✅ Signé le {fmt(isTravauxClient ? pvr.dateSignaturePrestataire : pvr.dateSignatureMO)}
              </p>
            )}
          </Card>
          <Card title={ext.labelPartie}>
            <p className="font-bold text-[#1E2F6E]">{ext.titrePartie}</p>
            {ext.repNom && <p className="text-sm text-slate-600 mt-1">{ext.repNom}</p>}
            {externalSigned && (
              <p className="text-xs text-emerald-600 mt-1 font-medium">
                ✅ Signé le {fmt(ext.dateSigne)}
              </p>
            )}
          </Card>
        </div>

        {/* Références */}
        {(pvr.periodeDebut || pvr.periodeFin || pvr.refDevis || pvr.refCommande) && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 mb-6">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Références</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {pvr.periodeDebut && <div><span className="text-slate-400 text-xs">Début : </span>{fmt(pvr.periodeDebut)}</div>}
              {pvr.periodeFin   && <div><span className="text-slate-400 text-xs">Fin : </span>{fmt(pvr.periodeFin)}</div>}
              {pvr.refDevis     && <div><span className="text-slate-400 text-xs">Devis : </span>{pvr.refDevis}</div>}
              {pvr.refCommande  && <div><span className="text-slate-400 text-xs">Commande : </span>{pvr.refCommande}</div>}
            </div>
          </div>
        )}

        {/* Livrables */}
        {pvr.lignes.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-[#1E2F6E] mb-3 text-lg">Livrables vérifiés</h2>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-[#1E2F6E] text-white text-xs">
                  <tr>
                    <th className="px-3 py-2.5 text-left w-8">#</th>
                    <th className="px-3 py-2.5 text-left">Livrable / Prestation</th>
                    <th className="px-3 py-2.5 text-center">Conformité</th>
                    <th className="px-3 py-2.5 text-left hidden sm:table-cell">Observations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pvr.lignes.map((l, i) => (
                    <tr key={l.id} className={l.conformite === "NON_CONFORME" ? "bg-red-50" : ""}>
                      <td className="px-3 py-2 text-slate-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-2 font-medium">{l.designation}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          l.conformite === "CONFORME"     ? "bg-green-100 text-green-700" :
                          l.conformite === "NON_CONFORME" ? "bg-red-100 text-red-700"     :
                                                            "bg-slate-100 text-slate-500"
                        }`}>
                          {l.conformite === "CONFORME" ? "✓ Conforme" : l.conformite === "NON_CONFORME" ? "✗ Non conforme" : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs italic hidden sm:table-cell">{l.observations ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Réserves */}
        {pvr.reserves.length > 0 && (
          <div className="mb-6">
            <h2 className="font-bold text-[#1E2F6E] mb-3 text-lg">Réserves constatées</h2>
            <div className="flex flex-col gap-3">
              {pvr.reserves.map((r, i) => (
                <div key={r.id} className={`rounded-xl border px-4 py-3 ${
                  r.statut === "LEVEE" ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"
                }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-slate-500 mb-1">Réserve {i + 1}</p>
                      <p className="text-sm font-medium text-slate-700">{r.description}</p>
                      {r.delaiLevee && <p className="text-xs text-slate-500 mt-1">Délai : {fmt(r.delaiLevee)}</p>}
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full shrink-0 ${
                      r.statut === "LEVEE" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}>
                      {r.statut === "LEVEE" ? "Levée ✓" : "En cours"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Garanties */}
        {pvr.garantieConformite && pvr.dureeGarantie && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
            <p className="text-xs font-bold text-blue-700">Garantie de conformité</p>
            <p className="text-sm text-blue-600 mt-1">{pvr.dureeGarantie}</p>
          </div>
        )}
        {pvr.garantieDecennale && pvr.dateFinDecennale && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold text-slate-600">Garantie décennale</p>
            <p className="text-sm text-slate-600 mt-1">Jusqu&apos;au {fmt(pvr.dateFinDecennale)}</p>
          </div>
        )}

        {/* ── Section Signature ── */}
        <div className="mt-4 mb-6">
          {/* PV encore en brouillon */}
          {pvr.statut === "BROUILLON" && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 text-center">
              <p className="text-sm text-amber-700">
                Ce PV est encore en cours de rédaction par SDA Rénovation. La signature sera disponible prochainement.
              </p>
            </div>
          )}

          {/* Les DEUX ont signé → téléchargement disponible */}
          {pvr.statut !== "BROUILLON" && bothSigned && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-6 text-center flex flex-col items-center gap-3">
              <p className="text-3xl">✅</p>
              <p className="text-emerald-700 font-bold text-lg">PV signé par les deux parties</p>
              <p className="text-emerald-600 text-sm">
                Le PV de réception est maintenant définitivement signé et peut être téléchargé.
              </p>
              <div className="flex items-center gap-4 flex-wrap justify-center text-xs text-emerald-600 mt-1">
                <span>
                  {ext.labelPartie} : {ext.repSigneNom ?? ext.titrePartie} — {fmt(ext.dateSigne)}
                </span>
                <span>
                  SDA Rénovation — {fmt(isTravauxClient ? pvr.dateSignaturePrestataire : pvr.dateSignatureMO)}
                </span>
              </div>
              <a
                href={dlUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-[#1E2F6E] text-white px-6 py-3 text-sm font-bold hover:bg-[#1B3F94] transition shadow-md mt-2"
              >
                📄 Télécharger le PV signé (PDF)
              </a>
              {pvr.premiereOuvertureSigneAt && (
                <p className="text-emerald-400 text-xs">
                  Téléchargé le {fmt(pvr.premiereOuvertureSigneAt)}
                </p>
              )}
            </div>
          )}

          {/* Externe a signé, en attente de SDA */}
          {pvr.statut !== "BROUILLON" && externalSigned && !sdaSigned && (
            <div className="rounded-xl bg-blue-50 border border-blue-200 px-5 py-6 text-center flex flex-col items-center gap-3">
              <p className="text-3xl">⏳</p>
              <p className="text-blue-700 font-bold text-lg">Votre signature a été enregistrée</p>
              <p className="text-blue-600 text-sm max-w-md">
                Votre signature a bien été reçue. SDA Rénovation doit maintenant apposer sa propre signature.
                <strong> Vous recevrez un email</strong> dès que le PV sera définitivement signé et disponible au téléchargement.
              </p>
              {ext.signatureImage && (
                <div className="mt-1">
                  <p className="text-xs text-blue-500 mb-1">Votre signature enregistrée :</p>
                  <img src={ext.signatureImage} alt="Votre signature" className="h-12 object-contain" />
                </div>
              )}
              <p className="text-xs text-blue-400">
                Signé le {fmt(ext.dateSigne)}
                {ext.repSigneNom && ` — par ${ext.repSigneNom}`}
              </p>
            </div>
          )}

          {/* Personne n'a encore signé → pad de signature */}
          {pvr.statut !== "BROUILLON" && !externalSigned && (
            <div className="flex flex-col gap-3">
              <h2 className="font-bold text-[#1E2F6E] text-lg">Votre signature est requise</h2>
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
                <p className="text-sm text-blue-800">
                  Après lecture du document ci-dessus, veuillez apposer votre signature électronique
                  pour valider la réception. SDA Rénovation signera à son tour, puis vous pourrez
                  télécharger le PV définitivement signé.
                </p>
              </div>
              <SignaturePadPv
                token={token}
                pvNumero={pvr.numero}
                pvId={pvr.id}
                role={ext.role}
                roleLabel={ext.titrePartie}
                defaultNom={ext.repNom}
              />
            </div>
          )}
        </div>

        {/* Pied */}
        <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400">
          <p>{COMPANY.nom} · {COMPANY.adresse}, {COMPANY.codePostal} {COMPANY.ville}</p>
          <p className="mt-1">{COMPANY.email} · {COMPANY.telephone}</p>
        </div>
      </div>
    </div>
  );
}
