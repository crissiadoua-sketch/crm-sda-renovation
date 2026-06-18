-- CreateTable
CREATE TABLE "Salarie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "matricule" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "numeroSS" TEXT,
    "dateNaissance" DATETIME,
    "dateEmbauche" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateSortie" DATETIME,
    "typeContrat" TEXT NOT NULL DEFAULT 'CDI',
    "typeCcn" TEXT NOT NULL DEFAULT 'OUVRIERS',
    "coefficient" INTEGER,
    "position" TEXT,
    "qualification" TEXT,
    "salaireBase" REAL NOT NULL DEFAULT 0,
    "heuresMois" REAL NOT NULL DEFAULT 151.67,
    "adresse" TEXT,
    "codePostal" TEXT,
    "ville" TEXT,
    "email" TEXT,
    "telephone" TEXT,
    "numeroCIBTP" TEXT,
    "statutRH" TEXT NOT NULL DEFAULT 'ACTIF',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "BulletinDePaie" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salarieId" TEXT NOT NULL,
    "periode" TEXT NOT NULL,
    "datePaiement" DATETIME,
    "heuresTravaillees" REAL NOT NULL DEFAULT 151.67,
    "heuresSupp25" REAL NOT NULL DEFAULT 0,
    "heuresSupp50" REAL NOT NULL DEFAULT 0,
    "salaireBase" REAL NOT NULL DEFAULT 0,
    "autresElements" REAL NOT NULL DEFAULT 0,
    "totalBrut" REAL NOT NULL DEFAULT 0,
    "cotisationsSalarie" REAL NOT NULL DEFAULT 0,
    "csgNonDeductible" REAL NOT NULL DEFAULT 0,
    "cotisationsPatronales" REAL NOT NULL DEFAULT 0,
    "netImposable" REAL NOT NULL DEFAULT 0,
    "netAPayer" REAL NOT NULL DEFAULT 0,
    "lignes" TEXT NOT NULL DEFAULT '[]',
    "commentaires" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BulletinDePaie_salarieId_fkey" FOREIGN KEY ("salarieId") REFERENCES "Salarie" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Salarie_matricule_key" ON "Salarie"("matricule");
