import { MAX_ITEM_QUANTITY, MAX_REQUEST_ITEMS } from "./limits";
import type { DraftItem } from "./types";

export type Draft = { items: DraftItem[]; clientRequestKey: string | null };
export type DraftChange = { type: "add"; item: DraftItem } | { type: "quantity"; sku: string; quantity: number }
	| { type: "remove"; sku: string } | { type: "clear" };
export const EMPTY_DRAFT: Draft = { items: [], clientRequestKey: null };

export function createDraftKey(source: Crypto = globalThis.crypto): string {
	if (typeof source.randomUUID === "function") return source.randomUUID();
	// randomUUID requires HTTPS, but getRandomValues also works on local HTTP LAN URLs.
	// Keep UUIDv4 randomness cryptographic when testing a paired phone locally.
	const bytes = source.getRandomValues(new Uint8Array(16));
	bytes[6] = (bytes[6] & 0x0f) | 0x40;
	bytes[8] = (bytes[8] & 0x3f) | 0x80;
	const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Metadata is only for display. Submission sends SKU and quantity, never this metadata.
export function changeDraft(draft: Draft, change: DraftChange, nextKey: string): Draft {
	if (change.type === "clear") return EMPTY_DRAFT;
	let items: DraftItem[];
	if (change.type === "add") {
		const existing = draft.items.find((item) => item.sku === change.item.sku);
		if (existing) throw new Error("DUPLICATE");
		items = [...draft.items, change.item];
	} else if (change.type === "remove") {
		items = draft.items.filter((item) => item.sku !== change.sku);
	} else {
		items = draft.items.map((item) => item.sku === change.sku ? { ...item, quantity: change.quantity } : item);
	}
	if (items.length > MAX_REQUEST_ITEMS || items.some((item) => !Number.isInteger(item.quantity)
		|| item.quantity < 1 || item.quantity > MAX_ITEM_QUANTITY)) throw new Error("LIMIT");
	return items.length ? { items, clientRequestKey: nextKey } : EMPTY_DRAFT;
}
