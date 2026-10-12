// This deployment supports adults only. Historical CHILD rows remain readable by managers.
export const ADULT_PROFILE_KIND = "ASSISTED_ADULT" as const;
export const ACTIVE_PROFILE_KINDS = [ADULT_PROFILE_KIND] as const;
// Stored in ManagedProfile.consentVersion, whose database contract is VarChar(20).
export const ADULT_ACCESS_CONSENT_VERSION = "adult-v1-2026-10-12";

export function isAdultProfile(kind: string): kind is typeof ADULT_PROFILE_KIND {
	return kind === ADULT_PROFILE_KIND;
}
