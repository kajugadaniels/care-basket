// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Guards the contrast ratios documented in .agents/design.md § 3.2.
const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

const TEXT_MIN = 4.5;
const UI_MIN = 3;

function token(name: string): string {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!match) {
    throw new Error(`Missing hex color token --${name}`);
  }
  return match[1];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5]
    .map((index) => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

const textPairs: Array<[string, string]> = [
  ["color-text", "color-bg"],
  ["color-text", "color-surface-soft"],
  ["color-text", "color-surface-accent"],
  ["color-text-muted", "color-bg"],
  ["color-text-muted", "color-surface-soft"],
  ["color-text-muted", "color-surface-accent"],
  ["color-primary", "color-bg"],
  ["color-primary", "color-surface-soft"],
  ["color-primary", "color-surface-accent"],
  ["color-on-primary", "color-primary"],
  ["color-on-primary", "color-primary-hover"],
  ["color-accent-strong", "color-bg"],
  ["color-accent-strong", "color-surface-accent"],
  ["color-success", "color-bg"],
  ["color-success", "color-success-bg"],
  ["color-warning", "color-bg"],
  ["color-warning", "color-warning-bg"],
  ["color-danger", "color-bg"],
  ["color-danger", "color-danger-bg"],
  ["color-info", "color-bg"],
  ["color-info", "color-info-bg"],
];

const uiPairs: Array<[string, string]> = [
  ["color-border-strong", "color-bg"],
  ["color-border-strong", "color-surface-soft"],
  ["color-border-strong", "color-surface-accent"],
  ["color-focus", "color-bg"],
  ["color-focus", "color-surface-soft"],
  ["color-focus", "color-surface-accent"],
];

describe("design token contrast", () => {
  it.each(textPairs)("--%s on --%s meets 4.5:1 for text", (foreground, background) => {
    expect(contrast(token(foreground), token(background))).toBeGreaterThanOrEqual(TEXT_MIN);
  });

  it.each(uiPairs)("--%s on --%s meets 3:1 for UI components", (foreground, background) => {
    expect(contrast(token(foreground), token(background))).toBeGreaterThanOrEqual(UI_MIN);
  });
});
