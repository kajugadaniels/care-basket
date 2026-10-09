// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { downloadProductImage, MAX_PRODUCT_IMAGE_BYTES } from "./image-download";

const url = "https://images.openfoodfacts.org/images/products/001/234/567/8905/front_en.1.400.jpg";
const userAgent = "CareBasket/0.1.0 (catalog@example.test)";
const jpeg = new Uint8Array([255, 216, 255, 224, 255, 217]);
const photo = () => new Response(jpeg, { headers: { "content-type": "image/jpeg" } });

describe("developer-run product photo download", () => {
	it("preserves bytes and identifies the client without following redirects", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(photo());
		expect(await downloadProductImage(url, userAgent, { fetcher })).toEqual(Buffer.from(jpeg));
		expect(fetcher).toHaveBeenCalledWith(url, expect.objectContaining({
			redirect: "error", signal: expect.any(AbortSignal),
			headers: { "User-Agent": userAgent, Accept: "image/jpeg,image/png,image/webp" },
		}));
	});
	it.each([
		"http://images.openfoodfacts.org/images/products/001/234/567/8905/front_en.1.400.jpg",
		"https://retailer.example/photo.jpg",
		url + "?redirect=https://retailer.example",
		url.replace(".400.jpg", ".full.jpg"),
		url.replace("images.openfoodfacts.org", "catalog@images.openfoodfacts.org"),
	])("rejects an unapproved URL before requesting it: %s", async (source) => {
		const fetcher = vi.fn<typeof fetch>();
		await expect(downloadProductImage(source, userAgent, { fetcher })).rejects.toMatchObject({ reason: "URL" });
		expect(fetcher).not.toHaveBeenCalled();
	});
	it.each([
		() => new Response("<html>not a photo</html>", { headers: { "content-type": "text/html" } }),
		() => new Response("not a photo", { headers: { "content-type": "image/jpeg" } }),
		() => new Response(jpeg, { headers: { "content-type": "image/png" } }),
		() => new Response(jpeg, { headers: { "content-type": "image/jpeg", "content-length": String(MAX_PRODUCT_IMAGE_BYTES + 1) } }),
		() => new Response(new Uint8Array(MAX_PRODUCT_IMAGE_BYTES + 1), { headers: { "content-type": "image/jpeg" } }),
		() => new Response(null, { headers: { "content-type": "image/jpeg" } }),
	])("rejects invalid or oversized content", async (response) => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response());
		await expect(downloadProductImage(url, userAgent, { fetcher })).rejects.toMatchObject({ reason: "CONTENT" });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
	it("accepts PNG and WebP signatures only with matching extensions and MIME types", async () => {
		for (const [extension, bytes] of [
			["png", new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])],
			["webp", new Uint8Array(Buffer.from("RIFFxxxxWEBP"))],
		] as const) {
			const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(bytes, {
				headers: { "content-type": `image/${extension}` },
			}));
			expect(await downloadProductImage(url.replace(".jpg", `.${extension}`), userAgent, { fetcher })).toEqual(Buffer.from(bytes));
		}
	});
	it("honors Retry-After and retries transient responses at most three times", async () => {
		const fetcher = vi.fn<typeof fetch>()
			.mockResolvedValueOnce(new Response(null, { status: 429, headers: { "retry-after": "5" } }))
			.mockResolvedValueOnce(new Response(null, { status: 503 }))
			.mockResolvedValueOnce(photo());
		const wait = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);
		await downloadProductImage(url, userAgent, { fetcher, wait });
		expect(fetcher).toHaveBeenCalledTimes(3);
		expect(wait).toHaveBeenNthCalledWith(1, 5000);
		expect(wait.mock.calls[1][0]).toBeGreaterThanOrEqual(2000);
	});
	it("bounds network retries without exposing the original error", async () => {
		const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("private network details"));
		const wait = vi.fn<(milliseconds: number) => Promise<void>>().mockResolvedValue(undefined);
		await expect(downloadProductImage(url, userAgent, { fetcher, wait })).rejects.toMatchObject({ reason: "NETWORK" });
		expect(fetcher).toHaveBeenCalledTimes(3);
	});
	it("never follows a redirect or retries a missing photo", async () => {
		for (const status of [302, 404]) {
			const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status }));
			await expect(downloadProductImage(url, userAgent, { fetcher })).rejects.toMatchObject({ reason: "HTTP" });
			expect(fetcher).toHaveBeenCalledTimes(1);
		}
	});
	it("stops instead of ignoring a long rate-limit cooldown", async () => {
		const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 429, headers: { "retry-after": "120" } }));
		await expect(downloadProductImage(url, userAgent, { fetcher })).rejects.toMatchObject({ reason: "COOLDOWN" });
		expect(fetcher).toHaveBeenCalledTimes(1);
	});
});
