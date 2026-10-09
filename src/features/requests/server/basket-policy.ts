import "server-only";
import { createHash } from "node:crypto";
import { AppError } from "@/server/errors";
import { MAX_ITEM_QUANTITY, MAX_MONEY_MINOR, MAX_REQUEST_ITEMS } from "../limits";
import type { SubmitRequestInput } from "../schemas";

export function submissionFingerprint(input: SubmitRequestInput): string {
	const items = input.items.map(({ sku, quantity, origin, isSubstitute, substitutionNote }) => ({ sku, quantity,
		origin: origin ?? "REQUESTED", isSubstitute: isSubstitute ?? false, substitutionNote: substitutionNote ?? null }))
		.sort((a, b) => a.sku.localeCompare(b.sku));
	// Preserve Step 7 hashes so an in-flight picture request can still retry after rollout.
	if (input.inputMode === "PICTURES" && !input.inputText && input.budgetMinor === undefined
		&& items.every((item) => item.origin === "REQUESTED" && !item.isSubstitute && !item.substitutionNote)) {
		return createHash("sha256").update(JSON.stringify({ inputMode: input.inputMode,
			items: items.map(({ sku, quantity }) => ({ sku, quantity })) })).digest("hex");
	}
	// Expiring signatures are authorization evidence, not immutable request material.
	return createHash("sha256").update(JSON.stringify({ inputMode: input.inputMode, inputText: input.inputText ?? null,
		budgetMinor: input.budgetMinor ?? null, items })).digest("hex");
}

export function basketSubtotal(items: readonly { quantity: number; unitPriceMinor: number }[]): number {
	if (items.length < 1 || items.length > MAX_REQUEST_ITEMS) throw new AppError("CONFLICT");
	let subtotal = 0;
	for (const item of items) {
		if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY
			|| !Number.isInteger(item.unitPriceMinor) || item.unitPriceMinor < 0) throw new AppError("CONFLICT");
		subtotal += item.quantity * item.unitPriceMinor;
		if (!Number.isSafeInteger(subtotal) || subtotal > MAX_MONEY_MINOR) throw new AppError("CONFLICT");
	}
	return subtotal;
}

export function databaseConflict(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "P2034";
}
