import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env/server";

// One client (and connection pool) per server process. Development hot reloads re-evaluate
// this module, so the instance lives on globalThis instead of a module variable.
const globalForPrisma = globalThis as typeof globalThis & {
  careBasketPrisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  // Neon's pooled connection string; migrations use DIRECT_URL through the Prisma CLI.
  const adapter = new PrismaPg({ connectionString: getServerEnv().DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Created on first use, never at import time, so nothing connects until a query runs.
// Only repositories and src/server modules call this (architecture.md § 5).
export function getDb(): PrismaClient {
  globalForPrisma.careBasketPrisma ??= createPrismaClient();
  return globalForPrisma.careBasketPrisma;
}
