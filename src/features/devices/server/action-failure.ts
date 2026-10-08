import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { AppError } from "@/server/errors";
import { logSecurityFailure } from "@/server/logger";
import type { ActionResult } from "@/types/action-result";
import { devicesCopy } from "../copy";

export function deviceFailure<T>(error: unknown): ActionResult<T> {
  unstable_rethrow(error);
  if (error instanceof z.ZodError) return { ok: false, error: { code: "VALIDATION_FAILED",
    message: devicesCopy.errors.VALIDATION_FAILED, fieldErrors: z.flattenError(error).fieldErrors } };
  if (error instanceof AppError) return { ok: false, error: { code: error.code,
    message: devicesCopy.errors[error.code as keyof typeof devicesCopy.errors] ?? devicesCopy.errors.INTERNAL } };
  logSecurityFailure({ event: "devices.operation_failed", requestId: randomUUID(), actorType: "SYSTEM", code: "INTERNAL" });
  return { ok: false, error: { code: "INTERNAL", message: devicesCopy.errors.INTERNAL } };
}
