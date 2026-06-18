-- AlterTable
ALTER TABLE "DevisLigne" ADD COLUMN "codeArticle" TEXT;
ALTER TABLE "DevisLigne" ADD COLUMN "remise" REAL;

-- AlterTable
ALTER TABLE "FactureLigne" ADD COLUMN "codeArticle" TEXT;
ALTER TABLE "FactureLigne" ADD COLUMN "remise" REAL;
