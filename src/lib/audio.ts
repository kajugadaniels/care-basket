export const AUDIO_LIMIT = 2 * 1024 * 1024;
export const AUDIO_MIMES = ["audio/webm", "audio/ogg", "audio/mp4", "audio/m4a", "audio/aac", "audio/mpeg", "audio/wav"] as const;
export type AudioMime = typeof AUDIO_MIMES[number];
export function audioMime(value: string): AudioMime | null {
	const mime = value.split(";")[0].trim().toLowerCase();
	return AUDIO_MIMES.includes(mime as AudioMime) ? mime as AudioMime : null;
}

// Check container signatures as well as MIME. No decoding, uploads or persistence.
export function validAudio(bytes: Uint8Array, mime: AudioMime) {
	if (bytes.length < 12 || bytes.length > AUDIO_LIMIT) return false;
	const ascii = (start: number, end: number) => String.fromCharCode(...bytes.slice(start, end));
	if (mime === "audio/webm") return bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
	if (mime === "audio/ogg") return ascii(0, 4) === "OggS";
	if (mime === "audio/mp4" || mime === "audio/m4a") return ascii(4, 8) === "ftyp";
	if (mime === "audio/wav") return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WAVE";
	if (mime === "audio/mpeg") return ascii(0, 3) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0);
	return bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0;
}
