import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { requestNotificationsCopy } from "@/features/requests/copy";
import { getRequestNotifications } from "@/features/requests/server/service";
import { requireAdultRead } from "@/server/auth/require-adult-read";
import { AppError } from "@/server/errors";
import { logSecurityFailure } from "@/server/logger";

export async function GET() {
	const headers = { "Cache-Control": "no-store" };
	try {
		const actor = await requireAdultRead();
		return Response.json({ data: await getRequestNotifications(actor) }, { headers });
	} catch (error) {
		unstable_rethrow(error);
		const requestId = randomUUID();
		const code = error instanceof AppError ? error.code : "INTERNAL";
		const status = code === "UNAUTHENTICATED" ? 401 : code === "FORBIDDEN" ? 403 : 500;
		if (status === 500) logSecurityFailure({ event: "requests.notifications_failed", requestId, actorType: "SYSTEM", code });
		const message = status === 401 || status === 403 ? requestNotificationsCopy.sessionExpired : requestNotificationsCopy.error;
		return Response.json({ error: { code, message, requestId } }, { status, headers });
	}
}
