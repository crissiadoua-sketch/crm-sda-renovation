-- CreateTable
CREATE TABLE "NoteDeFrais" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montant" REAL NOT NULL DEFAULT 0,
    "tva" REAL,
    "categorie" TEXT NOT NULL DEFAULT 'AUTRE',
    "fournisseur" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "justificatif" TEXT,
    "statut" TEXT NOT NULL DEFAULT 'EN_ATTENTE',
    "chantierId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NoteDeFrais_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
