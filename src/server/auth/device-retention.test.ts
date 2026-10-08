// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deviceIds, deviceTestNow } from "@/test/factories/devices";
const fake = vi.hoisted(() => ({ devices: vi.fn(), pairings: vi.fn(), counters: vi.fn(), audits: vi.fn(),
  deleteDevice: vi.fn(), deletePairings: vi.fn(), deleteCounters: vi.fn(), deleteAudits: vi.fn(), event: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/serializable", () => ({ serializable: (run: (tx: unknown) => unknown) => run({
  authorizedDevice: { findMany: fake.devices, deleteMany: fake.deleteDevice },
  devicePairing: { findMany: fake.pairings, deleteMany: fake.deletePairings },
  rateLimitCounter: { findMany: fake.counters, deleteMany: fake.deleteCounters },
  auditLog: { findMany: fake.audits, deleteMany: fake.deleteAudits, create: fake.event },
}) }));
import { purgeDeviceData } from "./device-retention";
describe("developer-only retention maintenance", () => {
  beforeEach(() => {
    vi.resetAllMocks(); fake.devices.mockResolvedValue([]); fake.pairings.mockResolvedValue([]);
    fake.counters.mockResolvedValue([]); fake.audits.mockResolvedValue([]);
  });
  it("uses bounded batches with 24-hour pairing, 30-day device, and 180-day audit retention", async () => {
    expect(await purgeDeviceData(deviceIds.family, deviceTestNow)).toEqual({ devices: 0, pairings: 0, counters: 0, audits: 0 });
    expect(fake.pairings).toHaveBeenCalledWith(expect.objectContaining({ take: 50, where: { OR: [{ familyId: deviceIds.family }, { familyId: null }], AND: [{ OR: [
      { completedAt: { lte: new Date(deviceTestNow.getTime() - 24 * 60 * 60_000) } },
      { completedAt: null, expiresAt: { lte: new Date(deviceTestNow.getTime() - 24 * 60 * 60_000) } },
    ] }] } }));
    expect(fake.audits).toHaveBeenCalledWith(expect.objectContaining({ take: 50,
      where: { OR: [{ familyId: deviceIds.family }, { familyId: null }], createdAt: { lte: new Date(deviceTestNow.getTime() - 180 * 24 * 60 * 60_000) } } }));
    expect(fake.deleteCounters).not.toHaveBeenCalled();
  });
  it("audits policy-expired devices before deleting their hashes, with explicit family scope", async () => {
    fake.devices.mockResolvedValue([{ id: deviceIds.device, familyId: deviceIds.family, revokedAt: null }]);
    await purgeDeviceData(deviceIds.family, deviceTestNow);
    expect(fake.event).toHaveBeenCalledWith({ data: { familyId: deviceIds.family, actorType: "SYSTEM", actorId: deviceIds.device,
      action: "device.expired", targetType: "AuthorizedDevice", targetId: deviceIds.device }, select: { id: true } });
    expect(fake.deleteDevice).toHaveBeenCalledWith({ where: { id: deviceIds.device, familyId: deviceIds.family } });
    expect(fake.event.mock.invocationCallOrder[0]).toBeLessThan(fake.deleteDevice.mock.invocationCallOrder[0]);
  });
});
