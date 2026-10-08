// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ status: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.mock("@/features/devices/server/service", () => ({ getPairingStatus: fake.status }));
vi.mock("@/server/db/client", () => ({ getDb: vi.fn() }));
import { GET } from "./route";
import { AppError } from "@/server/errors";
import { RateLimitError } from "@/server/rate-limit/limiter";
describe("GET pairing status", () => {
  beforeEach(() => vi.resetAllMocks());
  it("returns only status with no-store and no Set-Cookie", async () => {
    fake.status.mockResolvedValue({ status: "APPROVED" }); const response = await GET();
    expect(await response.json()).toEqual({ data: { status: "APPROVED" } });
    expect(response.headers.get("Cache-Control")).toBe("no-store"); expect(response.headers.has("Set-Cookie")).toBe(false);
  });
  it("exposes no pairing data to a missing or wrong cookie", async () => {
    fake.status.mockRejectedValue(new AppError("UNAUTHENTICATED")); const response = await GET();
    expect(response.status).toBe(401); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).not.toHaveProperty("data");
  });
  it("returns HTTP 429 and Retry-After with no cookie mutation", async () => {
    fake.status.mockRejectedValue(new RateLimitError(42)); const response = await GET();
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("42");
    expect(response.headers.get("Cache-Control")).toBe("no-store"); expect(response.headers.has("Set-Cookie")).toBe(false);
  });
});
