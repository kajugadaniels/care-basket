import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { AppError } from "@/server/errors";
import { logSecurityFailure } from "@/server/logger";
import type { ActionResult } from "@/types/action-result";
import { assistantCopy } from "../copy";

export function assistantFailure(error: unknown): Extract<ActionResult<never>, { ok: false }> {
	unstable_rethrow(error);
	const code = error instanceof z.ZodError ? "VALIDATION_FAILED" : error instanceof AppError ? error.code : "INTERNAL";
	if (code === "INTERNAL") logSecurityFailure({ event: "assistant.failed", requestId: randomUUID(), actorType: "SYSTEM", code });
	return { ok: false, error: { code, message: assistantCopy.error } };
}
