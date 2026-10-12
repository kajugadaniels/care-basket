// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
// Configuration tests must not depend on a developer's inherited cloud account setting.
vi.hoisted(() => vi.stubEnv("CLOUDINARY_CLOUD_NAME", ""));
import config from "../next.config";

describe("baseline response security headers", () => {
	afterEach(() => vi.unstubAllEnvs());
	it("protects every path without blocking SDK resources or first-party microphone access", async () => {
		const rules = await config.headers?.();
		expect(rules).toEqual([{ source: "/:path*", headers: [
			{ key: "X-Content-Type-Options", value: "nosniff" },
			{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
			{ key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
			{ key: "X-Frame-Options", value: "DENY" },
		] }]);
		expect(config.poweredByHeader).toBe(false);
		expect(config.cacheComponents).toBe(true);
		expect(config.images?.maximumRedirects).toBe(0);
	});
});
