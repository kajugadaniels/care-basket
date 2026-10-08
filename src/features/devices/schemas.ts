import { z } from "zod";
import { hasUnsafeCharacters } from "@/features/family/schemas";
import { devicesCopy } from "./copy";

export const startPairingSchema = z.strictObject({});
export const lookupPairingSchema = z.strictObject({
  code: z.string().max(7).regex(/^\d{3} ?\d{3}$/, devicesCopy.errors.code)
    .transform((value) => value.replace(" ", "")),
});
const reviewFields = {
  pairingId: z.uuid(), expiresAt: z.iso.datetime(), reviewTicket: z.string().length(64).regex(/^[a-f0-9]+$/),
};
export const approvePairingSchema = z.strictObject({
  ...reviewFields, profileId: z.uuid(), confirmed: z.literal(true, { error: devicesCopy.errors.confirm }),
  label: z.string().max(80).refine((value) => !hasUnsafeCharacters(value), devicesCopy.errors.label)
    .trim().min(1, devicesCopy.errors.label).max(40, devicesCopy.errors.label),
});
export const rejectPairingSchema = z.strictObject({ ...reviewFields, confirmed: z.literal(true) });
export const revokeDeviceSchema = z.strictObject({ deviceId: z.uuid(), confirmed: z.literal(true) });
export const deviceListSchema = z.strictObject({ after: z.uuid().optional() });
export const pairingStatusSchema = z.strictObject({ status: z.enum(["PENDING", "APPROVED", "REJECTED", "COMPLETED", "EXPIRED"]) });
export type ApprovePairingInput = z.infer<typeof approvePairingSchema>;
export type RejectPairingInput = z.infer<typeof rejectPairingSchema>;
