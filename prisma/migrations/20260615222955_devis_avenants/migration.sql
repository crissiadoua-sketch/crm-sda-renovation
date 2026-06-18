-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Devis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "chantierId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'BROUILLON',
    "type" TEXT NOT NULL DEFAULT 'INITIAL',
    "devisParentId" TEXT,
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
    CONSTRAINT "Devis_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Devis_devisParentId_fkey" FOREIGN KEY ("devisParentId") REFERENCES "Devis" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_Devis" ("chantierId", "clientId", "createdAt", "dateCreation", "dateValidite", "delaiExecution", "id", "lot", "maitreOeuvre", "maitreOuvrage", "modaliteReglement", "modelePdf", "numero", "objet", "referenceMarche", "signatureToken", "statut", "totalHT", "totalTTC", "totalTVA", "updatedAt") SELECT "chantierId", "clientId", "createdAt", "dateCreation", "dateValidite", "delaiExecution", "id", "lot", "maitreOeuvre", "maitreOuvrage", "modaliteReglement", "modelePdf", "numero", "objet", "referenceMarche", "signatureToken", "statut", "totalHT", "totalTTC", "totalTVA", "updatedAt" FROM "Devis";
DROP TABLE "Devis";
ALTER TABLE "new_Devis" RENAME TO "Devis";
CREATE UNIQUE INDEX "Devis_numero_key" ON "Devis"("numero");
CREATE UNIQUE INDEX "Devis_signatureToken_key" ON "Devis"("signatureToken");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
