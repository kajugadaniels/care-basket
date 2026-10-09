// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { CatalogSourceError } from "@/lib/catalog-http/client";
import { describeDiscoveryFailure } from "./discovery-error";

describe("discovery failure diagnostics", () => {
	it.each(["options", "configuration", "sources", "report"] as const)("never prints raw error details during %s", (phase) => {
		const error = new Error("private-value https://private.invalid/?token=private-token");
		const message = describeDiscoveryFailure(error, phase);

		expect(message).not.toContain("private-value");
		expect(message).not.toContain("private-token");
		expect(message).not.toContain("private.invalid");
	});

	it("explains configuration format and environment precedence", () => {
		const message = describeDiscoveryFailure(new Error(), "configuration");

		expect(message).toContain("CATALOG_USER_AGENT");
		expect(message).toContain("CareBasket/<version> (<contact email>)");
		expect(message).toContain(".env.local");
		expect(message).toContain("shell variables take precedence");
	});

	it.each([
		["NETWORK", "bounded retries"],
		["INVALID_RESPONSE", "expected schema"],
		["ABORTED", "cancelled"],
	] as const)("describes %s source failures", (reason, expected) => {
		expect(describeDiscoveryFailure(new CatalogSourceError(reason), "sources")).toContain(expected);
	});

	it("preserves safe HTTP status without logging a mutated error message", () => {
		const error = new CatalogSourceError("HTTP", 429);
		error.message = "private-token";
		const message = describeDiscoveryFailure(error, "sources");

		expect(message).toContain("HTTP 429");
		expect(message).toContain("Retry-After");
		expect(message).not.toContain("private-token");
	});

	it("omits invalid HTTP status values", () => {
		expect(describeDiscoveryFailure(new CatalogSourceError("HTTP", Infinity), "sources")).not.toContain("Infinity");
	});

	it("handles non-Error failures safely", () => {
		expect(describeDiscoveryFailure({ token: "private-token" }, "sources")).not.toContain("private-token");
	});
});
