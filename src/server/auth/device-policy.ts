import "server-only";

export const PAIRING_TTL_MS = 10 * 60 * 1000;
export const DEVICE_LIFETIME_MS = 180 * 24 * 60 * 60 * 1000;
export const DEVICE_IDLE_MS = 30 * 24 * 60 * 60 * 1000;
export const DEVICE_ACTIVITY_MS = 60 * 60 * 1000;
export const MAX_PROFILE_DEVICES = 5;

export type DeviceActor = {
  type: "device"; deviceId: string; familyId: string; profileId: string;
  profileKind: "ASSISTED_ADULT" | "CHILD";
};
