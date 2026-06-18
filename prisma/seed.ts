import "dotenv/config";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});
const prisma = new PrismaClient({ adapter });

const PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

// ---------------------------------------------------------------------------
// Helpers métré (lignes hiérarchiques chapitres / sous-chapitres / lignes)
// ---------------------------------------------------------------------------

type LigneInput = {
  type?: "CHAPITRE" | "SOUS_CHAPITRE" | "LIGNE";
  designation: string;
  unite?: string;
  quantite?: number;
  prixUnitaireHT?: number;
  tauxTVA?: number;
};

function buildLignes(items: LigneInput[]) {
  return items.map((item, index) => {
    const type = item.type ?? "LIGNE";
    const totalHT =
      type === "LIGNE" && item.quantite != null && item.prixUnitaireHT != null
        ? Math.round(item.quantite * item.prixUnitaireHT * 100) / 100
        : null;
    return {
      ordre: index + 1,
      type,
      designation: item.designation,
      unite: item.unite ?? null,
      quantite: item.quantite ?? null,
      prixUnitaireHT: item.prixUnitaireHT ?? null,
      tauxTVA: item.tauxTVA ?? null,
      totalHT,
    };
  });
}

function buildSimpleLignes(items: Omit<LigneInput, "type">[]) {
  return items.map((item, index) => ({
    ordre: index + 1,
    designation: item.designation,
    unite: item.unite ?? null,
    quantite: item.quantite ?? null,
    prixUnitaireHT: item.prixUnitaireHT ?? null,
    tauxTVA: item.tauxTVA ?? null,
    totalHT:
      item.quantite != null && item.prixUnitaireHT != null
        ? Math.round(item.quantite * item.prixUnitaireHT * 100) / 100
        : null,
  }));
}

function computeTotalsSimple(lignes: ReturnType<typeof buildSimpleLignes>) {
  let totalHT = 0;
  let totalTVA = 0;
  for (const l of lignes) {
    if (l.totalHT != null) {
      totalHT += l.totalHT;
      totalTVA += l.totalHT * ((l.tauxTVA ?? 20) / 100);
    }
  }
  totalHT = Math.round(totalHT * 100) / 100;
  totalTVA = Math.round(totalTVA * 100) / 100;
  return {
    totalHT,
    totalTVA,
    totalTTC: Math.round((totalHT + totalTVA) * 100) / 100,
  };
}

function computeTotals(lignes: ReturnType<typeof buildLignes>) {
  let totalHT = 0;
  let totalTVA = 0;
  for (const l of lignes) {
    if (l.type === "LIGNE" && l.totalHT != null) {
      totalHT += l.totalHT;
      totalTVA += l.totalHT * ((l.tauxTVA ?? 20) / 100);
    }
  }
  totalHT = Math.round(totalHT * 100) / 100;
  totalTVA = Math.round(totalTVA * 100) / 100;
  return {
    totalHT,
    totalTVA,
    totalTTC: Math.round((totalHT + totalTVA) * 100) / 100,
  };
}

// ---------------------------------------------------------------------------
// CGV / mentions légales
// ---------------------------------------------------------------------------

const CONDITIONS_DEVIS = `CONDITIONS GÉNÉRALES DE VENTE ET D'EXÉCUTION DES TRAVAUX

1. Objet — Les présentes conditions générales régissent les relations entre SDA Rénovation et le client pour la réalisation de travaux de rénovation, dans le cadre du devis auquel elles sont annexées.

2. Validité du devis — Le présent devis est établi gratuitement et reste valable pour une durée de 3 mois à compter de sa date d'émission. Au-delà, les prix pourront être révisés en fonction de l'évolution du coût des matériaux et de la main d'œuvre.

3. Acceptation de la commande — Le devis devient un bon de commande ferme après signature (manuscrite ou électronique) et mention « Bon pour accord » par le client. Toute commande implique l'acceptation sans réserve des présentes conditions.

4. Prix — Les prix sont exprimés en euros et hors taxes (HT), la TVA applicable étant précisée pour chaque ligne ou poste (taux normal 20 %, ou taux réduit 10 % / 5,5 % pour les travaux d'amélioration, de transformation, d'aménagement ou d'entretien de logements achevés depuis plus de deux ans, sous réserve que le client atteste remplir les conditions requises).

5. Modalités de règlement — Sauf stipulation contraire portée sur le devis : un acompte de 30 % est demandé à la commande, des factures de situation pourront être émises au fur et à mesure de l'avancement des travaux, le solde étant exigible à la réception des travaux. Les règlements s'effectuent par virement, chèque, carte bancaire ou via le lien de paiement en ligne indiqué sur la facture.

6. Délai d'exécution — Le délai d'exécution est indiqué à titre indicatif sur le devis. Il court à compter de la levée des éventuelles conditions suspensives (acceptation, obtention d'autorisations, encaissement de l'acompte) et peut être prolongé en cas de force majeure, intempéries, ou découverte de désordres non visibles lors de l'établissement du devis.

7. Assurances — SDA Rénovation est couverte par une assurance de responsabilité civile professionnelle et une assurance décennale conformément aux articles 1792 et suivants du Code civil, dont les attestations peuvent être communiquées sur demande.

8. Garanties — Les travaux bénéficient de la garantie de parfait achèvement (1 an), de la garantie biennale de bon fonctionnement des éléments d'équipement (2 ans) et de la garantie décennale pour les dommages compromettant la solidité de l'ouvrage ou le rendant impropre à sa destination (10 ans), à compter de la réception des travaux.

9. Réception des travaux — La réception est constatée contradictoirement entre les parties, le cas échéant avec mention de réserves. Les réserves font l'objet d'une levée dans un délai à convenir entre les parties.

10. Droit de rétractation — Conformément aux articles L221-18 et suivants du Code de la consommation, lorsque le contrat est conclu hors établissement avec un consommateur, ce dernier dispose d'un délai de 14 jours à compter de la signature pour exercer son droit de rétractation, sauf demande expresse d'exécution immédiate des travaux avant l'expiration de ce délai.

11. Réserve de propriété — Les matériaux et fournitures demeurent la propriété de SDA Rénovation jusqu'au complet paiement du prix.

12. Données personnelles — Les informations recueillies font l'objet d'un traitement destiné à la gestion de la relation commerciale et sont conservées conformément au Règlement (UE) 2016/679 (RGPD). Le client dispose d'un droit d'accès, de rectification et d'effacement de ses données en s'adressant à contact@sda-renovation.com.

13. Litiges et médiation — En cas de différend, le client peut recourir gratuitement à un médiateur de la consommation. À défaut de résolution amiable, les tribunaux compétents seront ceux du ressort du siège social de SDA Rénovation, sous réserve des dispositions légales impératives applicables aux consommateurs.

14. Loi applicable — Les présentes conditions sont soumises au droit français.`;

const CONDITIONS_FACTURE = `CONDITIONS DE RÈGLEMENT

Sauf accord particulier mentionné sur la facture, le règlement est dû à réception. Pour les clients professionnels, le délai de paiement ne peut excéder 30 jours à compter de la date d'émission de la facture (art. L441-10 du Code de commerce).

Tout retard de paiement entraîne, de plein droit et sans qu'un rappel soit nécessaire, l'application d'un intérêt de retard égal au taux d'intérêt légal en vigueur majoré de 10 points, ainsi qu'une indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce).

Escompte pour paiement anticipé : néant.

En cas de non-paiement, SDA Rénovation se réserve le droit de suspendre l'exécution des travaux en cours jusqu'au règlement intégral des sommes dues.`;

// ---------------------------------------------------------------------------
// Programme principal
// ---------------------------------------------------------------------------

async function main() {
  console.log("Suppression des données existantes…");
  await prisma.paiement.deleteMany();
  await prisma.factureLigne.deleteMany();
  await prisma.facture.deleteMany();
  await prisma.signature.deleteMany();
  await prisma.devisLigne.deleteMany();
  await prisma.devis.deleteMany();
  await prisma.bonLivraisonLigne.deleteMany();
  await prisma.bonLivraison.deleteMany();
  await prisma.bonCommandeLigne.deleteMany();
  await prisma.bonCommande.deleteMany();
  await prisma.ordreMission.deleteMany();
  await prisma.contratSousTraitance.deleteMany();
  await prisma.evenement.deleteMany();
  await prisma.depense.deleteMany();
  await prisma.document.deleteMany();
  await prisma.dossier.deleteMany();
  await prisma.chantierSousTraitant.deleteMany();
  await prisma.chantier.deleteMany();
  await prisma.client.deleteMany();
  await prisma.fournisseur.deleteMany();
  await prisma.sousTraitant.deleteMany();
  await prisma.user.deleteMany();
  await prisma.parametres.deleteMany();

  // -------------------------------------------------------------------------
  // Paramètres entreprise
  // -------------------------------------------------------------------------
  console.log("Paramètres de l'entreprise…");
  await prisma.parametres.create({
    data: {
      id: "default",
      nomEntreprise: "SDA Rénovation",
      siret: "988 681 672",
      adresse: "23 bis rue Aristide Berges",
      codePostal: "31270",
      ville: "Cugnaux",
      telephone: "06.25.43.64.54",
      email: "contact@sda-renovation.com",
      siteWeb: "https://www.sda-renovation.com",
      iban: "",
      bic: "",
      tvaIntracom: "FR77988681672",
      logoUrl: "/logo.png",
      emailComptable: "",
      leadsApiKey: randomBytes(24).toString("hex"),
      conditionsDevis: CONDITIONS_DEVIS,
      conditionsFacture: CONDITIONS_FACTURE,
      tauxTvaDefaut: 20,
    },
  });

  // -------------------------------------------------------------------------
  // Utilisateurs
  // -------------------------------------------------------------------------
  console.log("Utilisateurs…");
  const passwordHash = await bcrypt.hash("SdaRenovation2026!", 10);
  await prisma.user.create({
    data: {
      name: "Dirigeant SDA",
      email: "contact@sda-renovation.com",
      password: passwordHash,
      role: "DIRIGEANT",
      permissions: "[]",
    },
  });

  // -------------------------------------------------------------------------
  // Fournisseurs
  // -------------------------------------------------------------------------
  console.log("Fournisseurs…");
  const fournisseurPointP = await prisma.fournisseur.create({
    data: {
      reference: "FOU-0001",
      nom: "Point.P Agence Melun",
      contact: "Service Pro",
      email: "melun.pro@pointp.fr",
      telephone: "01 64 10 20 30",
      adresse: "5 avenue de la République",
      codePostal: "77000",
      ville: "Melun",
      siret: "542065479 00012",
      notes: "Compte pro ouvert — gros œuvre, plâtrerie, isolation.",
    },
  });

  const fournisseurCedeo = await prisma.fournisseur.create({
    data: {
      reference: "FOU-0002",
      nom: "Cedeo Melun",
      contact: "Agence Sanitaire/Chauffage",
      email: "melun@cedeo.fr",
      telephone: "01 64 11 22 33",
      adresse: "8 rue de la Plomberie",
      codePostal: "77000",
      ville: "Melun",
      siret: "552061096 00045",
      notes: "Plomberie, sanitaire, chauffage.",
    },
  });

  await prisma.fournisseur.create({
    data: {
      reference: "FOU-0003",
      nom: "Sonepar Île-de-France",
      contact: "Agence Sénart",
      email: "senart@sonepar.fr",
      telephone: "01 64 88 99 00",
      adresse: "2 rue de l'Électricité",
      codePostal: "77550",
      ville: "Moissy-Cramayel",
      siret: "303670329 00050",
      notes: "Matériel électrique et éclairage.",
    },
  });

  await prisma.fournisseur.create({
    data: {
      reference: "FOU-0004",
      nom: "Carrelage Distribution 77",
      contact: "M. Faure",
      email: "contact@carrelage-distrib77.fr",
      telephone: "01 64 77 88 99",
      adresse: "14 zone artisanale du Mée",
      codePostal: "77350",
      ville: "Le Mée-sur-Seine",
      siret: "412345678 00021",
      notes: "Carrelage, faïence, parquet.",
    },
  });

  // -------------------------------------------------------------------------
  // Sous-traitants
  // -------------------------------------------------------------------------
  console.log("Sous-traitants…");
  const stPlomberie = await prisma.sousTraitant.create({
    data: {
      reference: "ST-0001",
      nom: "Plomberie Lefebvre",
      specialite: "Plomberie / Chauffage / Sanitaire",
      contact: "Marc Lefebvre",
      email: "marc.lefebvre@plomberie-lefebvre.fr",
      telephone: "06 12 34 56 78",
      adresse: "9 rue des Lavandières, 77000 Melun",
      tauxHoraire: 45,
      notes: "Intervient régulièrement sur nos chantiers de rénovation de salle de bain.",
    },
  });

  const stElec = await prisma.sousTraitant.create({
    data: {
      reference: "ST-0002",
      nom: "Élec'Pro 77",
      specialite: "Électricité générale / Mise aux normes",
      contact: "Karim Boudjema",
      email: "karim@elecpro77.fr",
      telephone: "06 23 45 67 89",
      adresse: "21 rue Pasteur, 77000 Melun",
      tauxHoraire: 42,
      notes: "Habilité pour mises en conformité NF C 15-100.",
    },
  });

  const stCarreleur = await prisma.sousTraitant.create({
    data: {
      reference: "ST-0003",
      nom: "Carrelage & Sols Martin",
      specialite: "Carrelage / Faïence / Sols souples",
      contact: "Julien Martin",
      email: "julien.martin@carrelage-martin.fr",
      telephone: "06 34 56 78 90",
      adresse: "3 impasse des Tuileries, 77000 Vaux-le-Pénil",
      tauxHoraire: 40,
      notes: "",
    },
  });

  // -------------------------------------------------------------------------
  // Clients
  // -------------------------------------------------------------------------
  console.log("Clients…");
  const clientLefevre = await prisma.client.create({
    data: {
      reference: "PA-0001-SL",
      type: "PA",
      civilite: "Madame",
      nom: "Lefèvre",
      prenom: "Sophie",
      email: "sophie.lefevre@example.com",
      telephone: "06 11 22 33 44",
      adresse: "18 rue du Maréchal Joffre",
      codePostal: "77000",
      ville: "Melun",
      statut: "ACTIF",
      source: "RECOMMANDATION",
      notes: "Cliente fidèle, deuxième chantier avec nous.",
    },
  });

  const clientBernard = await prisma.client.create({
    data: {
      reference: "PA-0002-JB",
      type: "PA",
      civilite: "Monsieur",
      nom: "Bernard",
      prenom: "Jean",
      email: "jean.bernard@example.com",
      telephone: "06 22 33 44 55",
      adresse: "27 avenue Thiers",
      codePostal: "77000",
      ville: "Melun",
      statut: "ACTIF",
      source: "SITE_WEB",
      notes: "Contact initial via le formulaire du site.",
    },
  });

  const clientCopro = await prisma.client.create({
    data: {
      reference: "CO-0001-AR",
      type: "CO",
      civilite: "Monsieur",
      nom: "Roussel",
      prenom: "Alain",
      raisonSociale: "Syndicat des copropriétaires - Résidence Les Tilleuls",
      siret: "",
      email: "syndic.lestilleuls@gestion-immo77.fr",
      telephone: "01 64 55 66 77",
      adresse: "4 allée des Tilleuls",
      codePostal: "77000",
      ville: "Melun",
      statut: "ACTIF",
      source: "TELEPHONE",
      notes: "Syndic : Gestion Immo 77 — interlocuteur M. Roussel (président du conseil syndical).",
    },
  });

  const clientPetit = await prisma.client.create({
    data: {
      reference: "PA-0003-TP",
      type: "PA",
      civilite: "Monsieur",
      nom: "Petit",
      prenom: "Thomas",
      email: "thomas.petit@example.com",
      telephone: "06 33 44 55 66",
      adresse: "6 chemin des Vignes",
      codePostal: "77190",
      ville: "Dammarie-les-Lys",
      statut: "ACTIF",
      source: "GOOGLE",
      notes: "Avis Google laissé après la fin du chantier combles.",
    },
  });

  const clientDupont = await prisma.client.create({
    data: {
      reference: "AI-0001-MD",
      type: "AI",
      civilite: "Monsieur",
      nom: "Dupont",
      prenom: "Marc",
      raisonSociale: "SARL Dupont Immobilier",
      siret: "789123456 00033",
      email: "m.dupont@dupont-immobilier.fr",
      telephone: "01 64 99 88 77",
      adresse: "10 place Saint-Jean",
      codePostal: "77000",
      ville: "Melun",
      statut: "PROSPECT",
      source: "TELEPHONE",
      notes: "Souhaite rénover un local commercial avant relocation.",
    },
  });

  // -------------------------------------------------------------------------
  // Chantiers
  // -------------------------------------------------------------------------
  console.log("Chantiers…");
  const chantierSdb = await prisma.chantier.create({
    data: {
      reference: "CH-2026-014",
      nom: "Rénovation salle de bain — Mme Lefèvre",
      clientId: clientLefevre.id,
      adresse: "18 rue du Maréchal Joffre",
      codePostal: "77000",
      ville: "Melun",
      statut: "EN_COURS",
      dateDebut: new Date("2026-05-04"),
      dateFin: new Date("2026-06-20"),
      budgetEstime: 9500,
      description: "Rénovation complète d'une salle de bain de 12 m² : dépose, plomberie, électricité, carrelage et finitions.",
    },
  });

  const chantierAppart = await prisma.chantier.create({
    data: {
      reference: "CH-2026-015",
      nom: "Rénovation appartement complet — M. Bernard",
      clientId: clientBernard.id,
      adresse: "27 avenue Thiers",
      codePostal: "77000",
      ville: "Melun",
      statut: "EN_COURS",
      dateDebut: new Date("2026-06-01"),
      dateFin: new Date("2026-08-30"),
      budgetEstime: 38000,
      description: "Rénovation d'un appartement T3 de 65 m² : plâtrerie/isolation, électricité, plomberie, sols, peinture, menuiseries intérieures.",
    },
  });

  const chantierFacade = await prisma.chantier.create({
    data: {
      reference: "CH-2026-016",
      nom: "Ravalement de façade — Copropriété Les Tilleuls",
      clientId: clientCopro.id,
      adresse: "4 allée des Tilleuls",
      codePostal: "77000",
      ville: "Melun",
      statut: "DEVIS_ENVOYE",
      budgetEstime: 62000,
      description: "Ravalement de façade complet (4 façades) avec traitement des fissures, enduit et peinture façade.",
    },
  });

  const chantierCombles = await prisma.chantier.create({
    data: {
      reference: "CH-2026-010",
      nom: "Aménagement de combles — M. Petit",
      clientId: clientPetit.id,
      adresse: "6 chemin des Vignes",
      codePostal: "77190",
      ville: "Dammarie-les-Lys",
      statut: "TERMINE",
      dateDebut: new Date("2026-02-10"),
      dateFin: new Date("2026-03-28"),
      budgetEstime: 15000,
      description: "Aménagement de combles en chambre + bureau : isolation, plâtrerie, électricité, sol stratifié, peinture.",
    },
  });

  const chantierLocaux = await prisma.chantier.create({
    data: {
      reference: "CH-2026-017",
      nom: "Rénovation locaux commerciaux — SARL Dupont Immobilier",
      clientId: clientDupont.id,
      adresse: "10 place Saint-Jean",
      codePostal: "77000",
      ville: "Melun",
      statut: "PROSPECT",
      budgetEstime: 25000,
      description: "Rénovation tous corps d'état d'un local commercial de 80 m² avant relocation (devis en cours de chiffrage).",
    },
  });

  // Sous-traitants affectés aux chantiers
  await prisma.chantierSousTraitant.createMany({
    data: [
      { chantierId: chantierSdb.id, sousTraitantId: stPlomberie.id, role: "Plomberie / sanitaire" },
      { chantierId: chantierSdb.id, sousTraitantId: stCarreleur.id, role: "Carrelage / faïence" },
      { chantierId: chantierAppart.id, sousTraitantId: stElec.id, role: "Mise en conformité électrique" },
      { chantierId: chantierAppart.id, sousTraitantId: stPlomberie.id, role: "Réseaux plomberie" },
    ],
  });

  // -------------------------------------------------------------------------
  // Devis
  // -------------------------------------------------------------------------
  console.log("Devis…");

  // Devis 1 — Salle de bain (accepté + signé électroniquement)
  const lignesSdb = buildLignes([
    { type: "CHAPITRE", designation: "Démolition / Dépose" },
    { designation: "Dépose ancienne baignoire, lavabo, WC et meuble", unite: "ENS.", quantite: 1, prixUnitaireHT: 380, tauxTVA: 10 },
    { designation: "Dépose carrelage sol et murs existants", unite: "m²", quantite: 28, prixUnitaireHT: 18, tauxTVA: 10 },
    { designation: "Évacuation des gravats en déchetterie", unite: "FORFAIT", quantite: 1, prixUnitaireHT: 250, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Plomberie / Sanitaires" },
    { type: "SOUS_CHAPITRE", designation: "Réseaux" },
    { designation: "Dépose et reprise des réseaux eau chaude / eau froide / évacuations", unite: "ENS.", quantite: 1, prixUnitaireHT: 850, tauxTVA: 10 },
    { type: "SOUS_CHAPITRE", designation: "Appareils sanitaires" },
    { designation: "Fourniture et pose receveur de douche extra-plat 120x80", unite: "U", quantite: 1, prixUnitaireHT: 480, tauxTVA: 10 },
    { designation: "Fourniture et pose parois de douche vitrées", unite: "U", quantite: 1, prixUnitaireHT: 590, tauxTVA: 10 },
    { designation: "Fourniture et pose meuble vasque double vasque 120 cm", unite: "U", quantite: 1, prixUnitaireHT: 690, tauxTVA: 10 },
    { designation: "Fourniture et pose WC suspendu + bâti-support", unite: "U", quantite: 1, prixUnitaireHT: 520, tauxTVA: 10 },
    { designation: "Fourniture et pose robinetterie (mitigeurs douche + vasque)", unite: "ENS.", quantite: 1, prixUnitaireHT: 410, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Électricité" },
    { designation: "Mise aux normes installation électrique salle de bain (NF C 15-100)", unite: "ENS.", quantite: 1, prixUnitaireHT: 680, tauxTVA: 10 },
    { designation: "Fourniture et pose spots LED encastrés", unite: "U", quantite: 5, prixUnitaireHT: 38, tauxTVA: 10 },
    { designation: "Fourniture et pose sèche-serviettes électrique", unite: "U", quantite: 1, prixUnitaireHT: 320, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Carrelage / Faïence" },
    { designation: "Fourniture et pose carrelage sol grand format", unite: "m²", quantite: 12, prixUnitaireHT: 58, tauxTVA: 10 },
    { designation: "Fourniture et pose faïence murale", unite: "m²", quantite: 24, prixUnitaireHT: 62, tauxTVA: 10 },
    { designation: "Pose plinthes carrelage", unite: "ml", quantite: 9, prixUnitaireHT: 18, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Peinture / Finitions" },
    { designation: "Peinture plafond et murs hors faïence (2 couches)", unite: "m²", quantite: 16, prixUnitaireHT: 30, tauxTVA: 10 },
    { designation: "Pose plafond suspendu hydrofuge", unite: "m²", quantite: 12, prixUnitaireHT: 45, tauxTVA: 10 },
  ]);
  const totauxSdb = computeTotals(lignesSdb);

  const devisSdb = await prisma.devis.create({
    data: {
      numero: "DEV-2026-014",
      chantierId: chantierSdb.id,
      clientId: clientLefevre.id,
      statut: "ACCEPTE",
      dateCreation: new Date("2026-04-18"),
      dateValidite: new Date("2026-07-18"),
      objet: "Rénovation complète de la salle de bain",
      delaiExecution: "3 semaines à compter de l'acceptation et de l'encaissement de l'acompte",
      modaliteReglement: "Acompte de 30 % à la commande, solde à réception des travaux",
      modelePdf: "CLASSIQUE",
      ...totauxSdb,
      lignes: { create: lignesSdb },
    },
  });

  await prisma.signature.create({
    data: {
      devisId: devisSdb.id,
      nomSignataire: "Sophie Lefèvre",
      imageSignature: PIXEL_PNG,
      dateSignature: new Date("2026-04-22T18:42:00"),
      adresseIp: "82.123.45.67",
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
  });

  // Devis 2 — Appartement complet (accepté, signature papier)
  const lignesAppart = buildLignes([
    { type: "CHAPITRE", designation: "Démolition / Préparation" },
    { designation: "Dépose cloisons non porteuses et revêtements existants", unite: "ENS.", quantite: 1, prixUnitaireHT: 1200, tauxTVA: 10 },
    { designation: "Protection des sols et accès, évacuation des gravats", unite: "FORFAIT", quantite: 1, prixUnitaireHT: 650, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Plâtrerie / Isolation" },
    { designation: "Isolation thermique des murs périphériques (laine de verre 100mm)", unite: "m²", quantite: 55, prixUnitaireHT: 32, tauxTVA: 10 },
    { designation: "Fourniture et pose cloisons de distribution placo BA13", unite: "m²", quantite: 24, prixUnitaireHT: 48, tauxTVA: 10 },
    { designation: "Doublage des murs extérieurs placo + isolant", unite: "m²", quantite: 48, prixUnitaireHT: 42, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Électricité" },
    { designation: "Refonte complète du tableau électrique et mise aux normes", unite: "ENS.", quantite: 1, prixUnitaireHT: 1450, tauxTVA: 10 },
    { designation: "Création de points lumineux, prises et interrupteurs", unite: "U", quantite: 32, prixUnitaireHT: 65, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Plomberie" },
    { designation: "Réfection des réseaux d'alimentation et d'évacuation cuisine", unite: "ENS.", quantite: 1, prixUnitaireHT: 1350, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Sols / Revêtements" },
    { designation: "Fourniture et pose parquet stratifié", unite: "m²", quantite: 48, prixUnitaireHT: 46, tauxTVA: 10 },
    { designation: "Fourniture et pose carrelage cuisine et entrée", unite: "m²", quantite: 17, prixUnitaireHT: 55, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Peinture / Menuiseries" },
    { designation: "Peinture murs et plafonds (2 couches) toutes pièces", unite: "m²", quantite: 180, prixUnitaireHT: 26, tauxTVA: 10 },
    { designation: "Fourniture et pose portes intérieures + huisseries", unite: "U", quantite: 5, prixUnitaireHT: 320, tauxTVA: 10 },
  ]);
  const totauxAppart = computeTotals(lignesAppart);

  const devisAppart = await prisma.devis.create({
    data: {
      numero: "DEV-2026-015",
      chantierId: chantierAppart.id,
      clientId: clientBernard.id,
      statut: "ACCEPTE",
      dateCreation: new Date("2026-05-12"),
      dateValidite: new Date("2026-08-12"),
      objet: "Rénovation complète d'un appartement T3 (65 m²)",
      delaiExecution: "Environ 10 semaines à compter du démarrage du chantier",
      modaliteReglement: "Acompte de 30 % à la commande, factures de situation mensuelles, solde à réception",
      modelePdf: "MINIMALISTE",
      ...totauxAppart,
      lignes: { create: lignesAppart },
    },
  });

  // Devis 3 — Façade copropriété (envoyé, modèle appel d'offres, lien de signature en attente)
  const lignesFacade = buildLignes([
    { type: "CHAPITRE", designation: "Installation de chantier" },
    { designation: "Amenée, montage et repli d'échafaudage (4 façades)", unite: "ENS.", quantite: 1, prixUnitaireHT: 8500, tauxTVA: 20 },
    { designation: "Protection des abords, balisage et signalisation", unite: "FORFAIT", quantite: 1, prixUnitaireHT: 1200, tauxTVA: 20 },

    { type: "CHAPITRE", designation: "Ravalement de façade" },
    { designation: "Nettoyage haute pression des façades", unite: "m²", quantite: 420, prixUnitaireHT: 8, tauxTVA: 20 },
    { designation: "Traitement des fissures et reprises d'enduit", unite: "m²", quantite: 60, prixUnitaireHT: 35, tauxTVA: 20 },
    { designation: "Application enduit de façade taloché", unite: "m²", quantite: 420, prixUnitaireHT: 42, tauxTVA: 20 },

    { type: "CHAPITRE", designation: "Peinture façade et étanchéité" },
    { designation: "Application peinture façade pliolite (2 couches)", unite: "m²", quantite: 420, prixUnitaireHT: 22, tauxTVA: 20 },
    { designation: "Reprise des éléments de zinguerie et étanchéité des appuis", unite: "ml", quantite: 85, prixUnitaireHT: 48, tauxTVA: 20 },
  ]);
  const totauxFacade = computeTotals(lignesFacade);

  await prisma.devis.create({
    data: {
      numero: "DEV-2026-016",
      chantierId: chantierFacade.id,
      clientId: clientCopro.id,
      statut: "ENVOYE",
      dateCreation: new Date("2026-06-02"),
      dateValidite: new Date("2026-09-02"),
      referenceMarche: "RAVAL-TILLEULS-2026",
      maitreOuvrage: "Syndicat des copropriétaires - Résidence Les Tilleuls (représenté par Gestion Immo 77)",
      maitreOeuvre: "SDA Rénovation",
      lot: "Lot unique — Ravalement de façade",
      objet: "Ravalement complet des façades de la résidence Les Tilleuls (4 façades)",
      delaiExecution: "8 semaines, hors intempéries, à compter de la réception de l'ordre de service",
      modaliteReglement: "Acompte de 20 % à la commande, situations mensuelles sur état d'avancement, retenue de garantie 5 %",
      modelePdf: "APPEL_OFFRE",
      signatureToken: randomBytes(16).toString("hex"),
      ...totauxFacade,
      lignes: { create: lignesFacade },
    },
  });

  // Devis 4 — Combles (terminé / accepté)
  const lignesCombles = buildLignes([
    { type: "CHAPITRE", designation: "Isolation / Structure" },
    { designation: "Isolation des rampants en laine de verre 200mm", unite: "m²", quantite: 45, prixUnitaireHT: 38, tauxTVA: 10 },
    { designation: "Renforcement du plancher existant", unite: "m²", quantite: 28, prixUnitaireHT: 55, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Plâtrerie / Électricité" },
    { designation: "Habillage placo rampants et plafonds", unite: "m²", quantite: 60, prixUnitaireHT: 40, tauxTVA: 10 },
    { designation: "Création de points lumineux et prises", unite: "U", quantite: 12, prixUnitaireHT: 65, tauxTVA: 10 },

    { type: "CHAPITRE", designation: "Sol / Finitions" },
    { designation: "Fourniture et pose sol stratifié", unite: "m²", quantite: 28, prixUnitaireHT: 44, tauxTVA: 10 },
    { designation: "Peinture murs et plafonds (2 couches)", unite: "m²", quantite: 95, prixUnitaireHT: 27, tauxTVA: 10 },
    { designation: "Fourniture et pose fenêtre de toit + store occultant", unite: "U", quantite: 2, prixUnitaireHT: 780, tauxTVA: 10 },
  ]);
  const totauxCombles = computeTotals(lignesCombles);

  const devisCombles = await prisma.devis.create({
    data: {
      numero: "DEV-2026-010",
      chantierId: chantierCombles.id,
      clientId: clientPetit.id,
      statut: "ACCEPTE",
      dateCreation: new Date("2026-01-15"),
      dateValidite: new Date("2026-04-15"),
      objet: "Aménagement de combles en chambre + bureau",
      delaiExecution: "6 semaines",
      modaliteReglement: "Acompte de 30 % à la commande, solde à réception des travaux",
      modelePdf: "CLASSIQUE",
      ...totauxCombles,
      lignes: { create: lignesCombles },
    },
  });

  // Devis 5 — Locaux commerciaux (brouillon, appel d'offres)
  const lignesLocaux = buildLignes([
    { type: "CHAPITRE", designation: "Démolition / Gros œuvre" },
    { designation: "Dépose des cloisons et revêtements existants", unite: "ENS.", quantite: 1, prixUnitaireHT: 1800, tauxTVA: 20 },
    { type: "CHAPITRE", designation: "Second œuvre" },
    { designation: "Cloisons de distribution et faux-plafonds", unite: "m²", quantite: 80, prixUnitaireHT: 50, tauxTVA: 20 },
    { designation: "Mise aux normes électricité et éclairage tertiaire", unite: "ENS.", quantite: 1, prixUnitaireHT: 4200, tauxTVA: 20 },
    { type: "CHAPITRE", designation: "Finitions" },
    { designation: "Sol PVC technique + plinthes", unite: "m²", quantite: 80, prixUnitaireHT: 38, tauxTVA: 20 },
    { designation: "Peinture murs et plafonds", unite: "m²", quantite: 220, prixUnitaireHT: 24, tauxTVA: 20 },
  ]);
  const totauxLocaux = computeTotals(lignesLocaux);

  await prisma.devis.create({
    data: {
      numero: "DEV-2026-017",
      chantierId: chantierLocaux.id,
      clientId: clientDupont.id,
      statut: "BROUILLON",
      dateCreation: new Date("2026-06-10"),
      dateValidite: new Date("2026-09-10"),
      maitreOuvrage: "SARL Dupont Immobilier",
      maitreOeuvre: "SDA Rénovation",
      lot: "Tous corps d'état",
      objet: "Rénovation d'un local commercial de 80 m² avant relocation",
      delaiExecution: "À définir avec le maître d'ouvrage",
      modaliteReglement: "Acompte de 30 % à la commande, solde à réception des travaux",
      modelePdf: "APPEL_OFFRE",
      ...totauxLocaux,
      lignes: { create: lignesLocaux },
    },
  });

  // -------------------------------------------------------------------------
  // Factures + paiements
  // -------------------------------------------------------------------------
  console.log("Factures…");

  // Facture d'acompte — salle de bain (payée)
  const acompteSdb = Math.round(totauxSdb.totalHT * 0.3 * 100) / 100;
  const acompteSdbLignes = buildLignes([
    { designation: `Acompte de 30 % sur devis n° DEV-2026-014 (rénovation salle de bain)`, unite: "FORFAIT", quantite: 1, prixUnitaireHT: acompteSdb, tauxTVA: 10 },
  ]);
  const totauxAcompteSdb = computeTotals(acompteSdbLignes);

  const factureAcompteSdb = await prisma.facture.create({
    data: {
      numero: "FAC-2026-021",
      chantierId: chantierSdb.id,
      clientId: clientLefevre.id,
      devisId: devisSdb.id,
      statut: "PAYEE",
      type: "ACOMPTE",
      dateEmission: new Date("2026-04-23"),
      dateEcheance: new Date("2026-04-23"),
      modelePdf: "CLASSIQUE",
      ...totauxAcompteSdb,
      montantPaye: totauxAcompteSdb.totalTTC,
      lignes: { create: acompteSdbLignes },
    },
  });

  await prisma.paiement.create({
    data: {
      factureId: factureAcompteSdb.id,
      montant: totauxAcompteSdb.totalTTC,
      date: new Date("2026-04-24"),
      methode: "VIREMENT",
      reference: "VIR-LEFEVRE-ACOMPTE",
    },
  });

  // Facture en cours — solde salle de bain (envoyée, en attente, avec lien de paiement)
  const soldeSdb = Math.round((totauxSdb.totalHT - acompteSdb) * 100) / 100;
  const soldeSdbLignes = buildLignes([
    { designation: `Solde sur devis n° DEV-2026-014 (rénovation salle de bain) — déduction de l'acompte versé`, unite: "FORFAIT", quantite: 1, prixUnitaireHT: soldeSdb, tauxTVA: 10 },
  ]);
  const totauxSoldeSdb = computeTotals(soldeSdbLignes);

  await prisma.facture.create({
    data: {
      numero: "FAC-2026-028",
      chantierId: chantierSdb.id,
      clientId: clientLefevre.id,
      devisId: devisSdb.id,
      statut: "ENVOYEE",
      type: "SOLDE",
      dateEmission: new Date("2026-06-12"),
      dateEcheance: new Date("2026-06-26"),
      modelePdf: "CLASSIQUE",
      ...totauxSoldeSdb,
      montantPaye: 0,
      lienPaiement: "https://paiement.sda-renovation.com/placeholder/FAC-2026-028",
      lignes: { create: soldeSdbLignes },
    },
  });

  // Facture d'acompte — appartement (payée)
  const acompteAppart = Math.round(totauxAppart.totalHT * 0.3 * 100) / 100;
  const acompteAppartLignes = buildLignes([
    { designation: `Acompte de 30 % sur devis n° DEV-2026-015 (rénovation appartement)`, unite: "FORFAIT", quantite: 1, prixUnitaireHT: acompteAppart, tauxTVA: 10 },
  ]);
  const totauxAcompteAppart = computeTotals(acompteAppartLignes);

  const factureAcompteAppart = await prisma.facture.create({
    data: {
      numero: "FAC-2026-024",
      chantierId: chantierAppart.id,
      clientId: clientBernard.id,
      devisId: devisAppart.id,
      statut: "PAYEE",
      type: "ACOMPTE",
      dateEmission: new Date("2026-05-15"),
      dateEcheance: new Date("2026-05-15"),
      modelePdf: "MINIMALISTE",
      ...totauxAcompteAppart,
      montantPaye: totauxAcompteAppart.totalTTC,
      lignes: { create: acompteAppartLignes },
    },
  });

  await prisma.paiement.create({
    data: {
      factureId: factureAcompteAppart.id,
      montant: totauxAcompteAppart.totalTTC,
      date: new Date("2026-05-16"),
      methode: "VIREMENT",
      reference: "VIR-BERNARD-ACOMPTE",
    },
  });

  // Facture soldée — combles (terminé, payée intégralement en deux fois)
  const factureCombles = await prisma.facture.create({
    data: {
      numero: "FAC-2026-006",
      chantierId: chantierCombles.id,
      clientId: clientPetit.id,
      devisId: devisCombles.id,
      statut: "PAYEE",
      type: "STANDARD",
      dateEmission: new Date("2026-03-30"),
      dateEcheance: new Date("2026-04-13"),
      modelePdf: "CLASSIQUE",
      ...totauxCombles,
      montantPaye: totauxCombles.totalTTC,
      lignes: { create: buildLignes([
        { designation: "Solde des travaux d'aménagement de combles — devis n° DEV-2026-010", unite: "FORFAIT", quantite: 1, prixUnitaireHT: Math.round(totauxCombles.totalHT * 0.7 * 100) / 100, tauxTVA: 10 },
        { designation: "Acompte déjà versé à la commande (30 %)", unite: "FORFAIT", quantite: 1, prixUnitaireHT: Math.round(totauxCombles.totalHT * 0.3 * 100) / 100, tauxTVA: 10 },
      ]) },
    },
  });

  await prisma.paiement.createMany({
    data: [
      { factureId: factureCombles.id, montant: Math.round(totauxCombles.totalHT * 0.3 * 1.1 * 100) / 100, date: new Date("2026-01-16"), methode: "VIREMENT", reference: "VIR-PETIT-ACOMPTE" },
      { factureId: factureCombles.id, montant: Math.round((totauxCombles.totalTTC - Math.round(totauxCombles.totalHT * 0.3 * 1.1 * 100) / 100) * 100) / 100, date: new Date("2026-04-02"), methode: "EN_LIGNE", reference: "PAY-PETIT-SOLDE" },
    ],
  });

  // -------------------------------------------------------------------------
  // Bons de commande / Bons de livraison
  // -------------------------------------------------------------------------
  console.log("Bons de commande et de livraison…");

  const lignesBcCedeo = buildSimpleLignes([
    { designation: "Receveur de douche extra-plat 120x80", unite: "U", quantite: 1, prixUnitaireHT: 280, tauxTVA: 20 },
    { designation: "Parois de douche vitrées", unite: "U", quantite: 1, prixUnitaireHT: 350, tauxTVA: 20 },
    { designation: "Meuble vasque double 120 cm", unite: "U", quantite: 1, prixUnitaireHT: 420, tauxTVA: 20 },
    { designation: "WC suspendu + bâti-support", unite: "U", quantite: 1, prixUnitaireHT: 310, tauxTVA: 20 },
    { designation: "Mitigeurs douche et vasque", unite: "ENS.", quantite: 1, prixUnitaireHT: 240, tauxTVA: 20 },
  ]);
  const totauxBcCedeo = computeTotalsSimple(lignesBcCedeo);

  const bcCedeo = await prisma.bonCommande.create({
    data: {
      numero: "BC-2026-031",
      fournisseurId: fournisseurCedeo.id,
      chantierId: chantierSdb.id,
      statut: "RECU",
      dateCreation: new Date("2026-04-25"),
      notes: "Matériel sanitaire pour la salle de bain de Mme Lefèvre.",
      ...totauxBcCedeo,
      lignes: { create: lignesBcCedeo },
    },
  });

  const lignesBcPointP = buildSimpleLignes([
    { designation: "Plaques de plâtre BA13 (paquet)", unite: "U", quantite: 30, prixUnitaireHT: 14, tauxTVA: 20 },
    { designation: "Laine de verre 100mm (rouleau)", unite: "U", quantite: 18, prixUnitaireHT: 32, tauxTVA: 20 },
    { designation: "Rails et montants placo", unite: "ENS.", quantite: 1, prixUnitaireHT: 420, tauxTVA: 20 },
    { designation: "Peinture acrylique mate 10L", unite: "U", quantite: 8, prixUnitaireHT: 65, tauxTVA: 20 },
  ]);
  const totauxBcPointP = computeTotalsSimple(lignesBcPointP);

  await prisma.bonCommande.create({
    data: {
      numero: "BC-2026-032",
      fournisseurId: fournisseurPointP.id,
      chantierId: chantierAppart.id,
      statut: "CONFIRME",
      dateCreation: new Date("2026-06-03"),
      notes: "Matériaux gros œuvre / second œuvre pour l'appartement de M. Bernard.",
      ...totauxBcPointP,
      lignes: { create: lignesBcPointP },
    },
  });

  await prisma.bonLivraison.create({
    data: {
      numero: "BL-2026-018",
      fournisseurId: fournisseurCedeo.id,
      chantierId: chantierSdb.id,
      bonCommandeId: bcCedeo.id,
      statut: "COMPLET",
      dateLivraison: new Date("2026-04-29"),
      notes: "Livraison conforme à la commande, réceptionnée sur le chantier.",
      lignes: {
        create: [
          { ordre: 1, designation: "Receveur de douche extra-plat 120x80", quantiteCommandee: 1, quantiteRecue: 1 },
          { ordre: 2, designation: "Parois de douche vitrées", quantiteCommandee: 1, quantiteRecue: 1 },
          { ordre: 3, designation: "Meuble vasque double 120 cm", quantiteCommandee: 1, quantiteRecue: 1 },
          { ordre: 4, designation: "WC suspendu + bâti-support", quantiteCommandee: 1, quantiteRecue: 1 },
          { ordre: 5, designation: "Mitigeurs douche et vasque", quantiteCommandee: 1, quantiteRecue: 1 },
        ],
      },
    },
  });

  // -------------------------------------------------------------------------
  // Contrats de sous-traitance / Ordres de mission
  // -------------------------------------------------------------------------
  console.log("Contrats de sous-traitance et ordres de mission…");

  await prisma.contratSousTraitance.create({
    data: {
      numero: "CST-2026-003",
      sousTraitantId: stPlomberie.id,
      chantierId: chantierSdb.id,
      statut: "SIGNE",
      objet: "Travaux de plomberie et sanitaires — rénovation salle de bain",
      lot: "Plomberie / Sanitaires",
      montantHT: 2450,
      tauxTVA: 10,
      modaliteReglement: "30 % à la commande, solde à réception des travaux",
      retenueGarantie: 5,
      delaiExecution: "2 semaines",
      dateDebut: new Date("2026-05-11"),
      dateFin: new Date("2026-05-23"),
      penalitesRetard: "0,3 % du montant HT par jour ouvré de retard non justifié",
      assuranceRC: "Attestation RC Professionnelle et décennale en cours de validité fournie",
      signataireNom: "Marc Lefebvre",
      signatureImage: PIXEL_PNG,
      dateSignature: new Date("2026-05-05T09:15:00"),
      signatureIp: "90.45.123.10",
    },
  });

  await prisma.contratSousTraitance.create({
    data: {
      numero: "CST-2026-004",
      sousTraitantId: stElec.id,
      chantierId: chantierAppart.id,
      statut: "ENVOYE",
      objet: "Mise en conformité électrique — appartement T3",
      lot: "Électricité",
      montantHT: 3100,
      tauxTVA: 10,
      modaliteReglement: "30 % à la commande, solde à réception des travaux",
      retenueGarantie: 5,
      delaiExecution: "3 semaines",
      dateDebut: new Date("2026-06-15"),
      dateFin: new Date("2026-07-03"),
      penalitesRetard: "0,3 % du montant HT par jour ouvré de retard non justifié",
      assuranceRC: "Attestation RC Professionnelle en cours de validité à transmettre",
      signatureToken: randomBytes(16).toString("hex"),
    },
  });

  await prisma.ordreMission.create({
    data: {
      numero: "OM-2026-007",
      sousTraitantId: stCarreleur.id,
      chantierId: chantierSdb.id,
      statut: "TERMINE",
      titre: "Pose carrelage et faïence — salle de bain Mme Lefèvre",
      description: "Pose du carrelage sol grand format et de la faïence murale selon plan de calepinage fourni.",
      lieu: "18 rue du Maréchal Joffre, 77000 Melun",
      dateDebut: new Date("2026-05-25"),
      dateFin: new Date("2026-05-29"),
    },
  });

  await prisma.ordreMission.create({
    data: {
      numero: "OM-2026-008",
      sousTraitantId: stPlomberie.id,
      chantierId: chantierAppart.id,
      statut: "ENVOYE",
      titre: "Diagnostic des réseaux existants — appartement Bernard",
      description: "Repérage et diagnostic des réseaux d'alimentation et d'évacuation avant travaux de plâtrerie.",
      lieu: "27 avenue Thiers, 77000 Melun",
      dateDebut: new Date("2026-06-18"),
      dateFin: new Date("2026-06-18"),
    },
  });

  // -------------------------------------------------------------------------
  // Planning
  // -------------------------------------------------------------------------
  console.log("Planning…");
  await prisma.evenement.createMany({
    data: [
      {
        titre: "Visite technique — Mme Lefèvre",
        description: "Prise de mesures et relevés pour le devis de la salle de bain.",
        dateDebut: new Date("2026-04-15T09:00:00"),
        dateFin: new Date("2026-04-15T10:00:00"),
        type: "VISITE",
        lieu: "18 rue du Maréchal Joffre, 77000 Melun",
        chantierId: chantierSdb.id,
      },
      {
        titre: "Livraison matériel sanitaire (Cedeo)",
        description: "Réception du matériel commandé via BC-2026-031.",
        dateDebut: new Date("2026-04-29T08:30:00"),
        dateFin: new Date("2026-04-29T09:30:00"),
        type: "LIVRAISON",
        lieu: "18 rue du Maréchal Joffre, 77000 Melun",
        chantierId: chantierSdb.id,
      },
      {
        titre: "Intervention carrelage — salle de bain",
        description: "Pose carrelage et faïence par Carrelage & Sols Martin (OM-2026-007).",
        dateDebut: new Date("2026-05-25T08:00:00"),
        dateFin: new Date("2026-05-29T17:00:00"),
        type: "INTERVENTION",
        lieu: "18 rue du Maréchal Joffre, 77000 Melun",
        chantierId: chantierSdb.id,
      },
      {
        titre: "Réunion de chantier — appartement Bernard",
        description: "Point hebdomadaire d'avancement avec le client.",
        dateDebut: new Date("2026-06-19T17:30:00"),
        dateFin: new Date("2026-06-19T18:30:00"),
        type: "REUNION",
        lieu: "27 avenue Thiers, 77000 Melun",
        chantierId: chantierAppart.id,
      },
      {
        titre: "Diagnostic réseaux — appartement Bernard",
        description: "Intervention de Plomberie Lefebvre (OM-2026-008).",
        dateDebut: new Date("2026-06-18T08:00:00"),
        dateFin: new Date("2026-06-18T12:00:00"),
        type: "INTERVENTION",
        lieu: "27 avenue Thiers, 77000 Melun",
        chantierId: chantierAppart.id,
      },
      {
        titre: "Visite de réception — combles M. Petit",
        description: "Réception des travaux avec le client, levée des réserves.",
        dateDebut: new Date("2026-03-28T14:00:00"),
        dateFin: new Date("2026-03-28T15:30:00"),
        type: "VISITE",
        lieu: "6 chemin des Vignes, 77190 Dammarie-les-Lys",
        chantierId: chantierCombles.id,
      },
      {
        titre: "Rendez-vous chiffrage — SARL Dupont Immobilier",
        description: "Visite du local commercial et prise de mesures pour le devis.",
        dateDebut: new Date("2026-06-22T10:00:00"),
        dateFin: new Date("2026-06-22T11:00:00"),
        type: "VISITE",
        lieu: "10 place Saint-Jean, 77000 Melun",
        chantierId: chantierLocaux.id,
      },
    ],
  });

  // -------------------------------------------------------------------------
  // Dépenses
  // -------------------------------------------------------------------------
  console.log("Dépenses…");
  await prisma.depense.createMany({
    data: [
      {
        libelle: "Matériel sanitaire (BC-2026-031)",
        montant: totauxBcCedeo.totalTTC,
        date: new Date("2026-04-29"),
        categorie: "MATERIAUX",
        chantierId: chantierSdb.id,
        fournisseurId: fournisseurCedeo.id,
      },
      {
        libelle: "Sous-traitance plomberie (CST-2026-003)",
        montant: 2450 * 1.1,
        date: new Date("2026-05-23"),
        categorie: "SOUS_TRAITANCE",
        chantierId: chantierSdb.id,
      },
      {
        libelle: "Carburant véhicules de chantier — mai 2026",
        montant: 285.4,
        date: new Date("2026-05-31"),
        categorie: "TRANSPORT",
      },
      {
        libelle: "Cotisation annuelle assurance RC Pro / décennale",
        montant: 1850,
        date: new Date("2026-01-10"),
        categorie: "ADMINISTRATIF",
      },
      {
        libelle: "Matériaux plâtrerie / isolation (BC-2026-032)",
        montant: totauxBcPointP.totalTTC,
        date: new Date("2026-06-05"),
        categorie: "MATERIAUX",
        chantierId: chantierAppart.id,
        fournisseurId: fournisseurPointP.id,
      },
      {
        libelle: "Achat outillage (perforateur, niveau laser)",
        montant: 540,
        date: new Date("2026-03-02"),
        categorie: "ADMINISTRATIF",
      },
    ],
  });

  // -------------------------------------------------------------------------
  // Arborescence Documents — SAS SDA Rénovation
  // 10 services internes clairement séparés
  // -------------------------------------------------------------------------
  console.log("Arborescence des documents…");
  type ArboNode = { nom: string; enfants?: string[] };
  const tree: ArboNode[] = [
    {
      nom: "Direction Générale",
      enfants: [
        "Stratégie & Développement",
        "Comptes-rendus de direction",
        "Reporting & Tableaux de bord",
      ],
    },
    {
      nom: "Service Commercial",
      enfants: [
        "Prospects & Opportunités",
        "Devis & Propositions commerciales",
        "Contrats clients signés",
        "Appels d'offres",
        "Références & Supports marketing",
      ],
    },
    {
      nom: "Service Opérations & Chantiers",
      enfants: [
        "Plans, métrés & études techniques",
        "Rapports journaliers de chantier",
        "Photos de chantier",
        "PV de réception & levée de réserves",
        "Ordres de service & Avenants",
      ],
    },
    {
      nom: "Service Achats & Approvisionnement",
      enfants: [
        "Bons de commande émis",
        "Bons de livraison reçus",
        "Fiches techniques & Datasheets produits",
        "Catalogues fournisseurs",
      ],
    },
    {
      nom: "Service Sous-traitance",
      enfants: [
        "Contrats de sous-traitance",
        "DC4 & Agréments maître d'ouvrage",
        "Attestations & Assurances sous-traitants",
        "Situations de travaux sous-traitants",
      ],
    },
    {
      nom: "Service Administratif & Juridique",
      enfants: [
        "Assurances société (RC Pro & Décennale)",
        "Certifications & Labels (RGE, Qualibat)",
        "Kbis, Statuts & Registre du Commerce",
        "Contrats & Conventions",
        "Licences, Abonnements & Logiciels",
      ],
    },
    {
      nom: "Service Financier & Comptabilité",
      enfants: [
        "Facturation clients",
        "Factures fournisseurs & Achats",
        "Relevés bancaires",
        "Déclarations TVA & Fiscales",
        "Bilans & Comptes annuels",
        "Notes de frais",
      ],
    },
    {
      nom: "Service Ressources Humaines",
      enfants: [
        "Contrats de travail & Avenants",
        "Bulletins de salaire",
        "Registre unique du personnel",
        "Formations, Habilitations & Certifications",
        "Visites médicales & Aptitudes",
        "EPI, Sécurité & Prévention",
      ],
    },
    {
      nom: "QSE — Qualité, Sécurité, Environnement",
      enfants: [
        "Document Unique d'Évaluation des Risques (DUER)",
        "Plans de prévention",
        "PPSPS",
        "Fiches de données sécurité (FDS)",
        "Certificats & Audits qualité",
      ],
    },
    {
      nom: "Archives",
      enfants: ["2024", "2025", "Antérieures"],
    },
  ];

  for (let i = 0; i < tree.length; i++) {
    const node = tree[i];
    const parent = await prisma.dossier.create({
      data: { nom: node.nom, systeme: true, ordre: i },
    });
    if (node.enfants) {
      for (let j = 0; j < node.enfants.length; j++) {
        await prisma.dossier.create({
          data: { nom: node.enfants[j], parentId: parent.id, systeme: true, ordre: j },
        });
      }
    }
  }

  console.log("Seed terminé avec succès.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
