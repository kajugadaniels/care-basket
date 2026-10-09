// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requester } from "@/test/factories/requests";
const fake = vi.hoisted(() => ({ device: vi.fn(), permission: vi.fn(), limit: vi.fn(), read: vi.fn(), interpret: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: fake.device }));
vi.mock("@/lib/env/server", () => ({ getAppOrigin: () => "https://example.test" }));
vi.mock("@/features/assistant/server/service", () => ({ requireVoicePermission: fake.permission, enforceAssistantLimits: fake.limit, interpretShopping: fake.interpret }));
vi.mock("@/features/assistant/server/voice-upload", async (original) => ({ ...await original<typeof import("@/features/assistant/server/voice-upload")>(), readVoiceUpload: fake.read }));
import { AppError } from "@/server/errors";
import { RateLimitError } from "@/server/rate-limit/limiter";
import { AudioUploadError } from "@/features/assistant/server/voice-upload";
import { POST } from "./route";
const request = (origin = "https://example.test") => new Request("https://example.test/api/assistant/voice", { method: "POST", headers: { origin } });
describe("voice endpoint boundaries", () => {
	beforeEach(() => { vi.resetAllMocks(); fake.device.mockResolvedValue(requester); fake.read.mockResolvedValue({ kind: "audio" }); fake.interpret.mockResolvedValue({ items: [] }); });
	it.each([["UNAUTHENTICATED", 401], ["FORBIDDEN", 403], ["AI_UNAVAILABLE", 503]] as const)(
		"returns %s before reading uploads", async (code, status) => {
			if (code === "UNAUTHENTICATED") fake.device.mockRejectedValue(new AppError(code)); else fake.permission.mockRejectedValue(new AppError(code));
			const response = await POST(request()); expect(response.status).toBe(status);
			expect(fake.read).not.toHaveBeenCalled(); expect(fake.interpret).not.toHaveBeenCalled();
			expect(response.headers.get("cache-control")).toBe("no-store");
		});
	it("rejects a mismatched origin before consuming quota or audio", async () => {
		expect((await POST(request("https://hostile.test"))).status).toBe(403);
		expect(fake.limit).not.toHaveBeenCalled(); expect(fake.read).not.toHaveBeenCalled();
	});
	it("refuses an absent Origin before reading audio", async () => {
		expect((await POST(new Request("https://example.test/api/assistant/voice", { method: "POST" }))).status).toBe(403);
		expect(fake.read).not.toHaveBeenCalled();
	});
	it("rate limits before reading audio and returns Retry-After", async () => {
		fake.limit.mockRejectedValue(new RateLimitError(60));
		const response = await POST(request()); expect(response.status).toBe(429);
		expect(response.headers.get("retry-after")).toBe("60"); expect(fake.read).not.toHaveBeenCalled();
	});
	it.each([413, 415, 422] as const)("returns audio validation status %s without provider calls", async (status) => {
		fake.read.mockRejectedValue(new AudioUploadError(status));
		expect((await POST(request())).status).toBe(status); expect(fake.interpret).not.toHaveBeenCalled();
	});
	it("returns no-store proposals and does not apply the same quota twice", async () => {
		const response = await POST(request()); expect(response.status).toBe(200);
		expect(fake.interpret).toHaveBeenCalledWith(requester, { kind: "audio" }, true);
		expect(response.headers.get("cache-control")).toBe("no-store");
	});
});
