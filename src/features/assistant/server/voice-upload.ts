import "server-only";
import { AUDIO_LIMIT, audioMime, validAudio } from "@/lib/audio";
import { AppError } from "@/server/errors";

export class AudioUploadError extends AppError {
	constructor(readonly status: 413 | 415 | 422) { super("VALIDATION_FAILED"); }
}
export async function readVoiceUpload(request: Request) {
	if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) throw new AudioUploadError(415);
	const limit = AUDIO_LIMIT + 16_384;
	const length = request.headers.get("content-length");
	if (length && (!/^\d+$/.test(length) || Number(length) > limit)) throw new AudioUploadError(413);
	if (!request.body) throw new AudioUploadError(422);
	const reader = request.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	let timeout: ReturnType<typeof setTimeout> | undefined;
	const deadline = new Promise<never>((_, reject) => {
		timeout = setTimeout(() => { reject(new AudioUploadError(422)); void reader.cancel(); }, 3000);
	});
	try {
		while (true) {
			const { done, value } = await Promise.race([reader.read(), deadline]);
			if (done) break;
			size += value.byteLength;
			if (size > limit) { await reader.cancel(); throw new AudioUploadError(413); }
			chunks.push(value);
		}
	} finally { clearTimeout(timeout); reader.releaseLock(); }
	const bytes = new Uint8Array(size);
	let offset = 0;
	for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
	let form: FormData;
	try { form = await new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type")! } }).formData(); }
	catch { throw new AudioUploadError(422); }
	if ([...form.keys()].some((key) => key !== "audio") || form.getAll("audio").length !== 1) throw new AudioUploadError(422);
	const file = form.get("audio");
	if (!file || typeof file === "string") throw new AudioUploadError(422);
	const mimeType = audioMime(file.type);
	if (!mimeType) throw new AudioUploadError(415);
	if (file.size > AUDIO_LIMIT) throw new AudioUploadError(413);
	const audio = new Uint8Array(await file.arrayBuffer());
	if (!validAudio(audio, mimeType)) throw new AudioUploadError(422);
	return { kind: "audio" as const, audio, mimeType };
}
