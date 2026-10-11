import "server-only";

import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";
import { getDeviceEnv } from "@/lib/env/server";
import type { DeviceActor } from "./device-policy";

const MAX_PLAINTEXT_BYTES = 64 * 1024;
const MAX_ENCRYPTED_LENGTH = 90_000;

function key() {
	// Domain separation: review encryption never reuses a signing/session key directly.
	return createHmac("sha256", getDeviceEnv().DEVICE_AUTH_SECRET)
		.update("carebasket:assistant-review:encryption:v1").digest();
}

function scope(actor: DeviceActor) {
	return Buffer.from(JSON.stringify(["assistant-review:v1", actor.familyId, actor.profileId, actor.deviceId]));
}

export function encryptReview(actor: DeviceActor, value: unknown): string {
	const plaintext = Buffer.from(JSON.stringify(value));
	if (plaintext.length > MAX_PLAINTEXT_BYTES) throw new Error("Review exceeds storage limit.");
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key(), iv);
	cipher.setAAD(scope(actor));
	const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
	return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptReview(actor: DeviceActor, payload: string): unknown {
	if (payload.length > MAX_ENCRYPTED_LENGTH) throw new Error("Invalid review.");
	const [version, ivText, tagText, ciphertextText, extra] = payload.split(".");
	if (version !== "v1" || extra !== undefined || !ivText || !tagText || !ciphertextText
		|| ![ivText, tagText, ciphertextText].every((part) => /^[A-Za-z0-9_-]+$/.test(part))) {
		throw new Error("Invalid review.");
	}
	const iv = Buffer.from(ivText, "base64url");
	const tag = Buffer.from(tagText, "base64url");
	if (iv.length !== 12 || tag.length !== 16) throw new Error("Invalid review.");
	const decipher = createDecipheriv("aes-256-gcm", key(), iv);
	decipher.setAAD(scope(actor));
	decipher.setAuthTag(tag);
	const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextText, "base64url")), decipher.final()]);
	if (plaintext.length > MAX_PLAINTEXT_BYTES) throw new Error("Invalid review.");
	return JSON.parse(plaintext.toString("utf8")) as unknown;
}
