import { describe, expect, it } from "vitest";
import { formatCountdown, formatDate, formatTime } from "./format";

describe("formatDate", () => {
  it("formats profile creation dates consistently in UTC", () => {
    expect(formatDate("2026-10-08T23:59:59Z")).toBe("October 8, 2026");
  });
});

describe("device time formatting", () => {
  it("uses UTC for stable manager review times", () => { expect(formatTime("2026-10-08T12:10:00Z")).toBe("12:10 PM"); });
  it("formats a bounded countdown without negative time", () => {
    expect(formatCountdown(600_000)).toBe("10:00"); expect(formatCountdown(61_000)).toBe("01:01"); expect(formatCountdown(-1)).toBe("00:00");
  });
});
