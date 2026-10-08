import { describe, expect, it } from "vitest";
import { formatDate } from "./format";

describe("formatDate", () => {
  it("formats profile creation dates consistently in UTC", () => {
    expect(formatDate("2026-10-08T23:59:59Z")).toBe("October 8, 2026");
  });
});
