import { vi } from "vitest";
import type { PaymentAttempt } from "@/features/checkout/server/persistence";
import { requestIds, requestNow } from "./requests";

type Line = { id: string; quantity: number; unitPriceMinor: number; product: {
	sku: string; displayName: string; sizeLabel: string; isActive: boolean; archivedAt: Date | null;
	demoPrices: { currency: string; priceMinor: number; approvedAt: Date }[];
} };
type Event = { id: string; paypalEventId?: string; paymentId?: string | null; source: string;
	eventType: string; processedAt: Date | null; summary: string };
type State = { revision: number; status: string; lockedAt: Date | null; subtotalMinor: number;
	items: Line[]; payments: PaymentAttempt[]; events: Event[]; audits: string[] };
type Where = { id?: string; requestId?: string; familyId?: string; basketId?: string; revision?: number;
	status?: string | { in?: string[]; not?: string }; operationToken?: string; operationExpiresAt?: null | { gt?: Date; lte?: Date };
	lockedAt?: null | { not: null }; OR?: Where[]; paypalOrderId?: string | null;
	paypalCaptureId?: string | null; captureStartedAt?: null;
	basket?: { lockedAt?: null | { not: null }; familyId?: string; requestId?: string };
	request?: { status: string; basket?: { lockedAt: { not: null } } } };
type RequestData = { revision?: { increment: number }; status?: string };
type BasketData = { lockedAt?: Date | null; subtotalMinor?: number };
type PaymentData = Partial<PaymentAttempt>;

export function checkoutDatabase() {
	let committed: State = { revision: 0, status: "PENDING_REVIEW", lockedAt: null, subtotalMinor: 500,
		items: [{ id: requestIds.item, quantity: 2, unitPriceMinor: 250, product: { sku: "demo-milk",
			displayName: "Milk", sizeLabel: "1 litre", isActive: true, archivedAt: null,
				demoPrices: [{ currency: "USD", priceMinor: 250, approvedAt: requestNow }] } }], payments: [], events: [], audits: [] };
	let staged: State | undefined;
	let tail: Promise<unknown> = Promise.resolve();
	const state = () => staged ?? committed;
	function owned(where: Where) { return where.familyId === requestIds.family && (!where.requestId || where.requestId === requestIds.request); }
	function requestMatches(where: Where) {
		return owned(where) && (!where.id || where.id === requestIds.request)
			&& (where.revision === undefined || where.revision === state().revision)
			&& (!where.status || (typeof where.status === "string" ? where.status === state().status : where.status.in?.includes(state().status)))
			&& (where.basket?.lockedAt !== null || state().lockedAt === null);
	}
	function basketMatches(where: Where) {
		return owned(where) && (!where.id || where.id === requestIds.basket)
			&& (where.lockedAt !== null || state().lockedAt === null)
			&& (typeof where.lockedAt !== "object" || !where.lockedAt || state().lockedAt !== null);
	}
	function paymentMatches(payment: PaymentAttempt, where: Where): boolean {
		return (!where.familyId || where.familyId === payment.familyId) && (!where.id || where.id === payment.id)
			&& (!where.requestId || where.requestId === payment.requestId)
			&& (!where.status || (typeof where.status === "string" ? where.status === payment.status
				: where.status.in ? where.status.in.includes(payment.status) : where.status.not !== payment.status))
			&& (where.operationToken === undefined || where.operationToken === payment.operationToken)
			&& (where.paypalOrderId === undefined || where.paypalOrderId === payment.paypalOrderId)
			&& (where.paypalCaptureId === undefined || where.paypalCaptureId === payment.paypalCaptureId)
			&& (where.captureStartedAt === undefined || payment.captureStartedAt === null)
			&& (!where.request || where.request.status === state().status && (!where.request.basket || state().lockedAt !== null))
			&& (where.operationExpiresAt === undefined || where.operationExpiresAt === null && payment.operationExpiresAt === null
				|| typeof where.operationExpiresAt === "object" && where.operationExpiresAt !== null && payment.operationExpiresAt !== null
				&& (!where.operationExpiresAt.gt || payment.operationExpiresAt > where.operationExpiresAt.gt)
				&& (!where.operationExpiresAt.lte || payment.operationExpiresAt <= where.operationExpiresAt.lte))
			&& (!where.OR || where.OR.some((part) => paymentMatches(payment, part)));
	}
	const db = {
		shoppingRequest: {
			findFirst: vi.fn().mockImplementation(({ where }: { where: Where }) => requestMatches(where)
				? { id: requestIds.request, revision: state().revision, status: state().status, basket: { id: requestIds.basket,
					currency: "USD", subtotalMinor: state().subtotalMinor, lockedAt: state().lockedAt, items: state().items,
					payments: state().payments.filter((payment) => ["CREATED", "APPROVED", "PENDING"].includes(payment.status)) } } : null),
			updateMany: vi.fn().mockImplementation(({ where, data }: { where: Where; data: RequestData }) => {
				if (!requestMatches(where)) return { count: 0 };
				if (data.revision) state().revision += data.revision.increment;
				if (data.status) state().status = data.status;
				return { count: 1 };
			}),
			update: vi.fn().mockImplementation(({ where, data }: { where: Where; data: RequestData }) => {
				if (!requestMatches(where)) throw new Error("Request condition failed");
				if (data.revision) state().revision += data.revision.increment;
				if (data.status) state().status = data.status;
				return { id: requestIds.request };
			}),
		},
		shoppingBasket: {
			findFirst: vi.fn().mockImplementation(({ where }: { where: Where }) => owned(where)
				? { id: requestIds.basket, items: state().items } : null),
			updateMany: vi.fn().mockImplementation(({ where, data }: { where: Where; data: BasketData }) => {
				if (!basketMatches(where)) return { count: 0 };
				if ("lockedAt" in data) state().lockedAt = data.lockedAt ?? null;
				if (data.subtotalMinor !== undefined) state().subtotalMinor = data.subtotalMinor;
				return { count: 1 };
			}),
			update: vi.fn().mockImplementation(({ where, data }: { where: Where; data: BasketData }) => {
				if (!basketMatches(where)) throw new Error("Basket condition failed");
				if (data.subtotalMinor !== undefined) state().subtotalMinor = data.subtotalMinor;
				return { id: requestIds.basket };
			}),
		},
		basketItem: {
			update: vi.fn().mockImplementation(({ where, data }: { where: Where; data: { unitPriceMinor: number } }) => {
				const item = state().items.find((line) => line.id === where.id);
				if (!item || where.basket?.familyId !== requestIds.family) throw new Error("Unscoped item update");
				item.unitPriceMinor = data.unitPriceMinor;
				return { id: item.id };
			}),
			updateMany: vi.fn().mockImplementation(() => { throw new Error("Unexpected edit after lock"); }),
			deleteMany: vi.fn().mockImplementation(() => { throw new Error("Unexpected removal after lock"); }),
		},
		payment: {
			findUnique: vi.fn().mockImplementation(({ where }: { where: Where }) => {
				const payment = state().payments.find((row) => paymentMatches(row, where));
				return payment ? structuredClone(payment) : null;
			}),
			findFirst: vi.fn().mockImplementation(({ where }: { where: Where }) => {
				if (!where.familyId) throw new Error("Unscoped payment read");
				const payment = state().payments.find((row) => paymentMatches(row, where));
				return payment ? structuredClone(payment) : null;
			}),
			create: vi.fn().mockImplementation(({ data }: { data: Pick<PaymentAttempt, "familyId" | "requestId" | "basketId" | "amountMinor" | "currency" | "orderItems" | "paypalClientId"> }) => {
				if (state().payments.some((payment) => ["CREATED", "APPROVED", "PENDING"].includes(payment.status))) {
					throw Object.assign(new Error("Open attempt exists"), { code: "P2002" });
				}
				const payment: PaymentAttempt = { ...data, id: `0199a100-0000-7000-8000-${String(100 + state().payments.length).padStart(12, "0")}`,
					status: "CREATED", paypalOrderId: null, paypalCaptureId: null, capturedAt: null, captureStartedAt: null,
					creationStartedAt: null, operationToken: null, operationExpiresAt: null };
				state().payments.push(payment);
				return structuredClone(payment);
			}),
			updateMany: vi.fn().mockImplementation(({ where, data }: { where: Where; data: PaymentData }) => {
				if (!where.familyId) throw new Error("Unscoped payment write");
				const payment = state().payments.find((row) => paymentMatches(row, where));
				if (!payment) return { count: 0 };
				Object.assign(payment, data);
				return { count: 1 };
			}),
		},
		paymentEvent: {
			findUnique: vi.fn().mockImplementation(({ where }: { where: { paypalEventId: string } }) =>
				state().events.find((event) => event.paypalEventId === where.paypalEventId) ?? null),
			upsert: vi.fn().mockImplementation(({ where, create }: { where: { paypalEventId: string }; create: Omit<Event, "id" | "processedAt"> }) => {
				const found = state().events.find((event) => event.paypalEventId === where.paypalEventId);
				if (found) return structuredClone(found);
				const event = { ...create, id: requestIds.other, processedAt: null };
				state().events.push(event); return structuredClone(event);
			}),
			create: vi.fn().mockImplementation(({ data }: { data: Omit<Event, "id"> }) => {
				state().events.push({ ...data, id: requestIds.other }); return { id: requestIds.other };
			}),
			updateMany: vi.fn().mockImplementation(({ where, data }: { where: { paypalEventId: string; processedAt: null }; data: Partial<Event> }) => {
				const event = state().events.find((row) => row.paypalEventId === where.paypalEventId && row.processedAt === null);
				if (!event) return { count: 0 };
				Object.assign(event, data); return { count: 1 };
			}),
		},
		auditLog: { create: vi.fn().mockImplementation(({ data }: { data: { action: string } }) => {
			state().audits.push(data.action); return { id: requestIds.other };
		}) },
	};
	const transaction = vi.fn().mockImplementation((work: (tx: typeof db) => Promise<unknown>) => {
		// Staged writes are committed ONLY after the callback succeeds; thrown audits
		// roll back prices, revisions, locks, attempts and statuses as a real transaction would.
		const result = tail.then(async () => {
			staged = structuredClone(committed);
			try { const value = await work(db); committed = staged; return value; }
			finally { staged = undefined; }
		});
		tail = result.then(() => undefined, () => undefined);
		return result;
	});
	return { db: { ...db, $transaction: transaction }, state: () => committed, inTransaction: () => staged !== undefined };
}
