import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY, COMPANY_LEGAL } from "@/lib/company";
import { EmailsDocument } from "@/components/ui/emails-document";
import { formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

const RESULTAT_LABELS: Record<string, { label: string; cls: string }> = {
  ACCEPTE:          { label: "RÉCEPTION PRONONCÉE SANS RÉSERVE", cls: "bg-green-600 text-white" },
  ACCEPTE_RESERVES: { label: "RÉCEPTION PRONONCÉE AVEC RÉSERVES", cls: "bg-amber-500 text-white" },
  REFUSE:           { label: "RÉCEPTION REFUSÉE", cls: "bg-red-600 text-white" },
};

const TYPE_LABELS: Record<string, string> = {
  PRESTATION:  "Prestation de service",
  MAINTENANCE: "Maintenance",
  FORMATION:   "Formation / Transfert de compétences",
  LIVRAISON:   "Livraison de fournitures",
  ETUDE:       "Étude / Prestation intellectuelle",
  AUTRE:       "Autre",
};

export default async function ApercuPvReceptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const pvr = await prisma.pvReception.findUnique({
    where: { id },
    include: {
      fournisseur:  true,
      sousTraitant: true,
      chantier:    { select: { nom: true, adresse: true, reference: true } },
      client:      { select: { nom: true, prenom: true, raisonSociale: true, siret: true, adresse: true, codePostal: true, ville: true } },
      lignes:      { orderBy: { ordre: "asc" } },
      reserves:    { orderBy: { ordre: "asc" } },
    },
  });

  if (!pvr) notFound();

  const categorie = pvr.categorie ?? "SUPPORT";
  const isTravaux = categorie === "TRAVAUX_CLIENT" || categorie === "TRAVAUX_SOUS_TRAITANT";

  const resultatConfig = pvr.resultat ? RESULTAT_LABELS[pvr.resultat] : null;
  const reservesOuvertes = pvr.reserves.filter(r => r.statut === "OUVERTE");
  const reservesLevees   = pvr.reserves.filter(r => r.statut === "LEVEE");

  // Titre du document selon catégorie
  const titrePV =
    categorie === "TRAVAUX_CLIENT"        ? "PROCÈS-VERBAL DE RÉCEPTION DE TRAVAUX" :
    categorie === "TRAVAUX_SOUS_TRAITANT" ? "PROCÈS-VERBAL DE RÉCEPTION DE TRAVAUX — SOUS-TRAITANCE" :
    "PROCÈS-VERBAL DE RÉCEPTION";

  const sousTitre =
    categorie === "TRAVAUX_CLIENT"        ? "Réception des travaux par le maître d'ouvrage" :
    categorie === "TRAVAUX_SOUS_TRAITANT" ? "Réception des travaux du sous-traitant par SDA Rénovation" :
    (TYPE_LABELS[pvr.typeSupport] ?? pvr.typeSupport);

  // Parties selon catégorie
  const labelMO =
    categorie === "TRAVAUX_CLIENT" ? "Maître d'ouvrage (Client)" :
    "Maître d'ouvrage (SDA Rénovation)";

  const labelExecutant =
    categorie === "TRAVAUX_CLIENT"        ? "Entreprise — SDA Rénovation" :
    categorie === "TRAVAUX_SOUS_TRAITANT" ? "Sous-traitant" :
    "Prestataire / Fournisseur";

  // Partie principale (côté exécutant)
  const executantNom   =
    categorie === "TRAVAUX_CLIENT"        ? COMPANY.nom :
    categorie === "TRAVAUX_SOUS_TRAITANT" ? (pvr.sousTraitant?.nom ?? "___________________") :
    (pvr.fournisseur?.nom ?? "___________________");

  const executantAdresse =
    categorie === "TRAVAUX_CLIENT"        ? `${COMPANY.adresse}, ${COMPANY.codePostal} ${COMPANY.ville}` :
    categorie === "TRAVAUX_SOUS_TRAITANT" ? (pvr.sousTraitant?.adresse ?? null) :
    (pvr.fournisseur ? `${pvr.fournisseur.adresse ?? ""} ${pvr.fournisseur.codePostal ?? ""} ${pvr.fournisseur.ville ?? ""}`.trim() : null);

  const executantSiret =
    categorie === "TRAVAUX_CLIENT"        ? COMPANY.siren :
    categorie === "TRAVAUX_SOUS_TRAITANT" ? (pvr.sousTraitant?.siret ?? null) :
    (pvr.fournisseur?.siret ?? null);

  // Côté MO
  const moNom =
    categorie === "TRAVAUX_CLIENT"
      ? (pvr.client?.raisonSociale ?? (pvr.client ? `${pvr.client.prenom ?? ""} ${pvr.client.nom}`.trim() : COMPANY.nom))
      : COMPANY.nom;

  const moAdresse =
    categorie === "TRAVAUX_CLIENT"
      ? (pvr.client ? `${pvr.client.adresse ?? ""} ${pvr.client.codePostal ?? ""} ${pvr.client.ville ?? ""}`.trim() : "")
      : `${COMPANY.adresse}, ${COMPANY.codePostal} ${COMPANY.ville}`;

  const moSiret =
    categorie === "TRAVAUX_CLIENT" ? (pvr.client?.siret ?? null) : COMPANY.siren;

  return (
    <>
      <PrintToolbar label={`${titrePV} ${pvr.numero}`} />

      <div className="mx-auto my-6 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-10 py-8 print:px-7 print:py-4 text-sm">

          {/* ══ EN-TÊTE ═══════════════════════════════════════════════════════ */}
          <div className="flex items-start justify-between border-b-[3px] border-[#F7941E] pb-4 mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src="/logo.png" alt="SDA Rénovation" className="h-12 w-auto object-contain" />
                <p className="text-xs font-semibold text-[#F7941E] uppercase tracking-wide">{COMPANY.activite}</p>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5 ml-1">
                <p>{COMPANY.adresse} — {COMPANY.codePostal} {COMPANY.ville}</p>
                <p><EmailsDocument /> · {COMPANY.site}</p>
                <p>SIREN {COMPANY.siren}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[18px] font-black text-[#1E2F6E] leading-tight max-w-64">
                {titrePV}
              </p>
              <p className="text-sm font-semibold text-[#F7941E] uppercase tracking-wider mt-0.5">
                {sousTitre}
              </p>
              <p className="mt-1.5 font-bold text-slate-700 font-mono text-base">{pvr.numero}</p>
              <p className="text-xs text-slate-500">Établi le : {formatDate(pvr.createdAt)}</p>
              {pvr.dateReception && (
                <p className="text-xs text-slate-700 font-semibold mt-1">
                  Date de réception : {formatDate(pvr.dateReception)}
                </p>
              )}
              {pvr.dateEffet && (
                <p className="text-xs text-slate-600">Date d'effet garanties : {formatDate(pvr.dateEffet)}</p>
              )}
            </div>
          </div>

          {/* ══ RÉSULTAT (encadré proéminent) ══════════════════════════════════ */}
          {resultatConfig && (
            <div className={`mb-4 rounded-xl px-5 py-3 text-center font-black text-sm tracking-wider uppercase ${resultatConfig.cls}`}>
              {resultatConfig.label}
              {pvr.dateEffet && (
                <span className="ml-3 font-normal text-xs opacity-90">
                  · Date d'effet : {formatDate(pvr.dateEffet)}
                </span>
              )}
            </div>
          )}

          {/* ══ OBJET ══════════════════════════════════════════════════════════ */}
          {pvr.objet && (
            <div className="mb-4 rounded-lg border border-[#1E2F6E]/20 bg-[#1E2F6E]/5 px-4 py-2.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E2F6E]">Objet :</span>
              <span className="ml-2 font-semibold text-[#1E2F6E]">{pvr.objet}</span>
            </div>
          )}

          {/* ══ PARTIES ════════════════════════════════════════════════════════ */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            {/* MO */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{labelMO}</p>
              <p className="font-bold text-[#1E2F6E]">{moNom}</p>
              {moAdresse && <p className="text-xs text-slate-500">{moAdresse}</p>}
              {moSiret && <p className="text-xs text-slate-500">SIRET / SIREN : {moSiret}</p>}
              {/* Pour TRAVAUX_CLIENT : signaler aussi SDA Rénovation comme entreprise */}
              {categorie === "TRAVAUX_CLIENT" && (
                <p className="text-xs text-slate-400 mt-1 italic">Réception émise par SDA Rénovation</p>
              )}
              {pvr.repMO && (
                <div className="mt-2 border-t border-slate-200 pt-1.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Représentant</p>
                  <p className="text-xs font-medium text-slate-700">{pvr.repMO}</p>
                  {pvr.fonctionRepMO && <p className="text-xs text-slate-500">{pvr.fonctionRepMO}</p>}
                  {pvr.emailRepMO && <p className="text-xs text-slate-500">{pvr.emailRepMO}</p>}
                </div>
              )}
              {pvr.maitreOeuvreNom && (
                <div className="mt-2 border-t border-slate-200 pt-1.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Maître d'œuvre / Architecte</p>
                  <p className="text-xs font-medium text-slate-700">{pvr.maitreOeuvreNom}</p>
                  {pvr.maitreOeuvreEmail && <p className="text-xs text-slate-500">{pvr.maitreOeuvreEmail}</p>}
                </div>
              )}
            </div>

            {/* Exécutant */}
            <div className="rounded-lg border border-[#1E2F6E]/25 bg-[#1E2F6E]/5 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{labelExecutant}</p>
              <p className="font-bold text-[#1E2F6E]">{executantNom}</p>
              {executantAdresse && <p className="text-xs text-slate-500">{executantAdresse}</p>}
              {executantSiret && <p className="text-xs text-slate-500">SIRET / SIREN : {executantSiret}</p>}
              {pvr.repPrestataire && (
                <div className="mt-2 border-t border-[#1E2F6E]/20 pt-1.5">
                  <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wide">Représentant</p>
                  <p className="text-xs font-medium text-slate-700">{pvr.repPrestataire}</p>
                  {pvr.fonctionPrestataire && <p className="text-xs text-slate-500">{pvr.fonctionPrestataire}</p>}
                  {pvr.emailPrestataire && <p className="text-xs text-slate-500">{pvr.emailPrestataire}</p>}
                </div>
              )}
            </div>
          </div>

          {/* ══ CHANTIER & RÉFÉRENCES ═══════════════════════════════════════════ */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            {(pvr.chantier || pvr.lieuReception) && (
              <div className="rounded-lg border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Chantier / Lieu de réception</p>
                {pvr.chantier && <p className="font-medium text-slate-700">{pvr.chantier.nom}</p>}
                {pvr.lieuReception && <p className="text-xs text-slate-500">{pvr.lieuReception}</p>}
                {pvr.periodeDebut && (
                  <p className="text-xs text-slate-500 mt-1">
                    {isTravaux ? "Période travaux : " : "Période : "}{formatDate(pvr.periodeDebut)}
                    {pvr.periodeFin ? ` → ${formatDate(pvr.periodeFin)}` : ""}
                  </p>
                )}
              </div>
            )}
            {(pvr.refContrat || pvr.refDevis || pvr.refCommande || pvr.refBonLivraison) && (
              <div className="rounded-lg border border-slate-200 px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Références</p>
                <div className="space-y-0.5 text-xs">
                  {pvr.refContrat      && <p><span className="text-slate-400 w-24 inline-block">Contrat :</span> <span className="font-mono font-medium">{pvr.refContrat}</span></p>}
                  {pvr.refDevis        && <p><span className="text-slate-400 w-24 inline-block">Devis :</span> <span className="font-mono font-medium">{pvr.refDevis}</span></p>}
                  {pvr.refCommande     && <p><span className="text-slate-400 w-24 inline-block">Commande :</span> <span className="font-mono font-medium">{pvr.refCommande}</span></p>}
                  {pvr.refBonLivraison && <p><span className="text-slate-400 w-24 inline-block">BL :</span> <span className="font-mono font-medium">{pvr.refBonLivraison}</span></p>}
                </div>
              </div>
            )}
          </div>

          {/* ══ DESCRIPTION ═════════════════════════════════════════════════════ */}
          {pvr.descriptionPrestations && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                {isTravaux ? "Description des travaux réceptionnés" : "Description de la prestation réceptionnée"}
              </p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {pvr.descriptionPrestations}
              </div>
            </div>
          )}

          {/* ══ TABLEAU DE VÉRIFICATION ══════════════════════════════════════════ */}
          {pvr.lignes.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                {isTravaux ? "Points de contrôle des travaux" : "Tableau de vérification des livrables"}
              </p>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-[#F7941E] text-white text-[10px] uppercase tracking-wider">
                    <th className="px-2 py-2 text-left w-6">#</th>
                    <th className="px-2 py-2 text-left">{isTravaux ? "Ouvrage / Lot" : "Désignation / Livrable"}</th>
                    <th className="px-2 py-2 text-left w-24">Réf. / DTU</th>
                    <th className="px-2 py-2 text-right w-12">Qté</th>
                    <th className="px-2 py-2 text-left w-12">Unité</th>
                    <th className="px-2 py-2 text-center w-28">Conformité</th>
                    <th className="px-2 py-2 text-left">Observations</th>
                  </tr>
                </thead>
                <tbody>
                  {pvr.lignes.map((l, i) => (
                    <tr key={l.id} className={`border-b border-slate-100 text-xs ${
                      l.conformite === "NON_CONFORME" ? "bg-red-50" :
                      i % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                    }`} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                      <td className="px-2 py-1.5 text-slate-400">{i + 1}</td>
                      <td className="px-2 py-1.5 font-medium text-slate-700">{l.designation}</td>
                      <td className="px-2 py-1.5 font-mono text-slate-500 text-[10px]">{l.reference ?? "—"}</td>
                      <td className="px-2 py-1.5 text-right text-slate-600">{l.quantite ?? "—"}</td>
                      <td className="px-2 py-1.5 text-slate-500">{l.unite ?? "—"}</td>
                      <td className="px-2 py-1.5 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          l.conformite === "CONFORME"     ? "bg-green-100 text-green-700" :
                          l.conformite === "NON_CONFORME" ? "bg-red-100 text-red-700" :
                          "bg-slate-100 text-slate-500"
                        }`}>
                          {l.conformite === "CONFORME" ? "Conforme ✓" : l.conformite === "NON_CONFORME" ? "Non conforme ✗" : "Sans objet"}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-500 italic text-[10px]">{l.observations ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ══ RÉSERVES ═════════════════════════════════════════════════════════ */}
          {pvr.reserves.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
                Réserves émises ({pvr.reserves.length} · {reservesOuvertes.length} ouverte(s) · {reservesLevees.length} levée(s))
              </p>
              <div className="rounded-lg border border-[#1E2F6E]/20 overflow-hidden">
                {pvr.reserves.map((r, i) => (
                  <div key={r.id} className={`border-b border-slate-100 last:border-0 px-3 py-2.5 ${
                    r.statut === "LEVEE" ? "bg-green-50/50" : "bg-red-50/30"
                  }`} style={{ breakInside: "avoid", pageBreakInside: "avoid" }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <span className="rounded-full bg-[#1B3F94] text-white text-[9px] font-bold px-1.5 py-0.5 mt-0.5 shrink-0">
                          R{i + 1}
                        </span>
                        <div>
                          <p className="text-xs font-medium text-slate-700">{r.description}</p>
                          <div className="flex flex-wrap gap-3 mt-1">
                            {r.delaiLevee && (
                              <p className="text-[10px] text-slate-500">
                                Délai : <span className="font-medium">{formatDate(r.delaiLevee)}</span>
                              </p>
                            )}
                            {r.responsable && (
                              <p className="text-[10px] text-slate-500">
                                Responsable : <span className="font-medium">{r.responsable}</span>
                              </p>
                            )}
                            {r.dateLevee && (
                              <p className="text-[10px] text-green-600">
                                Levée le : <span className="font-medium">{formatDate(r.dateLevee)}</span>
                              </p>
                            )}
                            {r.commentaireLevee && (
                              <p className="text-[10px] text-green-600 italic">Note : {r.commentaireLevee}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        r.statut === "LEVEE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {r.statut === "LEVEE" ? "Levée ✓" : "Ouverte"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══ MOTIF DE REFUS ═══════════════════════════════════════════════════ */}
          {pvr.resultat === "REFUSE" && pvr.motifRefus && (
            <div className="mb-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-1">Motif de refus</p>
              <p className="text-xs text-red-700 leading-relaxed">{pvr.motifRefus}</p>
            </div>
          )}

          {/* ══ GARANTIES BTP ═════════════════════════════════════════════════════ */}
          {isTravaux && (pvr.garantiePerfaitAchevement || pvr.garantieBiennale || pvr.garantieDecennale) && (
            <div className="mb-4 rounded-lg border border-[#1E2F6E]/20 overflow-hidden">
              <div className="bg-[#F7941E] px-4 py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-white">Garanties légales BTP (art. 1792 et s. C.civ.)</p>
              </div>
              <div className="divide-y divide-slate-100">
                {pvr.garantiePerfaitAchevement && (
                  <div className="flex items-center justify-between px-4 py-2 text-xs bg-blue-50/50">
                    <span className="font-medium text-slate-700">Garantie de parfait achèvement (1 an)</span>
                    <span className="text-blue-700 font-bold">
                      {pvr.dateFinParfaitAchevement ? `Jusqu'au ${formatDate(pvr.dateFinParfaitAchevement)}` : "Date non renseignée"}
                    </span>
                  </div>
                )}
                {pvr.garantieBiennale && (
                  <div className="flex items-center justify-between px-4 py-2 text-xs bg-amber-50/50">
                    <span className="font-medium text-slate-700">Garantie biennale — éléments d'équipement (2 ans)</span>
                    <span className="text-amber-700 font-bold">
                      {pvr.dateFinBiennale ? `Jusqu'au ${formatDate(pvr.dateFinBiennale)}` : "Date non renseignée"}
                    </span>
                  </div>
                )}
                {pvr.garantieDecennale && (
                  <div className="flex items-center justify-between px-4 py-2 text-xs bg-red-50/50">
                    <span className="font-medium text-slate-700">Garantie décennale — solidité de l'ouvrage (10 ans)</span>
                    <span className="text-red-700 font-bold">
                      {pvr.dateFinDecennale ? `Jusqu'au ${formatDate(pvr.dateFinDecennale)}` : "Date non renseignée"}
                    </span>
                  </div>
                )}
              </div>
              {(pvr.assuranceDecennaleNo || pvr.assuranceDONo) && (
                <div className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-500 bg-slate-50">
                  {pvr.assuranceDecennaleNo && <span className="mr-4">Assurance décennale SDA : {pvr.assuranceDecennaleNo}</span>}
                  {pvr.assuranceDONo && <span>Dommages-ouvrage : {pvr.assuranceDONo}</span>}
                </div>
              )}
            </div>
          )}

          {/* ══ GARANTIE CONFORMITÉ (support) ════════════════════════════════════ */}
          {!isTravaux && pvr.garantieConformite && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs">
              <p className="font-bold text-blue-700 mb-0.5">Garantie de conformité</p>
              <p className="text-blue-600">
                La réception prononcée déclenche la garantie de conformité
                {pvr.dureeGarantie ? ` pour une durée de : ${pvr.dureeGarantie}` : ""}.
                À compter du {pvr.dateEffet ? formatDate(pvr.dateEffet) : "la date d'effet ci-dessus"}.
              </p>
            </div>
          )}

          {/* ══ MENTIONS LÉGALES ══════════════════════════════════════════════════ */}
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-[10px] text-slate-600 leading-relaxed">
            <p className="font-bold text-slate-700 mb-1">Valeur juridique et mentions obligatoires</p>
            {isTravaux ? (
              <p>
                Le présent Procès-Verbal de Réception de Travaux est établi conformément aux dispositions
                des articles 1792 et suivants du Code Civil. La réception des travaux constitue l'acte par lequel
                le maître d'ouvrage déclare accepter l'ouvrage avec ou sans réserves. Elle déclenche le point de
                départ des garanties légales (parfait achèvement, biennale et décennale) ainsi que le transfert
                des risques au maître d'ouvrage. Les réserves éventuelles doivent être levées dans les délais
                contractuels impartis. Passé ce délai, le maître d'ouvrage pourra faire exécuter les travaux
                de reprise aux frais et risques de l'entreprise défaillante.
                {pvr.reserves.length > 0 && pvr.resultat === "ACCEPTE_RESERVES" && (
                  ` La réception est prononcée sous réserve de la levée des ${reservesOuvertes.length} réserve(s) ouverte(s) ci-dessus dans les délais impartis.`
                )}
              </p>
            ) : (
              <p>
                Le présent Procès-Verbal de Réception constitue l'acte constatant l'achèvement de la prestation
                et son acceptation par le maître d'ouvrage, sous réserve des réserves éventuellement émises.
                Il emporte transfert de la garde et déclenche les délais de garantie contractuels.
                Le prestataire s'engage à lever les réserves dans les délais indiqués.
              </p>
            )}
          </div>

          {/* ══ SIGNATURES ════════════════════════════════════════════════════════ */}
          <div className="mb-3 rounded-lg border border-[#1E2F6E]/20 overflow-hidden">
            <div className="bg-[#F7941E] px-4 py-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-white">Signatures</p>
              {pvr.statut === "SIGNE" && (
                <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                  ✅ Signé électroniquement par les deux parties
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-200">
              {/* MO */}
              <div className="px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Pour le {labelMO}
                </p>
                <p className="text-xs font-bold text-[#1E2F6E]">{moNom}</p>
                {pvr.repMO && (
                  <p className="text-xs text-slate-600">{pvr.repMO}{pvr.fonctionRepMO ? ` — ${pvr.fonctionRepMO}` : ""}</p>
                )}
                <div className="mt-3 border-t border-dashed border-slate-300 pt-3">
                  {pvr.signatureMO ? (
                    <>
                      <p className="text-[10px] text-emerald-600 font-semibold mb-1">✅ Signé électroniquement</p>
                      <img
                        src={pvr.signatureMO}
                        alt="Signature"
                        className="h-14 object-contain"
                        style={{ maxWidth: "100%", display: "block" }}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        {pvr.repMO ?? moNom}
                        {pvr.dateSignatureMO ? ` — le ${formatDate(pvr.dateSignatureMO)}` : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] text-slate-400">Lu et approuvé — Signature :</p>
                      <div className="h-14"></div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        À {categorie === "TRAVAUX_CLIENT" ? "_____________" : COMPANY.ville}, le _____ / _____ / _________
                      </p>
                    </>
                  )}
                </div>
              </div>
              {/* Exécutant */}
              <div className="px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  Pour {labelExecutant}
                </p>
                <p className="text-xs font-bold text-[#1E2F6E]">{executantNom}</p>
                {pvr.repPrestataire && (
                  <p className="text-xs text-slate-600">{pvr.repPrestataire}{pvr.fonctionPrestataire ? ` — ${pvr.fonctionPrestataire}` : ""}</p>
                )}
                <div className="mt-3 border-t border-dashed border-slate-300 pt-3">
                  {pvr.signaturePrestataire ? (
                    <>
                      <p className="text-[10px] text-emerald-600 font-semibold mb-1">✅ Signé électroniquement</p>
                      <img
                        src={pvr.signaturePrestataire}
                        alt="Signature"
                        className="h-14 object-contain"
                        style={{ maxWidth: "100%", display: "block" }}
                      />
                      <p className="text-[10px] text-slate-500 mt-1">
                        {pvr.repPrestataire ?? executantNom}
                        {pvr.dateSignaturePrestataire ? ` — le ${formatDate(pvr.dateSignaturePrestataire)}` : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] text-slate-400">Lu et approuvé — Signature :</p>
                      <div className="h-14"></div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        À {categorie === "TRAVAUX_CLIENT" ? COMPANY.ville : "_____________"}, le _____ / _____ / _________
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-4 py-2 text-[10px] text-slate-400 text-center">
              Document établi en 2 exemplaires originaux — un exemplaire pour chaque partie signataire
              {pvr.statut === "SIGNE" && " · Signature électronique conforme à l'article 1367 du Code civil"}
            </div>
          </div>

          {/* ══ PIED DE PAGE ══════════════════════════════════════════════════════ */}
          <div className="border-t border-slate-200 pt-3 text-center space-y-0.5">
            <p className="text-[9px] text-slate-400">{COMPANY_LEGAL}</p>
            <p className="text-[9px] text-slate-400">
              {titrePV} n° {pvr.numero} · {pvr.dateReception ? `Réception du ${formatDate(pvr.dateReception)}` : "Date à compléter"}
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
    </>
  );
}
