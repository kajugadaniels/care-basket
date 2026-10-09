// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { AUDIO_LIMIT } from "@/lib/audio";
import { readVoiceUpload } from "./voice-upload";

function upload(bytes: Uint8Array, type = "audio/webm", extra = false) {
	const form = new FormData(); form.append("audio", new Blob([Uint8Array.from(bytes)], { type }), "clip");
	if (extra) form.append("profileId", "untrusted");
	return new Request("https://example.test/api/assistant/voice", { method: "POST", body: form });
}
const webm = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 0, 0, 0, 0, 0, 0, 0]);
describe("bounded in-memory voice multipart", () => {
	it("accepts the one valid audio part and strips MIME parameters", async () => {
		expect(await readVoiceUpload(upload(webm, "audio/webm;codecs=opus"))).toMatchObject({ kind: "audio", mimeType: "audio/webm", audio: webm });
	});
	it("refuses incorrect transport or part MIME", async () => {
		await expect(readVoiceUpload(new Request("https://example.test", { method: "POST", body: "audio" }))).rejects.toMatchObject({ status: 415 });
		await expect(readVoiceUpload(upload(webm, "image/png"))).rejects.toMatchObject({ status: 415 });
	});
	it("refuses empty, corrupt or MIME-spoofed audio", async () => {
		await expect(readVoiceUpload(upload(new Uint8Array()))).rejects.toMatchObject({ status: 422 });
		await expect(readVoiceUpload(upload(new Uint8Array(12)))).rejects.toMatchObject({ status: 422 });
		await expect(readVoiceUpload(upload(webm, "audio/wav"))).rejects.toMatchObject({ status: 422 });
	});
	it("rejects extraneous form parts", async () => {
		await expect(readVoiceUpload(upload(webm, "audio/webm", true))).rejects.toMatchObject({ status: 422 });
	});
	it("rejects oversize with or without an advertised Content-Length", async () => {
		const request = upload(new Uint8Array(AUDIO_LIMIT + 1));
		await expect(readVoiceUpload(request)).rejects.toMatchObject({ status: 413 });
		const declared = upload(webm); declared.headers.set("content-length", String(AUDIO_LIMIT + 16_385));
		await expect(readVoiceUpload(declared)).rejects.toMatchObject({ status: 413 });
	});
});
