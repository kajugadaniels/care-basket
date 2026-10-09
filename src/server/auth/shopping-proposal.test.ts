// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { requester, requestIds } from "@/test/factories/requests";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ getDeviceEnv: () => ({ DEVICE_AUTH_SECRET: "fictional-test-signing-secret-not-a-real-credential" }) }));
import { signShoppingProposal, verifyShoppingProposal } from "./shopping-proposal";

const proposal = { inputMode: "TEXT" as const, inputText: "milk", items: [{ sku: "demo-milk", origin: "SUGGESTED" as const,
	isSubstitute: false, substitutionNote: null }] };
describe("shopping proposal provenance", () => {
	afterEach(() => vi.useRealTimers());
	it("verifies signatures scoped to the authenticated device, profile and family", () => {
		const proof = signShoppingProposal(requester, proposal);
		expect(verifyShoppingProposal(requester, proof)).toMatchObject(proposal);
		for (const field of ["deviceId", "profileId", "familyId"] as const) {
			expect(() => verifyShoppingProposal({ ...requester, [field]: requestIds.other }, proof)).toThrow("VALIDATION_FAILED");
		}
	});
	it("rejects forged, malformed, oversized and expired claims", () => {
		vi.useFakeTimers();
		const proof = signShoppingProposal(requester, proposal);
		for (const value of ["bad", "a.b.c", "a".repeat(16_001), `${proof}tampered`]) {
			expect(() => verifyShoppingProposal(requester, value)).toThrow("VALIDATION_FAILED");
		}
		vi.advanceTimersByTime(30 * 60_000);
		expect(() => verifyShoppingProposal(requester, proof)).toThrow("VALIDATION_FAILED");
	});
});
