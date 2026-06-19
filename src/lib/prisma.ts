import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

// Le driver HTTP Neon utilise l'URL directe (sans pooler)
const rawUrl = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
const cleanUrl = rawUrl
  .replace(/&channel_binding=require/g, "")
  .replace(/\?channel_binding=require&?/g, "?")
  .replace(/\?$/, "");

const adapter = new PrismaNeonHttp(cleanUrl, {});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
