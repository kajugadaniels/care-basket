// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkoutDatabase } from "@/test/factories/checkout";
import { paymentAttempt } from "@/test/factories/payments";
import { requestIds, requestNow } from "@/test/factories/requests";
const fake = vi.hoisted(() => ({ db: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: fake.db }));
import { commitVerifiedPayment } from "./confirmation-repository";
import { receiveWebhook } from "./payment-events";

const event = { source: "WEBHOOK" as const, paypalEventId: "WH-FICTIONAL1", eventType: "PAYMENT.CAPTURE.COMPLETED" };
const completed = { status: "CAPTURED" as const, captureId: "CAPTURE1", capturedAt: requestNow };
let database: ReturnType<typeof checkoutDatabase>;

describe("atomic, monotonic payment confirmation", () => {
	beforeEach(() => {
		vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(requestNow);
		database = checkoutDatabase(); fake.db.mockReturnValue(database.db);
		database.state().status = "AWAITING_PAYMENT"; database.state().lockedAt = requestNow;
		database.state().payments.push(paymentAttempt());
	});
	afterEach(() => vi.useRealTimers());
	it("handles concurrent identical deliveries once and returns the committed winner", async () => {
		await receiveWebhook(event);
		await Promise.all([1, 2].map(() => commitVerifiedPayment(paymentAttempt(), completed, event, { type: "system" })));
		expect(database.state().status).toBe("PAID");
		expect(database.state().audits).toEqual(["payment.captured"]);
		expect(database.state().events).toHaveLength(1);
		expect(database.state().events[0].processedAt).toEqual(requestNow);
	});
	it("resumes an inserted but unfinished event after a database rollback", async () => {
		await receiveWebhook(event);
		database.db.auditLog.create.mockRejectedValueOnce(new Error("private persistence diagnostics"));
		await expect(commitVerifiedPayment(paymentAttempt(), completed, event, { type: "system" })).rejects.toThrow();
		expect(database.state().events[0].processedAt).toBeNull();
		expect(database.state().payments[0].status).toBe("CREATED");
		expect(database.state().status).toBe("AWAITING_PAYMENT");
		await commitVerifiedPayment(paymentAttempt(), completed, event, { type: "system" });
		expect(database.state().status).toBe("PAID");
	});
	it("recovers the unique-event winner if an adapter races during upsert", async () => {
		await receiveWebhook(event);
		database.db.paymentEvent.upsert.mockRejectedValueOnce(Object.assign(new Error("unique event"), { code: "P2002" }));
		expect(await receiveWebhook(event)).toMatchObject({ processedAt: null });
		expect(database.state().events).toHaveLength(1);
	});
	it.each(["APPROVED", "PENDING", "DENIED"] as const)("does not regress captured to %s on stale delivery", async (status) => {
		database.state().status = "PAID";
		database.state().payments[0] = paymentAttempt({ status: "CAPTURED", paypalCaptureId: "CAPTURE1", capturedAt: requestNow });
		await receiveWebhook(event);
		await commitVerifiedPayment(database.state().payments[0], { ...completed, status }, event, { type: "system" });
		expect(database.state().payments[0].status).toBe("CAPTURED");
		expect(database.state().lockedAt).toEqual(requestNow);
		expect(database.state().audits).toHaveLength(0);
	});
	it.each(["REFUNDED", "REVERSED"] as const)("retains historical capture and never hides %s behind a late completion", async (status) => {
		database.state().status = "PAID";
		database.state().payments[0] = paymentAttempt({ status: "CAPTURED", paypalCaptureId: "CAPTURE1", capturedAt: requestNow });
		await receiveWebhook(event);
		await commitVerifiedPayment(database.state().payments[0], { ...completed, status }, event, { type: "system" });
		await commitVerifiedPayment(database.state().payments[0], completed, { source: "SYSTEM", eventType: "LATE_RESPONSE" }, { type: "system" });
		expect(database.state().payments[0]).toMatchObject({ status, capturedAt: requestNow, paypalCaptureId: "CAPTURE1" });
		expect(database.state().status).toBe("PAID");
		expect(database.state().audits).toEqual([`payment.${status.toLowerCase()}`]);
	});
	it("unlocks only a verified denied capture in the same transaction", async () => {
		await receiveWebhook(event);
		await commitVerifiedPayment(paymentAttempt(), { ...completed, status: "DENIED", capturedAt: null }, event, { type: "system" });
		expect(database.state()).toMatchObject({ status: "PENDING_REVIEW", lockedAt: null, revision: 1 });
		expect(database.state().payments[0].status).toBe("DENIED");
	});
	it("fences a stale worker without overwriting the new worker's lease", async () => {
		database.state().payments[0].operationToken = requestIds.other;
		database.state().payments[0].operationExpiresAt = new Date(requestNow.getTime() + 90_000);
		await expect(commitVerifiedPayment(paymentAttempt(), completed, { source: "CAPTURE_RESPONSE", eventType: "CAPTURE_RESULT" },
			{ type: "system" }, requestIds.key)).rejects.toMatchObject({ code: "CONFLICT" });
		expect(database.state().payments[0].operationToken).toBe(requestIds.other);
		expect(database.state().status).toBe("AWAITING_PAYMENT");
	});
	it("rejects a different capture ID without processing the event", async () => {
		database.state().payments[0].paypalCaptureId = "OTHER";
		await receiveWebhook(event);
		await expect(commitVerifiedPayment(paymentAttempt(), completed, event, { type: "system" })).rejects.toMatchObject({ code: "CONFLICT" });
		expect(database.state().events[0].processedAt).toBeNull();
	});
});
