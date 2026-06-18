-- CreateTable
CREATE TABLE "EtatReserves" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numero" TEXT NOT NULL,
    "chantierId" TEXT,
    "clientId" TEXT,
    "dateDocument" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "natureReserves" TEXT NOT NULL DEFAULT '',
    "travauxAExecuter" TEXT NOT NULL DEFAULT '',
    "delaiExecution" TEXT NOT NULL DEFAULT '',
    "lieuSignature" TEXT NOT NULL DEFAULT '',
    "nombreExemplaires" INTEGER NOT NULL DEFAULT 2,
    "statut" TEXT NOT NULL DEFAULT 'EN_COURS',
    "dateLevee" DATETIME,
    "lieuLevee" TEXT NOT NULL DEFAULT '',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EtatReserves_chantierId_fkey" FOREIGN KEY ("chantierId") REFERENCES "Chantier" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "EtatReserves_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EtatReserves_numero_key" ON "EtatReserves"("numero");
