// @vitest-environment node
import { describe, expect, it } from "vitest";
import { cloudinaryImageSchema, cloudinaryImageUrl, cloudinaryRemotePatterns, productPublicId } from "./catalog-images";

const sha256 = "a".repeat(64);
const image = { cloudName: "fixture-cloud", publicId: productPublicId("reviewed-rice", sha256), version: 123, format: "jpg" as const, sha256 };

describe("Cloudinary catalog identities", () => {
	it("builds immutable upload URLs with no transformations, credentials or query", () => {
		expect(cloudinaryImageUrl(image)).toBe("https://res.cloudinary.com/fixture-cloud/image/upload/v123/care-based/products/reviewed-rice-aaaaaaaaaaaaaaaa.jpg");
		expect(productPublicId("reviewed-rice", "b".repeat(64))).not.toBe(image.publicId);
	});
	it("disables remote delivery until a cloud is configured", () => {
		expect(cloudinaryRemotePatterns(undefined)).toEqual([]);
		expect(cloudinaryRemotePatterns("")).toEqual([]);
		expect(cloudinaryRemotePatterns("fixture-cloud")).toEqual([{
			protocol: "https", hostname: "res.cloudinary.com", port: "", search: "",
			pathname: "/fixture-cloud/image/upload/*/care-based/products/*",
		}]);
	});
	it.each(["../other", "cloud/path", "cloud?query", "cloud.example", "cloud:443", " cloud"])("rejects unsafe cloud configuration %s", (cloud) => {
		expect(() => cloudinaryRemotePatterns(cloud)).toThrow(/CLOUDINARY_CLOUD_NAME/);
	});
	it.each([
		{ publicId: "other/products/reviewed-rice-aaaaaaaaaaaaaaaa" },
		{ publicId: "care-based/products/../reviewed-rice-aaaaaaaaaaaaaaaa" },
		{ version: -1 }, { format: "svg" }, { sha256: "invalid" }, { url: "https://arbitrary.example/photo" },
	])("rejects unapproved metadata %j", (patch) => {
		expect(cloudinaryImageSchema.safeParse({ ...image, ...patch }).success).toBe(false);
	});
	it("bounds delivery URLs to the existing database field", () => {
		expect(() => cloudinaryImageUrl({ ...image, cloudName: "c".repeat(50),
			publicId: productPublicId("s".repeat(60), sha256), version: Number.MAX_SAFE_INTEGER })).toThrow();
	});
});
