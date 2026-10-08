// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => ({ $transaction: fake.transaction }) }));
import { serializable } from "./serializable";
describe("bounded serializable retries", () => {
  beforeEach(() => vi.resetAllMocks());
  it("retries serialization failures using a fresh transaction", async () => {
    fake.transaction.mockRejectedValueOnce({ code: "P2034" }).mockResolvedValue("committed");
    expect(await serializable(async () => "result")).toBe("committed"); expect(fake.transaction).toHaveBeenCalledTimes(2);
  });
  it("returns safe conflict after three failures and never retries arbitrary database errors", async () => {
    fake.transaction.mockRejectedValue({ code: "P2034" });
    await expect(serializable(async () => "result")).rejects.toMatchObject({ code: "CONFLICT" }); expect(fake.transaction).toHaveBeenCalledTimes(3);
    fake.transaction.mockReset().mockRejectedValue(new Error("unavailable"));
    await expect(serializable(async () => "result")).rejects.toThrow("unavailable"); expect(fake.transaction).toHaveBeenCalledTimes(1);
  });
});
