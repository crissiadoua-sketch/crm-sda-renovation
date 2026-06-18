-- CreateTable
CREATE TABLE "Ouvrage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "corpsEtat" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "unite" TEXT NOT NULL DEFAULT 'm²',
    "prixFourniture" REAL NOT NULL DEFAULT 0,
    "prixPose" REAL NOT NULL DEFAULT 0,
    "prixUnitaire" REAL NOT NULL DEFAULT 0,
    "tauxTVA" REAL NOT NULL DEFAULT 10,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Ouvrage_code_key" ON "Ouvrage"("code");
