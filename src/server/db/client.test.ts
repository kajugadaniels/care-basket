// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  PrismaPg: vi.fn(function PrismaPgMock(this: unknown, options: unknown) {
    return { kind: "adapter", options };
  }),
  PrismaClient: vi.fn(function PrismaClientMock() {
    return { kind: "prisma-client" };
  }),
}));

vi.mock("server-only", () => ({}));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: mocks.PrismaPg }));
vi.mock("@/generated/prisma/client", () => ({ PrismaClient: mocks.PrismaClient }));
vi.mock("@/lib/env/server", () => ({
  getServerEnv: () => ({ DATABASE_URL: "postgresql://ep-example-pooler.neon.tech/db" }),
}));

const globalWithPrisma = globalThis as { careBasketPrisma?: unknown };

describe("getDb", () => {
  beforeEach(() => {
    delete globalWithPrisma.careBasketPrisma;
    mocks.PrismaPg.mockClear();
    mocks.PrismaClient.mockClear();
    vi.resetModules();
  });

  it("does not create a client or connect when the module is imported", async () => {
    await import("./client");

    expect(mocks.PrismaClient).not.toHaveBeenCalled();
    expect(mocks.PrismaPg).not.toHaveBeenCalled();
  });

  it("creates one client on the pooled connection and reuses it", async () => {
    const { getDb } = await import("./client");

    const first = getDb();
    const second = getDb();

    expect(first).toBe(second);
    expect(mocks.PrismaClient).toHaveBeenCalledTimes(1);
    expect(mocks.PrismaPg).toHaveBeenCalledWith({
      connectionString: "postgresql://ep-example-pooler.neon.tech/db",
    });
  });

  it("keeps the same client across module reloads, as in development hot reload", async () => {
    const firstLoad = await import("./client");
    const client = firstLoad.getDb();

    vi.resetModules();
    const secondLoad = await import("./client");

    expect(secondLoad.getDb()).toBe(client);
    expect(mocks.PrismaClient).toHaveBeenCalledTimes(1);
  });
});
