// @vitest-environment node
import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { uploadProductImage, validateUploadImage } from "./upload";
import { productPublicId } from "./catalog-images";

// Fictional credentials, never copied from an environment or provider account.
const config = { cloudName: "fixture-cloud", apiKey: "123456", apiSecret: "fixture-only-not-a-real-secret", folderMode: "dynamic" as const };
const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const publicId = productPublicId("reviewed-rice", sha256);
const now = new Date("2026-10-10T12:00:00Z");

function responseData(patch: Record<string, unknown> = {}) {
	return {
		public_id: publicId, version: 123, format: "jpg", bytes: bytes.length, width: 400, height: 400,
		resource_type: "image", type: "upload",
		signature: createHash("sha1").update(`public_id=${publicId}&version=123${config.apiSecret}`).digest("hex"),
		...patch,
	};
}

describe("signed local-photo uploads", () => {
	it("uploads only local bytes to the configured account and approved folder", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(responseData({ secure_url: "https://untrusted.example" })));
		const result = await uploadProductImage("reviewed-rice", bytes, "jpg", config, { fetcher, now });
		expect(result).toEqual({ cloudName: config.cloudName, publicId, version: 123, format: "jpg", sha256 });
		const [url, request] = fetcher.mock.calls[0];
		expect(url).toBe("https://api.cloudinary.com/v1_1/fixture-cloud/image/upload");
		expect(request).toMatchObject({ method: "POST", redirect: "error" });
		const body = request?.body as FormData;
		expect(body.get("asset_folder")).toBe("care-based/products");
		expect(body.get("public_id")).toBe(publicId);
		expect(body.get("overwrite")).toBe("false");
		expect(body.get("api_secret")).toBeNull();
		expect(await (body.get("file") as Blob).arrayBuffer()).toEqual(Uint8Array.from(bytes).buffer);
		const signed = Array.from(body.entries()).filter(([key]) => !["file", "api_key", "signature"].includes(key));
		const serialized = signed.sort(([left], [right]) => left.localeCompare(right)).map(([key, value]) => `${key}=${value}`).join("&");
		expect(body.get("signature")).toBe(createHash("sha1").update(serialized + config.apiSecret).digest("hex"));
	});
	it("supports legacy fixed folders without duplicating the public-ID prefix", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(responseData()));
		await uploadProductImage("reviewed-rice", bytes, "jpg", { ...config, folderMode: "fixed" }, { fetcher });
		const body = fetcher.mock.calls[0][1]?.body as FormData;
		expect(body.get("folder")).toBe("care-based/products");
		expect(body.get("asset_folder")).toBeNull();
		expect(body.get("public_id")).toBe(`reviewed-rice-${sha256.slice(0, 16)}`);
	});
	it.each([
		{ existing: true }, { overwritten: true }, { public_id: "other/product" },
		{ type: "fetch" }, { resource_type: "raw" }, { format: "webp" },
		{ bytes: 10 }, { signature: "0".repeat(40) }, { signature: "invalid" }, { version: -1 },
	])("refuses inconsistent or existing assets %j", async (patch) => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(responseData(patch)));
		await expect(uploadProductImage("reviewed-rice", bytes, "jpg", config, { fetcher })).rejects.toThrow(/Cloudinary upload stopped/);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it("refuses unexpected local content before contacting Cloudinary", async () => {
		const fetcher = vi.fn<typeof fetch>();
		await expect(uploadProductImage("reviewed-rice", Buffer.from("<svg>"), "jpg", config, { fetcher })).rejects.toThrow(/IMAGE/);
		expect(() => validateUploadImage(Buffer.concat([bytes, Buffer.alloc(2 * 1024 * 1024)]), "jpg")).toThrow();
		expect(() => validateUploadImage(bytes, "png")).toThrow();
		expect(fetcher).not.toHaveBeenCalled();
	});
	it("validates the existing permitted PNG and WebP signatures", () => {
		expect(validateUploadImage(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), "png")).toMatch(/^[a-f0-9]{64}$/);
		expect(validateUploadImage(Buffer.from("RIFF0000WEBP"), "webp")).toMatch(/^[a-f0-9]{64}$/);
	});
	it("also verifies SHA-256 response signatures", async () => {
		const signature = createHash("sha256").update(`public_id=${publicId}&version=123${config.apiSecret}`).digest("hex");
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json(responseData({ signature })));
		await expect(uploadProductImage("reviewed-rice", bytes, "jpg", config, { fetcher })).resolves.toHaveProperty("sha256", sha256);
	});
	it("never retries an ambiguous upload or leaks provider errors", async () => {
		const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error(config.apiSecret));
		await expect(uploadProductImage("reviewed-rice", bytes, "jpg", config, { fetcher })).rejects.toThrow(/NETWORK/);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it("stops on rate limits without reading raw provider errors", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(config.apiSecret, { status: 429 }));
		await expect(uploadProductImage("reviewed-rice", bytes, "jpg", config, { fetcher })).rejects.toThrow(/HTTP/);
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it("bounds response size and refuses non-JSON content", async () => {
		for (const response of [new Response("x".repeat(65 * 1024), { headers: { "content-type": "application/json" } }), new Response("<html>error</html>")]) {
			const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);
			await expect(uploadProductImage("reviewed-rice", bytes, "jpg", config, { fetcher })).rejects.toThrow(/RESPONSE/);
		}
	});
});
