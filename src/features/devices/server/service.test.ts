// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { deviceIds, deviceTestNow, makeDeviceActor, makeDeviceAdult, makePairingReview } from "@/test/factories/devices";
const mocks = vi.hoisted(() => ({ insert: vi.fn(), lookup: vi.fn(), decide: vi.fn(), complete: vi.fn(),
  session: vi.fn(), limit: vi.fn(), code: vi.fn(), secret: vi.fn(), ticket: vi.fn(), list: vi.fn(), more: vi.fn(), revoke: vi.fn(), shop: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/device-crypto", () => ({ generatePairingCode: mocks.code, generateDeviceSecret: mocks.secret,
  hashPairingCode: (value: string) => `hmac:${value}`, hashSecret: (value: string) => `sha:${value}`,
  createReviewTicket: mocks.ticket,
  hashesMatch: (a: string, b: string) => a === b }));
vi.mock("@/server/auth/pairing-session", () => ({ requirePairingSession: mocks.session }));
vi.mock("@/server/auth/require-device", () => ({ assertDevicePermission: (actor: { type: string }) => {
  if (actor.type !== "device") throw new Error("FORBIDDEN");
} }));
vi.mock("@/server/rate-limit/limiter", () => ({ enforceRateLimit: mocks.limit }));
vi.mock("./repository", () => ({ insertPairing: mocks.insert, lookupPending: mocks.lookup,
  listDeviceRecords: mocks.list, hasMoreDevices: mocks.more, revokeDevice: mocks.revoke, readShopProfile: mocks.shop }));
vi.mock("./pairing-repository", () => ({ decidePairing: mocks.decide, completePairingRecord: mocks.complete }));
import { startPairing, reviewPairing, approvePairing, completePairing, getPairingStatus, listDevices, disconnectDevice } from "./service";
describe("device service", () => {
  beforeEach(() => {
    vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(deviceTestNow);
    mocks.code.mockReturnValue("472918"); mocks.secret.mockReturnValue("test-only-secret");
    mocks.ticket.mockReturnValue("a".repeat(64));
    mocks.lookup.mockResolvedValue({ pairing: null, limited: false });
    mocks.session.mockResolvedValue({ id: deviceIds.pairing, secretHash: "secret-hash", status: "APPROVED",
      expiresAt: new Date(deviceTestNow.getTime() + 600_000) });
  });
  afterEach(() => vi.useRealTimers());
  it("stores only hashes, category summary, and a ten-minute expiration", async () => {
    const result = await startPairing("private raw UA", null);
    expect(result.code).toBe("472918");
    expect(mocks.insert).toHaveBeenCalledWith({ codeHash: "hmac:472918", secretHash: "sha:test-only-secret",
      userAgentSummary: "Browser on unknown device", expiresAt: new Date(deviceTestNow.getTime() + 600_000) }, deviceTestNow, undefined);
  });
  it("retries a database-enforced code collision with a newly generated code", async () => {
    mocks.insert.mockRejectedValueOnce(Object.assign(new Error(), { code: "P2002" }));
    mocks.code.mockReturnValueOnce("000042").mockReturnValueOnce("472918");
    expect((await startPairing(null, null)).code).toBe("472918"); expect(mocks.insert).toHaveBeenCalledTimes(2);
  });
  it("bounds collision retries", async () => {
    mocks.insert.mockRejectedValue(Object.assign(new Error(), { code: "P2002" }));
    await expect(startPairing(null, null)).rejects.toMatchObject({ code: "CONFLICT" }); expect(mocks.insert).toHaveBeenCalledTimes(8);
  });
  it.each(["OWNER", "MANAGER"] as const)("permits %s review but never approves automatically", async (role) => {
    const review = makePairingReview();
    mocks.lookup.mockResolvedValue({ limited: false, pairing: { id: review.pairingId, createdAt: deviceTestNow,
      expiresAt: new Date(review.expiresAt), userAgentSummary: review.userAgentSummary } });
    expect(await reviewPairing(makeDeviceAdult(role), { code: "472 918" })).not.toHaveProperty("code");
    expect(mocks.decide).not.toHaveBeenCalled();
  });
  it("denies a device actor adult review and revocation", async () => {
    const deviceAsAdult = makeDeviceActor() as unknown as ReturnType<typeof makeDeviceAdult>;
    await expect(reviewPairing(deviceAsAdult, { code: "472918" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(disconnectDevice(deviceAsAdult, { deviceId: deviceIds.device, confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.lookup).not.toHaveBeenCalled(); expect(mocks.revoke).not.toHaveBeenCalled();
  });
  it("maps invalid, expired, or used codes to the same safe not-found error", async () => {
    await expect(reviewPairing(makeDeviceAdult(), { code: "472918" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
  it("returns cooldown when failure budgets are exhausted", async () => {
    mocks.lookup.mockResolvedValue({ limited: true, pairing: null });
    await expect(reviewPairing(makeDeviceAdult(), { code: "472918" })).rejects.toMatchObject({ code: "RATE_LIMITED" });
  });
  it("requires explicit approval confirmation before repository mutation", async () => {
    const review = makePairingReview();
    await expect(approvePairing(makeDeviceAdult(), { pairingId: review.pairingId, expiresAt: review.expiresAt,
      reviewTicket: review.reviewTicket, profileId: deviceIds.profile, label: "Tablet", confirmed: false })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(mocks.decide).not.toHaveBeenCalled();
  });
  it.each(["OWNER", "MANAGER"] as const)("permits explicit %s approval with an actor-bound review ticket", async (role) => {
    const review = makePairingReview();
    const input = { pairingId: review.pairingId, expiresAt: review.expiresAt, reviewTicket: review.reviewTicket,
      profileId: deviceIds.profile, label: "Tablet", confirmed: true };
    await approvePairing(makeDeviceAdult(role), input);
    expect(mocks.ticket).toHaveBeenCalledWith(deviceIds.user, deviceIds.family, deviceIds.pairing, review.expiresAt);
    expect(mocks.decide).toHaveBeenCalledWith(makeDeviceAdult(role), input, "APPROVED", deviceTestNow);
  });
  it("rejects a review ticket from another actor before touching an unassigned pairing", async () => {
    const review = makePairingReview(); mocks.ticket.mockReturnValue("b".repeat(64));
    await expect(approvePairing(makeDeviceAdult(), { pairingId: review.pairingId, expiresAt: review.expiresAt,
      reviewTicket: review.reviewTicket, profileId: deviceIds.profile, label: "Tablet", confirmed: true })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.decide).not.toHaveBeenCalled();
  });
  it.each(["PENDING", "EXPIRED", "REJECTED", "COMPLETED"])("cannot complete a %s pairing", async (status) => {
    mocks.session.mockResolvedValue({ status, expiresAt: new Date(deviceTestNow.getTime() + 600_000) });
    await expect(completePairing()).rejects.toMatchObject({ code: "CONFLICT" }); expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("cannot complete an expired approved pairing", async () => {
    mocks.session.mockResolvedValue({ status: "APPROVED", expiresAt: deviceTestNow });
    await expect(completePairing()).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("hashes the session token and sets absolute lifetime to 180 days", async () => {
    const result = await completePairing();
    const expiry = new Date(deviceTestNow.getTime() + 180 * 24 * 60 * 60_000);
    expect(result.expiresAt).toEqual(expiry);
    expect(mocks.complete).toHaveBeenCalledWith(deviceIds.pairing, "secret-hash", "sha:test-only-secret", expiry, deviceTestNow);
  });
  it("validates the pairing cookie before polling and exposes status only", async () => {
    expect(await getPairingStatus()).toEqual({ status: "APPROVED" });
    expect(mocks.limit).toHaveBeenCalledWith(`pairing-poll:${deviceIds.pairing}`, 30, 60_000);
    mocks.session.mockRejectedValue(new Error("missing cookie")); mocks.limit.mockClear();
    await expect(getPairingStatus()).rejects.toThrow("missing cookie"); expect(mocks.limit).not.toHaveBeenCalled();
  });
  it("derives expiry without writing pairing or device state", async () => {
    mocks.session.mockResolvedValue({ id: deviceIds.pairing, status: "PENDING", expiresAt: deviceTestNow });
    expect(await getPairingStatus()).toEqual({ status: "EXPIRED" });
    expect(mocks.decide).not.toHaveBeenCalled(); expect(mocks.complete).not.toHaveBeenCalled();
  });
  it("scopes the list and hides token hashes and ownership metadata", async () => {
    mocks.list.mockResolvedValue([{ id: deviceIds.device, label: "Tablet", userAgentSummary: "Safari on iPad",
      createdAt: deviceTestNow, lastSeenAt: deviceTestNow, expiresAt: new Date(deviceTestNow.getTime() + 1000),
      revokedAt: null, profile: { displayName: "Rose" } }]);
    const result = await listDevices(makeDeviceAdult());
    expect(mocks.list).toHaveBeenCalledWith(deviceIds.family, undefined);
    expect(result.devices[0]).toMatchObject({ profileName: "Rose", status: "ACTIVE" });
    expect(result.devices[0]).not.toHaveProperty("tokenHash");
  });
});
