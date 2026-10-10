import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { getCloudinaryUploadEnv } from "@/lib/env/server";
import { MAX_PRODUCT_IMAGE_BYTES } from "@/lib/open-food-facts/image-download";
import { CLOUDINARY_PRODUCT_FOLDER, cloudNameSchema, cloudinaryImageUrl, productPublicId } from "./catalog-images";
import type { CloudinaryImage } from "./catalog-images";

type UploadConfig = ReturnType<typeof getCloudinaryUploadEnv>;
type ImageFormat = CloudinaryImage["format"];

export class CloudinaryUploadError extends Error {
	constructor(public readonly reason: "IMAGE" | "NETWORK" | "HTTP" | "RESPONSE" | "EXISTING") {
		super(`Cloudinary upload stopped (${reason}). Automatic overwrites are disabled.`);
		this.name = "CloudinaryUploadError";
	}
}

export function validateUploadImage(bytes: Buffer, format: ImageFormat) {
	const matches = format === "jpg"
		? bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
		: format === "png"
			? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
			: bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
	if (!matches || bytes.length > MAX_PRODUCT_IMAGE_BYTES) throw new CloudinaryUploadError("IMAGE");
	return createHash("sha256").update(bytes).digest("hex");
}

function sign(parameters: Record<string, string>, secret: string, algorithm = "sha1") {
	const serialized = Object.keys(parameters).sort().map((key) => `${key}=${parameters[key]}`).join("&");
	return createHash(algorithm).update(serialized + secret).digest("hex");
}

async function readUploadResponse(response: Response) {
	const limit = 64 * 1024;
	if (!response.body || response.headers.get("content-type")?.split(";")[0].trim() !== "application/json"
		|| Number(response.headers.get("content-length")) > limit) {
		await response.body?.cancel();
		throw new CloudinaryUploadError("RESPONSE");
	}
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let length = 0;
	try {
		while (true) {
			const chunk = await reader.read();
			if (chunk.done) break;
			length += chunk.value.byteLength;
			if (length > limit) throw new CloudinaryUploadError("RESPONSE");
			chunks.push(chunk.value);
		}
	} finally {
		await reader.cancel().catch(() => undefined);
		reader.releaseLock();
	}
	return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

const responseSchema = z.object({
	resource_type: z.literal("image"), type: z.literal("upload"),
	public_id: z.string().max(100), version: z.int().positive(),
	format: z.enum(["jpg", "png", "webp"]), bytes: z.int().positive().max(MAX_PRODUCT_IMAGE_BYTES),
	width: z.int().positive(), height: z.int().positive(),
	signature: z.string().regex(/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/),
	existing: z.boolean().optional(), overwritten: z.boolean().optional(),
});

// CLI-only: upload local bytes, never a source URL or a user's attachment.
export async function uploadProductImage(
	sku: string, bytes: Buffer, format: ImageFormat, config: UploadConfig,
	options: { fetcher?: typeof fetch; now?: Date } = {},
): Promise<CloudinaryImage> {
	const cloudName = cloudNameSchema.parse(config.cloudName);
	const sha256 = validateUploadImage(bytes, format);
	const publicId = productPublicId(sku, sha256);
	// Check the database URL limit before creating an asset (allow a 16-digit version).
	cloudinaryImageUrl({ cloudName, publicId, sha256, format, version: Number.MAX_SAFE_INTEGER });
	const parameters: Record<string, string> = {
		public_id: config.folderMode === "fixed" ? publicId.slice(CLOUDINARY_PRODUCT_FOLDER.length + 1) : publicId,
		timestamp: String(Math.floor((options.now ?? new Date()).getTime() / 1000)),
		overwrite: "false", unique_filename: "false", use_filename: "false",
		[config.folderMode === "fixed" ? "folder" : "asset_folder"]: CLOUDINARY_PRODUCT_FOLDER,
	};
	const body = new FormData();
	for (const [key, value] of Object.entries(parameters)) body.set(key, value);
	body.set("api_key", config.apiKey);
	body.set("signature", sign(parameters, config.apiSecret));
	body.set("file", new Blob([Uint8Array.from(bytes)], { type: format === "jpg" ? "image/jpeg" : `image/${format}` }), `${sku}.${format}`);

	let response: Response;
	try {
		response = await (options.fetcher ?? fetch)(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
			method: "POST", body, redirect: "error", signal: AbortSignal.timeout(15_000),
		});
	} catch {
		// Never retry an ambiguous POST: an asset may exist even if its response was lost.
		throw new CloudinaryUploadError("NETWORK");
	}
	if (!response.ok) {
		await response.body?.cancel().catch(() => undefined);
		throw new CloudinaryUploadError("HTTP");
	}
	try {
		const raw = await readUploadResponse(response);
		if (z.object({ existing: z.literal(true) }).safeParse(raw).success) throw new CloudinaryUploadError("EXISTING");
		const data = responseSchema.parse(raw);
		if (data.overwritten) throw new CloudinaryUploadError("RESPONSE");
		const expected = sign({ public_id: data.public_id, version: String(data.version) }, config.apiSecret,
			data.signature.length === 64 ? "sha256" : "sha1");
		if (!timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(data.signature, "hex"))
			|| data.public_id !== publicId || data.format !== format || data.bytes !== bytes.length) {
			throw new CloudinaryUploadError("RESPONSE");
		}
		const image = { cloudName, publicId, version: data.version, format, sha256 };
		cloudinaryImageUrl(image);
		return image;
	} catch (error) {
		if (error instanceof CloudinaryUploadError) throw error;
		throw new CloudinaryUploadError("RESPONSE");
	}
}
