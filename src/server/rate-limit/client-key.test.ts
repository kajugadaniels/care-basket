// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ env: { NODE_ENV: "development", DEVICE_IP_SOURCE: "unconfigured", VERCEL: undefined as string | undefined } }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/env/server", () => ({ getDeviceEnv: () => fake.env }));
vi.mock("@/server/auth/device-crypto", () => ({ keyedHash: () => "test-keyed-hash" }));
import { pairingStartKey } from "./client-key";
describe("trusted pairing client key", () => {
  beforeEach(() => { fake.env = { NODE_ENV: "development", DEVICE_IP_SOURCE: "unconfigured", VERCEL: undefined }; });
  it("ignores caller-supplied forwarding headers locally and uses one shared limited bucket", () => {
    expect(pairingStartKey(new Headers({ "x-forwarded-for": "203.0.113.1" }))).toBe("pairing-start:test-keyed-hash");
  });
  it("fails closed in production without a verified platform configuration", () => {
    fake.env.NODE_ENV = "production";
    expect(() => pairingStartKey(new Headers({ "x-forwarded-for": "203.0.113.1" }))).toThrow("INTERNAL");
  });
  it("requires Vercel's own trusted, single-IP header and platform marker", () => {
    fake.env = { NODE_ENV: "production", DEVICE_IP_SOURCE: "vercel", VERCEL: "1" };
    expect(pairingStartKey(new Headers({ "x-vercel-forwarded-for": "203.0.113.1" }))).toBe("pairing-start:test-keyed-hash");
    expect(() => pairingStartKey(new Headers({ "x-forwarded-for": "203.0.113.1" }))).toThrow("INTERNAL");
    expect(() => pairingStartKey(new Headers({ "x-vercel-forwarded-for": "203.0.113.1, 203.0.113.2" }))).toThrow("INTERNAL");
    fake.env.VERCEL = undefined; expect(() => pairingStartKey(new Headers())).toThrow("INTERNAL");
  });
});
