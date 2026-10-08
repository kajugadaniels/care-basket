// @vitest-environment node
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: () => () => undefined,
}));

import { config } from "./proxy";

// The installed Next.js exposes the proxy matcher helper under its former "middleware" name.
describe("proxy matcher", () => {
  it.each(["/", "/family", "/sign-in", "/sign-up/verify-email-address", "/api/webhooks/paypal"])(
    "runs Clerk for %s so server code can read the session",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    },
  );

  it.each(["/_next/static/chunks/app.js", "/favicon.ico", "/products/milk.jpg"])(
    "skips static file %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, url })).toBe(false);
    },
  );
});
