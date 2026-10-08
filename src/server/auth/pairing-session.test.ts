// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ cookie: vi.fn(), find: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("./device-cookies", () => ({ readDeviceCookie: fake.cookie }));
vi.mock("./device-crypto", () => ({ hashSecret: (s: string) => `sha:${s}` }));
vi.mock("@/server/db/client", () => ({ getDb: () => ({ devicePairing: { findUnique: fake.find } }) }));
import { requirePairingSession } from "./pairing-session";
describe("original-browser pairing authentication", () => {
  beforeEach(() => vi.resetAllMocks());
  it("rejects a missing cookie before querying", async () => {
    fake.cookie.mockResolvedValue(null); await expect(requirePairingSession()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(fake.find).not.toHaveBeenCalled();
  });
  it("rejects the wrong secret and queries only its hash", async () => {
    fake.cookie.mockResolvedValue("test-wrong-secret"); fake.find.mockResolvedValue(null);
    await expect(requirePairingSession()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(fake.find).toHaveBeenCalledWith({ where: { secretHash: "sha:test-wrong-secret" },
      select: { id: true, secretHash: true, status: true, expiresAt: true } });
  });
});
