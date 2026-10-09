// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { describeSeedFailure } from "./seed-error";

describe("seed failure diagnostics", () => {
	it.each([
		["P2021", "table is missing"],
		["P2022", "column is missing"],
		["P1000", "authentication failed"],
		["P1001", "could not be reached"],
		["P1002", "timed out"],
		["P1011", "TLS verification failed"],
		["P1003", "does not exist"],
		["P1010", "lacks access"],
		["P2002", "conflicts with an existing"],
		["P2003", "violates a database constraint"],
		["P2024", "connection limit"],
		["P1017", "closed the connection"],
		["P2028", "transaction failed or expired"],
	])("describes %s without raw error details", (code, expected) => {
		const result = describeSeedFailure({ code, message: "private-token", meta: { query: "private-query" } }, "database");
		expect(result).toContain(expected);
		expect(result).not.toContain("private-token");
		expect(result).not.toContain("private-query");
		expect(result).toContain("Earlier products may have been committed");
	});

	it("recognizes SQLSTATE within a Prisma adapter wrapper", () => {
		const error = {
			code: "P2010",
			meta: { driverAdapterError: { cause: { originalCode: "42P01", originalMessage: "private-query" } } },
		};
		const result = describeSeedFailure(error, "database");
		expect(result).toContain("table is missing");
		expect(result).toContain("DIRECT_URL");
		expect(result).not.toContain("private-query");
	});

	it("recognizes adapter TLS failures without exposing certificate details", () => {
		const result = describeSeedFailure({ cause: { kind: "TlsConnectionError", reason: "private-host" } }, "database");
		expect(result).toContain("do not disable TLS checks");
		expect(result).not.toContain("private-host");
	});

	it("recognizes generated client validation failures", () => {
		expect(describeSeedFailure({ name: "PrismaClientValidationError" }, "database")).toContain("Regenerate the client");
	});

	it.each([null, undefined, "private-token", { code: "private-token" }, new Error("private-token")])(
		"handles unknown failures without exposing their contents", (error) => {
			const result = describeSeedFailure(error, "database");
			expect(result).toContain("Unclassified database-stage failure");
			expect(result).not.toContain("private-token");
		},
	);

	it("bounds inspection of cyclic wrappers", () => {
		const error: { cause?: unknown } = {};
		error.cause = error;
		expect(describeSeedFailure(error, "database")).toContain("Unclassified");
	});

	it.each(["input", "images"] as const)("reports no writes for failures during %s", (phase) => {
		const result = describeSeedFailure(new Error("private-token"), phase);
		expect(result).toContain("No database writes were made");
		expect(result).not.toContain("Earlier products");
		expect(result).not.toContain("private-token");
	});
});
