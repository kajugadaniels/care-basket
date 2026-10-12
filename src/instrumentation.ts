import type { Instrumentation } from "next";
import { logSecurityFailure } from "@/server/logger";

const errorEvents = {
	render: "server.render_failed",
	route: "server.route_failed",
	action: "server.action_failed",
	proxy: "server.proxy_failed",
} as const;

// Handled service failures already log at their boundary and never reach this hook.
// Do not inspect errors or request metadata: even messages/digests can contain secrets.
export const onRequestError: Instrumentation.onRequestError = (_error, _request, context) => {
	const event = Object.hasOwn(errorEvents, context.routeType)
		? errorEvents[context.routeType] : "server.request_failed";
	logSecurityFailure({ event, requestId: crypto.randomUUID(), actorType: "SYSTEM", code: "INTERNAL" });
};
