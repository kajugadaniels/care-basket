export const deviceIds = {
  user: "019a1234-0000-7000-8000-000000000001",
  family: "019a1234-0000-7000-8000-000000000002",
  profile: "019a1234-0000-7000-8000-000000000003",
  pairing: "019a1234-0000-7000-8000-000000000004",
  device: "019a1234-0000-7000-8000-000000000005",
  otherFamily: "019a1234-0000-7000-8000-000000000006",
};
export const deviceTestNow = new Date("2026-10-08T12:00:00Z");
export function makeDeviceAdult(role: "OWNER" | "MANAGER" = "OWNER") {
  return { type: "adult" as const, userId: deviceIds.user, familyId: deviceIds.family, role };
}
export function makeDeviceActor() {
  return { type: "device" as const, deviceId: deviceIds.device, familyId: deviceIds.family,
    profileId: deviceIds.profile, profileKind: "CHILD" as const };
}
export function makePairingReview() {
  return { pairingId: deviceIds.pairing, reviewTicket: "a".repeat(64),
    createdAt: deviceTestNow.toISOString(), expiresAt: new Date(deviceTestNow.getTime() + 600_000).toISOString(),
    userAgentSummary: "Safari on iPad" };
}
