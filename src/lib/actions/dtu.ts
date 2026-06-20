"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { stockerFichier, supprimerFichierStocke } from "@/lib/blob-storage";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

// ─── Catalogue officiel ───────────────────────────────────────────────────────

const DTU_CATALOG = [
  // TERRASSEMENT
  { reference: "DTU 12", titre: "Terrassements pour bâtiments", domaine: "TERRASSEMENT", corpsEtat: "TER", version: "Juillet 1964 (révisé)", normeNF: "NF P11-300", description: "Exécution des déblais et remblais pour la réalisation des bâtiments. Définit les conditions de mise en œuvre des travaux de terrassement, de compactage et de contrôle.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 13.1", titre: "Travaux de fondations superficielles", domaine: "TERRASSEMENT", corpsEtat: "TER", version: "Avril 2000", normeNF: "NF P11-211", description: "Conditions techniques de réalisation des fondations superficielles de bâtiment : semelles filantes, radiers, longrines.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 13.11", titre: "Fondations superficielles — Règles de calcul", domaine: "TERRASSEMENT", corpsEtat: "TER", version: "1988", normeNF: "NF P11-211-1", description: "Règles de calcul des fondations superficielles.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 13.2", titre: "Fondations profondes pour le bâtiment", domaine: "TERRASSEMENT", corpsEtat: "TER", version: "Septembre 2000", normeNF: "NF P11-212", description: "Conditions techniques de réalisation des fondations profondes : pieux, micropieux, barrettes. Inclut les règles de calcul et les essais.", lienAchat: "https://www.boutique.afnor.org" },
  // MACONNERIE
  { reference: "DTU 20.1", titre: "Ouvrages en maçonnerie de petits éléments — Parois et murs", domaine: "MACONNERIE", corpsEtat: "MAC", version: "Septembre 2008", normeNF: "NF P10-202", description: "Conditions de mise en œuvre des maçonneries de parpaings, briques, blocs de béton cellulaire, pierres. Appuis de baies, linteaux, chaînages.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 20.11", titre: "Parois et murs en béton banché", domaine: "MACONNERIE", corpsEtat: "MAC", version: "Novembre 1973", normeNF: "NF P10-211", description: "Exécution des parois verticales en béton coulé en place dans des coffrages. Conditions de mise en œuvre, ferraillage, décoffrage.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 20.12", titre: "Gros œuvre en maçonnerie des toitures destinées à recevoir un revêtement d'étanchéité", domaine: "MACONNERIE", corpsEtat: "MAC", version: "Décembre 1993", normeNF: "NF P10-203", description: "Réalisation du gros œuvre supportant les revêtements d'étanchéité : pentes, évacuations, relevés.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 20.13", titre: "Cloisons en maçonnerie de petits éléments", domaine: "MACONNERIE", corpsEtat: "MAC", version: "Juillet 1994", normeNF: "NF P10-202-2", description: "Réalisation des cloisons intérieures en briques, carreaux de plâtre, blocs béton.", lienAchat: "https://www.boutique.afnor.org" },
  // BETON
  { reference: "DTU 21", titre: "Exécution des travaux en béton", domaine: "BETON", corpsEtat: "MAC", version: "Octobre 2017 (NF EN 13670)", normeNF: "NF EN 13670 / NF P18-201", description: "Conditions d'exécution des structures en béton coulé en place : composition, mise en œuvre, coffrage, cure. Conforme à l'Eurocode 2.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 23.1", titre: "Murs en béton banché", domaine: "BETON", corpsEtat: "MAC", version: "Mars 1993", normeNF: "NF P18-210", description: "Conditions techniques d'exécution des murs en béton coulé en coffrage glissant ou grimpant.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 23.2", titre: "Planchers à dalles pleines", domaine: "BETON", corpsEtat: "MAC", version: "Octobre 1982", normeNF: "NF P19-201", description: "Exécution des planchers béton coulés en place, tables de travail, conditions de coffrage et de ferraillage.", lienAchat: "https://www.boutique.afnor.org" },
  // DALLAGE
  { reference: "DTU 13.3", titre: "Dallages — Conception, calcul et exécution", domaine: "DALLAGE", corpsEtat: "DAL", version: "Novembre 2005 (révisé 2012)", normeNF: "NF P11-213", description: "Conception et réalisation des dallages industriels et résidentiels sur terre-plein. Calcul des épaisseurs, armatures, joints de fractionnement, traitement de surface. S'applique aux dallages de bâtiments industriels, commerciaux et d'habitation.", lienAchat: "https://www.boutique.afnor.org" },
  // CHAPE
  { reference: "DTU 26.2", titre: "Chapes et dalles à base de liants hydrauliques", domaine: "CHAPE", corpsEtat: "DAL", version: "Juillet 2008", normeNF: "NF P14-201", description: "Réalisation des chapes et dalles de ciment, anhydrite, ou base de liants hydrauliques. Inclut chapes désolidarisées, adhérentes, flottantes. Épaisseurs minimales, délais de séchage, conditions d'application.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 26.2 P2", titre: "Chapes — Prescriptions pour la mise en œuvre", domaine: "CHAPE", corpsEtat: "DAL", version: "Juillet 2008", normeNF: "NF P14-201-2", description: "Cahier des clauses techniques pour la réalisation des chapes en bâtiment.", lienAchat: "https://www.boutique.afnor.org" },
  // COUVERTURE
  { reference: "DTU 40.11", titre: "Couvertures en ardoises naturelles", domaine: "COUVERTURE", corpsEtat: "RSS", version: "Septembre 2008", normeNF: "NF P31-201", description: "Mise en œuvre des ardoises naturelles sur liteaux, voligeage ou sarking. Pureau, recouvrement, faîtage, noues, rives.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 40.13", titre: "Couvertures en tuiles de terre cuite à emboîtement ou à glissement à relief", domaine: "COUVERTURE", corpsEtat: "RSS", version: "Novembre 2006", normeNF: "NF P31-202", description: "Pose des tuiles à emboîtement et à glissement, pureau, fixation, accessoires de rive et de faîtage.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 40.14", titre: "Couvertures en tuiles de terre cuite — Tuiles canal", domaine: "COUVERTURE", corpsEtat: "RSS", version: "Octobre 1980 (révisé)", normeNF: "NF P31-203", description: "Pose des tuiles canal (romanes) en courant et couvrant. Fixation, faîtage, noues.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 40.35", titre: "Couvertures en plaques nervurées d'acier inoxydable", domaine: "COUVERTURE", corpsEtat: "RSS", version: "Septembre 1997", normeNF: "NF P34-205", description: "Mise en œuvre des bacs acier nervurés en couverture. Fixation, recouvrement, accessoires.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 40.41", titre: "Couvertures par éléments métalliques en feuilles et longues feuilles — Zinc", domaine: "COUVERTURE", corpsEtat: "RSS", version: "Septembre 2013", normeNF: "NF P34-215", description: "Mise en œuvre du zinc en couverture et zinguerie : joint debout, à tasseaux, à baguettes. Chéneaux, gouttières, descentes, solins.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 40.46", titre: "Couvertures par éléments métalliques en feuilles — Cuivre", domaine: "COUVERTURE", corpsEtat: "RSS", version: "Juillet 2008", normeNF: "NF P34-214", description: "Mise en œuvre du cuivre en couverture. Joint debout, à tasseaux, joint à baguette.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 43.1", titre: "Travaux d'étanchéité des toitures-terrasses avec revêtements d'étanchéité", domaine: "COUVERTURE", corpsEtat: "RSS", version: "Décembre 2004", normeNF: "NF P84-204", description: "Réalisation des étanchéités de toitures-terrasses accessibles ou inaccessibles. Pare-vapeur, isolation, revêtements bitumineux ou synthétiques. Relevés, costières, évacuations.", lienAchat: "https://www.boutique.afnor.org" },
  // RAVALEMENT
  { reference: "DTU 42.1", titre: "Réfection de façades en service par revêtements d'imperméabilité à base de polymères", domaine: "RAVALEMENT", corpsEtat: "RAV", version: "Octobre 2007", normeNF: "NF P28-010", description: "Application de revêtements d'imperméabilité et de revêtements minces sur enduits existants ou maçonneries. Préparation du support, primaires, conditions de mise en œuvre.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 26.1", titre: "Travaux d'enduits de mortiers", domaine: "RAVALEMENT", corpsEtat: "RAV", version: "Septembre 2008", normeNF: "NF P15-201", description: "Réalisation des enduits extérieurs et intérieurs à base de mortiers. Préparation du support, épaisseurs, finitions (grattée, talochée, projetée).", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 55.2", titre: "Revêtements muraux attachés — Vêtures et vêtages", domaine: "RAVALEMENT", corpsEtat: "RAV", version: "Juin 2003", normeNF: "NF P65-202", description: "Pose des vêtures (ITE avec bardage) et vêtages sur facades. Conditions de fixation, joints, étanchéité.", lienAchat: "https://www.boutique.afnor.org" },
  // PLATRERIE
  { reference: "DTU 25.1", titre: "Enduits intérieurs en plâtre", domaine: "PLATRERIE", corpsEtat: "PLA", version: "Octobre 2008", normeNF: "NF P71-201", description: "Application des enduits de plâtre sur supports en briques, parpaings, béton. Épaisseurs, conditions de mise en œuvre, délais de séchage.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 25.31", titre: "Ouvrages en plâtre — Cloisons à base de carreaux de plâtre", domaine: "PLATRERIE", corpsEtat: "PLA", version: "Août 1994", normeNF: "NF P72-201", description: "Réalisation des cloisons en carreaux de plâtre pleins ou creux. Formats, joints, finitions, ouvertures.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 25.41", titre: "Ouvrages en plaques de plâtre — Cloisons et doublages", domaine: "PLATRERIE", corpsEtat: "PLA", version: "Octobre 2012", normeNF: "NF P72-203", description: "Mise en œuvre des plaques de plâtre sur ossature métallique pour cloisons distributives et doublages isolants. Rails, montants, vissage, bandes, enduits de joint.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 25.42", titre: "Ouvrages de doublage et habillage en plaques de plâtre", domaine: "PLATRERIE", corpsEtat: "PLA", version: "Décembre 1998", normeNF: "NF P72-204", description: "Doublages collés ou sur ossature, habillages de gaines techniques.", lienAchat: "https://www.boutique.afnor.org" },
  // MENUISERIE
  { reference: "DTU 36.1", titre: "Menuiserie en bois", domaine: "MENUISERIE", corpsEtat: "MEN", version: "Décembre 2010", normeNF: "NF P23-201", description: "Mise en œuvre des fenêtres, portes, volets, escaliers en bois. Conditions de stockage, pose, fixation, joints d'étanchéité, traitement de surface.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 36.5", titre: "Mise en œuvre des fenêtres et portes extérieures", domaine: "MENUISERIE", corpsEtat: "MEN", version: "Septembre 2010", normeNF: "NF P23-305", description: "Calfeutrement et étanchéité à l'air et à l'eau des menuiseries extérieures. Bandes compriband, mousse expansive, bavette d'appui.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 37.1", titre: "Menuiseries métalliques — Fenêtres et portes extérieures en acier", domaine: "MENUISERIE", corpsEtat: "MEN", version: "Juin 1993", normeNF: "NF P24-201", description: "Pose des menuiseries extérieures en acier. Scellement, fixation, étanchéité.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 38.1", titre: "Fenêtres et portes extérieures en aluminium", domaine: "MENUISERIE", corpsEtat: "MEN", version: "Novembre 2014", normeNF: "NF P24-351", description: "Mise en œuvre des fenêtres et portes extérieures en aluminium. Rupture de pont thermique, vitrages, garde-corps.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 39.1", titre: "Travaux de vitrerie-miroiterie", domaine: "MENUISERIE", corpsEtat: "MEN", version: "Novembre 2006", normeNF: "NF P78-201", description: "Pose de vitrages simples, doubles, triples, feuilletés. Feuillures, mastics, joints, VEC, VEA.", lienAchat: "https://www.boutique.afnor.org" },
  // AGENCEMENT
  { reference: "DTU 36.3", titre: "Menuiseries et agencements intérieurs en bois", domaine: "AGENCEMENT", corpsEtat: "MEN", version: "Décembre 1995", normeNF: "NF P23-305", description: "Mise en œuvre des ouvrages d'agencement intérieur en bois ou dérivés : placards, bibliothèques, cuisines équipées, plans de travail. Fixations, assemblages, finitions.", lienAchat: "https://www.boutique.afnor.org" },
  // REVETEMENT SOL
  { reference: "DTU 52.1", titre: "Revêtements de sol scellés", domaine: "REVETEMENT_SOL", corpsEtat: "COV", version: "Janvier 2004", normeNF: "NF P61-202", description: "Pose scellée des carrelages céramiques, grès-cérame, pierre naturelle sur mortier de pose. Calepinage, joints, raccords. Applications sol et mur.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 52.2", titre: "Pose collée des revêtements de sol et carrelages — Carrelages céramiques", domaine: "REVETEMENT_SOL", corpsEtat: "COV", version: "Juillet 2013", normeNF: "NF P61-204", description: "Pose collée des carrelages et revêtements céramiques sur chape ou plancher. Colles, joints de dilatation, préparation du support.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 53.1", titre: "Revêtements de sol textiles — Moquettes", domaine: "REVETEMENT_SOL", corpsEtat: "COV", version: "Décembre 1993", normeNF: "NF P62-201", description: "Pose des moquettes et revêtements textiles : collé, semi-collé, tendu. Préparation du support, jonctions.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 53.2", titre: "Revêtements de sol PVC collés", domaine: "REVETEMENT_SOL", corpsEtat: "COV", version: "Novembre 2002", normeNF: "NF P62-203", description: "Pose collée des dalles et lames PVC, linoléum. Préparation des supports, primaires d'accrochage, conditions d'hygrométrie.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 51.1", titre: "Pose de parquet à clouer", domaine: "REVETEMENT_SOL", corpsEtat: "COV", version: "Juin 2019", normeNF: "NF P63-201", description: "Pose des parquets massifs à lames clouées sur lambourdes ou faux-plancher.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 51.11", titre: "Parquets en bois contrecollés — Pose flottante", domaine: "REVETEMENT_SOL", corpsEtat: "COV", version: "Mars 2013", normeNF: "NF P63-204", description: "Pose flottante et collée des parquets contrecollés et stratifiés. Sous-couches acoustiques, joints périphériques.", lienAchat: "https://www.boutique.afnor.org" },
  // REVETEMENT MURAL
  { reference: "DTU 55.1", titre: "Revêtements muraux en carreaux et plaquettes", domaine: "REVETEMENT_MURAL", corpsEtat: "COV", version: "Septembre 2009", normeNF: "NF P65-201", description: "Pose de carrelage mural en faïence, grès, pierre sur mortier ou colle. Préparation des supports, joints, silicone aux angles.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 59.4", titre: "Revêtements muraux en papiers peints et revêtements muraux en feuilles", domaine: "REVETEMENT_MURAL", corpsEtat: "PEI", version: "Juillet 1978 (révisé)", normeNF: "NF P74-203", description: "Mise en œuvre des papiers peints et revêtements muraux souples. Préparation du support, encollage, raccords.", lienAchat: "https://www.boutique.afnor.org" },
  // PEINTURE
  { reference: "DTU 59.1", titre: "Travaux de peinture des bâtiments", domaine: "PEINTURE", corpsEtat: "PEI", version: "Octobre 2012", normeNF: "NF P74-201", description: "Application des peintures en bâtiment intérieur et extérieur. Préparation des supports, primaires, nombre de couches, délais entre couches. Peintures sur bois, métal, béton, plâtre.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 59.2", titre: "Travaux de peinture — Revêtements plastiques épais sur béton et enduits", domaine: "PEINTURE", corpsEtat: "PEI", version: "Juin 1980", normeNF: "NF P74-202", description: "Application de peintures épaisses à base de résines sur façades. Teintes, finitions (lisse, grattée, projetée), retouches.", lienAchat: "https://www.boutique.afnor.org" },
  // PLOMBERIE
  { reference: "DTU 60.1", titre: "Plomberie sanitaire pour bâtiments à usage d'habitation", domaine: "PLOMBERIE", corpsEtat: "RSD", version: "Octobre 2013", normeNF: "NF P40-201", description: "Installation des réseaux d'alimentation en eau froide et chaude et évacuations. Dimensionnement, matériaux (cuivre, PER, PVC, fonte). Mise en pression, contrôles.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 60.11", titre: "Règles de calcul des installations de plomberie sanitaire et des installations d'évacuation des eaux pluviales", domaine: "PLOMBERIE", corpsEtat: "RSD", version: "Décembre 1988", normeNF: "NF P40-202", description: "Méthodes de calcul des débits, dimensionnement des colonnes montantes, évacuations et eaux pluviales.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 60.2", titre: "Canalisations en fonte, évacuations d'eaux usées, eaux vannes et eaux pluviales", domaine: "PLOMBERIE", corpsEtat: "RSD", version: "Octobre 1979", normeNF: "NF P41-201", description: "Mise en œuvre des canalisations en fonte pour les évacuations intérieures et extérieures.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 65.11", titre: "Exécution des chaufferies utilisant des combustibles gazeux ou liquides", domaine: "PLOMBERIE", corpsEtat: "RSD", version: "Décembre 2000", normeNF: "NF P52-203", description: "Règles de réalisation des chaufferies collectives. Ventilation, sécurités, raccordements gaz, conduits de fumées.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 65.12", titre: "Réalisation des installations de capteurs solaires plans à circulation de liquide pour le chauffage et la production d'eau chaude", domaine: "PLOMBERIE", corpsEtat: "RSD", version: "Octobre 2011", normeNF: "NF P52-210", description: "Installation des systèmes solaires thermiques pour eau chaude sanitaire et chauffage.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 68.1", titre: "Installations de ventilation mécanique contrôlée", domaine: "PLOMBERIE", corpsEtat: "RSD", version: "Septembre 1986 (révisé)", normeNF: "NF P50-410", description: "Mise en œuvre des systèmes VMC simple flux et double flux dans les logements.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 61.1", titre: "Installations de gaz dans les locaux d'habitation", domaine: "PLOMBERIE", corpsEtat: "RSD", version: "Octobre 2011", normeNF: "NF P45-204", description: "Exécution des installations intérieures de gaz naturel, propane, butane dans les locaux d'habitation.", lienAchat: "https://www.boutique.afnor.org" },
  // ELECTRICITE
  { reference: "NF C 15-100", titre: "Installations électriques à basse tension — Règles", domaine: "ELECTRICITE", corpsEtat: "RSD", version: "Janvier 2002 + amendements 2008/2015", normeNF: "NF C 15-100", description: "Norme de référence pour les installations électriques basse tension dans les bâtiments d'habitation. Tableaux, circuits, protections différentielles, prises, éclairage, liaisons équipotentielles, TBTS. Obligatoire pour toute installation neuve ou rénovation.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 70.1", titre: "Installations électriques des bâtiments — Appartements et maisons individuelles", domaine: "ELECTRICITE", corpsEtat: "RSD", version: "Juin 1991", normeNF: "NF C 15-100-5-559", description: "Spécifications complémentaires pour les installations électriques dans les logements : VDI, domotique, prises TV, téléphone, RJ45.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 70.2", titre: "Installations de génie climatique électrique", domaine: "ELECTRICITE", corpsEtat: "RSD", version: "2006", normeNF: "NF C 15-100", description: "Raccordements électriques des équipements de chauffage, climatisation et VMC.", lienAchat: "https://www.boutique.afnor.org" },
  // RENFORCEMENT STRUCTUREL
  { reference: "Eurocode 2 — EN 1992", titre: "Calcul des structures en béton", domaine: "RENFORCEMENT_STRUCTUREL", corpsEtat: "MAC", version: "NF EN 1992-1-1 (2005)", normeNF: "NF EN 1992-1-1", description: "Règles de calcul des structures en béton armé et précontraint. Utilisé pour le dimensionnement des renforcements structurels béton (chemisage, armatures, ajout de voiles).", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "Eurocode 3 — EN 1993", titre: "Calcul des structures en acier", domaine: "RENFORCEMENT_STRUCTUREL", corpsEtat: "SER", version: "NF EN 1993-1-1 (2005)", normeNF: "NF EN 1993-1-1", description: "Règles de calcul des structures métalliques. Renforcement par profils acier, HEA, poutrelles, cerclage.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "DTU 13.12", titre: "Règles pour le calcul des fondations superficielles", domaine: "RENFORCEMENT_STRUCTUREL", corpsEtat: "TER", version: "Juin 1988", normeNF: "NF P11-211", description: "Méthodes de vérification de la capacité portante des fondations existantes avant renforcement ou surélévation.", lienAchat: "https://www.boutique.afnor.org" },
  { reference: "Recommandations AFGC", titre: "Renforcement des structures en béton par collage de matériaux composites", domaine: "RENFORCEMENT_STRUCTUREL", corpsEtat: "MAC", version: "2011", normeNF: "Guide AFGC", description: "Guide technique pour le renforcement des poutres, dalles et poteaux par collage de tissus de fibres de carbone (CFRP) ou de verre (GFRP). Calcul de la résistance, conditions de collage, contrôle.", lienAchat: "https://www.afgc.asso.fr" },
  { reference: "Recommandations SETRA", titre: "Renforcement des ouvrages en béton par précontrainte additionnelle", domaine: "RENFORCEMENT_STRUCTUREL", corpsEtat: "MAC", version: "2007", normeNF: "Guide SETRA", description: "Techniques de renforcement par précontrainte extérieure ou torons additionnels. Applications sur structures de génie civil et bâtiment.", lienAchat: "https://www.cerema.fr" },
  { reference: "NF EN 1998-3", titre: "Eurocode 8 — Renforcement et réparation des structures", domaine: "RENFORCEMENT_STRUCTUREL", corpsEtat: "MAC", version: "2005", normeNF: "NF EN 1998-3", description: "Évaluation et renforcement parasismique des bâtiments existants. Méthodes de renforcement selon l'indice de vulnérabilité sismique.", lienAchat: "https://www.boutique.afnor.org" },
];

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function seedDTU(): Promise<void> {
  const existing = await prisma.dTU.count();
  if (existing > 0) return;

  await prisma.dTU.createMany({
    data: DTU_CATALOG.map((item) => ({
      ...item,
      actif: true,
    })),
  });

  revalidatePath("/dtu");
}

export async function uploadDtuPdf(id: string, formData: FormData): Promise<void> {
  const file = formData.get("fichier");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Aucun fichier sélectionné.");
  }

  // Delete old PDF if one exists
  const existing = await prisma.dTU.findUnique({ where: { id }, select: { fichierPdf: true } });
  await supprimerFichierStocke(existing?.fichierPdf);

  // Save new file
  const { url } = await stockerFichier(file, "dtu");

  await prisma.dTU.update({
    where: { id },
    data: { fichierPdf: url },
  });

  revalidatePath("/dtu");
  revalidatePath(`/dtu/${id}`);
}

export async function createDtu(formData: FormData): Promise<void> {
  const reference = (formData.get("reference") as string)?.trim();
  if (!reference) throw new Error("La référence est requise.");
  const titre = (formData.get("titre") as string)?.trim();
  if (!titre) throw new Error("Le titre est requis.");

  await prisma.dTU.create({
    data: {
      reference,
      titre,
      domaine: (formData.get("domaine") as string) || "AUTRE",
      corpsEtat: emptyToNull(formData.get("corpsEtat")) ?? "",
      version: emptyToNull(formData.get("version")),
      normeNF: emptyToNull(formData.get("normeNF")),
      description: emptyToNull(formData.get("description")),
      lienAchat: emptyToNull(formData.get("lienAchat")),
      actif: true,
    },
  });

  revalidatePath("/dtu");
  redirect("/dtu");
}

export async function updateDtu(id: string, formData: FormData): Promise<void> {
  await prisma.dTU.update({
    where: { id },
    data: {
      reference: (formData.get("reference") as string)?.trim() || undefined,
      titre: (formData.get("titre") as string)?.trim() || undefined,
      domaine: (formData.get("domaine") as string) || undefined,
      corpsEtat: (formData.get("corpsEtat") as string)?.trim() || undefined,
      version: emptyToNull(formData.get("version")),
      normeNF: emptyToNull(formData.get("normeNF")),
      description: emptyToNull(formData.get("description")),
      lienAchat: emptyToNull(formData.get("lienAchat")),
    },
  });

  revalidatePath("/dtu");
  revalidatePath(`/dtu/${id}`);
}

export async function deleteDtu(id: string): Promise<void> {
  const dtu = await prisma.dTU.findUnique({ where: { id }, select: { fichierPdf: true } });
  await supprimerFichierStocke(dtu?.fichierPdf);

  await prisma.dTU.delete({ where: { id } });

  revalidatePath("/dtu");
  redirect("/dtu");
}
