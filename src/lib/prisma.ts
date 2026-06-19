import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

// Supprimer channel_binding=require incompatible avec le driver HTTP Neon
const rawUrl = process.env.DATABASE_URL ?? "";
const cleanUrl = rawUrl.replace(/&?channel_binding=require/g, "").replace(/\?$/, "");

const adapter = new PrismaNeonHttp(cleanUrl, {});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
