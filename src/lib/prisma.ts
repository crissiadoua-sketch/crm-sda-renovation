import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeonHttp } from "@prisma/adapter-neon";

function getNeonHttpUrl(): string {
  const raw = process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "";
  return raw
    .replace(/-pooler\./g, ".")           // supprime -pooler du hostname
    .replace(/&?channel_binding=require/g, "") // supprime channel_binding
    .replace(/\?$/, "");                  // supprime ? final orphelin
}

const adapter = new PrismaNeonHttp(getNeonHttpUrl(), {});

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
