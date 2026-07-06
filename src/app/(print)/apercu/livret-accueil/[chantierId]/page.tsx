import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { formatDate, clientDisplayName } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Composants typographiques fidèles au document officiel ───────────────────

function PageHeader() {
  return (
    <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-[#F7941E]">
      <img src="/logo.png" alt="SDA Rénovation" className="h-8 w-auto object-contain" />
    </div>
  );
}

function PageFooter({ page }: { page: number }) {
  return (
    <div className="flex items-center justify-between pt-3 mt-4 border-t border-slate-200 text-[9px] text-slate-500">
      <span>SDA RÉNOVATION — Livret d&apos;accueil chantier sous-traitants</span>
      <span>Page {page} / 7</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold text-[#1E2F6E] mb-3 pb-1 border-b border-[#1E2F6E]/20">
      {children}
    </h2>
  );
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-bold text-[#F7941E] mb-2 mt-3">{children}</h3>
  );
}

function TableInfo({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <table className="w-full border-collapse text-sm mb-3">
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border border-slate-200">
            <td className="px-3 py-2 font-semibold text-[#1E2F6E] bg-slate-50 w-56 border-r border-slate-200 text-xs">{r.label}</td>
            <td className={`px-3 py-2 text-xs ${!r.value || r.value.startsWith("[") ? "text-slate-400 italic" : "text-slate-700"}`}>{r.value || "[À compléter]"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 mb-1">
      <span className="text-[#F7941E] font-bold mt-0.5 text-sm">•</span>
      <span className="text-xs text-slate-700 leading-relaxed">{children}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LivretAccueilPage({
  params,
}: {
  params: Promise<{ chantierId: string }>;
}) {
  const { chantierId } = await params;

  const [chantier, parametres] = await Promise.all([
    prisma.chantier.findUnique({
      where: { id: chantierId },
      include: {
        client: true,
        sousTraitants: { include: { sousTraitant: true } },
        ordresMission: {
          where: { statut: { not: "ANNULE" } },
          include: { sousTraitant: true },
          orderBy: { createdAt: "asc" },
        },
        devis: { where: { statut: "ACCEPTE" }, orderBy: { dateCreation: "desc" }, take: 1 },
      },
    }),
    prisma.parametres.findUnique({ where: { id: "default" } }),
  ]);

  if (!chantier) notFound();

  const nomEntreprise = parametres?.nomEntreprise ?? COMPANY.nom;
  const adresseSDA   = parametres?.adresse ?? COMPANY.adresse;
  const villeSDA     = [parametres?.codePostal, parametres?.ville].filter(Boolean).join(" ") || `${COMPANY.codePostal} ${COMPANY.ville}`;
  const telSDA       = parametres?.telephone ?? COMPANY.telephone;
  const emailSDA     = parametres?.email ?? COMPANY.email;
  const siretSDA     = parametres?.siret ?? COMPANY.siren;
  const tvaSDA       = parametres?.tvaIntracom ?? COMPANY.tvaIntracommunautaire;

  const adresseChantier = [chantier.adresse, chantier.codePostal, chantier.ville].filter(Boolean).join(", ");
  const refDevis = chantier.devis[0]?.numero ?? "[À compléter]";
  const clientNom = clientDisplayName(chantier.client);

  // Lots depuis ordres de mission (dédupliqués par sous-traitant)
  const lots = chantier.ordresMission.reduce<{ specialite: string; nom: string; titre: string }[]>((acc, om) => {
    if (!acc.find((l) => l.nom === om.sousTraitant.nom)) {
      acc.push({
        nom: om.sousTraitant.nom,
        specialite: om.sousTraitant.specialite ?? "",
        titre: om.titre,
      });
    }
    return acc;
  }, []);

  // Fallback sur sousTraitants du chantier si pas d'ordres de mission
  const lotsAffichage = lots.length > 0 ? lots : chantier.sousTraitants.map((cs) => ({
    nom: cs.sousTraitant.nom,
    specialite: cs.sousTraitant.specialite ?? "",
    titre: "",
  }));

  const today = new Date();

  return (
    <>
      <PrintToolbar label={`Livret d'accueil — ${chantier.nom}`} />

      <div className="bg-white">

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 1 — Page de couverture
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page mx-auto w-full max-w-[210mm] min-h-[297mm] px-14 py-12 flex flex-col justify-between print:shadow-none shadow-xl my-6 print:my-0 bg-white">
          <div className="flex flex-col items-center justify-center flex-1 gap-8 text-center">
            {/* Logo centré grand format */}
            <img src="/logo.png" alt="SDA Rénovation" className="h-28 w-auto object-contain mx-auto" />

            {/* Titre principal */}
            <div>
              <h1 className="text-4xl font-black text-slate-800 tracking-wide uppercase mb-2">
                LIVRET D&apos;ACCUEIL CHANTIER
              </h1>
              <p className="text-xl font-bold text-[#1E2F6E]">
                À destination des entreprises sous-traitantes
              </p>
            </div>

            {/* Encadré CHANTIER */}
            <div className="w-full max-w-[380px] border border-slate-300 rounded-sm mt-4">
              <div className="bg-[#1E2F6E] px-4 py-2 text-center">
                <span className="text-white font-bold text-sm tracking-widest uppercase">CHANTIER</span>
              </div>
              <div className="px-6 py-5 text-center space-y-1">
                <p className="text-base font-bold italic text-slate-700">{chantier.nom}</p>
                <p className="text-sm italic text-slate-500">{clientNom}</p>
                <p className="text-sm italic text-slate-500">{adresseChantier || "[Adresse complète du chantier]"}</p>
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="text-xs italic text-slate-500">Référence devis / contrat : {refDevis}</p>
                  <p className="text-xs italic text-slate-500">Édité le {formatDate(today)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Pied de page couverture */}
          <div className="text-center mt-8 pt-4 border-t border-slate-200">
            <p className="text-sm font-bold text-[#1E2F6E]">{nomEntreprise}</p>
            <p className="text-xs text-slate-500">{adresseSDA} — {villeSDA}</p>
            <p className="text-xs text-slate-500">{telSDA} · {emailSDA} · sda-renovation.com</p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 2 — Coordonnées & interlocuteurs
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page mx-auto w-full max-w-[210mm] min-h-[297mm] px-12 py-8 flex flex-col print:shadow-none shadow-xl my-6 print:my-0 bg-white print:break-before-page">
          <PageHeader />

          <div className="flex-1">
            <SectionTitle>Coordonnées du chantier et interlocuteurs</SectionTitle>

            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              Ce livret vous est remis avant votre intervention sur le chantier. Il rappelle les règles de sécurité, de
              qualité et d&apos;environnement à respecter par toute entreprise sous-traitante travaillant pour le compte de {nomEntreprise}.
            </p>

            <SubTitle>Entreprise principale</SubTitle>
            <TableInfo rows={[
              { label: "Entreprise",              value: nomEntreprise },
              { label: "Adresse",                 value: `${adresseSDA} — ${villeSDA}` },
              { label: "Téléphone",               value: telSDA },
              { label: "Courriel",                value: emailSDA },
              { label: "SIRET / Identifiant",     value: siretSDA },
              { label: "TVA intracommunautaire",  value: tvaSDA },
            ]} />

            <SubTitle>Chantier</SubTitle>
            <TableInfo rows={[
              { label: "Nature de l'ouvrage",         value: chantier.description?.split("\n")[0] ?? "[À compléter]" },
              { label: "Adresse chantier",             value: adresseChantier },
              { label: "Maître d'ouvrage",             value: clientNom },
              { label: "Référence devis / contrat",    value: refDevis },
            ]} />

            <SubTitle>Organigramme {nomEntreprise}</SubTitle>
            <table className="w-full border-collapse text-xs mb-4">
              <thead>
                <tr>
                  <th className="px-3 py-2 bg-[#1E2F6E] text-white text-left font-semibold border border-[#1E2F6E]">Fonction</th>
                  <th className="px-3 py-2 bg-[#1E2F6E] text-white text-left font-semibold border border-[#1E2F6E]">Nom</th>
                  <th className="px-3 py-2 bg-[#1E2F6E] text-white text-left font-semibold border border-[#1E2F6E]">Contact</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border border-slate-200">
                  <td className="px-3 py-2 border-r border-slate-200">Gérant / Conducteur de travaux</td>
                  <td className="px-3 py-2 border-r border-slate-200">Christopher Siadoua</td>
                  <td className="px-3 py-2">{telSDA}</td>
                </tr>
                <tr className="border border-slate-200 bg-slate-50">
                  <td className="px-3 py-2 border-r border-slate-200">Chef de chantier / référent sur site</td>
                  <td className="px-3 py-2 border-r border-slate-200 italic text-slate-400">À compléter</td>
                  <td className="px-3 py-2 italic text-slate-400">À compléter</td>
                </tr>
                <tr className="border border-slate-200">
                  <td className="px-3 py-2 border-r border-slate-200">Maître d&apos;ouvrage</td>
                  <td className="px-3 py-2 border-r border-slate-200">{clientNom}</td>
                  <td className="px-3 py-2 italic text-slate-400">Coordonnées confidentielles</td>
                </tr>
              </tbody>
            </table>

            <SubTitle>Corps de métier sous-traités intervenant sur ce chantier</SubTitle>
            <p className="text-xs text-slate-600 mb-2 leading-relaxed">
              Les corps de métier sous-traités par {nomEntreprise} dans le cadre de ce chantier font chacun l&apos;objet
              d&apos;une convention de sous-traitance dédiée. Chaque entreprise sous-traitante n&apos;est destinataire que des
              informations relatives à son propre lot.
            </p>
            <table className="w-full border-collapse text-xs mb-3">
              <thead>
                <tr>
                  <th className="px-3 py-2 bg-[#1E2F6E] text-white text-left font-semibold border border-[#1E2F6E]">Lot / Corps de métier</th>
                  <th className="px-3 py-2 bg-[#1E2F6E] text-white text-left font-semibold border border-[#1E2F6E]">Intervention prévue</th>
                </tr>
              </thead>
              <tbody>
                {lotsAffichage.length > 0 ? lotsAffichage.map((lot, i) => (
                  <tr key={i} className={`border border-slate-200 ${i % 2 === 1 ? "bg-slate-50" : ""}`}>
                    <td className="px-3 py-2 border-r border-slate-200 font-medium">
                      Lot {i + 1} — {lot.specialite || lot.nom}
                    </td>
                    <td className="px-3 py-2">{lot.titre || "[À compléter]"}</td>
                  </tr>
                )) : (
                  <>
                    <tr className="border border-slate-200">
                      <td className="px-3 py-2 border-r border-slate-200 italic text-slate-400">Lot 1 — [À compléter]</td>
                      <td className="px-3 py-2 italic text-slate-400">[À compléter]</td>
                    </tr>
                    <tr className="border border-slate-200 bg-slate-50">
                      <td className="px-3 py-2 border-r border-slate-200 italic text-slate-400">Lot 2 — [À compléter]</td>
                      <td className="px-3 py-2 italic text-slate-400">[À compléter]</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
            <p className="text-[10px] italic text-slate-500 leading-relaxed">
              Chaque entreprise sous-traitante reste seule responsable de la conformité de ses prestations, doit
              affecter des équipes compétentes et ne peut s&apos;adresser directement au maître d&apos;ouvrage sans l&apos;accord
              préalable de {nomEntreprise}.
            </p>
          </div>

          <PageFooter page={2} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 3 — Présentation SDA + Présentation du chantier
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page mx-auto w-full max-w-[210mm] min-h-[297mm] px-12 py-8 flex flex-col print:shadow-none shadow-xl my-6 print:my-0 bg-white print:break-before-page">
          <PageHeader />

          <div className="flex-1">
            <SectionTitle>Présentation de {nomEntreprise}</SectionTitle>
            <p className="text-xs text-slate-700 mb-2 leading-relaxed">
              SDA Rénovation est une entreprise générale du bâtiment toulousaine, fondée par Christopher Siadoua
              après plusieurs années d&apos;expérience en tant que conducteur de travaux (Eiffage Construction, Placéo,
              Adéquate Façade). Elle intervient en maçonnerie et renforcement structurel, dallage industriel,
              couverture et zinguerie, ravalement de façade et second œuvre, pour des particuliers comme pour des
              professionnels.
            </p>
            <p className="text-xs text-slate-700 mb-4 leading-relaxed">
              Nos valeurs : un seul interlocuteur fiable, des artisans et sous-traitants sélectionnés pour leur qualité et
              leur sérieux, la maîtrise des coûts et un accompagnement personnalisé de A à Z. En tant que sous-traitant,
              vous représentez SDA Rénovation sur le terrain : votre comportement, votre sécurité et la qualité de votre
              travail engagent notre image auprès du client.
            </p>

            <SectionTitle>Présentation du chantier</SectionTitle>
            {chantier.description ? (
              <p className="text-xs text-slate-700 mb-3 leading-relaxed whitespace-pre-wrap">{chantier.description}</p>
            ) : (
              <p className="text-xs italic text-slate-400 mb-3">
                [Description générale du chantier : nature de l&apos;ouvrage, surface, contexte (particulier / professionnel),
                organisation en lots le cas échéant.]
              </p>
            )}

            {lotsAffichage.length > 0 ? lotsAffichage.map((lot, i) => (
              <div key={i}>
                <p className="text-xs font-bold text-[#F7941E] mt-2 mb-1">Lot {i + 1} — {lot.specialite || lot.nom}</p>
                <p className="text-xs text-slate-700 ml-3">{lot.titre || "[Description des travaux]"}</p>
                <p className="text-xs italic text-slate-500 ml-3 mt-0.5">Travaux réalisés selon les normes et DTU applicables.</p>
              </div>
            )) : (
              <>
                <p className="text-xs font-bold text-[#F7941E] mt-2 mb-1">Lot 1 — [À compléter]</p>
                <p className="text-xs italic text-slate-400 ml-3">• [Description des travaux du lot 1]</p>
                <p className="text-xs italic text-slate-500 ml-3 mt-0.5">Travaux réalisés selon [normes / DTU applicables].</p>
                <p className="text-xs font-bold text-[#F7941E] mt-2 mb-1">Lot 2 — [À compléter]</p>
                <p className="text-xs italic text-slate-400 ml-3">• [Description des travaux du lot 2]</p>
                <p className="text-xs italic text-slate-500 ml-3 mt-0.5">Travaux réalisés selon [normes / DTU applicables].</p>
              </>
            )}

            {lotsAffichage.length > 0 && (
              <table className="w-full border-collapse text-xs mt-4">
                <tbody>
                  {lotsAffichage.map((lot, i) => (
                    <tr key={i} className={`border border-slate-200 ${i % 2 === 1 ? "bg-slate-50" : ""}`}>
                      <td className="px-3 py-2 font-semibold border-r border-slate-200">Lot {i + 1} — {lot.specialite || lot.nom}</td>
                      <td className="px-3 py-2 italic text-slate-500">{lot.titre || "[À compléter]"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <p className="text-[10px] italic text-slate-500 mt-3 leading-relaxed">
              Remarque : {chantier.adresse ? `Chantier situé au ${adresseChantier}.` : "[préciser le contexte du chantier — zone résidentielle, industrielle, professionnelle — et les points de vigilance particuliers : propreté, voisinage, nuisances, etc.]"}
            </p>
          </div>

          <PageFooter page={3} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 4 — Sécurité
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page mx-auto w-full max-w-[210mm] min-h-[297mm] px-12 py-8 flex flex-col print:shadow-none shadow-xl my-6 print:my-0 bg-white print:break-before-page">
          <PageHeader />

          <div className="flex-1">
            <SectionTitle>Sécurité</SectionTitle>
            <p className="text-xs text-slate-700 mb-3 leading-relaxed">
              Avant toute intervention sur le chantier, chaque entreprise sous-traitante doit :
            </p>
            <div className="mb-4">
              <Bullet>Avoir pris connaissance du présent livret et l&apos;avoir transmis à l&apos;ensemble de son personnel intervenant ;</Bullet>
              <Bullet>Fournir une attestation d&apos;assurance responsabilité civile et décennale en cours de validité ;</Bullet>
              <Bullet>Fournir, le cas échéant, son Plan Particulier de Sécurité et de Protection de la Santé (PPSPS) ou son mode opératoire de sécurité ;</Bullet>
              <Bullet>S&apos;assurer que son personnel dispose des habilitations et autorisations nécessaires (autorisation de conduite d&apos;engins, CACES, habilitation électrique, etc.).</Bullet>
            </div>

            <SubTitle>Équipements de Protection Individuelle (EPI)</SubTitle>
            <p className="text-xs text-slate-700 mb-4 leading-relaxed">
              Le port des EPI est obligatoire sur toute la durée de l&apos;intervention sur le chantier : casque (si risque de
              chute d&apos;objet), chaussures de sécurité, gants adaptés, lunettes de protection et gilet haute visibilité si le
              chantier est situé à proximité d&apos;une voie de circulation.
            </p>

            <SubTitle>Charte de prévention sous-traitants</SubTitle>
            <p className="text-xs text-slate-700 mb-2 leading-relaxed">
              Les règles suivantes s&apos;appliquent en permanence à l&apos;ensemble des sous-traitants et prestataires de {nomEntreprise} :
            </p>
            <div>
              <Bullet>Porter les EPI adaptés à la tâche réalisée ;</Bullet>
              <Bullet>Maintenir son poste de travail, les zones de stockage et les circulations propres et rangés ;</Bullet>
              <Bullet>Disposer d&apos;une autorisation de conduite pour tout engin utilisé ;</Bullet>
              <Bullet>N&apos;utiliser aucune échelle comme moyen d&apos;accès ; les escabeaux sont interdits, seules les plateformes sécurisées et conformes sont autorisées ;</Bullet>
              <Bullet>Maintenir en place les protections collectives existantes ;</Bullet>
              <Bullet>Respecter les moyens et les zones d&apos;approvisionnement définis avec {nomEntreprise} ;</Bullet>
              <Bullet>Trier les déchets et respecter les modalités d&apos;évacuation, notamment pour les déchets dangereux ;</Bullet>
              <Bullet>Informer immédiatement {nomEntreprise} de tout accident ou presqu&apos;accident survenu sur le chantier.</Bullet>
            </div>
          </div>

          <PageFooter page={4} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 5 — Accident + Qualité
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page mx-auto w-full max-w-[210mm] min-h-[297mm] px-12 py-8 flex flex-col print:shadow-none shadow-xl my-6 print:my-0 bg-white print:break-before-page">
          <PageHeader />

          <div className="flex-1">
            <SectionTitle>En cas d&apos;accident</SectionTitle>
            <p className="text-xs text-slate-700 mb-2 leading-relaxed">
              Accident = urgence. Le témoin de l&apos;accident doit immédiatement :
            </p>
            <div className="mb-4">
              <Bullet>Protéger la victime et écarter tout danger persistant (électrisation, éboulement, asphyxie…) ;</Bullet>
              <Bullet>Faire le bilan de la situation ;</Bullet>
              <Bullet>Alerter les secours et prévenir le chef de chantier {nomEntreprise}.</Bullet>
            </div>

            <table className="w-full border-collapse text-xs mb-4">
              <tbody>
                <tr className="border border-slate-200">
                  <td className="px-3 py-2 font-bold text-[#1E2F6E] bg-slate-50 border-r border-slate-200">SAMU</td>
                  <td className="px-3 py-2">15</td>
                </tr>
                <tr className="border border-slate-200">
                  <td className="px-3 py-2 font-bold text-[#1E2F6E] bg-slate-50 border-r border-slate-200">Pompiers</td>
                  <td className="px-3 py-2">18</td>
                </tr>
                <tr className="border border-slate-200">
                  <td className="px-3 py-2 font-bold text-[#1E2F6E] bg-slate-50 border-r border-slate-200">Numéro d&apos;urgence européen</td>
                  <td className="px-3 py-2">112</td>
                </tr>
              </tbody>
            </table>

            <p className="text-[10px] italic text-slate-500 mb-3 leading-relaxed">
              Appel clair et précis : nature de l&apos;accident, nombre de victimes, adresse exacte du chantier
              ({adresseChantier || "[À compléter]"}), état de la ou des victimes.
            </p>
            <p className="text-xs text-slate-700 mb-1 leading-relaxed">
              En cas d&apos;accident grave : faire alerter les secours et placer un guide à l&apos;entrée du chantier pour les orienter.
              En cas d&apos;accident bénin : prodiguer les premiers soins.
            </p>
            <p className="text-xs text-slate-700 mb-5 leading-relaxed">
              Tout accident, même léger, doit être signalé sans délai à Christopher Siadoua ({telSDA}).
            </p>

            <SubTitle>Qualité</SubTitle>
            <p className="text-xs text-slate-700 mb-2 leading-relaxed">
              Le client attend de nous un ouvrage de qualité : bien réalisé, livré dans les délais, sur un chantier
              propre. Chaque sous-traitant s&apos;engage à :
            </p>
            <div>
              <Bullet>Assurer la présence d&apos;un encadrement compétent sur le chantier ;</Bullet>
              <Bullet>Fournir les documents demandés en temps utile (assurances, fiches techniques, PPSPS) ;</Bullet>
              <Bullet>Organiser ses livraisons et stockages en concertation avec {nomEntreprise} ;</Bullet>
              <Bullet>Réaliser ses propres contrôles qualité et signaler toute non-conformité ;</Bullet>
              <Bullet>Nettoyer son poste de travail chaque jour et maintenir l&apos;ordre sur le chantier.</Bullet>
            </div>
          </div>

          <PageFooter page={5} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 6 — Environnement & voisinage
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page mx-auto w-full max-w-[210mm] min-h-[297mm] px-12 py-8 flex flex-col print:shadow-none shadow-xl my-6 print:my-0 bg-white print:break-before-page">
          <PageHeader />

          <div className="flex-1">
            <SectionTitle>Environnement et respect du voisinage</SectionTitle>

            <SubTitle>Trions nos déchets</SubTitle>
            <div className="mb-3">
              <Bullet>Éviter le gaspillage de matériaux ;</Bullet>
              <Bullet>Respecter les zones de tri prévues sur le chantier ;</Bullet>
              <Bullet>Ne pas brûler et ne pas abandonner de déchets sur le terrain ou aux abords ;</Bullet>
              <Bullet>Évacuer les déchets et gravats dans les filières adaptées.</Bullet>
            </div>

            <SubTitle>Limitons les nuisances</SubTitle>
            <div className="mb-3">
              <Bullet>Respecter les horaires de chantier : [À compléter] ;</Bullet>
              <Bullet>Limiter le volume sonore (radios, outils bruyants) et éviter toute nuisance en dehors de ces horaires ;</Bullet>
              <Bullet>Couper le moteur des véhicules et engins à l&apos;arrêt ;</Bullet>
              <Bullet>Utiliser des bacs de rétention pour tout produit polluant et ne rejeter aucun produit dangereux dans les réseaux ou le milieu naturel ;</Bullet>
              <Bullet>Informer le voisinage en cas de nuisance ponctuelle prévisible (livraison, coulage de béton) et faire preuve de courtoisie envers les riverains.</Bullet>
            </div>

            <SubTitle>Stationnement et accès</SubTitle>
            <p className="text-xs italic text-slate-400 mb-4 leading-relaxed">
              [Préciser les modalités de stationnement et d&apos;accès au chantier : aire dédiée, voie publique, restrictions
              horaires, consignes riverains, etc.]
            </p>
            <p className="text-xs text-slate-700 leading-relaxed">
              À la sortie du chantier, veillez à ne pas porter vos EPI en dehors de la zone de travaux et à laisser les
              abords propres et dégagés.
            </p>
          </div>

          <PageFooter page={6} />
        </div>

        {/* ══════════════════════════════════════════════════════════════════
            PAGE 7 — Engagement & signatures
        ══════════════════════════════════════════════════════════════════ */}
        <div className="page mx-auto w-full max-w-[210mm] min-h-[297mm] px-12 py-8 flex flex-col print:shadow-none shadow-xl my-6 print:my-0 bg-white print:break-before-page">
          <PageHeader />

          <div className="flex-1">
            <SectionTitle>Engagement</SectionTitle>

            <div className="space-y-4 mb-8 text-xs text-slate-700">
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap font-medium">Je soussigné(e) :</span>
                <div className="flex-1 border-b border-slate-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap font-medium">Représentant(e) de l&apos;entreprise :</span>
                <div className="flex-1 border-b border-slate-400" />
              </div>
              <div className="flex items-center gap-2">
                <span className="whitespace-nowrap font-medium">Fonction :</span>
                <div className="flex-1 border-b border-slate-400" />
              </div>
            </div>

            <p className="text-xs text-slate-700 mb-8 leading-relaxed">
              Reconnais avoir pris connaissance du présent livret d&apos;accueil du chantier{" "}
              <em className="font-semibold">« {chantier.nom} »</em> et
              m&apos;engage à transmettre cette information à l&apos;ensemble des salariés de mon entreprise intervenant sur
              ce chantier, ainsi qu&apos;à faire respecter toutes les règles qui y figurent, notamment celles de la charte de
              prévention sous-traitants.
            </p>

            <div className="grid grid-cols-2 gap-12 mt-6">
              <div>
                <p className="text-xs font-bold text-[#1E2F6E] mb-3">Pour l&apos;entreprise sous-traitante :</p>
                <div className="flex items-center gap-2 text-xs mb-6">
                  <span>Le (date) :</span>
                  <div className="w-32 border-b border-slate-400" />
                </div>
                <p className="text-xs mb-1">Signature :</p>
                <div className="h-20 border border-dashed border-slate-300 rounded" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1E2F6E] mb-3">Pour {nomEntreprise} :</p>
                <div className="flex items-center gap-2 text-xs mb-6">
                  <span>Le (date) :</span>
                  <div className="w-32 border-b border-slate-400" />
                </div>
                <p className="text-xs mb-1">Signature :</p>
                <div className="h-20 border border-dashed border-slate-300 rounded" />
              </div>
            </div>

            <p className="text-[10px] italic text-slate-500 mt-10">
              Document établi en deux exemplaires : un pour l&apos;entreprise sous-traitante, un pour {nomEntreprise}.
            </p>
          </div>

          <PageFooter page={7} />
        </div>

      </div>

      {/* CSS print */}
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm 0 12mm 0; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .page { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>
    </>
  );
}
