-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL DEFAULT 'PARTICULIER',
    "civilite" TEXT,
    "nom" TEXT NOT NULL,
    "prenom" TEXT,
    "raisonSociale" TEXT,
    "siret" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "notes" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ACTIF',
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Fournisseur" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "siret" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SousTraitant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "specialite" TEXT,
    "contact" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "adresse" TEXT,
    "tauxHoraire" REAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Chantier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reference" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'PROSPECT',
    "dateDebut" DATETIME,
    "dateFin" DATETIME,
    "budgetEstime" REAL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Chantier_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChantierSousTraitant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "chantierId" TEXT NOT NULL,
    "sousTraitantId" TEXT NOT NULL,
    "role" TEXT,
    CONSTRAINT "ChantierSousTraitant_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChantierSousTraitant_sousTraitantId_fkey" FOREIGN KEY ("sousTraitantId") REFERENCES "SousTraitant" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContratSousTraitance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "sousTraitantId" TEXT NOT NULL,
    "chantierId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "objet" TEXT,
    "lot" TEXT,
    "montantHT" REAL,
    "tauxTVA" REAL,
    "modaliteReglement" TEXT,
    "retenueGarantie" REAL,
    "delaiExecution" TEXT,
    "dateDebut" DATETIME,
    "dateFin" DATETIME,
    "penalitesRetard" TEXT,
    "assuranceRC" TEXT,
    "notes" TEXT,
    "signatureToken" TEXT,
    "signataireNom" TEXT,
    "signatureImage" TEXT,
    "dateSignature" DATETIME,
    "signatureIp" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContratSousTraitance_sousTraitantId_fkey" FOREIGN KEY ("sousTraitantId") REFERENCES "SousTraitant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ContratSousTraitance_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrdreMission" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "sousTraitantId" TEXT NOT NULL,
    "chantierId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "lieu" TEXT,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "OrdreMission_sousTraitantId_fkey" FOREIGN KEY ("sousTraitantId") REFERENCES "SousTraitant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrdreMission_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Devis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "chantierId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateValidite" DATETIME,
    "referenceMarche" TEXT,
    "maitreOuvrage" TEXT,
    "maitreOeuvre" TEXT,
    "lot" TEXT,
    "objet" TEXT,
    "delaiExecution" TEXT,
    "modaliteReglement" TEXT,
    "modelePdf" TEXT NOT NULL DEFAULT 'APPEL_OFFRE',
    "totalHT" REAL NOT NULL DEFAULT 0,
    "totalTVA" REAL NOT NULL DEFAULT 0,
    "totalTTC" REAL NOT NULL DEFAULT 0,
    "signatureToken" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Devis_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DevisLigne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "devisId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LIGNE',
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "unite" TEXT,
    "quantite" REAL,
    "prixUnitaireHT" REAL,
    "tauxTVA" REAL,
    "totalHT" REAL,
    CONSTRAINT "DevisLigne_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "devisId" TEXT NOT NULL,
    "nomSignataire" TEXT NOT NULL,
    "imageSignature" TEXT NOT NULL,
    "dateSignature" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adresseIp" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "Signature_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Facture" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "chantierId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "devisId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "type" TEXT NOT NULL DEFAULT 'STANDARD',
    "dateEmission" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateEcheance" DATETIME,
    "modelePdf" TEXT NOT NULL DEFAULT 'APPEL_OFFRE',
    "totalHT" REAL NOT NULL DEFAULT 0,
    "totalTVA" REAL NOT NULL DEFAULT 0,
    "totalTTC" REAL NOT NULL DEFAULT 0,
    "montantPaye" REAL NOT NULL DEFAULT 0,
    "lienPaiement" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Facture_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Facture_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Facture_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FactureLigne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factureId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'LIGNE',
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "unite" TEXT,
    "quantite" REAL,
    "prixUnitaireHT" REAL,
    "tauxTVA" REAL,
    "totalHT" REAL,
    CONSTRAINT "FactureLigne_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "factureId" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "methode" TEXT NOT NULL DEFAULT 'VIREMENT',
    "reference" TEXT,
    "notes" TEXT,
    CONSTRAINT "Paiement_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BonCommande" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "chantierId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "dateCreation" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "totalHT" REAL NOT NULL DEFAULT 0,
    "totalTVA" REAL NOT NULL DEFAULT 0,
    "totalTTC" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BonCommande_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BonCommande_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BonCommandeLigne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bonCommandeId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "unite" TEXT,
    "quantite" REAL,
    "prixUnitaireHT" REAL,
    "tauxTVA" REAL,
    "totalHT" REAL,
    CONSTRAINT "BonCommandeLigne_bonCommandeId_fkey" FOREIGN KEY ("bonCommandeId") REFERENCES "BonCommande" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BonLivraison" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "fournisseurId" TEXT NOT NULL,
    "chantierId" TEXT,
    "bonCommandeId" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'ATTENDU',
    "dateLivraison" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BonLivraison_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BonLivraison_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "BonLivraison_bonCommandeId_fkey" FOREIGN KEY ("bonCommandeId") REFERENCES "BonCommande" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BonLivraisonLigne" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bonLivraisonId" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL,
    "designation" TEXT NOT NULL,
    "unite" TEXT,
    "quantiteCommandee" REAL,
    "quantiteRecue" REAL,
    "notes" TEXT,
    CONSTRAINT "BonLivraisonLigne_bonLivraisonId_fkey" FOREIGN KEY ("bonLivraisonId") REFERENCES "BonLivraison" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nom" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "chemin" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "categorie" TEXT,
    "clientId" TEXT,
    "chantierId" TEXT,
    "devisId" TEXT,
    "factureId" TEXT,
    "fournisseurId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Document_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_devisId_fkey" FOREIGN KEY ("devisId") REFERENCES "Devis" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_factureId_fkey" FOREIGN KEY ("factureId") REFERENCES "Facture" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Document_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Evenement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "dateDebut" DATETIME NOT NULL,
    "dateFin" DATETIME,
    "type" TEXT NOT NULL DEFAULT 'AUTRE',
    "lieu" TEXT,
    "chantierId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Evenement_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Depense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "libelle" TEXT NOT NULL,
    "montant" REAL NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "categorie" TEXT NOT NULL DEFAULT 'AUTRE',
    "chantierId" TEXT,
    "fournisseurId" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Depense_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Depense_fournisseurId_fkey" FOREIGN KEY ("fournisseurId") REFERENCES "Fournisseur" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Parametres" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'default',
    "nomEntreprise" TEXT NOT NULL DEFAULT 'SDA Rénovation',
    "siret" TEXT,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "telephone" TEXT,
    "email" TEXT,
    "siteWeb" TEXT,
    "iban" TEXT,
    "bic" TEXT,
    "tvaIntracom" TEXT,
    "logoUrl" TEXT,
    "emailComptable" TEXT,
    "leadsApiKey" TEXT,
    "conditionsDevis" TEXT,
    "conditionsFacture" TEXT,
    "tauxTvaDefaut" REAL NOT NULL DEFAULT 20
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Chantier_reference_key" ON "Chantier"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "ChantierSousTraitant_chantierId_sousTraitantId_key" ON "ChantierSousTraitant"("chantierId", "sousTraitantId");

-- CreateIndex
CREATE UNIQUE INDEX "ContratSousTraitance_numero_key" ON "ContratSousTraitance"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "ContratSousTraitance_signatureToken_key" ON "ContratSousTraitance"("signatureToken");

-- CreateIndex
CREATE UNIQUE INDEX "OrdreMission_numero_key" ON "OrdreMission"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_numero_key" ON "Devis"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Devis_signatureToken_key" ON "Devis"("signatureToken");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_devisId_key" ON "Signature"("devisId");

-- CreateIndex
CREATE UNIQUE INDEX "Facture_numero_key" ON "Facture"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "BonCommande_numero_key" ON "BonCommande"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "BonLivraison_numero_key" ON "BonLivraison"("numero");
