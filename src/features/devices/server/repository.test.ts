// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { deviceIds, deviceTestNow, makeDeviceAdult } from "@/test/factories/devices";

type State = { counters: Record<string, number>; audits: Record<string, unknown>[];
  device: { id: string; familyId: string; revokedAt: Date | null } | null; pending: boolean; auditFails: boolean };
const fake = vi.hoisted(() => {
  const state: State = { counters: {}, audits: [], device: null, pending: false, auditFails: false };
  const calls: { method: string; input: unknown }[] = [];
  let queue = Promise.resolve();
  function tx(s: State) {
    return {
      rateLimitCounter: { findUnique: async ({ where }: { where: { key_windowStart: { key: string; windowStart: Date } } }) => {
        const key = `${where.key_windowStart.key}:${where.key_windowStart.windowStart.toISOString()}`;
        return s.counters[key] ? { count: s.counters[key] } : null;
      } },
      $queryRaw: async (_sql: TemplateStringsArray, key: string, start: Date, _end: Date, cap: number) => {
        const bucket = `${key}:${start.toISOString()}`; s.counters[bucket] = Math.min((s.counters[bucket] ?? 0) + 1, cap);
        return [{ count: s.counters[bucket] }];
      },
      devicePairing: { findFirst: async (input: unknown) => {
        calls.push({ method: "pairing.findFirst", input }); return s.pending ? { id: "pending" } : null;
      } },
      authorizedDevice: {
        findFirst: async (input: { where: { id: string; familyId: string } }) => {
          calls.push({ method: "device.findFirst", input });
          return s.device?.id === input.where.id && s.device.familyId === input.where.familyId ? s.device : null;
        },
        updateMany: async (input: { where: { id: string; familyId: string }; data: { revokedAt: Date } }) => {
          calls.push({ method: "device.updateMany", input });
          if (!s.device || s.device.revokedAt || s.device.familyId !== input.where.familyId) return { count: 0 };
          s.device.revokedAt = input.data.revokedAt; return { count: 1 };
        },
      },
      auditLog: { create: async ({ data }: { data: Record<string, unknown> }) => {
        if (s.auditFails) throw new Error("audit unavailable"); s.audits.push(data); return { id: "audit" };
      } },
    };
  }
  const db = { $transaction: (run: (transaction: unknown) => Promise<unknown>) => {
    const result = queue.then(async () => { const staged = structuredClone(state); const result = await run(tx(staged)); Object.assign(state, staged); return result; });
    queue = result.then(() => undefined, () => undefined); return result;
  } };
  return { state, calls, db };
});
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => fake.db }));
import { lookupPending, revokeDevice } from "./repository";
describe("adult failure limits and scoped revocation", () => {
  beforeEach(() => {
    Object.assign(fake.state, { counters: {}, audits: [], pending: false, auditFails: false,
      device: { id: deviceIds.device, familyId: deviceIds.family, revokedAt: null } }); fake.calls.splice(0);
  });
  it("atomically stops concurrent invalid guesses at five failures per 15-minute window", async () => {
    const results = await Promise.all(Array.from({ length: 10 }, () => lookupPending(makeDeviceAdult(), "code-hash", deviceTestNow)));
    expect(results.filter((r) => r.limited)).toHaveLength(6);
    expect(fake.calls.filter((c) => c.method === "pairing.findFirst")).toHaveLength(5);
    expect(fake.state.audits.map((a) => a.action)).toEqual(["pairing.lookup_limited"]);
    expect(fake.calls[0].input).toMatchObject({ where: { activeCodeHash: "code-hash", familyId: null, status: "PENDING", expiresAt: { gt: deviceTestNow } } });
  });
  it("enforces the daily budget across separate short windows", async () => {
    for (let window = 0; window < 4; window++) {
      const now = new Date(deviceTestNow.getTime() + window * 15 * 60_000);
      for (let attempt = 0; attempt < 5; attempt++) await lookupPending(makeDeviceAdult(), "bad", now);
    }
    expect(await lookupPending(makeDeviceAdult(), "bad", new Date(deviceTestNow.getTime() + 60 * 60_000))).toMatchObject({ limited: true });
  });
  it("does not increment failure budgets on a valid code lookup", async () => {
    fake.state.pending = true; expect((await lookupPending(makeDeviceAdult(), "valid", deviceTestNow)).pairing).not.toBeNull();
    expect(fake.state.counters).toEqual({}); expect(fake.state.audits).toEqual([]);
  });
  it("revokes once and handles a repeated revocation without duplicate audit", async () => {
    await revokeDevice(makeDeviceAdult(), deviceIds.device, deviceTestNow);
    await revokeDevice(makeDeviceAdult(), deviceIds.device, deviceTestNow);
    expect(fake.state.device?.revokedAt).toEqual(deviceTestNow); expect(fake.state.audits).toHaveLength(1);
  });
  it("returns NOT_FOUND for another family's device and changes nothing", async () => {
    await expect(revokeDevice({ familyId: deviceIds.otherFamily, userId: deviceIds.user }, deviceIds.device, deviceTestNow)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(fake.state.device?.revokedAt).toBeNull(); expect(fake.state.audits).toEqual([]);
  });
  it("rolls back revocation if the security audit cannot be written", async () => {
    fake.state.auditFails = true; await expect(revokeDevice(makeDeviceAdult(), deviceIds.device, deviceTestNow)).rejects.toThrow("audit unavailable");
    expect(fake.state.device?.revokedAt).toBeNull(); expect(fake.state.audits).toEqual([]);
  });
});
