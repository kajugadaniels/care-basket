"use server";

import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { logSecurityFailure } from "@/server/logger";
import type { ActionResult } from "@/types/action-result";
import { requesterPageSchema } from "./schemas";
import { listRequesterProducts } from "./server/service";
import type { CatalogProductDto } from "./types";
import { catalogCopy } from "./copy";

export async function loadRequesterProductsAction(input: unknown): Promise<ActionResult<{ items: CatalogProductDto[]; nextCursor: string | null }>> {
	try {
		const actor = await requireDevice();
		const filters = requesterPageSchema.parse(input);
		const page = await listRequesterProducts(actor, { ...filters, limit: 12 });
		return { ok: true, data: { items: page.products, nextCursor: page.nextCursor } };
	} catch (error) {
		unstable_rethrow(error);
		const code = error instanceof z.ZodError ? "VALIDATION_FAILED" : error instanceof AppError ? error.code : "INTERNAL";
		if (code === "INTERNAL") logSecurityFailure({ event: "catalog.page_failed", requestId: randomUUID(), actorType: "SYSTEM", code });
		return { ok: false, error: { code, message: catalogCopy.feed.error } };
	}
}
