import { prisma } from "@/lib/prisma";
import { periodeComptable, donneesComptables } from "@/lib/comptabilite-filtre";

// Bilan comptable façon liasse fiscale simplifiée (2033-A/B), pré-rempli pour
// le compte de résultat avec les données déjà suivies par le CRM (factures, bons
// de commande, dépenses) ; toutes les autres lignes (immobilisations, capitaux
// propres, dettes...) sont saisies manuellement car le CRM ne tient pas de
// comptabilité en partie double — cf. modèle BilanExercice.

export type LigneBilan = { key: string; label: string; valeur: number; manuel: boolean };
export type GroupeBilan = { titre: string; lignes: LigneBilan[]; total: number };

export async function chargerBilanExercice(annee: number) {
  return prisma.bilanExercice.findUnique({ where: { annee } });
}

export async function calculerBilan(annee: number) {
  const [bilan, { debut, fin }, donnees] = await Promise.all([
    chargerBilanExercice(annee),
    Promise.resolve(periodeComptable(String(annee))),
    donneesComptables(String(annee)),
  ]);

  // Solde de clôture du relevé bancaire le plus récent de l'exercice → Disponibilités auto
  const releveAvecSolde = await prisma.releveBancaire.findFirst({
    where: {
      soldeFin: { not: null },
      dateImport: { gte: new Date(annee, 0, 1), lte: new Date(annee, 11, 31, 23, 59, 59) },
    },
    orderBy: { dateImport: "desc" },
    select: { soldeFin: true, dateImport: true, nom: true, banque: true },
  });

  const b = bilan ?? ({} as Partial<NonNullable<typeof bilan>>);
  const n = (v: number | null | undefined) => v ?? 0;

  // Créances clients = factures non annulées émises sur l'exercice, restant dues (TTC - payé).
  const facturesPeriode = await prisma.facture.findMany({
    where: { dateEmission: { gte: debut, lte: fin }, statut: { not: "ANNULEE" } },
    select: { totalTTC: true, montantPaye: true },
  });
  const creancesClientsAuto = facturesPeriode.reduce(
    (s, f) => s + Math.max(0, f.totalTTC - f.montantPaye),
    0,
  );

  const caHT = donnees.caHT;
  const achatsHT = donnees.totalAchHT;
  const chargesHT = donnees.totalDep;

  // --- Compte de résultat ---
  const produitsExploitation: LigneBilan[] = [
    { key: "venteMarchandises", label: "Ventes de marchandises", valeur: n(b.venteMarchandises), manuel: true },
    { key: "productionVendue", label: "Production vendue (travaux facturés)", valeur: caHT, manuel: false },
    { key: "productionStockee", label: "Production stockée", valeur: n(b.productionStockee), manuel: true },
    { key: "productionImmobilisee", label: "Production immobilisée", valeur: n(b.productionImmobilisee), manuel: true },
    { key: "subventionsExploitation", label: "Subventions d'exploitation", valeur: n(b.subventionsExploitation), manuel: true },
    { key: "reprisesProvisions", label: "Reprises sur provisions, transferts de charges", valeur: n(b.reprisesProvisions), manuel: true },
    { key: "autresProduitsExploitation", label: "Autres produits", valeur: n(b.autresProduitsExploitation), manuel: true },
  ];
  const totalProduitsExploitation = produitsExploitation.reduce((s, l) => s + l.valeur, 0);

  const chargesExploitation: LigneBilan[] = [
    { key: "achatsMarchandises", label: "Achats (bons de commande)", valeur: achatsHT, manuel: false },
    { key: "variationStock", label: "Variation de stock", valeur: n(b.variationStock), manuel: true },
    { key: "autresAchatsChargesExternes", label: "Autres achats et charges externes (dépenses)", valeur: chargesHT, manuel: false },
    { key: "impotsTaxesVersementsAssimiles", label: "Impôts, taxes et versements assimilés", valeur: n(b.impotsTaxesVersementsAssimiles), manuel: true },
    { key: "salairesTraitements", label: "Salaires et traitements", valeur: n(b.salairesTraitements), manuel: true },
    { key: "chargesSociales", label: "Charges sociales", valeur: n(b.chargesSociales), manuel: true },
    { key: "dotationsAmortissementsProvisions", label: "Dotations aux amortissements et provisions", valeur: n(b.dotationsAmortissementsProvisions), manuel: true },
    { key: "autresChargesExploitation", label: "Autres charges", valeur: n(b.autresChargesExploitation), manuel: true },
  ];
  const totalChargesExploitation = chargesExploitation.reduce((s, l) => s + l.valeur, 0);

  const resultatExploitation = totalProduitsExploitation - totalChargesExploitation;

  const produitsFinanciers = n(b.produitsFinanciers);
  const chargesFinancieres = n(b.chargesFinancieres);
  const resultatFinancier = produitsFinanciers - chargesFinancieres;

  const resultatCourantAvantImpots = resultatExploitation + resultatFinancier;

  const produitsExceptionnels = n(b.produitsExceptionnels);
  const chargesExceptionnelles = n(b.chargesExceptionnelles);
  const resultatExceptionnel = produitsExceptionnels - chargesExceptionnelles;

  const participationSalaries = n(b.participationSalaries);
  const impotsBenefices = n(b.impotsBenefices);

  const resultatNet =
    resultatCourantAvantImpots + resultatExceptionnel - participationSalaries - impotsBenefices;

  // --- Actif ---
  const immobIncorporellesNet = n(b.immobIncorporellesBrut) - n(b.immobIncorporellesAmort);
  const immobCorporellesNet = n(b.immobCorporellesBrut) - n(b.immobCorporellesAmort);
  const immobFinancieresNet = n(b.immobFinancieresBrut) - n(b.immobFinancieresAmort);
  const totalActifImmobilise = immobIncorporellesNet + immobCorporellesNet + immobFinancieresNet;

  const creancesClients = b.creancesClientsManuel ?? creancesClientsAuto;

  // Disponibilités : valeur manuelle saisie si présente, sinon soldeFin du relevé bancaire le plus récent
  const disponibilitesAuto = releveAvecSolde?.soldeFin ?? null;
  const disponibilitesManuelle = b.disponibilites != null && b.disponibilites !== 0 ? b.disponibilites : null;
  const disponibilites = disponibilitesManuelle ?? disponibilitesAuto ?? 0;
  const disponibilitesSource = disponibilitesManuelle == null && disponibilitesAuto !== null ? releveAvecSolde : null;

  const actifCirculant: LigneBilan[] = [
    { key: "stocksEnCours", label: "Stocks et en-cours", valeur: n(b.stocksEnCours), manuel: true },
    { key: "avancesAcomptesVerses", label: "Avances et acomptes versés sur commandes", valeur: n(b.avancesAcomptesVerses), manuel: true },
    { key: "creancesClientsManuel", label: "Créances clients et comptes rattachés", valeur: creancesClients, manuel: true },
    { key: "autresCreances", label: "Autres créances", valeur: n(b.autresCreances), manuel: true },
    { key: "valeursMobilieresPlacement", label: "Valeurs mobilières de placement", valeur: n(b.valeursMobilieresPlacement), manuel: true },
    { key: "disponibilites", label: "Disponibilités", valeur: disponibilites, manuel: true },
    { key: "chargesConstateesAvance", label: "Charges constatées d'avance", valeur: n(b.chargesConstateesAvance), manuel: true },
  ];
  const totalActifCirculant = actifCirculant.reduce((s, l) => s + l.valeur, 0);

  const capitalSouscritNonAppele = n(b.capitalSouscritNonAppele);
  const totalActif = capitalSouscritNonAppele + totalActifImmobilise + totalActifCirculant;

  // --- Passif ---
  const capitauxPropres: LigneBilan[] = [
    { key: "capitalSocial", label: "Capital social ou individuel", valeur: n(b.capitalSocial), manuel: true },
    { key: "primesEmissionFusionApport", label: "Primes d'émission, de fusion, d'apport", valeur: n(b.primesEmissionFusionApport), manuel: true },
    { key: "reserves", label: "Réserves", valeur: n(b.reserves), manuel: true },
    { key: "reportANouveau", label: "Report à nouveau", valeur: n(b.reportANouveau), manuel: true },
    { key: "resultatExercice", label: "Résultat de l'exercice", valeur: resultatNet, manuel: false },
    { key: "subventionsInvestissement", label: "Subventions d'investissement", valeur: n(b.subventionsInvestissement), manuel: true },
    { key: "provisionsReglementees", label: "Provisions réglementées", valeur: n(b.provisionsReglementees), manuel: true },
  ];
  const totalCapitauxPropres = capitauxPropres.reduce((s, l) => s + l.valeur, 0);

  const provisionsRisquesCharges = n(b.provisionsRisquesCharges);

  const dettes: LigneBilan[] = [
    { key: "empruntsDettesEtablissementsCredit", label: "Emprunts et dettes auprès des établissements de crédit", valeur: n(b.empruntsDettesEtablissementsCredit), manuel: true },
    { key: "empruntsDettesFinancieresDiverses", label: "Emprunts et dettes financières diverses", valeur: n(b.empruntsDettesFinancieresDiverses), manuel: true },
    { key: "avancesAcomptesRecus", label: "Avances et acomptes reçus sur commandes en cours", valeur: n(b.avancesAcomptesRecus), manuel: true },
    { key: "dettesFournisseursManuel", label: "Dettes fournisseurs et comptes rattachés", valeur: n(b.dettesFournisseursManuel), manuel: true },
    { key: "dettesFiscalesSociales", label: "Dettes fiscales et sociales", valeur: n(b.dettesFiscalesSociales), manuel: true },
    { key: "autresDettes", label: "Autres dettes", valeur: n(b.autresDettes), manuel: true },
    { key: "produitsConstatesAvance", label: "Produits constatés d'avance", valeur: n(b.produitsConstatesAvance), manuel: true },
  ];
  const totalDettes = dettes.reduce((s, l) => s + l.valeur, 0);

  const totalPassif = totalCapitauxPropres + provisionsRisquesCharges + totalDettes;

  return {
    annee,
    debut,
    fin,
    dateDebutExercice: b.dateDebutExercice ?? debut,
    dateFinExercice: b.dateFinExercice ?? fin,
    bilan,
    caHT,
    achatsHT,
    chargesHT,
    creancesClientsAuto,

    actif: {
      capitalSouscritNonAppele,
      immobilise: {
        incorporelles: { brut: n(b.immobIncorporellesBrut), amort: n(b.immobIncorporellesAmort), net: immobIncorporellesNet },
        corporelles: { brut: n(b.immobCorporellesBrut), amort: n(b.immobCorporellesAmort), net: immobCorporellesNet },
        financieres: { brut: n(b.immobFinancieresBrut), amort: n(b.immobFinancieresAmort), net: immobFinancieresNet },
        total: totalActifImmobilise,
      },
      circulant: { lignes: actifCirculant, total: totalActifCirculant },
      totalActif,
    },
    passif: {
      capitauxPropres: { lignes: capitauxPropres, total: totalCapitauxPropres },
      provisionsRisquesCharges,
      dettes: { lignes: dettes, total: totalDettes },
      totalPassif,
    },
    compteResultat: {
      produitsExploitation: { lignes: produitsExploitation, total: totalProduitsExploitation },
      chargesExploitation: { lignes: chargesExploitation, total: totalChargesExploitation },
      resultatExploitation,
      produitsFinanciers,
      chargesFinancieres,
      resultatFinancier,
      resultatCourantAvantImpots,
      produitsExceptionnels,
      chargesExceptionnelles,
      resultatExceptionnel,
      participationSalaries,
      impotsBenefices,
      resultatNet,
    },
    equilibre: totalActif - totalPassif,
    disponibilitesSource,
  };
}

export type BilanCalcule = Awaited<ReturnType<typeof calculerBilan>>;
