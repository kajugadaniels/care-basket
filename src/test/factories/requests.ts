import type { AdultActor } from "@/server/auth/require-adult";
import type { DeviceActor } from "@/server/auth/device-policy";
import type { CatalogProductDto } from "@/features/catalog/types";
import type { ManagerDetailDto, RequestDetailDto } from "@/features/requests/types";

export const requestIds = {
	request: "0199a100-0000-7000-8000-000000000001", family: "0199a100-0000-7000-8000-000000000002",
	profile: "0199a100-0000-7000-8000-000000000003", device: "0199a100-0000-7000-8000-000000000004",
	user: "0199a100-0000-7000-8000-000000000005", item: "0199a100-0000-7000-8000-000000000006",
	key: "0199a100-0000-7000-8000-000000000007", other: "0199a100-0000-7000-8000-000000000008",
	basket: "0199a100-0000-7000-8000-000000000009",
};
export const requestNow = new Date("2026-10-09T12:00:00Z");
export const requester: DeviceActor = { type: "device", deviceId: requestIds.device, familyId: requestIds.family,
	profileId: requestIds.profile, profileKind: "ASSISTED_ADULT" };
export const requestManager: AdultActor = { type: "adult", userId: requestIds.user, familyId: requestIds.family, role: "OWNER" };
export const requestProduct: CatalogProductDto = { sku: "demo-milk", displayName: "Demo milk", category: "DAIRY_EGGS",
	sizeLabel: "1 litre", imagePath: null };
export function makeOwnRequest(overrides: Partial<RequestDetailDto> = {}): RequestDetailDto {
	return { id: requestIds.request, status: "PENDING_REVIEW", submittedAt: requestNow.toISOString(), revision: 0,
		itemCount: 1, editable: true, items: [{ ...requestProduct, id: requestIds.item, quantity: 2 }], ...overrides };
}
export function makeManagerRequest(overrides: Partial<ManagerDetailDto> = {}): ManagerDetailDto {
	return { ...makeOwnRequest(), displayName: "Demo Grandma", subtotal: "$5.00", inputText: null,
		items: [{ ...requestProduct, id: requestIds.item, quantity: 2, unitPrice: "$2.50", lineTotal: "$5.00",
			origin: "REQUESTED", isSubstitute: false, substitutionNote: null }], ...overrides };
}
