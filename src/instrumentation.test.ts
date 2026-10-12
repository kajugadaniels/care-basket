// @vitest-environment node
import type { Instrumentation } from "next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const log = vi.hoisted(() => vi.fn());
vi.mock("@/server/logger", () => ({ logSecurityFailure: log }));
import { onRequestError } from "./instrumentation";

describe("safe unhandled request logging", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(crypto, "randomUUID").mockReturnValue("0199a100-0000-7000-8000-000000000001");
	});
	afterEach(() => vi.restoreAllMocks());
	it.each(["render", "route", "action", "proxy"] as const)("logs only an opaque identifier and category for %s", (routeType) => {
		const context: Parameters<Instrumentation.onRequestError>[2] = {
			routerKind: "App Router", routeType, routePath: "/private/secret-value",
			renderSource: "react-server-components", revalidateReason: undefined,
		};
		onRequestError(new Error("secret-value"), { path: "/?review=secret-value", method: "POST",
			headers: { cookie: "secret-value", authorization: "secret-value" } }, context);
		expect(log).toHaveBeenCalledExactlyOnceWith({ event: `server.${routeType}_failed`,
			requestId: expect.stringMatching(/^[0-9a-f-]{36}$/), actorType: "SYSTEM", code: "INTERNAL" });
		expect(JSON.stringify(log.mock.calls)).not.toContain("secret-value");
	});
	it("does not read properties or stringify an arbitrary thrown value", () => {
		const error = { get message() { throw new Error("must not inspect"); } };
		expect(() => onRequestError(error, { path: "/", method: "GET", headers: {} }, {
			routerKind: "App Router", routeType: "render", routePath: "/", renderSource: "server-rendering",
			revalidateReason: undefined,
		})).not.toThrow();
	});
});
