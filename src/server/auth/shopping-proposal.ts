import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getDeviceEnv } from "@/lib/env/server";
import { AppError } from "@/server/errors";
import type { DeviceActor } from "./device-policy";

const claimItemSchema = z.strictObject({ sku: z.string().max(60), origin: z.enum(["REQUESTED", "SUGGESTED"]),
	isSubstitute: z.boolean(), substitutionNote: z.string().max(120).nullable() });
const claimSchema = z.strictObject({ deviceId: z.uuid(), familyId: z.uuid(), profileId: z.uuid(), expiresAt: z.number().int(),
	inputMode: z.enum(["TEXT", "VOICE"]), inputText: z.string().max(1000), items: z.array(claimItemSchema).max(42) });
type Claim = z.infer<typeof claimSchema>;
function signature(payload: string) {
	return createHmac("sha256", getDeviceEnv().DEVICE_AUTH_SECRET).update(`shopping-proposal:v1:${payload}`).digest();
}
export function signShoppingProposal(actor: DeviceActor, input: Pick<Claim, "inputMode" | "inputText" | "items">) {
	const claim = claimSchema.parse({ ...input, deviceId: actor.deviceId, familyId: actor.familyId,
		profileId: actor.profileId, expiresAt: Date.now() + 30 * 60_000 });
	const payload = Buffer.from(JSON.stringify(claim)).toString("base64url");
	const proof = `${payload}.${signature(payload).toString("base64url")}`;
	if (proof.length > 16_000) throw new AppError("AI_UNAVAILABLE");
	return proof;
}
export function verifyShoppingProposal(actor: DeviceActor, proof: string): Claim {
	if (proof.length > 16_000) throw new AppError("VALIDATION_FAILED");
	const parts = proof.split(".");
	if (parts.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(parts[0]) || !/^[A-Za-z0-9_-]+$/.test(parts[1])) throw new AppError("VALIDATION_FAILED");
	const actual = Buffer.from(parts[1], "base64url");
	const expected = signature(parts[0]);
	if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new AppError("VALIDATION_FAILED");
	let claim: Claim;
	try { claim = claimSchema.parse(JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"))); }
	catch { throw new AppError("VALIDATION_FAILED"); }
	if (claim.deviceId !== actor.deviceId || claim.familyId !== actor.familyId || claim.profileId !== actor.profileId
		|| claim.expiresAt <= Date.now()) throw new AppError("VALIDATION_FAILED");
	return claim;
}
