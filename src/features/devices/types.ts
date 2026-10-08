import type { ActionResult } from "@/types/action-result";
import type { ProfileAvatarKey } from "@/features/profiles/types";

export type PairingStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED" | "EXPIRED";
export type PairingStartDto = { code: string; expiresAt: string };
export type PairingReviewDto = {
  pairingId: string; reviewTicket: string; expiresAt: string; createdAt: string; userAgentSummary: string;
};
export type DeviceDto = {
  id: string; label: string; profileName: string; userAgentSummary: string;
  createdAt: string; lastSeenAt: string; status: "ACTIVE" | "EXPIRED" | "REVOKED";
};
export type DeviceResult = ActionResult<{ done: true }>;
export type ProfileOption = { id: string; displayName: string };
export type ShopHomeDto = { displayName: string; avatarKey: ProfileAvatarKey };
