/**
 * Mémoire Technique — Bibliothèque de templates
 * 4 types × 2 modèles (Appel d'offre / Client SDA)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TypeMemoire = "TYPE_1" | "TYPE_2" | "TYPE_3" | "TYPE_4";
export type ModeleMemoire = "APPEL_OFFRE" | "CLIENT_SDA";

export interface SectionDef {
  key: string;
  titre: string;
  nbPages: number;
  ordre: number;
  obligatoire: boolean;
  contenuDefautAO: string;   // Modèle Appel d'offre
  contenuDefautSDA: string;  // Modèle Client SDA
}

export interface TypeDef {
  id: TypeMemoire;
  label: string;
  description: string;
  pagesMin: number;
  pagesMax: number;
  seuil: string;
  sections: SectionDef[];
}

// ---------------------------------------------------------------------------
// Contenu par défaut — Section 1 : Présentation entreprise
// ---------------------------------------------------------------------------

const S1_AO = `SDA Rénovation est une entreprise générale du bâtiment spécialisée dans les travaux de rénovation, d'aménagement et de construction tous corps d'état.

**Identité juridique**
• Raison sociale : SDA Rénovation
• Forme juridique : SARL
• SIREN : 988 681 672
• Siège social : Cugnaux (31270), Haute-Garonne
• Capital social : [à compléter]
• Code APE : [à compléter]

**Domaines de compétence**
L'entreprise intervient sur l'ensemble des corps d'état du bâtiment :
• Gros œuvre, maçonnerie, béton armé
• Charpente bois et métallique, couverture, zinguerie
• Ravalement de façades, isolation thermique par l'extérieur (ITE)
• Plâtrerie, isolation, cloisons sèches
• Menuiseries intérieures et extérieures, serrurerie
• Plomberie, sanitaires, CVC
• Électricité, domotique
• Carrelage, revêtements de sols et muraux
• Peinture, finitions

**Qualifications et certifications**
• Qualibat [numéro à compléter] — Rénovation générale
• RGE (Reconnu Garant de l'Environnement) — Travaux d'isolation
• [Autres certifications à compléter]

**Assurances professionnelles**
• Responsabilité Civile Professionnelle : Police n° [à compléter], assureur [à compléter]
• Garantie Décennale : Police n° [à compléter], assureur [à compléter], période de validité [à compléter]

**Références bancaires**
Établissement financier : [Banque à compléter] — Cugnaux (31270)`;

const S1_SDA = `Bienvenue chez SDA Rénovation, votre partenaire de confiance pour tous vos projets de rénovation en Occitanie.

**Qui sommes-nous ?**
Implantés à Cugnaux depuis notre création, nous sommes une équipe de professionnels passionnés par la rénovation et l'amélioration de l'habitat. Notre approche : un interlocuteur unique, une communication transparente, et un résultat à la hauteur de vos attentes.

**Notre savoir-faire**
Nous intervenons sur tous types de travaux : rénovation complète, extension, aménagement intérieur, isolation, ravalement… Aucun chantier n'est trop grand ni trop petit.

• Rénovation complète tous corps d'état
• Extension et surélévation
• Isolation thermique et acoustique
• Réfection de toiture et charpente
• Aménagement de combles et sous-sol
• Cuisine, salle de bain, peinture, sols

**Nos engagements envers vous**
✓ Devis détaillé et transparent
✓ Respect des délais convenus
✓ Équipes qualifiées et assurées
✓ Suivi de chantier régulier
✓ Garantie décennale sur tous nos ouvrages

**SIREN : 988 681 672 — Cugnaux (31270)**`;

// ---------------------------------------------------------------------------
// Section 2 : Compréhension du besoin
// ---------------------------------------------------------------------------

const S2_AO = `**Analyse des documents de consultation**

Après étude approfondie du Dossier de Consultation des Entreprises (DCE) et notamment du Cahier des Clauses Techniques Particulières (CCTP), nous avons identifié les enjeux suivants :

**Contexte et objectifs du maître d'ouvrage**
[À compléter avec les objectifs spécifiques du projet — pré-rempli depuis la fiche chantier]

**Contraintes identifiées**
• Contraintes techniques : [site occupé / phasage / accès limité / structure existante]
• Contraintes réglementaires : [ERP / IGH / monument historique / zone protégée]
• Contraintes environnementales : [gestion des déchets / nuisances acoustiques / horaires d'intervention]
• Contraintes de délai : [date impérative / phasage fonctionnel]

**Points d'attention particuliers**
Notre analyse révèle les points suivants qui méritent une attention particulière dans notre organisation chantier :
1. [Point 1 à personnaliser]
2. [Point 2 à personnaliser]
3. [Point 3 à personnaliser]

**Notre compréhension de vos attentes**
Nous avons parfaitement intégré les exigences de qualité, de sécurité et de respect des délais propres à ce marché. Notre réponse technique a été élaborée en conséquence, avec une méthodologie d'exécution adaptée aux spécificités de l'opération.`;

const S2_SDA = `**Ce que nous avons compris de votre projet**

Après notre visite sur site et l'analyse de vos besoins, voici notre lecture du projet :

**Vos attentes principales**
[À compléter — pré-rempli depuis la description du chantier]

**Les points clés que nous avons identifiés**
• [Contrainte 1 identifiée lors de la visite]
• [Contrainte 2 — accès, voisinage, occupation des lieux]
• [Contrainte 3 — délai souhaité]

**Notre engagement**
Nous nous engageons à réaliser vos travaux en minimisant les nuisances et en vous tenant informé à chaque étape. Vous aurez un interlocuteur dédié joignable à tout moment.

**Questions ou points à confirmer**
• [Point à clarifier 1]
• [Point à clarifier 2]`;

// ---------------------------------------------------------------------------
// Section 3 : Méthodologie d'exécution
// ---------------------------------------------------------------------------

const S3_AO = `**Phase 1 — Préparation et installation de chantier**

Avant tout démarrage des travaux, nous procéderons aux opérations préliminaires suivantes :
• Établissement du Plan Particulier de Sécurité et de Protection de la Santé (PPSPS)
• Installation de chantier conforme aux prescriptions du marché : clôture, bungalows de chantier, signalétique réglementaire
• Déclarations auprès des concessionnaires de réseaux (DICT)
• Réunion de lancement avec le maître d'œuvre et le coordonnateur SPS
• Piquetage et implantation des ouvrages par géomètre agréé
• Protection des ouvrages existants à conserver

**Phase 2 — Phasage opérationnel des travaux**

*Lot 1 — Démolition et préparation (semaines 1 à [X])*
[Description des démolitions, dégagement, cubage, évacuation des gravats]

*Lot 2 — Gros œuvre / Structure (semaines [X] à [X])*
[Description : fondations, maçonnerie, dalles, structure béton armé]
Normes applicables : DTU 20.1 (maçonnerie), NF EN 206 (béton), Eurocode 2

*Lot 3 — Second œuvre (semaines [X] à [X])*
[Description : cloisons, isolation, plâtrerie, menuiseries]
Normes : DTU 25.41, DTU 36.2, NF P20-302

*Lot 4 — Équipements techniques (semaines [X] à [X])*
[Description : électricité NF C15-100, plomberie DTU 60.1, CVC DTU 65.10]

*Lot 5 — Finitions et réceptions (semaines [X] à [X])*
[Peintures, revêtements, nettoyage, levée des réserves]

**Phase 3 — Réception et livraison**

• Organisation des opérations préalables à la réception (OPR) en présence du maître d'œuvre
• Levée de toutes les réserves dans les délais contractuels
• Constitution du Dossier des Ouvrages Exécutés (DOE) et du DIUO
• Remise des garanties, notices d'utilisation et plans de recollement

**Gestion des sous-traitants**
Tout recours à la sous-traitance fera l'objet d'une déclaration au maître d'ouvrage conformément à la loi n°75-1334 du 31 décembre 1975.`;

const S3_SDA = `**Comment nous allons réaliser vos travaux**

**Étape 1 — Préparation (avant le démarrage)**
• Visite technique complémentaire pour valider les détails d'exécution
• Commande des matériaux avec délais anticipés pour éviter tout retard
• Planification précise des interventions des différents corps de métier
• Information de votre voisinage si nécessaire (nuisances temporaires)
• Protection soigneuse de vos meubles et revêtements existants

**Étape 2 — Réalisation des travaux**

*Phase démolition et préparation*
Nous commençons par les démolitions nécessaires, avec évacuation immédiate des gravats. Les gravats sont triés à la source pour recyclage maximal.

*Phase gros œuvre / structure*
[Description adaptée au projet — maçonnerie, charpente, etc.]

*Phase second œuvre*
[Cloisons, isolation, plomberie, électricité, menuiseries]
Tous nos travaux sont réalisés dans le respect des DTU en vigueur.

*Phase finitions*
Peintures, revêtements, installation des équipements sanitaires, électriques. Nettoyage complet du chantier.

**Étape 3 — Réception et remise des clés**
• Visite de réception en votre présence
• Correction immédiate de toutes les remarques éventuelles
• Remise des garanties décennales et des notices d'entretien
• Votre satisfaction est notre priorité`;

// ---------------------------------------------------------------------------
// Section 4 : Moyens humains
// ---------------------------------------------------------------------------

const S4_AO = `**Organisation et encadrement du chantier**

**Responsable d'affaire**
Nom : [Prénom NOM]
Qualification : Conducteur de travaux / Ingénieur BTP
Expérience : [X] ans dans le BTP, dont [X] ans sur des marchés similaires
Rôle : Interlocuteur principal du maître d'œuvre, responsable de la coordination générale

**Chef de chantier**
Nom : [Prénom NOM]
Qualification : Chef de chantier gros œuvre / tous corps d'état
Expérience : [X] ans — suivi opérationnel quotidien des travaux

**Équipes d'exécution**
• [X] compagnons qualifiés gros œuvre (CAP/BEP Maçonnerie, niveaux N3P2/N4P1)
• [X] compagnons menuiserie/cloisons sèches
• [X] compagnons plomberie-chauffage (CAP + Qua-qualifications gaz)
• [X] compagnons électricité (habilitation B2/BR/BC)
• [X] peintres finisseurs

**Effectif total prévu : [X] compagnons**
**Effectif de pointe : [X] compagnons en phase [X]**

**Sous-traitants pressenti(s)**
• [Entreprise X] — Lot Électricité — Qualibat 6112 — [X] ans d'expérience
• [Entreprise Y] — Lot Plomberie-CVC — Qualibat 5311 — RGE

*Tous les sous-traitants feront l'objet d'une déclaration au maître d'ouvrage et devront justifier de leurs assurances professionnelles à jour.*`;

const S4_SDA = `**Votre équipe dédiée**

**Votre interlocuteur principal**
[Prénom NOM] — Conducteur de travaux
📞 [Téléphone direct]
📧 [Email]
Disponible du lundi au vendredi 7h-19h, et en cas d'urgence le week-end.

**L'équipe terrain**
Votre chantier sera réalisé par nos compagnons salariés, qualifiés et assurés :
• [X] maçons / chef d'équipe avec [X] ans d'expérience
• [X] plombiers-sanitaristes
• [X] électriciens (habilitation B2)
• [X] peintres finisseurs

**Effectif prévu : [X] personnes**

**Notre politique de recrutement**
Nous travaillons avec des professionnels formés et qualifiés. Pas d'intérimaires non formés sur vos chantiers — uniquement des compagnons que nous connaissons et en qui nous avons confiance.`;

// ---------------------------------------------------------------------------
// Section 5 : Moyens matériels
// ---------------------------------------------------------------------------

const S5_AO = `**Matériel propre de l'entreprise**

*Engins et véhicules*
• [X] véhicules utilitaires (Ford Transit / Mercedes Sprinter) — [X] m³ de charge utile
• Mini-pelle [Marque] [X] tonnes — gros œuvre et terrassement
• Nacelle élévatrice [H] mètres — travaux en hauteur
• Bétonnière [X] L — maçonnerie courante
• Compresseur [X] bar / [X] l — pneumatique

*Outillage électroportatif et de levage*
• Échafaudages tubulaires à montage rapide — [X] m² de plancher
• Échafaudage roulant aluminium H [X] m
• Perceuses, visseuses, boulonneuses — outillage complet par compagnon
• Outils de mesure : niveaux laser, détecteurs de réseaux, caméra d'inspection

*Matériel de sécurité*
• EPI complets par intervenant (casque, harnais, chaussures S3, gilets)
• Signalisation de chantier homologuée
• Trousse de premiers secours, extincteurs

**Matériel loué ou sous-traité**
Pour ce marché spécifique, nous prévoyons de louer :
• [Grue / Nacelle XX m / autre] — Loueur : [à compléter]
• [Benne à gravats XL] — Transporteur agréé pour déchets inertes

**Approvisionnement en matériaux**
Nos fournisseurs habituels garantissent des délais maîtrisés :
• Matériaux gros œuvre : [Fournisseur] — délai [X] jours
• Menuiseries : [Fabricant] — délai [X] semaines
• Équipements techniques : [Grossiste] — stock disponible`;

const S5_SDA = `**Notre matériel à votre service**

Nous disposons de tout le matériel nécessaire pour réaliser vos travaux dans les meilleures conditions :

**Véhicules et engins**
• Camionnettes et camions équipés pour le transport de matériaux
• Mini-pelle pour les travaux de terrassement si besoin
• Nacelle élévatrice pour les travaux en hauteur (façade, toiture)

**Outillage professionnel**
• Échafaudages aux normes européennes
• Outillage électroportatif complet et récent
• Matériel de mesure et de contrôle (laser, hygromètre, détecteur de réseau)

**Matériaux**
Nous travaillons avec des fournisseurs locaux de confiance, garantissant des matériaux certifiés aux normes françaises. Nous pouvons vous soumettre les fiches techniques de tous les produits utilisés sur votre chantier.`;

// ---------------------------------------------------------------------------
// Section 6 : Planning prévisionnel
// ---------------------------------------------------------------------------

const S6_AO = `**Planning général de l'opération**

Conformément aux exigences du CCAP, nous nous engageons à respecter le délai global d'exécution de [X] semaines à compter de la date de notification de l'ordre de service de démarrage.

**Jalons contractuels**
| Jalon | Désignation | Date prévisionnelle |
|-------|-------------|-------------------|
| J0 | Ordre de service de démarrage | [Date] |
| J+[X] | Fin d'installation de chantier | [Date] |
| J+[X] | Fin des travaux de gros œuvre | [Date] |
| J+[X] | Fin du second œuvre | [Date] |
| J+[X] | OPR (Opérations Préalables à la Réception) | [Date] |
| J+[X] | Réception des travaux | [Date] |

**Diagramme de Gantt**
[Le planning détaillé semaine par semaine est joint en Annexe [X] au format MS Project / Excel]

**Gestion des aléas**
Nous avons intégré une marge de [X]% sur les tâches critiques pour absorber les aléas météorologiques et les délais d'approvisionnement. En cas de dérive constatée, nous informerons immédiatement le maître d'œuvre et proposerons un plan de rattrapage.

**Périodes de congés et jours fériés**
Les jours suivants sont exclus du planning : [congés annuels du [X] au [X], jours fériés légaux].`;

const S6_SDA = `**Quand vos travaux seront-ils réalisés ?**

**Dates prévisionnelles**
• Démarrage des travaux : [Date de début]
• Durée prévisionnelle : [X] semaines
• Fin des travaux : [Date de fin]

**Déroulement semaine par semaine**
• Semaine 1 : Installation, protection, démolitions
• Semaine 2-[X] : [Phase principale des travaux]
• Semaine [X]-[X] : Second œuvre, finitions
• Dernière semaine : Nettoyage, réception, remise des clés

**Notre engagement sur les délais**
Nous respectons nos plannings. En cas de problème imprévu (météo, livraison retardée), nous vous prévenons immédiatement et trouvons ensemble une solution pour minimiser l'impact.

**Travaux pendant votre absence ?**
Si nécessaire, nous pouvons travailler pendant votre absence. Nous vous envoyons un rapport photo quotidien par SMS/email.`;

// ---------------------------------------------------------------------------
// Section 7 : Qualité et contrôle
// ---------------------------------------------------------------------------

const S7_AO = `**Politique qualité de l'entreprise**

SDA Rénovation déploie sur chaque chantier un Plan d'Assurance Qualité (PAQ) adapté aux exigences du marché.

**Organisation du contrôle qualité**
• Contrôle interne de niveau 1 : par le compagnon lui-même avant de passer à l'opération suivante
• Contrôle interne de niveau 2 : par le chef de chantier — visa sur les fiches de contrôle
• Contrôle de niveau 3 : par le conducteur de travaux — vérifications par sondage hebdomadaires

**Contrôles techniques spécifiques**
| Ouvrage | Contrôle | Fréquence | Outil/Norme |
|---------|----------|-----------|-------------|
| Béton | Consistance (affaissement) | Chaque gâchée | NF EN 12350-2 |
| Étanchéité | Test à la lance / infiltrométrie | Fin de chaque zone | DTU 43.1 |
| Isolation | Contrôle d'épaisseur | Par zone | Fiches ATec |
| Électricité | Vérification des installations | Avant CONSUEL | NF C15-100 |
| Plomberie | Épreuve de pression | Fin de réseau | DTU 60.1 |

**Gestion des non-conformités**
Toute non-conformité détectée fait l'objet d'une fiche NC horodatée, avec délai de correction et validation. Aucune prestation non conforme ne sera livrée.

**Traçabilité**
Nous maintenons un dossier qualité chantier comprenant : plans de récolement, fiches de contrôle, bons de livraison, certificats de produits.`;

const S7_SDA = `**Notre engagement qualité**

**Comment nous garantissons la qualité de nos travaux ?**

Chaque ouvrage réalisé est contrôlé avant la couverture ou la finition suivante. Vous ne paierez que des travaux conformes à ce qui a été convenu.

**Nos contrôles systématiques**
• Contrôle de l'aplomb et du niveau pour chaque cloison
• Vérification de l'étanchéité avant ragréage ou carrelage
• Test des installations électriques et plomberie avant fermeture
• Contrôle visuel de toutes les finitions avant votre visite de réception

**Photos de chantier**
Nous réalisons des photos régulières des phases cachées (réseaux, structure) que vous conservez pour vos archives et votre assurance.

**Et si quelque chose ne va pas ?**
Vous avez jusqu'à 10 ans (garantie décennale) pour nous signaler tout désordre affectant la solidité de l'ouvrage. Et pour les petits défauts, notre garantie de parfait achèvement couvre la première année.`;

// ---------------------------------------------------------------------------
// Section 8 : Sécurité chantier
// ---------------------------------------------------------------------------

const S8_AO = `**Engagement sécurité**

La sécurité est une valeur non négociable pour SDA Rénovation. Notre taux de fréquence d'accidents est inférieur à la moyenne du secteur.

**Documents réglementaires**
• Plan Particulier de Sécurité et de Protection de la Santé (PPSPS) : établi avant tout démarrage, soumis au coordonnateur SPS
• Registre de sécurité tenu à jour en permanence sur le chantier
• Affichage obligatoire : consignes de sécurité, numéros d'urgence, plan d'évacuation

**Risques identifiés et mesures de prévention**
| Risque | Niveau | Mesure de prévention | Responsable |
|--------|--------|---------------------|-------------|
| Chute de hauteur | CRITIQUE | Échafaudages, garde-corps, harnais obligatoire | Chef chantier |
| Ensevelissement | ÉLEVÉ | Blindage fouilles > 1,30 m, DICT | Chef chantier |
| Électrisation | ÉLEVÉ | Habilitation électrique, consignation | Électricien |
| Chute d'objet | MOYEN | Zone balisée, filets de protection | Compagnons |
| Bruit / poussières | MOYEN | EPI (casque, masque FFP2/FFP3) | Tous |

**Formation sécurité**
Tous nos compagnons disposent des formations à jour : SST (Sauveteur Secouriste du Travail), CACES selon engins utilisés, habilitations électriques.

**Coordonnateur SPS**
Les missions du coordonnateur SPS sont assurées par : [À compléter si applicable — ERP/opération soumise à coordination SPS]`;

const S8_SDA = `**La sécurité sur votre chantier**

**Nos règles de sécurité**
Nous appliquons des règles strictes pour protéger nos compagnons, vous-même et votre propriété :

• Zone de chantier sécurisée et signalée
• Équipements de protection individuelle portés en permanence
• Matériel régulièrement vérifié et certifié
• Évacuation quotidienne des déchets pour éviter les risques

**Si vous avez des enfants ou des animaux**
Nous vous demanderons de les tenir éloignés des zones de travail. Des filets ou barrières seront installés si nécessaire.

**En cas d'urgence**
Notre chef de chantier est formé aux premiers secours (SST). Les numéros d'urgence sont affichés sur le chantier : SAMU 15, Pompiers 18, Urgences 112.

**Voisinage**
Nous respectons les horaires légaux de travaux bruyants (7h-20h en semaine, 8h-12h le samedi). Nous informons vos voisins directs avant tout travail particulièrement bruyant.`;

// ---------------------------------------------------------------------------
// Section 9 : Environnement et gestion des déchets
// ---------------------------------------------------------------------------

const S9_AO = `**Politique environnementale**

SDA Rénovation s'engage dans une démarche de réduction de l'impact environnemental de ses chantiers, conformément à la réglementation en vigueur.

**Réglementation applicable**
• Loi AGEC (Anti-Gaspillage pour une Économie Circulaire) — Décret n°2021-1199
• Responsabilité Élargie du Producteur (REP) pour les déchets du bâtiment
• Arrêté du [date] relatif à la collecte séparée des déchets du bâtiment

**Gestion des déchets de chantier (SOGED)**
Nous mettrons en place un Schéma d'Organisation et de Gestion des Déchets (SOGED) comportant :

*Déchets inertes (classe 3)*
Béton, briques, carrelage, tuiles → Évacuation vers Installation de Stockage de Déchets Inertes (ISDI) agréée
Centre de collecte : [Nom ISDI] — [Ville] — Agrément préfectoral n° [X]

*Déchets non dangereux (classe 2)*
Bois, plastiques, métaux, plâtre → Tri sélectif en bennes séparées — Déchetterie professionnelle agréée

*Déchets dangereux*
Peintures, solvants, enduits isolants avec amiante → Filière spécifique — BDR (Bordereau de Suivi des Déchets Dangereux)
Diagnostics amiante et plomb joints en annexe [X]

**Matériaux réemployés ou recyclés**
Nous privilégions les matériaux avec contenu recyclé et les produits éco-labelisés (Écolabel Européen, Nature+).

**Eau et énergie sur chantier**
• Compteur de suivi de consommation eau et électricité
• Nettoyage au jet haute pression interdit à proximité des réseaux pluviaux
• Matériaux stockés sur rétention en cas de risque de pollution`;

const S9_SDA = `**Notre engagement pour l'environnement**

**Gestion de vos déchets de chantier**
Tous les déchets générés par vos travaux seront évacués et traités dans des filières agrées :

• Gravats et inertes → Centre de recyclage agréé (recyclage en remblai ou concassé)
• Bois → Valorisation énergétique ou recyclage
• Métaux → Récupération et valorisation
• Plâtre → Filière spécifique de recyclage
• Déchets dangereux (si présents) → Filière déchet dangereux certifiée

**Notre chantier propre**
• Benne(s) à déchets présente(s) en permanence sur votre propriété
• Nettoyage quotidien de la zone de travail
• Protection de vos espaces verts et de vos accès

**Matériaux écologiques**
Sur votre demande, nous pouvons privilegier des matériaux biosourcés, à faible empreinte carbone ou issus du réemploi. Demandez-nous notre catalogue de solutions durables.`;

// ---------------------------------------------------------------------------
// Section 10 : Références similaires
// ---------------------------------------------------------------------------

const S10_AO = `**Références de marchés similaires exécutés**

Nous présentons ci-après une sélection de références dont la nature et l'importance sont comparables à la présente consultation :

**Référence 1**
• Maître d'ouvrage : [Nom du MO — public/privé]
• Maître d'œuvre : [Bureau d'études / Cabinet architecture]
• Objet des travaux : [Description brève]
• Montant HT : [X] €
• Délai d'exécution : [X] mois
• Date d'achèvement : [mois/année]
• Contact de référence : [Nom] — [Téléphone/Email — avec autorisation]

**Référence 2**
• Maître d'ouvrage : [Nom]
• Objet des travaux : [Description]
• Montant HT : [X] €
• Délai : [X] mois — Achevé en [date]
• Contact : [Coordonnées]

**Référence 3**
• Maître d'ouvrage : [Nom]
• Objet des travaux : [Description]
• Montant HT : [X] €
• Délai : [X] mois — Achevé en [date]

*Des photos de réalisations et attestations de bonne exécution sont disponibles sur demande ou joints en annexe.*`;

const S10_SDA = `**Quelques-unes de nos réalisations**

**Projet 1 — [Ville / Type de travaux]**
[Description courte] — [Surface ou montant approximatif] — Livré en [mois/année]
📸 Photos disponibles sur demande ou en annexe

**Projet 2 — [Ville / Type de travaux]**
[Description courte] — [Surface ou montant] — Livré en [mois/année]
📸 Photos disponibles

**Projet 3 — [Ville / Type de travaux]**
[Description courte] — Livré en [mois/année]

**Avis clients**
⭐⭐⭐⭐⭐ "[Témoignage client 1]" — [Prénom, ville]
⭐⭐⭐⭐⭐ "[Témoignage client 2]" — [Prénom, ville]

*Retrouvez toutes nos réalisations sur notre site web et sur Google Business Profile.*`;

// ---------------------------------------------------------------------------
// Sections supplémentaires TYPE 3 & 4
// ---------------------------------------------------------------------------

const S_DECOMP_AO = `**Décomposition du Prix Global et Forfaitaire (DPGF)**

[Cette section présente la décomposition détaillée des prix conformément au CCTP. Le DPGF complet est joint en annexe au format Excel/PDF]

**Récapitulatif par lot/phase**
| N° | Désignation | Montant HT |
|----|-------------|-----------|
| 1 | [Lot 1] | [X] € |
| 2 | [Lot 2] | [X] € |
| 3 | [Lot 3] | [X] € |
| | **TOTAL HT** | **[X] €** |
| | TVA 20% | [X] € |
| | **TOTAL TTC** | **[X] €** |

**Modalités de variation de prix**
[Clause de révision de prix selon indice BT01/BT38 — si applicable]`;

const S_GESTION_PROJET_AO = `**Organisation et gestion de projet**

**Système d'information chantier**
• Planning MS Project / Primavera mis à jour hebdomadairement
• Compte-rendu de chantier hebdomadaire transmis au MO/MOE sous 48h
• Plateforme collaborative de partage de documents : [outil]
• Réunion de chantier hebdomadaire le [jour] à [heure]

**Gestion des interfaces entre corps d'état**
Tableau de coordination des interfaces joint en annexe [X]

**Gestion des modifications**
Toute demande de modification fera l'objet d'un devis modificatif signé avant exécution.`;

const S_ASSURANCE_QUALITE_AO = `**Plan d'Assurance Qualité (PAQ)**

Le PAQ complet sera remis dans les [X] jours suivant la notification du marché.

**Procédures d'exécution**
Les procédures d'exécution spécifiques suivantes seront établies :
• Procédure bétonnage
• Procédure d'étanchéité
• Procédure de mise en œuvre des isolants
• Procédure de réception des supports

**Audit qualité**
Un audit qualité interne sera réalisé à [X]% d'avancement des travaux.`;

const S_VARIANTES_AO = `**Variantes proposées**

Conformément aux documents de consultation, nous proposons les variantes suivantes :

**Variante 1 — [Titre]**
Description : [Description technique]
Incidence financière : [+/-X] € HT
Avantages : [Avantages techniques/économiques/environnementaux]

**Variante 2 — [Titre]**
Description : [Description]
Incidence financière : [+/-X] € HT`;

// ---------------------------------------------------------------------------
// Définition des 4 types
// ---------------------------------------------------------------------------

export const TYPES_MEMOIRE: TypeDef[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // TYPE 1 — Petit marché < 100 k€
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "TYPE_1",
    label: "Type 1 — Petit marché",
    description: "5 à 10 pages + annexes · Chantiers inférieurs à 100 000 € HT",
    pagesMin: 5,
    pagesMax: 10,
    seuil: "< 100 000 € HT",
    sections: [
      { key: "s1_presentation",   titre: "1. Présentation de l'entreprise",          nbPages: 1, ordre: 1,  obligatoire: true,  contenuDefautAO: S1_AO,  contenuDefautSDA: S1_SDA },
      { key: "s2_besoin",         titre: "2. Compréhension du besoin",                nbPages: 1, ordre: 2,  obligatoire: true,  contenuDefautAO: S2_AO,  contenuDefautSDA: S2_SDA },
      { key: "s3_methodologie",   titre: "3. Méthodologie d'exécution",               nbPages: 2, ordre: 3,  obligatoire: true,  contenuDefautAO: S3_AO,  contenuDefautSDA: S3_SDA },
      { key: "s6_planning",       titre: "4. Planning prévisionnel",                  nbPages: 1, ordre: 4,  obligatoire: true,  contenuDefautAO: S6_AO,  contenuDefautSDA: S6_SDA },
      { key: "s8_securite",       titre: "5. Sécurité chantier",                     nbPages: 1, ordre: 5,  obligatoire: true,  contenuDefautAO: S8_AO,  contenuDefautSDA: S8_SDA },
      { key: "s10_references",    titre: "6. Références similaires",                  nbPages: 1, ordre: 6,  obligatoire: false, contenuDefautAO: S10_AO, contenuDefautSDA: S10_SDA },
      { key: "s11_annexes",       titre: "Annexes",                                   nbPages: 0, ordre: 99, obligatoire: false, contenuDefautAO: "",      contenuDefautSDA: "" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // TYPE 2 — Classique 12 pages (DÉFAUT)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "TYPE_2",
    label: "Type 2 — Marché classique (défaut)",
    description: "12 pages + annexes · Affaires supérieures à 100 000 € HT — travaux classiques",
    pagesMin: 12,
    pagesMax: 12,
    seuil: "> 100 000 € HT",
    sections: [
      { key: "s1_presentation",   titre: "1. Présentation de l'entreprise",          nbPages: 1, ordre: 1,  obligatoire: true,  contenuDefautAO: S1_AO,  contenuDefautSDA: S1_SDA },
      { key: "s2_besoin",         titre: "2. Compréhension du besoin",                nbPages: 1, ordre: 2,  obligatoire: true,  contenuDefautAO: S2_AO,  contenuDefautSDA: S2_SDA },
      { key: "s3_methodologie",   titre: "3. Méthodologie d'exécution",               nbPages: 3, ordre: 3,  obligatoire: true,  contenuDefautAO: S3_AO,  contenuDefautSDA: S3_SDA },
      { key: "s4_humains",        titre: "4. Moyens humains",                         nbPages: 1, ordre: 4,  obligatoire: true,  contenuDefautAO: S4_AO,  contenuDefautSDA: S4_SDA },
      { key: "s5_materiels",      titre: "5. Moyens matériels",                       nbPages: 1, ordre: 5,  obligatoire: true,  contenuDefautAO: S5_AO,  contenuDefautSDA: S5_SDA },
      { key: "s6_planning",       titre: "6. Planning prévisionnel",                  nbPages: 1, ordre: 6,  obligatoire: true,  contenuDefautAO: S6_AO,  contenuDefautSDA: S6_SDA },
      { key: "s7_qualite",        titre: "7. Qualité et contrôle",                   nbPages: 1, ordre: 7,  obligatoire: true,  contenuDefautAO: S7_AO,  contenuDefautSDA: S7_SDA },
      { key: "s8_securite",       titre: "8. Sécurité chantier",                     nbPages: 1, ordre: 8,  obligatoire: true,  contenuDefautAO: S8_AO,  contenuDefautSDA: S8_SDA },
      { key: "s9_environnement",  titre: "9. Environnement et gestion des déchets",  nbPages: 1, ordre: 9,  obligatoire: true,  contenuDefautAO: S9_AO,  contenuDefautSDA: S9_SDA },
      { key: "s10_references",    titre: "10. Références similaires",                 nbPages: 1, ordre: 10, obligatoire: false, contenuDefautAO: S10_AO, contenuDefautSDA: S10_SDA },
      { key: "s11_annexes",       titre: "11. Annexes",                               nbPages: 0, ordre: 99, obligatoire: false, contenuDefautAO: "",      contenuDefautSDA: "" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // TYPE 3 — Marché complexe multi-lots 22 pages
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "TYPE_3",
    label: "Type 3 — Marché complexe / multi-lots",
    description: "22 pages + annexes · Marchés complexes, multi-lots, coordination importante",
    pagesMin: 22,
    pagesMax: 22,
    seuil: "Marché complexe",
    sections: [
      { key: "s1_presentation",   titre: "1. Présentation de l'entreprise",          nbPages: 2, ordre: 1,  obligatoire: true,  contenuDefautAO: S1_AO,  contenuDefautSDA: S1_SDA },
      { key: "s2_besoin",         titre: "2. Compréhension du besoin",                nbPages: 2, ordre: 2,  obligatoire: true,  contenuDefautAO: S2_AO,  contenuDefautSDA: S2_SDA },
      { key: "s3_methodologie",   titre: "3. Méthodologie d'exécution",               nbPages: 4, ordre: 3,  obligatoire: true,  contenuDefautAO: S3_AO,  contenuDefautSDA: S3_SDA },
      { key: "s4_humains",        titre: "4. Moyens humains",                         nbPages: 2, ordre: 4,  obligatoire: true,  contenuDefautAO: S4_AO,  contenuDefautSDA: S4_SDA },
      { key: "s5_materiels",      titre: "5. Moyens matériels",                       nbPages: 2, ordre: 5,  obligatoire: true,  contenuDefautAO: S5_AO,  contenuDefautSDA: S5_SDA },
      { key: "s6_planning",       titre: "6. Planning prévisionnel",                  nbPages: 2, ordre: 6,  obligatoire: true,  contenuDefautAO: S6_AO,  contenuDefautSDA: S6_SDA },
      { key: "s7_qualite",        titre: "7. Qualité et contrôle",                   nbPages: 2, ordre: 7,  obligatoire: true,  contenuDefautAO: S7_AO,  contenuDefautSDA: S7_SDA },
      { key: "s8_securite",       titre: "8. Sécurité chantier",                     nbPages: 1, ordre: 8,  obligatoire: true,  contenuDefautAO: S8_AO,  contenuDefautSDA: S8_SDA },
      { key: "s9_environnement",  titre: "9. Environnement et gestion des déchets",  nbPages: 1, ordre: 9,  obligatoire: true,  contenuDefautAO: S9_AO,  contenuDefautSDA: S9_SDA },
      { key: "s_gestion_projet",  titre: "10. Gestion de projet et interfaces",       nbPages: 2, ordre: 10, obligatoire: true,  contenuDefautAO: S_GESTION_PROJET_AO, contenuDefautSDA: S_GESTION_PROJET_AO },
      { key: "s10_references",    titre: "11. Références similaires",                 nbPages: 1, ordre: 11, obligatoire: false, contenuDefautAO: S10_AO, contenuDefautSDA: S10_SDA },
      { key: "s11_annexes",       titre: "Annexes",                                   nbPages: 0, ordre: 99, obligatoire: false, contenuDefautAO: "",      contenuDefautSDA: "" },
    ],
  },
  // ─────────────────────────────────────────────────────────────────────────
  // TYPE 4 — Gros marché 30 pages
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "TYPE_4",
    label: "Type 4 — Gros marché",
    description: "30 pages + annexes · Grands projets, marchés publics importants",
    pagesMin: 30,
    pagesMax: 30,
    seuil: "Grand projet",
    sections: [
      { key: "s1_presentation",   titre: "1. Présentation de l'entreprise",          nbPages: 2, ordre: 1,  obligatoire: true,  contenuDefautAO: S1_AO,  contenuDefautSDA: S1_SDA },
      { key: "s2_besoin",         titre: "2. Compréhension du besoin",                nbPages: 2, ordre: 2,  obligatoire: true,  contenuDefautAO: S2_AO,  contenuDefautSDA: S2_SDA },
      { key: "s3_methodologie",   titre: "3. Méthodologie d'exécution",               nbPages: 6, ordre: 3,  obligatoire: true,  contenuDefautAO: S3_AO,  contenuDefautSDA: S3_SDA },
      { key: "s4_humains",        titre: "4. Moyens humains",                         nbPages: 2, ordre: 4,  obligatoire: true,  contenuDefautAO: S4_AO,  contenuDefautSDA: S4_SDA },
      { key: "s5_materiels",      titre: "5. Moyens matériels",                       nbPages: 2, ordre: 5,  obligatoire: true,  contenuDefautAO: S5_AO,  contenuDefautSDA: S5_SDA },
      { key: "s6_planning",       titre: "6. Planning prévisionnel",                  nbPages: 3, ordre: 6,  obligatoire: true,  contenuDefautAO: S6_AO,  contenuDefautSDA: S6_SDA },
      { key: "s7_qualite",        titre: "7. Assurance qualité (PAQ)",               nbPages: 3, ordre: 7,  obligatoire: true,  contenuDefautAO: S_ASSURANCE_QUALITE_AO, contenuDefautSDA: S7_SDA },
      { key: "s8_securite",       titre: "8. Sécurité et PPSPS",                     nbPages: 2, ordre: 8,  obligatoire: true,  contenuDefautAO: S8_AO,  contenuDefautSDA: S8_SDA },
      { key: "s9_environnement",  titre: "9. Environnement et gestion des déchets",  nbPages: 2, ordre: 9,  obligatoire: true,  contenuDefautAO: S9_AO,  contenuDefautSDA: S9_SDA },
      { key: "s_gestion_projet",  titre: "10. Gestion de projet et interfaces",       nbPages: 2, ordre: 10, obligatoire: true,  contenuDefautAO: S_GESTION_PROJET_AO, contenuDefautSDA: S_GESTION_PROJET_AO },
      { key: "s_decomp",          titre: "11. Décomposition du prix (DPGF)",          nbPages: 2, ordre: 11, obligatoire: true,  contenuDefautAO: S_DECOMP_AO, contenuDefautSDA: S_DECOMP_AO },
      { key: "s_variantes",       titre: "12. Variantes et options",                  nbPages: 1, ordre: 12, obligatoire: false, contenuDefautAO: S_VARIANTES_AO, contenuDefautSDA: "" },
      { key: "s10_references",    titre: "13. Références similaires",                 nbPages: 1, ordre: 13, obligatoire: false, contenuDefautAO: S10_AO, contenuDefautSDA: S10_SDA },
      { key: "s11_annexes",       titre: "Annexes",                                   nbPages: 0, ordre: 99, obligatoire: false, contenuDefautAO: "",      contenuDefautSDA: "" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getTypeDef(type: TypeMemoire): TypeDef {
  return TYPES_MEMOIRE.find((t) => t.id === type) ?? TYPES_MEMOIRE[1];
}

/** Génère le JSON sections initial à partir d'un type + modèle + données chantier */
export function genererSectionsInitiales(
  type: TypeMemoire,
  modele: ModeleMemoire,
  prefill: {
    nomChantier?: string;
    adresseChantier?: string;
    descriptionChantier?: string;
    clientNom?: string;
    dateDebut?: string;
    dateFin?: string;
    budgetEstime?: number;
    devisNumero?: string;
    devisObjet?: string;
    nomEntreprise?: string;
    siret?: string;
    adresseEntreprise?: string;
  }
): Record<string, { titre: string; contenu: string; visible: boolean; ordre: number; nbPages: number }> {
  const def = getTypeDef(type);
  const result: Record<string, { titre: string; contenu: string; visible: boolean; ordre: number; nbPages: number }> = {};

  for (const section of def.sections) {
    let contenu = modele === "APPEL_OFFRE" ? section.contenuDefautAO : section.contenuDefautSDA;

    // Pré-remplissage dynamique
    if (prefill.nomChantier)        contenu = contenu.replace(/\[chantier\]/gi, prefill.nomChantier);
    if (prefill.clientNom)          contenu = contenu.replace(/\[client\]/gi, prefill.clientNom);
    if (prefill.descriptionChantier) {
      contenu = contenu.replace(
        /\[À compléter avec les objectifs spécifiques du projet — pré-rempli depuis la fiche chantier\]/gi,
        prefill.descriptionChantier
      );
      contenu = contenu.replace(
        /\[À compléter — pré-rempli depuis la description du chantier\]/gi,
        prefill.descriptionChantier
      );
    }
    if (prefill.dateDebut)  contenu = contenu.replace(/\[Date de début\]/gi, prefill.dateDebut);
    if (prefill.dateFin)    contenu = contenu.replace(/\[Date de fin\]/gi, prefill.dateFin);
    if (prefill.devisObjet) {
      contenu = contenu.replace(/\[Objet du marché\]/gi, prefill.devisObjet);
    }
    if (prefill.nomEntreprise) {
      contenu = contenu.replace(/SDA Rénovation/g, prefill.nomEntreprise);
    }
    if (prefill.siret) {
      contenu = contenu.replace(/988 681 672/g, prefill.siret);
    }

    result[section.key] = {
      titre: section.titre,
      contenu,
      visible: true,
      ordre: section.ordre,
      nbPages: section.nbPages,
    };
  }

  return result;
}

export const TYPE_LABELS: Record<TypeMemoire, string> = {
  TYPE_1: "Type 1 — Petit marché (5-10 p.)",
  TYPE_2: "Type 2 — Classique 12 p. (défaut)",
  TYPE_3: "Type 3 — Multi-lots 22 p.",
  TYPE_4: "Type 4 — Gros marché 30 p.",
};

export const MODELE_LABELS: Record<ModeleMemoire, string> = {
  APPEL_OFFRE: "Appel d'offre public/privé",
  CLIENT_SDA:  "Client SDA Rénovation",
};

export const STATUT_LABELS: Record<string, string> = {
  BROUILLON:  "Brouillon",
  FINALISE:   "Finalisé",
  ENVOYE:     "Envoyé",
};

export const STATUT_COLORS: Record<string, string> = {
  BROUILLON: "bg-amber-100 text-amber-700",
  FINALISE:  "bg-blue-100 text-blue-700",
  ENVOYE:    "bg-emerald-100 text-emerald-700",
};
