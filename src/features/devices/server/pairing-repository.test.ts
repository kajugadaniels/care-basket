// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceIds, deviceTestNow, makeDeviceAdult } from "@/test/factories/devices";

type Pairing = { id: string; familyId: string | null; profileId: string | null; status: string;
  secretHash: string; expiresAt: Date; approvedByUserId: string | null; label: string | null;
  userAgentSummary: string; activeCodeHash: string | null };
type Where = { id?: string; familyId?: string | null; profileId?: string; secretHash?: string; status?: string;
  expiresAt?: { gt: Date; equals?: Date } };
type State = { pairings: Pairing[]; devices: { id: string; familyId: string; profileId: string; tokenHash: string }[];
  audits: Record<string, unknown>[]; capacity: number; profileExists: boolean; managerExists: boolean; auditFails: boolean };
const fake = vi.hoisted(() => {
  const state: State = { pairings: [], devices: [], audits: [], capacity: 0, profileExists: true, managerExists: true, auditFails: false };
  const calls: { method: string; input: unknown }[] = [];
  let queue = Promise.resolve();
  const matches = (row: Pairing, w: Where) => (!w.id || row.id === w.id)
    && (w.familyId === undefined || row.familyId === w.familyId) && (!w.profileId || row.profileId === w.profileId)
    && (!w.secretHash || row.secretHash === w.secretHash) && (!w.status || row.status === w.status)
    && (!w.expiresAt || row.expiresAt > w.expiresAt.gt && (!w.expiresAt.equals || row.expiresAt.getTime() === w.expiresAt.equals.getTime()));
  function transaction(staged: State) {
    return {
      managedProfile: { findFirst: async (input: { where: { familyId: string } }) => {
        calls.push({ method: "profile.findFirst", input });
        return staged.profileExists && input.where.familyId === "019a1234-0000-7000-8000-000000000002" ? { id: "profile" } : null;
      } },
      familyMembership: { findFirst: async () => staged.managerExists ? { id: "membership" } : null },
      devicePairing: {
        findFirst: async (input: { where: Where }) => { calls.push({ method: "pairing.findFirst", input }); return staged.pairings.find((p) => matches(p, input.where)) ?? null; },
        updateMany: async (input: { where: Where; data: Partial<Pairing> }) => {
          calls.push({ method: "pairing.updateMany", input });
          const rows = staged.pairings.filter((p) => matches(p, input.where));
          rows.forEach((p) => Object.assign(p, input.data)); return { count: rows.length };
        },
        count: async (input: { where: Where }) => staged.pairings.filter((p) => matches(p, input.where)).length,
      },
      authorizedDevice: {
        count: async (input: unknown) => { calls.push({ method: "device.count", input }); return staged.capacity + staged.devices.length; },
        create: async (input: { data: State["devices"][number] }) => {
          const row = { ...input.data, id: `device-${staged.devices.length}` }; staged.devices.push(row); return row;
        },
      },
      auditLog: { create: async (input: { data: Record<string, unknown> }) => {
        if (staged.auditFails) throw new Error("audit unavailable"); staged.audits.push(input.data); return { id: "audit" };
      } },
    };
  }
  const db = { $transaction: vi.fn((callback: (tx: unknown) => Promise<unknown>, options: unknown) => {
    calls.push({ method: "transaction", input: options });
    const run = queue.then(async () => {
      const staged = structuredClone(state); const result = await callback(transaction(staged));
      Object.assign(state, staged); return result;
    });
    queue = run.then(() => undefined, () => undefined); return run;
  }) };
  return { state, calls, db };
});
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => fake.db }));
import { completePairingRecord, decidePairing } from "./pairing-repository";

function approved(id = deviceIds.pairing): Pairing {
  return { id, familyId: deviceIds.family, profileId: deviceIds.profile, status: "APPROVED",
    secretHash: "secret-hash", expiresAt: new Date(deviceTestNow.getTime() + 600_000),
    approvedByUserId: deviceIds.user, label: "Rose's tablet", userAgentSummary: "Safari on iPad", activeCodeHash: "code-hash" };
}
const expiry = new Date(deviceTestNow.getTime() + 180 * 24 * 60 * 60_000);
const complete = (id = deviceIds.pairing, secret = "secret-hash") => completePairingRecord(id, secret, "token-hash", expiry, deviceTestNow);
describe("transactional pairing repository", () => {
  beforeEach(() => {
    vi.useFakeTimers(); vi.setSystemTime(deviceTestNow);
    Object.assign(fake.state, { pairings: [approved()], devices: [], audits: [], capacity: 0,
      profileExists: true, managerExists: true, auditFails: false }); fake.calls.splice(0);
  });
  afterEach(() => vi.useRealTimers());
  it("binds the session to the approved family/profile and writes two opaque events", async () => {
    await complete();
    expect(fake.state.devices[0]).toMatchObject({ familyId: deviceIds.family, profileId: deviceIds.profile, tokenHash: "token-hash" });
    expect(fake.state.pairings[0]).toMatchObject({ status: "COMPLETED", activeCodeHash: null });
    expect(fake.state.audits.map((a) => a.action)).toEqual(["pairing.completed", "device.connected"]);
    expect(JSON.stringify(fake.state.audits)).not.toContain("Rose");
    expect(fake.calls[0]).toEqual({ method: "transaction", input: { isolationLevel: "Serializable" } });
  });
  it("allows exactly one of two simultaneous completions", async () => {
    const results = await Promise.allSettled([complete(), complete()]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(fake.state.devices).toHaveLength(1); expect(fake.state.audits).toHaveLength(2);
  });
  it("prevents separate pairings from racing above five active devices", async () => {
    fake.state.capacity = 4; const otherId = "019a1234-0000-7000-8000-000000000007";
    fake.state.pairings.push(approved(otherId));
    const results = await Promise.allSettled([complete(), complete(otherId)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1); expect(fake.state.devices).toHaveLength(1);
  });
  it("rolls back device creation and the status transition when auditing fails", async () => {
    fake.state.auditFails = true;
    await expect(complete()).rejects.toThrow("audit unavailable");
    expect(fake.state.devices).toEqual([]); expect(fake.state.audits).toEqual([]); expect(fake.state.pairings[0].status).toBe("APPROVED");
  });
  it.each(["PENDING", "REJECTED", "COMPLETED", "EXPIRED"])("does not complete %s", async (status) => {
    fake.state.pairings[0].status = status; await expect(complete()).rejects.toMatchObject({ code: "CONFLICT" });
    expect(fake.state.devices).toEqual([]);
  });
  it("rejects the wrong original-browser secret", async () => {
    await expect(complete(deviceIds.pairing, "wrong")).rejects.toMatchObject({ code: "CONFLICT" }); expect(fake.state.devices).toEqual([]);
  });
  it("rejects expired approvals, missing profiles, or removed managers", async () => {
    fake.state.pairings[0].expiresAt = deviceTestNow;
    await expect(complete()).rejects.toMatchObject({ code: "CONFLICT" });
    fake.state.pairings[0] = approved(); fake.state.profileExists = false;
    await expect(complete()).rejects.toMatchObject({ code: "NOT_FOUND" });
    fake.state.profileExists = true; fake.state.managerExists = false;
    await expect(complete()).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("checks profile ownership during approval", async () => {
    fake.state.pairings[0] = { ...approved(), status: "PENDING", familyId: null, profileId: null };
    await expect(decidePairing({ familyId: deviceIds.otherFamily, userId: deviceIds.user }, {
      pairingId: deviceIds.pairing, expiresAt: approved().expiresAt.toISOString(), profileId: deviceIds.profile, label: "Tablet",
    }, "APPROVED", deviceTestNow)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fake.state.pairings[0].status).toBe("PENDING");
  });
  it("reserves capacity for uncompleted approvals", async () => {
    fake.state.capacity = 5; fake.state.pairings[0] = { ...approved(), status: "PENDING", familyId: null, profileId: null };
    await expect(decidePairing(makeDeviceAdult(), { pairingId: deviceIds.pairing,
      expiresAt: approved().expiresAt.toISOString(), profileId: deviceIds.profile, label: "Tablet" }, "APPROVED", deviceTestNow)).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("allows only one simultaneous approval when one device slot remains", async () => {
    fake.state.capacity = 4;
    const otherId = "019a1234-0000-7000-8000-000000000007";
    fake.state.pairings = [deviceIds.pairing, otherId].map((id) => ({
      ...approved(id), status: "PENDING", familyId: null, profileId: null,
    }));
    const approve = (pairingId: string) => decidePairing(makeDeviceAdult(), {
      pairingId, expiresAt: approved().expiresAt.toISOString(), profileId: deviceIds.profile, label: "Tablet",
    }, "APPROVED", deviceTestNow);
    const results = await Promise.allSettled([approve(deviceIds.pairing), approve(otherId)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(fake.state.pairings.filter((pairing) => pairing.status === "APPROVED")).toHaveLength(1);
    expect(fake.state.audits).toHaveLength(1);
  });
  it("rejects pending pairing with a single conditional transition and audit", async () => {
    fake.state.pairings[0] = { ...approved(), status: "PENDING", familyId: null, profileId: null };
    await decidePairing(makeDeviceAdult(), { pairingId: deviceIds.pairing, expiresAt: approved().expiresAt.toISOString() }, "REJECTED", deviceTestNow);
    expect(fake.state.pairings[0]).toMatchObject({ status: "REJECTED", activeCodeHash: null, familyId: deviceIds.family });
    expect(fake.state.audits[0].action).toBe("pairing.rejected");
    await expect(decidePairing(makeDeviceAdult(), { pairingId: deviceIds.pairing, expiresAt: approved().expiresAt.toISOString() }, "REJECTED", deviceTestNow)).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
