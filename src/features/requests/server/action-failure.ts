import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { AppError } from "@/server/errors";
import { logSecurityFailure } from "@/server/logger";
import { requestsCopy } from "../copy";
import type { RequestMutationResult } from "../types";

export function requestFailure(error: unknown): RequestMutationResult {
	unstable_rethrow(error);
	const code = error instanceof z.ZodError ? "VALIDATION_FAILED" : error instanceof AppError ? error.code : "INTERNAL";
	if (code === "INTERNAL") logSecurityFailure({ event: "requests.mutation_failed", requestId: randomUUID(), actorType: "SYSTEM", code });
	const message = requestsCopy.errors[code as keyof typeof requestsCopy.errors] ?? requestsCopy.errors.INTERNAL;
	return { ok: false, error: { code, message } };
}
