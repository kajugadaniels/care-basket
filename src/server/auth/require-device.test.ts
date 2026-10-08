// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceIds, deviceTestNow } from "@/test/factories/devices";
const fake = vi.hoisted(() => ({ session: vi.fn(), update: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/device-session", () => ({ resolveDeviceSession: fake.session }));
vi.mock("@/server/db/client", () => ({ getDb: () => ({ authorizedDevice: { updateMany: fake.update } }) }));
import { requireDevice, assertDevicePermission } from "./require-device";
describe("restricted device actor", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(deviceTestNow);
    fake.session.mockResolvedValue({ id: deviceIds.device, familyId: deviceIds.family, profileId: deviceIds.profile,
      lastSeenAt: deviceTestNow, profile: { kind: "CHILD" } });
  });
  afterEach(() => vi.useRealTimers());
  it("resolves only device permissions, never an adult role", async () => {
    const actor = await requireDevice(); expect(actor).toMatchObject({ type: "device", profileKind: "CHILD" });
    expect(actor).not.toHaveProperty("role"); expect(actor).not.toHaveProperty("userId");
    expect(() => assertDevicePermission(actor, "view-own-home")).not.toThrow();
    expect(() => assertDevicePermission(actor, "create-own-request")).toThrow("FORBIDDEN");
    expect(fake.update).not.toHaveBeenCalled();
  });
  it("rejects every invalid resolved session without touching activity", async () => {
    fake.session.mockResolvedValue(null); await expect(requireDevice()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(fake.update).not.toHaveBeenCalled();
  });
  it("updates activity only after an hour, with conditional revocation/expiry/idle checks", async () => {
    fake.session.mockResolvedValue({ id: deviceIds.device, familyId: deviceIds.family, profileId: deviceIds.profile,
      lastSeenAt: new Date(deviceTestNow.getTime() - 3_600_000), profile: { kind: "ASSISTED_ADULT" } });
    await requireDevice();
    expect(fake.update).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
      id: deviceIds.device, familyId: deviceIds.family, profileId: deviceIds.profile, revokedAt: null,
      expiresAt: { gt: deviceTestNow },
    }), data: { lastSeenAt: deviceTestNow } }));
  });
});
