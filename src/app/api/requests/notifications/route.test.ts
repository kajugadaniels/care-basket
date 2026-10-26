// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds, requestManager } from "@/test/factories/requests";
import { AppError } from "@/server/errors";

const fake = vi.hoisted(() => ({ adult: vi.fn(), notifications: vi.fn(), log: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ unstable_rethrow: () => {} }));
vi.mock("@/server/auth/require-adult-read", () => ({ requireAdultRead: fake.adult }));
vi.mock("@/features/requests/server/service", () => ({ getRequestNotifications: fake.notifications }));
vi.mock("@/server/logger", () => ({ logSecurityFailure: fake.log }));
import * as route from "./route";

describe("GET /api/requests/notifications", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.adult.mockResolvedValue(requestManager);
		fake.notifications.mockResolvedValue({ count: 1, notifications: [
			{ id: requestIds.request, displayName: "Rose", submittedAt: "2026-10-12T12:00:00Z", message: "Rose has sent a shopping list." },
		] });
	});

	it("exposes only GET and authenticates every uncached read", async () => {
		expect(Object.keys(route)).toEqual(["GET"]);
		const response = await route.GET();
		expect(response.status).toBe(200);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(response.headers.get("Set-Cookie")).toBeNull();
		expect(await response.json()).toEqual({ data: await fake.notifications.mock.results[0].value });
		expect(fake.notifications).toHaveBeenCalledWith(requestManager);
		expect(fake.adult.mock.invocationCallOrder[0]).toBeLessThan(fake.notifications.mock.invocationCallOrder[0]);
	});

	it.each([["UNAUTHENTICATED", 401], ["FORBIDDEN", 403]] as const)("returns safe %s JSON without reading names", async (code, status) => {
		fake.adult.mockRejectedValue(new AppError(code, "private authentication details"));
		const response = await route.GET();
		expect(response.status).toBe(status);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(response.headers.get("Location")).toBeNull();
		expect(await response.json()).toEqual({ error: { code, message: expect.any(String), requestId: expect.any(String) } });
		expect(fake.notifications).not.toHaveBeenCalled();
	});

	it("scopes reads to a changed session's family rather than browser-supplied ownership", async () => {
		const actor = { ...requestManager, familyId: requestIds.other };
		fake.adult.mockResolvedValue(actor);
		await route.GET();
		expect(fake.notifications).toHaveBeenCalledWith(actor);
	});

	it("keeps raw database failures and family names out of responses and logs", async () => {
		fake.notifications.mockRejectedValue(new Error("private database and profile details"));
		const response = await route.GET();
		expect(response.status).toBe(500);
		expect(response.headers.get("Cache-Control")).toBe("no-store");
		expect(await response.json()).toEqual({ error: { code: "INTERNAL", message: expect.any(String), requestId: expect.any(String) } });
		expect(fake.log).toHaveBeenCalledWith({ event: "requests.notifications_failed", requestId: expect.any(String), actorType: "SYSTEM", code: "INTERNAL" });
	});
});
