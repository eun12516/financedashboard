import { PrismaClient } from "@prisma/client";

/**
 * One PrismaClient per Node process — required for Next.js dev (Turbopack/HMR reloads
 * the module graph) and for long-lived `next start` so we do not open extra pools
 * against Supabase’s connection limit.
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient();
}

export const prisma = globalForPrisma.prisma;
