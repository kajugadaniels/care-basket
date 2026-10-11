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
	it("derives bounded page proofs without extending the original expiry", () => {
		vi.useFakeTimers();
		const original = verifyShoppingProposal(requester, signShoppingProposal(requester, {
			...proposal, reviewDigest: "a".repeat(64),
		}));
		vi.advanceTimersByTime(10 * 60_000);
		const page = verifyShoppingProposal(requester, signShoppingProposal(requester, proposal, original.expiresAt));
		expect(page.expiresAt).toBe(original.expiresAt);
		vi.advanceTimersByTime(20 * 60_000);
		expect(() => signShoppingProposal(requester, proposal, original.expiresAt)).toThrow("VALIDATION_FAILED");
	});
	it("rejects expiry extensions and preserves the 42-item proof cap", () => {
		expect(() => signShoppingProposal(requester, proposal, Date.now() + 31 * 60_000)).toThrow("VALIDATION_FAILED");
		expect(() => signShoppingProposal(requester, { ...proposal, items: Array.from({ length: 43 }, () => proposal.items[0]) })).toThrow();
	});
});
