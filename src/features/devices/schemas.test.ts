import { describe, expect, it } from "vitest";
import { makePairingReview, deviceIds } from "@/test/factories/devices";
import { approvePairingSchema, lookupPairingSchema, revokeDeviceSchema, startPairingSchema } from "./schemas";
describe("device input schemas", () => {
  it.each(["472918", "472 918", "000042"])("accepts six digits: %s", (code) => {
    expect(lookupPairingSchema.parse({ code }).code).toBe(code.replace(" ", ""));
  });
  it.each(["12345", "1234567", "12a456", "123\n456", " 123456"])("rejects invalid code: %s", (code) => {
    expect(lookupPairingSchema.safeParse({ code }).success).toBe(false);
  });
  it("requires explicit confirmation and rejects client ownership fields", () => {
    const review = makePairingReview();
    const allowed = { pairingId: review.pairingId, reviewTicket: review.reviewTicket, expiresAt: review.expiresAt,
      profileId: deviceIds.profile, label: "Rose's tablet", confirmed: true };
    expect(approvePairingSchema.safeParse(allowed).success).toBe(true);
    expect(approvePairingSchema.safeParse({ ...allowed, confirmed: false }).success).toBe(false);
    expect(approvePairingSchema.safeParse({ ...allowed, familyId: deviceIds.otherFamily }).success).toBe(false);
  });
  it.each(["", "x".repeat(41), "Rose\n", "Rose\u202e"])("rejects unsafe or oversized labels", (label) => {
    const review = makePairingReview();
    expect(approvePairingSchema.safeParse({ pairingId: review.pairingId, reviewTicket: review.reviewTicket,
      expiresAt: review.expiresAt, profileId: deviceIds.profile, label, confirmed: true }).success).toBe(false);
  });
  it("validates device IDs and rejects unexpected pairing-start fields", () => {
    expect(revokeDeviceSchema.safeParse({ deviceId: "bad", confirmed: true }).success).toBe(false);
    expect(startPairingSchema.safeParse({ familyId: deviceIds.family }).success).toBe(false);
  });
});
