import { ADULT_ACCESS_CONSENT_VERSION } from "@/lib/audience";

// Stable identifiers, never photos. Changing labels does not change stored avatar keys.
export const PROFILE_AVATAR_KEYS = ["smile", "sun", "flower", "leaf"] as const;
// Stored kinds include legacy records, not the choices permitted for new profiles.
export const PROFILE_KINDS = ["ASSISTED_ADULT", "CHILD"] as const;
export const PROFILE_CONSENT_VERSION = ADULT_ACCESS_CONSENT_VERSION;
export const PROFILE_LOCALE = "en-US";
export const PROFILE_PAGE_SIZE = 50;
