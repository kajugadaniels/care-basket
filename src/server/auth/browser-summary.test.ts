// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { summarizeBrowser } from "./browser-summary";
describe("browser summaries", () => {
  it("stores categories rather than identifying text or versions", () => {
    expect(summarizeBrowser("Mozilla iPad Safari/600 private-name")).toBe("Safari on iPad");
    expect(summarizeBrowser("Windows Chrome/123 Edg/123")).toBe("Edge on Windows");
  });
  it("fails safely for missing, oversized, or arbitrary headers", () => {
    expect(summarizeBrowser(null)).toBe("Unknown browser");
    expect(summarizeBrowser("x".repeat(1025))).toBe("Unknown browser");
    expect(summarizeBrowser("personal-name\n")).toBe("Browser on unknown device");
  });
});
