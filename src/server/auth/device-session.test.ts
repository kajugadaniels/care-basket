// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deviceIds, deviceTestNow } from "@/test/factories/devices";
const fake = vi.hoisted(() => ({ cookie: vi.fn(), scope: vi.fn(), find: vi.fn(),
  row: { revokedAt: null as Date | null, expiresAt: new Date("2027-01-01T00:00:00Z"),
    lastSeenAt: new Date("2026-10-08T12:00:00Z"), hasProfile: true } }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/device-cookies", () => ({ readDeviceCookie: fake.cookie }));
vi.mock("@/server/auth/device-crypto", () => ({ hashSecret: (s: string) => `sha:${s}` }));
vi.mock("@/server/db/client", () => ({ getDb: () => ({ authorizedDevice: { findUnique: fake.scope, findFirst: fake.find } }) }));
import { resolveDeviceSession } from "./device-session";
describe("database-backed device sessions", () => {
  beforeEach(() => {
    vi.resetAllMocks(); fake.cookie.mockResolvedValue("test-cookie");
    fake.row = { revokedAt: null, expiresAt: new Date("2027-01-01T00:00:00Z"), lastSeenAt: deviceTestNow, hasProfile: true };
    fake.scope.mockResolvedValue({ id: deviceIds.device, familyId: deviceIds.family, profileId: deviceIds.profile });
    fake.find.mockImplementation(async ({ where }: { where: { revokedAt: null; expiresAt: { gt: Date }; lastSeenAt: { gt: Date } } }) => {
      if (!fake.row.revokedAt && fake.row.expiresAt > where.expiresAt.gt && fake.row.lastSeenAt > where.lastSeenAt.gt && fake.row.hasProfile) return { id: deviceIds.device };
      return null;
    });
  });
  it.each(["revoked", "absolute-expiry", "idle-expiry", "deleted-profile"])("rejects %s on the very next protected request", async (reason) => {
    if (reason === "revoked") fake.row.revokedAt = deviceTestNow;
    if (reason === "absolute-expiry") fake.row.expiresAt = deviceTestNow;
    if (reason === "idle-expiry") fake.row.lastSeenAt = new Date(deviceTestNow.getTime() - 30 * 24 * 60 * 60_000);
    if (reason === "deleted-profile") fake.row.hasProfile = false;
    expect(await resolveDeviceSession(deviceTestNow)).toBeNull();
  });
  it("requires the session cookie and a server-side hash match", async () => {
    fake.cookie.mockResolvedValue(null); expect(await resolveDeviceSession(deviceTestNow)).toBeNull(); expect(fake.scope).not.toHaveBeenCalled();
    fake.cookie.mockResolvedValue("wrong-cookie"); fake.scope.mockResolvedValue(null);
    expect(await resolveDeviceSession(deviceTestNow)).toBeNull(); expect(fake.find).not.toHaveBeenCalled();
  });
  it("scopes every validity query to its resolved family/profile and rejects revocation/expiry/idle/missing profile", async () => {
    expect(await resolveDeviceSession(deviceTestNow)).not.toBeNull();
    expect(fake.find).toHaveBeenCalledWith(expect.objectContaining({ where: {
      id: deviceIds.device, familyId: deviceIds.family, profileId: deviceIds.profile, tokenHash: "sha:test-cookie",
      revokedAt: null, expiresAt: { gt: deviceTestNow }, lastSeenAt: { gt: new Date(deviceTestNow.getTime() - 30 * 24 * 60 * 60_000) },
      profile: { is: { id: deviceIds.profile, familyId: deviceIds.family } },
    } }));
    fake.find.mockResolvedValue(null); expect(await resolveDeviceSession(deviceTestNow)).toBeNull();
  });
});
