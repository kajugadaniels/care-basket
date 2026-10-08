// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// A fresh module each time, because getServerEnv caches its result.
async function loadGetServerEnv() {
  vi.resetModules();
  const serverEnvModule = await import("./server");
  return serverEnvModule.getServerEnv;
}

function errorMessageOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as Error).message;
  }
  return "";
}

describe("getServerEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the pooled database connection string", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://user:secret@ep-example-pooler.neon.tech/db");
    const getServerEnv = await loadGetServerEnv();

    expect(getServerEnv().DATABASE_URL).toBe(
      "postgresql://user:secret@ep-example-pooler.neon.tech/db",
    );
  });

  it("names a missing variable", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const getServerEnv = await loadGetServerEnv();

    expect(errorMessageOf(getServerEnv)).toContain("DATABASE_URL");
  });

  it("rejects a value that is not a PostgreSQL URL without echoing the value", async () => {
    vi.stubEnv("DATABASE_URL", "https://secret-value.example.com");
    const getServerEnv = await loadGetServerEnv();

    const message = errorMessageOf(getServerEnv);
    expect(message).toContain("DATABASE_URL");
    expect(message).not.toContain("secret-value");
  });
});
