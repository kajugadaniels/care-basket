import "server-only";
import { z } from "zod";

// Persist only allow-listed category words, never a raw User-Agent or version/fingerprint.
export function summarizeBrowser(value: unknown): string {
  const parsed = z.string().max(1024).safeParse(value);
  if (!parsed.success) return "Unknown browser";
  const ua = parsed.data;
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Browser";
  const os = /iPad/.test(ua) ? "iPad" : /iPhone/.test(ua) ? "iPhone"
    : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows"
      : /Macintosh/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "unknown device";
  return `${browser} on ${os}`;
}
