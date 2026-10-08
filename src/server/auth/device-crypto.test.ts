// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ randomInt: vi.fn(), randomBytes: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("node:crypto", async (original) => ({ ...await original<typeof import("node:crypto")>(), ...mocks }));
vi.mock("@/lib/env/server", () => ({ getDeviceEnv: () => ({ DEVICE_AUTH_SECRET: Buffer.alloc(32, 7).toString("base64url") }) }));
import { generateDeviceSecret, generatePairingCode, hashesMatch, hashPairingCode, hashSecret, createReviewTicket } from "./device-crypto";
describe("device cryptography", () => {
  beforeEach(() => { mocks.randomInt.mockReturnValue(42); mocks.randomBytes.mockReturnValue(Buffer.alloc(32, 3)); });
  it("uses secure randomInt and preserves leading zeros", () => {
    expect(generatePairingCode()).toBe("000042"); expect(mocks.randomInt).toHaveBeenCalledWith(0, 1_000_000);
  });
  it("generates 32-byte base64url opaque secrets", () => {
    expect(generateDeviceSecret()).toMatch(/^[A-Za-z0-9_-]{43}$/); expect(mocks.randomBytes).toHaveBeenCalledWith(32);
  });
  it("hashes codes with HMAC and secrets with SHA-256", () => {
    expect(hashPairingCode("000042")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashPairingCode("000042")).not.toBe(hashSecret("000042"));
    expect(hashSecret(generateDeviceSecret())).not.toContain(generateDeviceSecret());
  });
  it("binds review tickets to the adult and family", () => {
    const ticket = createReviewTicket("adult-a", "family-a", "pairing", "expiry");
    expect(hashesMatch(ticket, createReviewTicket("adult-b", "family-a", "pairing", "expiry"))).toBe(false);
    expect(hashesMatch(ticket, createReviewTicket("adult-a", "family-b", "pairing", "expiry"))).toBe(false);
    expect(hashesMatch(ticket, ticket)).toBe(true); expect(hashesMatch("bad", ticket)).toBe(false);
  });
});
