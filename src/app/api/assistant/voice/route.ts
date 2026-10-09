import { randomUUID } from "node:crypto";
import { unstable_rethrow } from "next/navigation";
import { requireDevice } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { RateLimitError } from "@/server/rate-limit/limiter";
import { logSecurityFailure } from "@/server/logger";
import { getAppOrigin } from "@/lib/env/server";
import { assistantCopy } from "@/features/assistant/copy";
import { enforceAssistantLimits, interpretShopping, requireVoicePermission } from "@/features/assistant/server/service";
import { AudioUploadError, readVoiceUpload } from "@/features/assistant/server/voice-upload";

export const maxDuration = 30;
export async function POST(request: Request) {
	const headers: Record<string, string> = { "Cache-Control": "no-store" };
	try {
		const actor = await requireDevice();
		await requireVoicePermission(actor);
		if (request.headers.get("origin") !== getAppOrigin()) throw new AppError("FORBIDDEN");
		await enforceAssistantLimits(actor);
		const audio = await readVoiceUpload(request);
		return Response.json({ data: await interpretShopping(actor, audio, true) }, { headers });
	} catch (error) {
		unstable_rethrow(error);
		const code = error instanceof AppError ? error.code : "INTERNAL";
		const requestId = randomUUID();
		if (code === "INTERNAL") logSecurityFailure({ event: "assistant.voice_failed", code, actorType: "SYSTEM", requestId });
		const status = error instanceof AudioUploadError ? error.status : code === "UNAUTHENTICATED" ? 401
			: code === "FORBIDDEN" ? 403 : code === "RATE_LIMITED" ? 429 : code === "AI_UNAVAILABLE" ? 503 : 500;
		if (error instanceof RateLimitError) headers["Retry-After"] = String(error.retryAfter);
		return Response.json({ error: { code, message: assistantCopy.voiceError, requestId } }, { status, headers });
	}
}
