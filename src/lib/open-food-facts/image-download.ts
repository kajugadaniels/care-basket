import "server-only";
import { setTimeout as delay } from "node:timers/promises";
import { z } from "zod";
import { retryAfterMilliseconds } from "@/lib/catalog-http/client";

export const MAX_PRODUCT_IMAGE_BYTES = 2 * 1024 * 1024;

export class ProductImageError extends Error {
	constructor(public readonly reason: "URL" | "NETWORK" | "HTTP" | "CONTENT" | "COOLDOWN") {
		super(`Product photo unavailable (${reason}).`);
		this.name = "ProductImageError";
	}
}

function imageExtension(value: string) {
	const parsed = z.string().max(300).safeParse(value);
	if (!parsed.success) throw new ProductImageError("URL");
	let url: URL;
	try {
		url = new URL(parsed.data);
	} catch {
		throw new ProductImageError("URL");
	}
	if (url.protocol !== "https:" || url.hostname !== "images.openfoodfacts.org" ||
		url.port || url.username || url.password || url.search || url.hash) {
		throw new ProductImageError("URL");
	}
	const match = /^\/images\/products\/[\d/]+\/[a-z0-9_.-]+\.400\.(jpg|png|webp)$/i.exec(url.pathname);
	if (!match) throw new ProductImageError("URL");
	return match[1].toLowerCase();
}

async function readImage(response: Response, extension: string): Promise<Buffer> {
	const expectedMime = extension === "jpg" ? "image/jpeg" : `image/${extension}`;
	const mime = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
	if (mime !== expectedMime || !response.body ||
		Number(response.headers.get("content-length")) > MAX_PRODUCT_IMAGE_BYTES) {
		await response.body?.cancel();
		throw new ProductImageError("CONTENT");
	}
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let size = 0;
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			size += chunk.value.byteLength;
			if (size > MAX_PRODUCT_IMAGE_BYTES) throw new ProductImageError("CONTENT");
			chunks.push(chunk.value);
		}
	} finally {
		await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
	const bytes = Buffer.concat(chunks);
	const matches = extension === "jpg"
		? bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
		: extension === "png"
			? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
			: bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
	if (!matches) throw new ProductImageError("CONTENT");
	return bytes;
}

// CLI-only adapter: no application route may fetch product photos on demand.
export async function downloadProductImage(
	url: string,
	userAgent: string,
	options: { fetcher?: typeof fetch; wait?: (milliseconds: number) => Promise<void> } = {},
): Promise<Buffer> {
	const extension = imageExtension(url);
	const fetcher = options.fetcher ?? fetch;
	const wait = options.wait ?? (async (milliseconds: number) => { await delay(milliseconds); });
	for (let attempt = 0; attempt < 3; attempt += 1) {
		let response: Response;
		try {
			response = await fetcher(url, {
				headers: { "User-Agent": userAgent, Accept: "image/jpeg,image/png,image/webp" },
				redirect: "error",
				signal: AbortSignal.timeout(15_000),
			});
		} catch {
			if (attempt === 2) throw new ProductImageError("NETWORK");
			await wait(1000 * 2 ** attempt + Math.floor(Math.random() * 250));
			continue;
		}
		if (response.ok) {
			try {
				return await readImage(response, extension);
			} catch (error) {
				if (error instanceof ProductImageError) throw error;
				throw new ProductImageError("NETWORK");
			}
		}
		await response.body?.cancel();
		if ((response.status !== 429 && response.status < 500) || attempt === 2) {
			throw new ProductImageError("HTTP");
		}
		const cooldown = retryAfterMilliseconds(response.headers.get("retry-after"), Date.now());
		if (cooldown > 60_000) throw new ProductImageError("COOLDOWN");
		await wait(Math.max(cooldown, 1000 * 2 ** attempt + Math.floor(Math.random() * 250)));
	}
	throw new ProductImageError("NETWORK");
}
