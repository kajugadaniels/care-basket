import { z } from "zod";

export const CLOUDINARY_PRODUCT_FOLDER = "care-based/products";
export const cloudNameSchema = z.string().min(1).max(50).regex(/^[a-z0-9_-]+$/);
export const cloudinaryImageSchema = z.strictObject({
	cloudName: cloudNameSchema,
	publicId: z.string().max(100).regex(/^care-based\/products\/[a-z0-9]+(?:-[a-z0-9]+)*-[a-f0-9]{16}$/),
	version: z.int().positive().max(Number.MAX_SAFE_INTEGER),
	format: z.enum(["jpg", "png", "webp"]),
	sha256: z.string().regex(/^[a-f0-9]{64}$/),
});

export type CloudinaryImage = z.infer<typeof cloudinaryImageSchema>;

export function productPublicId(sku: string, sha256: string) {
	z.string().min(3).max(60).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).parse(sku);
	z.string().regex(/^[a-f0-9]{64}$/).parse(sha256);
	// Content-addressed names allow new photos without overwriting old assets.
	return `${CLOUDINARY_PRODUCT_FOLDER}/${sku}-${sha256.slice(0, 16)}`;
}

export function cloudinaryImageUrl(input: CloudinaryImage) {
	const image = cloudinaryImageSchema.parse(input);
	const url = `https://res.cloudinary.com/${image.cloudName}/image/upload/v${image.version}/${image.publicId}.${image.format}`;
	// CatalogProduct.imagePath already has this database limit; no migration needed.
	return z.string().max(200).parse(url);
}

export function cloudinaryRemotePatterns(value: string | undefined) {
	if (!value) return [];
	const parsed = cloudNameSchema.safeParse(value);
	if (!parsed.success) throw new Error("Invalid CLOUDINARY_CLOUD_NAME. Use the Cloudinary account cloud name.");
	return [{
		protocol: "https" as const, hostname: "res.cloudinary.com", port: "", search: "",
		pathname: `/${parsed.data}/image/upload/*/${CLOUDINARY_PRODUCT_FOLDER}/*`,
	}];
}
