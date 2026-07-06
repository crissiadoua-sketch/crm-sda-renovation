import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { COMPANY } from "@/lib/company";
import { formatEuros, formatDate } from "@/lib/format";
import { PrintToolbar } from "./print-toolbar";

export default async function ApercuContratSousTraitancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const contrat = await prisma.contratSousTraitance.findUnique({
    where: { id },
    include: { sousTraitant: true, chantier: true },
  });

  if (!contrat) notFound();

  const st = contrat.sousTraitant;
  const blank = (val?: string | null, len = 30) =>
    val ? val : "_".repeat(len);

  const montantHT  = contrat.montantHT  ?? 0;
  const tauxTVA   = contrat.tauxTVA    ?? 10;
  const montantTTC = montantHT * (1 + tauxTVA / 100);

  return (
    <>
      <PrintToolbar label={`Convention de sous-traitance — ${contrat.numero}`} />

      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 15mm 15mm 20mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .pb { break-before: page; }
        }
        .art { margin-bottom: 1.1em; }
        .art-title { font-size: 13px; font-weight: 700; color: #1E2F6E; margin-bottom: 3px; }
        .art-body { font-size: 11px; line-height: 1.7; color: #374151; }
        .art-body p { margin-bottom: 6px; }
        .art-body ul { margin-left: 16px; list-style: none; }
        .art-body ul li::before { content: "– "; }
        .section-title { font-size: 14px; font-weight: 800; color: #1E2F6E; border-left: 4px solid #F7941E; padding-left: 8px; margin: 18px 0 8px; }
        table.parties { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        table.parties td { border: 1px solid #cbd5e1; padding: 5px 10px; font-size: 11px; vertical-align: top; }
        table.parties td:first-child { font-weight: 700; color: #1E2F6E; width: 38%; background: #f8fafc; }
        .toc { font-size: 11px; color: #374151; }
        .toc li { display: flex; justify-content: space-between; padding: 1px 0; }
        .sign-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 16px; }
        .sign-label { font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: .05em; margin-bottom: 4px; }
        .sign-line { border-bottom: 1px dashed #94a3b8; margin: 18px 0 4px; height: 1px; }
      `}</style>

      {/* ─── PAGE 1 : Couverture ─── */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none">
        <div className="px-12 py-8 print:px-10 print:py-6">

          {/* En-tête */}
          <div className="flex items-start justify-between border-b-2 border-[#1E2F6E] pb-4 mb-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="SDA Rénovation" className="h-10 w-auto object-contain" />
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-[#1E2F6E] uppercase">Convention de sous-traitance</p>
              <p className="text-xs text-[#F7941E] font-semibold">Protocole de sous-traitance</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mb-6 text-center">
            {COMPANY.adresse} – {COMPANY.codePostal} {COMPANY.ville} | {COMPANY.email} | {COMPANY.telephone} | SIRET : {COMPANY.siren}
          </p>

          <h1 className="text-center text-2xl font-black text-[#1E2F6E] mb-8">CONVENTION DE SOUS TRAITANCE</h1>

          <p className="text-xs mb-4">Entre :</p>

          {/* SDA */}
          <table className="parties">
            <tbody>
              <tr><td>La société</td><td className="font-bold">{COMPANY.nom}</td></tr>
              <tr><td>Situé,</td><td>{COMPANY.adresse} – {COMPANY.codePostal} {COMPANY.ville}</td></tr>
              <tr><td>Représentée par</td><td>M. SIADOUA Christopher, chargé d&apos;affaires</td></tr>
              <tr>
                <td>Immatriculée au Registre du Commerce de Toulouse sous le n°</td>
                <td>{COMPANY.siren}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-xs mb-4">Ci-dénommée après « <strong>SDA</strong> »<br />D&apos;une part et,</p>

          <p className="text-xs font-bold mb-2">ET :</p>

          {/* Partenaire */}
          <table className="parties">
            <tbody>
              <tr><td>La société</td><td>{blank(st.nom)}</td></tr>
              <tr><td>Au capital de</td><td>{blank(null, 20)} Euros</td></tr>
              <tr><td>Immatriculée au</td><td>{blank(null, 20)} de {blank(null, 20)}</td></tr>
              <tr><td>Sous le numéro</td><td>{blank(null)}</td></tr>
              <tr><td>Dont le siège social est situé</td><td>{blank(st.adresse)}</td></tr>
              <tr><td>Représentée par, en sa qualité de</td><td>{blank(st.contact)}</td></tr>
            </tbody>
          </table>
          <p className="text-xs mb-6">
            Ci-dénommée après le « <strong>Partenaire</strong> » ou le « <strong>Sous-traitant</strong> »<br />
            <strong>Ci-après désignées collectivement par « les Parties »</strong>
          </p>

          {/* Sommaire */}
          <p className="font-bold text-[#1E2F6E] mb-2">SOMMAIRE</p>
          <ul className="toc">
            {[
              ["Préambule", "2"], ["1. Objet", "2"],
              ["2. Etablissement et négociation de la Proposition commune et du Marché", "2"],
              ["3. Principes de réalisation des prestations", "3"],
              ["4. Durée du Protocole", "4"], ["5. Propriété intellectuelle", "4"],
              ["6. Confidentialité", "5"], ["7. Traitement de données à caractère personnel", "5"],
              ["8. Résiliation", "5"], ["9. Force majeure", "6"],
              ["10. Cession et sous-traitance", "7"], ["11. Autres dispositions", "7"],
              ["12. Droit applicable – Attribution de compétence", "7"],
              ["13. Documents contractuels", "7"],
            ].map(([label, page]) => (
              <li key={label}><span>{label}</span><span>{page}</span></li>
            ))}
          </ul>
        </div>
      </div>

      {/* ─── PAGE 2 : Préambule + Art. 1 + Art. 2 ─── */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none print:pb pb">
        <div className="px-12 py-8 print:px-10 print:py-6">
          <p className="text-[10px] text-slate-400 text-center mb-6">
            {COMPANY.adresse} – {COMPANY.codePostal} {COMPANY.ville} | {COMPANY.email} | {COMPANY.telephone} | SIRET : {COMPANY.siren}
          </p>

          <div className="section-title">Préambule</div>
          <div className="art-body">
            <p>1. Les Parties ont décidé de collaborer en vue d&apos;élaborer une Proposition commune de sous-traitance en réponse à un Appel d&apos;Offres du Client réf {blank(contrat.numero, 15)} en date du {blank(contrat.dateDebut ? formatDate(contrat.dateDebut) : null, 12)} portant sur {blank(contrat.objet, 20)}.</p>
            <p>2. A cet effet, elles ont souhaité établir les principes de leur collaboration.</p>
          </div>
          <p className="text-center text-xs font-bold my-4">CECI ETANT EXPOSE, IL A ETE CONVENU CE QUI SUIT</p>

          <div className="section-title">1.&nbsp; Objet</div>
          <div className="art-body">
            <p>Le présent contrat (« Contrat » ou « Protocole ») a pour objet de définir :</p>
            <p>1. les conditions de coopération pour l&apos;établissement et négociation d&apos;une Proposition commune ; (Art. 2)</p>
            <p>2. les principes devant régir la sous-traitance. (Art. 3)</p>
          </div>

          <div className="section-title">2.&nbsp; Etablissement et négociation de la Proposition commune et du Marché</div>
          <div className="art-body">
            <p>2.1 L&apos;objet de la Proposition commune est de définir les Prestations à réaliser pour le Client ainsi que de définir les conditions de réalisation.</p>
            <p>2.2 L&apos;objet du Marché est de définir avec le Client les conditions de réalisation juridiques des Prestations.</p>
            <p>2.3 Une première liste des prestations à la charge du Sous-traitant figure en Annexe des présentes avec les conditions financières associées.</p>
            <p>2.4 Chacune des Parties collaborera à l&apos;établissement de la Proposition commune :</p>
            <ul>
              <li>en rédigeant la partie de la Proposition qui la concerne,</li>
              <li>en participant à l&apos;intégration des différentes parties composant la Proposition commune,</li>
              <li>en validant, avant remise au Client, la partie de la Proposition qui la concerne,</li>
              <li>en y affectant des équipes compétentes,</li>
              <li>en mettant en œuvre ses méthodes et savoirs-faire, et ses connaissances du contexte du Client, pour proposer des réponses/solutions adaptées aux besoins du Client,</li>
              <li>dans un esprit de partenariat et un souci d&apos;information réciproque, s&apos;agissant en particulier des interdépendances,</li>
              <li>à ses frais,</li>
              <li>et dans le respect des délais de réponses imposés par le Client.</li>
            </ul>
            <p>2.5 Il est convenu que SDA conduira la discussion de la Proposition commune et du Marché avec le Client.</p>
            <p>2.6 SDA négociera la Proposition et le Marché en coopération avec le Partenaire.</p>
            <p>2.7 Dans le cas où SDA serait amenée à modifier les principes de la Proposition commune pour les Prestations à la charge du Partenaire, elle en informera le Partenaire. Celui-ci précisera s&apos;il accepte ou non cette modification dans les plus brefs délais.</p>
            <p>2.8 En cas de refus, SDA pourra décider :</p>
            <p>• Soit de continuer avec le Partenaire aux conditions de la Proposition initiale. Dans ce cas, le Partenaire demeure tenu par les termes de la Proposition pendant toute la durée du présent Protocole ;</p>
            <p>• Soit de continuer seule ou avec d&apos;autres partenaires. Dans ce cas, le présent Protocole prendra fin de plein droit à la date de notification de la décision de SDA et ce, sans autre formalité, ni indemnité.</p>
            <p>2.9 SDA ne pourra être tenue responsable si la Proposition commune n&apos;est pas retenue par le Client.</p>
            <p>2.10 Pendant la durée du présent Protocole, le Partenaire s&apos;engage à ne pas participer directement ou indirectement à l&apos;établissement d&apos;une offre concurrente de la Proposition commune.</p>
          </div>
        </div>
      </div>

      {/* ─── PAGE 3 : Article 3 ─── */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none pb">
        <div className="px-12 py-8 print:px-10 print:py-6">
          <p className="text-[10px] text-slate-400 text-center mb-6">
            {COMPANY.adresse} – {COMPANY.codePostal} {COMPANY.ville} | {COMPANY.email} | {COMPANY.telephone} | SIRET : {COMPANY.siren}
          </p>

          <div className="section-title">3.&nbsp; Principes de réalisation des Prestations</div>
          <div className="art-body">
            <p>3.1 Le Partenaire interviendra vis-à-vis du Client en qualité de sous-traitant de SDA.</p>
            <p>3.2 Si la Proposition commune est retenue par le Client, le Protocole vaut contrat de sous-traitance entre les Parties, qui le cas échéant pourront signer dans les meilleurs délais, un avenant au Protocole afin de préciser les modalités opérationnelles énoncées dans l&apos;Appel d&apos;Offres ou les éventuelles dérogations aux principes énoncés dans le présent Protocole et à la Proposition telle qu&apos;acceptée par le Client ou tout autre document convenu entre le Client et SDA communiqué au Partenaire.</p>
            <p>3.3 En tout état de cause et quelle que soit la terminologie employée dans la Proposition (ou les documents de l&apos;Appel d&apos;Offres), l&apos;intention des Parties n&apos;est pas de créer une société ou toute autre forme de groupement ou d&apos;association dotée de la personnalité morale, toute notion d&apos;affectio societatis étant exclue.</p>
            <p>3.4 Au titre de l&apos;exécution des Prestations sous-traitées au Partenaire au titre du présent Protocole, les obligations du Partenaire sont les suivantes :</p>
            <p>• le Partenaire est responsable des Prestations qui lui sont confiées, la qualité de sous-traitant ne devant en aucun cas permettre des travaux non finalisés ou non totalement conformes ;</p>
            <p>• le Partenaire s&apos;engage sur le caractère forfaitaire du prix figurant en Annexe des présentes ;</p>
            <p>• les Prestations devront être livrées conformément aux spécifications et aux contraintes (délais, pénalités, garantie, engagement de performances ….) définies dans l&apos;Appel d&apos;Offres, dans le présent Protocole et dans la Proposition telle qu&apos;acceptée par le Client ;</p>
            <p>• en s&apos;assurant de la compatibilité de ses Prestations avec celles incombant à l&apos;autre Partie et devra, à cet effet, fournir à l&apos;autre Partie toutes les informations nécessaires ou que celle-ci lui demandera ;</p>
            <p>• le Partenaire réalisera les Prestations qui lui sont confiées :</p>
            <ul>
              <li>en y affectant des équipes compétentes et des moyens adéquats, dans le respect de la réglementation sociale et fiscale et des règles sur l&apos;immigration,</li>
              <li>en mettant en œuvre ses méthodes et savoirs-faire, ainsi que ses connaissances des méthodes et savoirs-faire utilisés par le Client,</li>
              <li>dans un esprit de partenariat et un souci de transparence et d&apos;information réciproque sur l&apos;exécution de ses Prestations,</li>
              <li>en respectant les normes éventuellement transmise par SDA,</li>
              <li>à ses frais,</li>
              <li>en s&apos;engageant à ne pas s&apos;adresser directement au Client ;</li>
              <li>en avertissant SDA de toute difficulté susceptible d&apos;avoir une incidence sur les délais, la qualité ou le bon déroulement des Prestations,</li>
              <li>en acceptant de contribuer au prorata de sa part en jours/hommes ou en honoraires dans le Marché au diagnostic, à la définition et à la mise en œuvre d&apos;un plan de résolution des difficultés mis au point d&apos;un commun accord dans l&apos;hypothèse où les Parties ne peuvent s&apos;accorder sur les responsabilités respectives ; pour ce faire, chaque Partie mettra à la disposition de l&apos;autre les éléments nécessaires (livrables en l&apos;état, ressources…) à la mise en œuvre de la solution retenue. La répartition au prorata des parts sera réalisée à titre provisoire, dans l&apos;attente de la répartition des responsabilités entre les Parties, et à titre définitif dans le cas où cette répartition de responsabilités ne serait pas possible. Cette disposition ne pourra empêcher SDA de mettre en demeure à tout moment le Partenaire en cas de défaillance de sa part.</li>
            </ul>
            <p>• au besoin, le Partenaire participera aux opérations de recette. Etant précisé que, les Prestations du Partenaire ne peuvent être définitivement réceptionnées par SDA qu&apos;à la date de signature du procès verbal de réception définitive des Prestations par le Client.</p>
            <p>3.5 Le Partenaire est pleinement informé du fait que les documents contractuels applicables sont les documents listés dans l&apos;Appel d&apos;Offres ou tout autre document liant le Client et SDA communiqué au Partenaire.</p>
            <p>3.6 Chacune des Parties déclare avoir lu l&apos;intégralité des documents d&apos;Appel d&apos;Offres et/ou du cahier des charges du Client concernant ses propres Prestations et déclare n&apos;avoir aucune autre réserve que celle éventuellement listée dans la Proposition commune.</p>
            <p>3.7 Le Partenaire ne pourra vis-à-vis de SDA invoquer une méconnaissance ou une incompréhension sur les documents d&apos;Appel d&apos;Offres et/ou du cahier des charges du Client ou des documents contractuels applicables de nature juridique, financière ou technique pour justifier une défaillance dans ses engagements contractuels.</p>
            <p>3.8 Dans le cas où la Proposition commune serait retenue par le Client, le Partenaire s&apos;engage à ne pas participer directement ou indirectement à la réalisation des Prestations, de toute autre façon que celle faisant l&apos;objet du présent Protocole.</p>
          </div>
        </div>
      </div>

      {/* ─── PAGE 4 : Art. 4 + Art. 5 ─── */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none pb">
        <div className="px-12 py-8 print:px-10 print:py-6">
          <p className="text-[10px] text-slate-400 text-center mb-6">
            {COMPANY.adresse} – {COMPANY.codePostal} {COMPANY.ville} | {COMPANY.email} | {COMPANY.telephone} | SIRET : {COMPANY.siren}
          </p>

          <div className="section-title">4.&nbsp; Durée du Protocole</div>
          <div className="art-body">
            <p>4.1 Le présent Protocole prend effet à la date du {blank(contrat.dateDebut ? formatDate(contrat.dateDebut) : null, 15)}.</p>
            <p>4.2 Le présent Protocole expirera sans préavis ni indemnité à la survenance du premier des événements suivants :</p>
            <p>• la date de notification écrite par le Client du rejet de la candidature ou de la Proposition commune ou de l&apos;abandon du Projet,</p>
            <p>• la non acceptation par le Client du Partenaire comme sous-traitant ,</p>
            <p>• en cas d&apos;absence de décision du Client au plus tard 90 jours après la remise de la Proposition commune par SDA.</p>
            <p>4.3 Si la Proposition commune est retenue par le Client, le Protocole vaut contrat de sous-traitance entre les Parties, il est alors réputé conclu pour la durée des Prestations concernées et ne peut en tout état de cause excéder la durée du Marché conclu entre SDA et le Client.</p>
          </div>

          <div className="section-title">5.&nbsp; Propriété intellectuelle</div>
          <div className="art-body">
            <p>5.1 Les méthodologies et les outils demeurent la propriété de la Partie qui les apporte ou qui les développe.</p>
            <p>5.2 Chacune des Parties reste la seule propriétaire de la partie de la Proposition commune qu&apos;elle aura réalisée.</p>
            <p>5.3 Le Partenaire autorise SDA à utiliser sa marque, son logo et/ou sa dénomination sociale dans la Proposition commune.</p>
            <p>5.4 Tous les droits de propriété relatifs aux Prestations du sous-traitant devront être cédés dans leur intégralité à SDA dans le cadre du contrat de sous-traitance.</p>
          </div>
        </div>
      </div>

      {/* ─── PAGE 5 : Art. 6 + Art. 7 + Art. 8 ─── */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none pb">
        <div className="px-12 py-8 print:px-10 print:py-6">
          <p className="text-[10px] text-slate-400 text-center mb-6">
            {COMPANY.adresse} – {COMPANY.codePostal} {COMPANY.ville} | {COMPANY.email} | {COMPANY.telephone} | SIRET : {COMPANY.siren}
          </p>

          <div className="section-title">6.&nbsp; Confidentialité</div>
          <div className="art-body">
            <p>6.1 Chaque Partie s&apos;engage à conserver confidentielles les informations commerciales, techniques et financières ainsi que les méthodologies et outils de l&apos;autre Partie dont elle aura connaissance à l&apos;occasion de l&apos;exécution du présent Protocole. Les Parties s&apos;engagent à respecter les règles de confidentialité imposées par le Client. La Proposition commune est également confidentielle. Cette disposition ne pourra toutefois empêcher chacune des Parties de réutiliser en partie de la Proposition dont elle est la propriétaire sous réserve de la confidentialité vis-à-vis du Client.</p>
            <p>6.2 Chaque Partie s&apos;engage à n&apos;utiliser ces Informations qu&apos;aux fins de la réalisation du présent Protocole et/ou du Marché, et à les protéger avec le degré de précaution qu&apos;elle accorde à ses propres informations confidentielles.</p>
            <p>6.3 Les Parties ne communiqueront les Informations qu&apos;à ceux de leurs employés qui auront besoin de les connaître en vue de l&apos;exécution du présent Protocole ou du Marché et devront les informer de leur nature confidentielle.</p>
            <p>6.4 Cette obligation subsistera pour chacune des deux Parties pendant les trois années suivant la fin du présent Protocole pour quelque cause que ce soit.</p>
            <p>6.5 Il est précisé que ne seront pas considérées comme confidentielles les informations :</p>
            <p>• dont une Partie disposerait, sans l&apos;obligation de secret, au moment de leur transmission par l&apos;autre Partie,</p>
            <p>• qui sont dans le domaine public ou qui y sont tombées, sans qu&apos;il y ait eu violation des engagements par l&apos;une ou l&apos;autre des Parties,</p>
            <p>• qui ont été communiquées sans l&apos;obligation de secret à une Partie, par un tiers non soumis a secret,</p>
            <p>• pour lesquelles la Partie, qui a communiqué l&apos;information, a indiqué par écrit qu&apos;elle retirait le caractère confidentiel.</p>
            <p>6.6 Les modalités de publicité (notamment avis, communications, articles de presse…) faites par une Partie à l&apos;occasion de la signature et/ou de l&apos;exécution du présent Protocole requièrent l&apos;accord préalable écrit de l&apos;autre Partie et, le cas échéant, du Client.</p>
          </div>

          <div className="section-title">7.&nbsp; Traitement de données à caractère personnel</div>
          <div className="art-body">
            <p>(A) Chacune des Parties s&apos;engagent à respecter les obligations légales et règlementaires à sa charge en matière de traitement de données personnelles.</p>
            <p>(B) Conformément à la Proposition commune et au présent Protocole, le Partenaire s&apos;est engagé à fournir les Prestations à SDA au profit du Client SDA. Au cours de leur exécution, si le Partenaire est amené à traiter des Données à Caractère Personnel en qualité de sous-Traitant au sens de la règlementation applicable (notamment le règlement (UE) 2016/679 du Parlement européen et du Conseil du 27 avril 2016) pour le compte de SDA, les Parties conviendront des modalités applicables audit traitement. Le descriptif de ce(s) traitement(s) figure en Annexe 2 du présent Protocole.</p>
          </div>

          <div className="section-title">8.&nbsp; Résiliation</div>
          <div className="art-body">
            <p>8.1 En cas de manquement par l&apos;une des Parties à l&apos;une quelconque des obligations prévues aux présentes, non réparé dans un délai de (15) quinze jours à compter de la réception de la notification du manquement en cause, l&apos;autre Partie pourra faire valoir la résiliation immédiate du présent Protocole de plein droit, par lettre recommandée avec accusé de réception, sous réserve de tous les dommages et intérêts auxquels elle pourrait prétendre.</p>
            <p>8.2 Il pourra également être mis fin sans indemnité, par écrit et d&apos;un commun accord au présent Protocole de coopération si les Parties ne parviennent pas à un accord sur les termes et conditions de la Proposition commune.</p>
          </div>
        </div>
      </div>

      {/* ─── PAGE 6 : Art. 9 Responsabilité + Art. 9 Force majeure ─── */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none pb">
        <div className="px-12 py-8 print:px-10 print:py-6">
          <p className="text-[10px] text-slate-400 text-center mb-6">
            {COMPANY.adresse} – {COMPANY.codePostal} {COMPANY.ville} | {COMPANY.email} | {COMPANY.telephone} | SIRET : {COMPANY.siren}
          </p>

          <div className="section-title">9.&nbsp; Responsabilité- Assurances</div>
          <div className="art-body">
            <p>Chaque Partie certifie que l&apos;ensemble des risques liés à sa responsabilité civile et professionnelle, sont couverts par une police d&apos;assurance adaptée pour la durée du contrat auprès d&apos;une compagnie d&apos;assurance notoirement solvable.</p>
            <p>Les Parties conviennent de rappeler que chaque Partie assume toutes les responsabilités inhérentes aux obligations qu&apos;elle doit honorer dans le cadre du présent Protocole. En aucun cas, les Parties ne seront responsables des dommages indirects subis par l&apos;autre Partie. En outre, les Parties conviennent expressément que les stipulations du Protocole n&apos;ont pas pour objet ou effet d&apos;exclure ou de limiter la responsabilité d&apos;une Partie en cas de :</p>
            <ul>
              <li>faute lourde ou intentionnelle,</li>
              <li>décès ou de dommage corporel,</li>
              <li>violation des engagements à la charge d&apos;une Partie en matière de Droit de Propriété Intellectuelle</li>
            </ul>
            <p>Vis-à-vis du Partenaire, la responsabilité de SDA ne peut être engagée qu&apos;en réparation d&apos;un préjudice direct, réel, personnel et certain subi par le Partenaire pour autant que le Partenaire rapporte la preuve que la faute de SDA (ou d&apos;un tiers mandaté par SDA pour l&apos;exécution des Prestations) est la cause de ce préjudice, à l&apos;exclusion des préjudices indirects, pertes d&apos;exploitation, de productivité, atteintes à l&apos;image de marque, ou pertes liées à des engagements à l&apos;égard de tiers.</p>
            <p>Sauf hypothèse où la responsabilité du Prestataire ne peut être limitée ou exclue conformément au droit applicable, en cas de responsabilité de SDA envers le Partenaire, pour toute la durée du Protocole et pour l&apos;ensemble des causes et sinistres, du fait de l&apos;exécution ou de la non-exécution par SDA de ses obligations, SDA sera responsable des dommages directs subis par le Partenaire dans la limite, d&apos;un montant équivalent au prix HT à payer au titre du Protocole (déduction faite des indemnités forfaitaires et/ou pénalités à la charge du Partenaire).</p>
          </div>

          <div className="section-title">9.&nbsp; Force majeure</div>
          <div className="art-body">
            <p>Dans le cas où un événement de force majeure surviendrait pendant la durée du Contrat, la Partie affectée par l&apos;évènement le notifie dans les meilleurs délais à l&apos;autre Partie par écrit, et l&apos;exécution de l&apos;obligation affectée par l&apos;évènement de force majeure est alors suspendue dans un premier temps. De façon expresse, sont considérés comme cas de force majeure ou cas fortuit, (i) ceux correspondant à la définition prévue à l&apos;article 1218 du Code Civil et ceux habituellement retenus par la jurisprudence des Cours et Tribunaux français mais également (ii) les cas que les Parties conviennent d&apos;assimiler comme tels, à savoir (i) les grèves ou conflits sociaux, (ii) le blocage des moyens de transport, d&apos;approvisionnement, de communications (iii) les tremblements de terre, incendies, tempêtes, inondations, pandémies, (iv) les pannes de fourniture des fluides extérieures aux Parties, (v) les guerres et émeutes, (vi) le fait du prince ou de toute autre circonstance indépendante de la volonté des Parties empêchant l&apos;exécution normale du Contrat. Si la force majeure persiste au-delà d&apos;une période de dix (10) jours, les Parties se consulteront pour statuer sur la poursuite de tout ou partie du Contrat.</p>
          </div>
        </div>
      </div>

      {/* ─── PAGE 7 : Art. 10 à 13 ─── */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none pb">
        <div className="px-12 py-8 print:px-10 print:py-6">
          <p className="text-[10px] text-slate-400 text-center mb-6">
            {COMPANY.adresse} – {COMPANY.codePostal} {COMPANY.ville} | {COMPANY.email} | {COMPANY.telephone} | SIRET : {COMPANY.siren}
          </p>

          <div className="section-title">10.&nbsp; Cession et sous-traitance</div>
          <div className="art-body">
            <p>10.1 Nulle Partie ne peut céder, apporter ou transférer, même par voie de fusion, le Contrat à un tiers, sans l&apos;accord écrit et préalable de l&apos;autre Partie.</p>
            <p>10.2 SDA pourra sous-traiter tout ou partie de ses obligations et/ou faire appel aux compétences ou à l&apos;expérience particulière de certains tiers experts pour l&apos;exécution des Services.</p>
          </div>

          <div className="section-title">11.&nbsp; Autres dispositions</div>
          <div className="art-body">
            <p>11.1 Le fait pour une Partie de ne pas invoquer une stipulation quelconque du Contrat ne saurait être analysé comme une renonciation et n&apos;affecte pas le droit ultérieur de la Partie à l&apos;appliquer ou à l&apos;invoquer.</p>
            <p>11.2 L&apos;invalidité ou l&apos;inopposabilité d&apos;une partie des stipulations du Contrat n&apos;affectera pas la validité ou l&apos;opposabilité des autres stipulations qui resteront pleinement en vigueur.</p>
            <p>11.3 Le Contrat ne pourra être modifié valablement que par un écrit signé des représentants des deux Parties.</p>
          </div>

          <div className="section-title">12.&nbsp; Droit applicable – Attribution de compétence</div>
          <div className="art-body">
            <p>12.1 Le présent Protocole est soumis au droit Français.</p>
            <p className="font-bold">12.2 EN CAS DE DIFFEREND PORTANT SUR LE PRESENT PROTOCOLE ET APRES RECHERCHE INFRUCTUEUSE D&apos;UNE SOLUTION AMIABLE, COMPETENCE EXPRESSE EST ATTRIBUEE AU TRIBUNAL DE COMMERCE DE TOULOUSE, NONOBSTANT PLURALITE DE DEFENDEURS OU APPEL EN GARANTIE, MEME POUR LES PROCEDURES D&apos;URGENCE OU LES PROCEDURES CONSERVATOIRES, EN REFERE OU PAR REQUETE.</p>
          </div>

          <div className="section-title">13.&nbsp; Documents contractuels</div>
          <div className="art-body">
            <p>Il est convenu de préciser que le Contrat est constitué des documents listés ci-après par ordre hiérarchique de valeur juridique décroissante :</p>
            <p>i. Le présent Protocole,</p>
            <p>ii. Ses Annexes</p>
            <p className="ml-4">a. Annexe 1 Description des Prestations à la charge du Partenaire et conditions financières.</p>
            <p className="ml-4">b.</p>
            <p>En cas de contradiction entre une ou plusieurs stipulations figurant dans l&apos;un quelconque des documents listés ci-dessus, les dispositions contenues dans le document de rang hiérarchique supérieur prévaudront, sauf stipulation dérogatoire figurant au Contrat.</p>
            <p>Les Parties reconnaissent que toute fourniture des Prestations sera exclusivement et intégralement régie par le Contrat. Nonobstant toute clause contraire, en aucun cas les conditions générales du Partenaire, quel que soit le support sur lequel elles sont mentionnées, ne pourront être opposées à SDA. Le Contrat prévaut donc sur toutes clauses des bons de commandes/ devis ou de tout autre document du Partenaire.</p>
          </div>
        </div>
      </div>

      {/* ─── PAGE 8 : Signatures ─── */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none pb">
        <div className="px-12 py-8 print:px-10 print:py-6">
          <p className="text-[10px] text-slate-400 text-center mb-8">
            {COMPANY.adresse} – {COMPANY.codePostal} {COMPANY.ville} | {COMPANY.email} | {COMPANY.telephone} | SIRET : {COMPANY.siren}
          </p>

          <p className="text-xs mb-10">Fait à Toulouse, en deux exemplaires originaux.</p>

          <div className="grid grid-cols-2 gap-8">
            <div className="sign-box">
              <p className="sign-label">Pour SDA</p>
              <p className="text-xs mt-3">Nom : Christopher SIADOUA</p>
              <p className="text-xs mt-1">Qualité : ____________________________</p>
              <p className="text-xs mt-4">Date : ____________________________</p>
              <p className="text-xs mt-8 mb-1">Signature et cachet de l&apos;entreprise</p>
              <div className="sign-line" />
              <div style={{ height: "60px" }} />
            </div>
            <div className="sign-box">
              <p className="sign-label">Pour le Partenaire</p>
              <p className="text-xs mt-3">Nom : ____________________________</p>
              <p className="text-xs mt-1">Qualité : ____________________________</p>
              {contrat.signataireNom && contrat.dateSignature ? (
                <p className="text-xs text-emerald-600 font-medium mt-4">
                  ✅ Signé par {contrat.signataireNom} le {formatDate(contrat.dateSignature)}
                </p>
              ) : (
                <p className="text-xs mt-4">Date : ____________________________</p>
              )}
              <p className="text-xs mt-8 mb-1">Signature et cachet de l&apos;entreprise</p>
              <div className="sign-line" />
              <div style={{ height: "60px" }} />
            </div>
          </div>
        </div>
      </div>

      {/* ─── PAGE 9 : Annexe 1 ─── */}
      <div className="mx-auto my-8 w-full max-w-[210mm] bg-white shadow-xl print:my-0 print:shadow-none pb">
        <div className="px-12 py-8 print:px-10 print:py-6">
          <p className="text-[10px] text-slate-400 text-center mb-8">
            {COMPANY.adresse} – {COMPANY.codePostal} {COMPANY.ville} | {COMPANY.email} | {COMPANY.telephone} | SIRET : {COMPANY.siren}
          </p>

          <p className="text-center font-bold text-[#1E2F6E] underline mb-2">ANNEXE 1</p>
          <p className="text-center font-bold text-[#1E2F6E] underline mb-1">DESCRIPTION DES PRESTATIONS A LA CHARGE DU PARTENAIRE</p>
          <p className="text-center font-bold text-[#1E2F6E] underline mb-8">ET CONDITIONS FINANCIERES</p>

          {contrat.objet && (
            <div className="mb-6 rounded border border-slate-200 p-4 text-xs text-slate-700 leading-relaxed">
              <p className="font-semibold mb-2">Objet des prestations :</p>
              <p>{contrat.objet}</p>
              {contrat.chantier && (
                <p className="mt-2 text-slate-500">Chantier : {contrat.chantier.nom}{contrat.chantier.adresse ? ` — ${contrat.chantier.adresse}` : ""}</p>
              )}
            </div>
          )}

          {montantHT > 0 && (
            <div className="mb-6 rounded border border-slate-200 p-4">
              <p className="text-xs font-semibold mb-3">Conditions financières :</p>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
                <tbody>
                  <tr>
                    <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>Montant HT</td>
                    <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0", fontWeight: "bold" }}>{formatEuros(montantHT)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>TVA ({tauxTVA}%)</td>
                    <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0" }}>{formatEuros(montantHT * tauxTVA / 100)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0", fontWeight: "bold" }}>Montant TTC</td>
                    <td style={{ padding: "4px 8px", border: "1px solid #e2e8f0", fontWeight: "bold" }}>{formatEuros(montantTTC)}</td>
                  </tr>
                </tbody>
              </table>
              {contrat.modaliteReglement && (
                <p className="mt-3 text-xs text-slate-500">Modalités de règlement : {contrat.modaliteReglement}</p>
              )}
            </div>
          )}

          <p className="text-xs italic text-amber-700 bg-amber-50 border border-amber-200 rounded p-3">
            Joindre le devis du Partenaire et préciser les modalités financières convenues.
          </p>
        </div>
      </div>
    </>
  );
}
