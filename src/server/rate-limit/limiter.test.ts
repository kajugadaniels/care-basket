// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ count: 0, query: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => ({ $queryRaw: fake.query }) }));
import { enforceRateLimit, rateWindow } from "./limiter";
describe("persistent fixed-window limiter", () => {
  beforeEach(() => {
    fake.count = 0;
    fake.query.mockReset().mockImplementation(async (_sql: TemplateStringsArray, _key: string, _start: Date, _end: Date, cap: number) => {
      fake.count = Math.min(fake.count + 1, cap); return [{ count: fake.count }];
    });
  });
  it("permits thirty polls and returns the remaining-window cooldown afterwards", async () => {
    const now = new Date("2026-10-08T12:00:10Z");
    const results = await Promise.allSettled(Array.from({ length: 31 }, () => enforceRateLimit("pairing-poll:test", 30, 60_000, now)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(30);
    const denied = results.find((r) => r.status === "rejected");
    expect(denied && "reason" in denied ? denied.reason : null).toMatchObject({ code: "RATE_LIMITED", retryAfter: 50 });
    expect(fake.query.mock.calls[0][0].join("?")).toContain("ON CONFLICT");
    expect(fake.query.mock.calls[0][0].join("?")).toContain("LEAST");
  });
  it("applies five starts per hour without an in-memory production counter", async () => {
    const now = new Date("2026-10-08T12:30:00Z");
    for (let i = 0; i < 5; i++) await enforceRateLimit("pairing-start:hash", 5, 3_600_000, now);
    await expect(enforceRateLimit("pairing-start:hash", 5, 3_600_000, now)).rejects.toMatchObject({ retryAfter: 1800 });
  });
  it("starts a new fixed window exactly on its boundary", () => {
    expect(rateWindow(new Date("2026-10-08T12:01:00Z"), 60_000)).toEqual({
      start: new Date("2026-10-08T12:01:00Z"), end: new Date("2026-10-08T12:02:00Z"),
    });
  });
});
