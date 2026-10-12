// This deployment supports adults only. Historical CHILD rows remain readable by managers.
export const ADULT_PROFILE_KIND = "ASSISTED_ADULT" as const;
export const ACTIVE_PROFILE_KINDS = [ADULT_PROFILE_KIND] as const;
export const ADULT_ACCESS_CONSENT_VERSION = "adults-only-2026-10-12";

export function isAdultProfile(kind: string): kind is typeof ADULT_PROFILE_KIND {
	return kind === ADULT_PROFILE_KIND;
}
