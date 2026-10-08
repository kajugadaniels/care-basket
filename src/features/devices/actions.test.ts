// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deviceTestNow, makeDeviceAdult, deviceIds, makePairingReview } from "@/test/factories/devices";
const fake = vi.hoisted(() => ({ adult: vi.fn(), limit: vi.fn(), start: vi.fn(), complete: vi.fn(), review: vi.fn(),
  approve: vi.fn(), reject: vi.fn(), revoke: vi.fn(), set: vi.fn(), clear: vi.fn(), redirect: vi.fn(), revalidate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: fake.revalidate }));
vi.mock("next/navigation", () => ({ redirect: fake.redirect, unstable_rethrow: (error: unknown) => {
  if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
} }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: fake.adult }));
vi.mock("@/server/rate-limit/limiter", () => ({ enforceRateLimit: fake.limit }));
vi.mock("@/server/rate-limit/client-key", () => ({ pairingStartKey: () => "hashed-ip-key" }));
vi.mock("@/server/auth/device-cookies", () => ({ readDeviceCookie: async () => null, setDeviceCookie: fake.set, clearPairingCookie: fake.clear }));
vi.mock("./server/service", () => ({ startPairing: fake.start, completePairing: fake.complete,
  reviewPairing: fake.review, approvePairing: fake.approve, rejectPairing: fake.reject, disconnectDevice: fake.revoke }));
import { startPairingAction, completePairingAction, reviewPairingAction, approvePairingAction, rejectPairingAction, revokeDeviceAction } from "./actions";
import { AppError } from "@/server/errors";
describe("device Server Actions", () => {
  beforeEach(() => {
    vi.resetAllMocks(); fake.adult.mockResolvedValue(makeDeviceAdult());
    fake.complete.mockResolvedValue({ secret: "internal-test-token", expiresAt: deviceTestNow });
    fake.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
  });
  it("rate-limits starts before generation and never serializes the pairing secret", async () => {
    fake.start.mockResolvedValue({ code: "000042", secret: "internal-test-secret", expiresAt: deviceTestNow });
    expect(await startPairingAction({})).toEqual({ ok: true, data: { code: "000042", expiresAt: deviceTestNow.toISOString() } });
    expect(fake.limit).toHaveBeenCalledWith("hashed-ip-key", 5, 3_600_000);
    expect(fake.set).toHaveBeenCalledWith("pairing", "internal-test-secret", deviceTestNow);
    expect(fake.limit.mock.invocationCallOrder[0]).toBeLessThan(fake.start.mock.invocationCallOrder[0]);
  });
  it("does not generate a code when the persistent start limiter rejects", async () => {
    fake.limit.mockRejectedValue(new AppError("RATE_LIMITED"));
    expect(await startPairingAction({})).toMatchObject({ ok: false, error: { code: "RATE_LIMITED" } }); expect(fake.start).not.toHaveBeenCalled();
  });
  it("sets the session cookie only after database completion and redirects to a fixed path", async () => {
    await expect(completePairingAction({})).rejects.toThrow("NEXT_REDIRECT");
    expect(fake.complete.mock.invocationCallOrder[0]).toBeLessThan(fake.set.mock.invocationCallOrder[0]);
    expect(fake.set).toHaveBeenCalledWith("device", "internal-test-token", deviceTestNow); expect(fake.clear).toHaveBeenCalled();
    expect(fake.redirect).toHaveBeenCalledWith("/shop");
  });
  it("sets no session cookie if the transaction fails", async () => {
    fake.complete.mockRejectedValue(new AppError("CONFLICT"));
    expect(await completePairingAction({})).toMatchObject({ ok: false, error: { code: "CONFLICT" } });
    expect(fake.set).not.toHaveBeenCalled(); expect(fake.clear).not.toHaveBeenCalled(); expect(fake.redirect).not.toHaveBeenCalled();
  });
  it("requires Clerk adult authentication for every manager action", async () => {
    fake.adult.mockRejectedValue(new Error("NEXT_REDIRECT"));
    for (const action of [reviewPairingAction, approvePairingAction, rejectPairingAction, revokeDeviceAction]) {
      await expect(action({})).rejects.toThrow("NEXT_REDIRECT");
    }
    expect(fake.review).not.toHaveBeenCalled(); expect(fake.approve).not.toHaveBeenCalled(); expect(fake.reject).not.toHaveBeenCalled(); expect(fake.revoke).not.toHaveBeenCalled();
  });
  it("requires deliberate confirmation and revalidates after revocation", async () => {
    expect(await revokeDeviceAction({ deviceId: deviceIds.device, confirmed: false })).toMatchObject({ ok: false, error: { code: "VALIDATION_FAILED" } });
    expect(fake.revoke).not.toHaveBeenCalled();
    expect(await revokeDeviceAction({ deviceId: deviceIds.device, confirmed: true })).toEqual({ ok: true, data: { done: true } });
    expect(fake.revalidate).toHaveBeenCalledWith("/family/devices"); expect(fake.revalidate).toHaveBeenCalledWith("/shop");
  });
  it("validates review input without mutating or approving the request", async () => {
    fake.review.mockResolvedValue(makePairingReview()); await reviewPairingAction({ code: "000042" });
    expect(fake.adult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] }); expect(fake.approve).not.toHaveBeenCalled();
  });
});
