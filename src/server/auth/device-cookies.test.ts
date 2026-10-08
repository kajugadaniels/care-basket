// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ production: false, get: vi.fn(), set: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: fake.get, set: fake.set }) }));
vi.mock("@/lib/env/server", () => ({ getDeviceEnv: () => ({ NODE_ENV: fake.production ? "production" : "development" }) }));
import { clearPairingCookie, readDeviceCookie, setDeviceCookie } from "./device-cookies";
describe("opaque device cookies", () => {
  beforeEach(() => { vi.resetAllMocks(); fake.production = false; });
  it("uses HttpOnly, Lax, root path and production __Host- Secure cookies without Domain", async () => {
    fake.production = true; const expires = new Date("2027-01-01T00:00:00Z");
    await setDeviceCookie("device", "test-only-cookie", expires);
    expect(fake.set).toHaveBeenCalledWith("__Host-cb_device", "test-only-cookie", { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires });
    await clearPairingCookie(); expect(fake.set).toHaveBeenLastCalledWith("__Host-cb_pairing", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  });
  it("validates the canonical 32-byte cookie format", async () => {
    fake.get.mockReturnValue({ value: "invalid" }); expect(await readDeviceCookie("pairing")).toBeNull();
    const value = Buffer.alloc(32, 3).toString("base64url"); fake.get.mockReturnValue({ value });
    expect(await readDeviceCookie("pairing")).toBe(value);
  });
});
