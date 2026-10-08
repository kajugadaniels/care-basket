// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createFamilySchema, hasUnsafeCharacters } from "./schemas";

function parse(input: Record<string, unknown>) {
  return createFamilySchema.safeParse(input);
}

function fieldError(input: Record<string, unknown>, field: "familyName" | "displayName") {
  const result = parse(input);
  if (result.success) {
    return undefined;
  }
  return result.error.issues.find((issue) => issue.path[0] === field)?.message;
}

const valid = { familyName: "Jane's Family", displayName: "Jane" };

describe("createFamilySchema", () => {
  it("accepts and trims valid names", () => {
    const result = parse({ familyName: "  Jane's Family  ", displayName: "  Jane " });

    expect(result.success && result.data).toEqual(valid);
  });

  it("rejects an empty or blank family name with one friendly message", () => {
    const result = parse({ ...valid, familyName: "   " });

    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Enter a name for your family.",
    ]);
  });

  it("reports a single message for a blank display name", () => {
    const result = parse({ ...valid, displayName: "  " });

    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      "Enter the name your family calls you.",
    ]);
  });

  it("enforces the family name length limits", () => {
    expect(fieldError({ ...valid, familyName: "J" }, "familyName")).toBe(
      "Use at least 2 characters.",
    );
    expect(parse({ ...valid, familyName: "F".repeat(60) }).success).toBe(true);
    expect(fieldError({ ...valid, familyName: "F".repeat(61) }, "familyName")).toBe(
      "Use 60 characters or fewer.",
    );
  });

  it("rejects an empty display name and enforces its length limit", () => {
    expect(fieldError({ ...valid, displayName: "" }, "displayName")).toBe(
      "Enter the name your family calls you.",
    );
    expect(parse({ ...valid, displayName: "J" }).success).toBe(true);
    expect(parse({ ...valid, displayName: "D".repeat(40) }).success).toBe(true);
    expect(fieldError({ ...valid, displayName: "D".repeat(41) }, "displayName")).toBe(
      "Use 40 characters or fewer.",
    );
  });

  it.each([
    ["a null character", "Jane\u0000"],
    ["a line break", "Jane's\nFamily"],
    ["a tab", "Jane's\tFamily"],
    ["a right-to-left override", "Jane‮s Family"],
    ["a zero-width space", "Jane​s Family"],
  ])("rejects names containing %s", (_label, familyName) => {
    expect(fieldError({ ...valid, familyName }, "familyName")).toBe(
      "Remove hidden or special characters.",
    );
  });

  it("accepts international names, apostrophes, hyphens, and emoji", () => {
    expect(parse({ familyName: "Famille Lefèvre-Ngoma", displayName: "Zoë" }).success).toBe(true);
    expect(parse({ familyName: "李家", displayName: "李" }).success).toBe(true);
    expect(parse({ familyName: "The O'Briens 👨‍👩‍👧", displayName: "Mum" }).success).toBe(true);
  });

  it("rejects ownership fields instead of trusting them", () => {
    expect(parse({ ...valid, role: "OWNER" }).success).toBe(false);
    expect(parse({ ...valid, familyId: "another-family" }).success).toBe(false);
    expect(parse({ ...valid, userId: "another-user" }).success).toBe(false);
  });

  it("rejects malformed input types", () => {
    expect(parse({ familyName: 42, displayName: "Jane" }).success).toBe(false);
    expect(parse({ familyName: "Jane's Family" }).success).toBe(false);
  });
});

describe("hasUnsafeCharacters", () => {
  it("allows ordinary text and joiners used by some scripts and emoji", () => {
    expect(hasUnsafeCharacters("Jane's Family")).toBe(false);
    expect(hasUnsafeCharacters("‍‌")).toBe(false);
  });

  it("flags control and invisible formatting characters", () => {
    expect(hasUnsafeCharacters("\u0085")).toBe(true);
    expect(hasUnsafeCharacters(" ")).toBe(true);
    expect(hasUnsafeCharacters("﻿")).toBe(true);
  });
});
