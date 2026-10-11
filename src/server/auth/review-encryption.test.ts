// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requester, requestIds } from "@/test/factories/requests";

const fake = vi.hoisted(() => ({ nonce: 0 }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ getDeviceEnv: () => ({ DEVICE_AUTH_SECRET: "fictional-test-only-review-encryption-key" }) }));
vi.mock("node:crypto", async (original) => ({
	...await original<typeof import("node:crypto")>(),
	randomBytes: (size: number) => Buffer.alloc(size, ++fake.nonce),
}));

import { encryptReview, decryptReview } from "./review-encryption";

describe("private review encryption", () => {
	beforeEach(() => { fake.nonce = 0; });

	it("encrypts personal contents with a fresh nonce and restores them for the same actor", () => {
		const contents = { inputText: "fictional grocery list", sourceProof: "fictional-provenance" };
		const first = encryptReview(requester, contents);
		const second = encryptReview(requester, contents);
		expect(first).not.toBe(second);
		expect(first).not.toContain(contents.inputText);
		expect(first).not.toContain(contents.sourceProof);
		expect(decryptReview(requester, first)).toEqual(contents);
	});

	it.each(["familyId", "profileId", "deviceId"] as const)("authenticates the %s as associated data", (field) => {
		const payload = encryptReview(requester, { inputText: "milk" });
		expect(() => decryptReview({ ...requester, [field]: requestIds.other }, payload)).toThrow();
	});

	it("rejects changed ciphertext or authentication tags", () => {
		const parts = encryptReview(requester, { inputText: "milk" }).split(".");
		for (const index of [2, 3]) {
			const altered = [...parts];
			const bytes = Buffer.from(altered[index], "base64url");
			bytes[0] ^= 1;
			altered[index] = bytes.toString("base64url");
			expect(() => decryptReview(requester, altered.join("."))).toThrow();
		}
	});

	it.each(["", "v2.a.b.c", "v1.a.b.c.extra", "v1.!.b.c", "x".repeat(90_001)])("rejects malformed or oversized encrypted input", (payload) => {
		expect(() => decryptReview(requester, payload)).toThrow();
	});

	it("bounds plaintext before encryption", () => {
		expect(() => encryptReview(requester, { text: "x".repeat(64 * 1024) })).toThrow();
	});
});
