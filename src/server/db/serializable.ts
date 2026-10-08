import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "./client";
import { AppError } from "@/server/errors";

export async function serializable<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await getDb().$transaction(run, { isolationLevel: "Serializable" }); }
    catch (error) {
      if (!error || typeof error !== "object" || !("code" in error) || error.code !== "P2034") throw error;
    }
  }
  throw new AppError("CONFLICT");
}
