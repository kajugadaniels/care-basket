import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { DeviceActor } from "@/server/auth/device-policy";
import { getDb } from "@/server/db/client";
import { AppError } from "@/server/errors";
import { REQUEST_PAGE_SIZE } from "../limits";
import type { RequestListInput } from "../schemas";

const productSelect = { sku: true, displayName: true, category: true, sizeLabel: true, imagePath: true } as const;
const summarySelect = { id: true, status: true, submittedAt: true,
	basket: { select: { _count: { select: { items: true } } } },
} satisfies Prisma.ShoppingRequestSelect;
const deviceDetailSelect = { id: true, status: true, submittedAt: true, revision: true,
	basket: { select: { lockedAt: true, items: {
		orderBy: { id: "asc" }, select: { id: true, quantity: true, product: { select: productSelect } },
	} } },
} satisfies Prisma.ShoppingRequestSelect;
const managerSummarySelect = { ...summarySelect, profile: { select: { displayName: true } },
	basket: { select: { subtotalMinor: true, currency: true, _count: { select: { items: true } } } },
} satisfies Prisma.ShoppingRequestSelect;
const managerDetailSelect = { ...managerSummarySelect, revision: true, inputText: true,
	basket: { select: { subtotalMinor: true, currency: true, lockedAt: true, items: {
		orderBy: { id: "asc" }, select: { id: true, quantity: true, unitPriceMinor: true, origin: true,
			isSubstitute: true, substitutionNote: true, product: { select: productSelect } },
	} } },
} satisfies Prisma.ShoppingRequestSelect;

export function readDeviceRequest(actor: DeviceActor, requestId: string) {
	return getDb().shoppingRequest.findFirst({
		where: { id: requestId, familyId: actor.familyId, profileId: actor.profileId }, select: deviceDetailSelect,
	});
}
export function readManagerRequest(familyId: string, requestId: string) {
	return getDb().shoppingRequest.findFirst({ where: { id: requestId, familyId }, select: managerDetailSelect });
}
export function readDeviceRequests(actor: DeviceActor, input: RequestListInput) {
	return getDb().shoppingRequest.findMany({
		where: { familyId: actor.familyId, profileId: actor.profileId,
			...(input.after ? { id: { lt: input.after } } : {}), ...(input.status ? { status: input.status } : {}) },
		select: summarySelect, orderBy: { id: "desc" }, take: REQUEST_PAGE_SIZE + 1,
	});
}
export async function readManagerRequests(familyId: string, input: RequestListInput) {
	const db = getDb();
	// A caller cannot use another family's row as a pagination cursor.
	if (input.after && !await db.shoppingRequest.findFirst({
		where: { id: input.after, familyId, ...(input.status ? { status: input.status } : {}) }, select: { id: true },
	})) throw new AppError("NOT_FOUND");
	return db.shoppingRequest.findMany({
		where: { familyId, ...(input.status ? { status: input.status } : {}) },
		...(input.after ? { cursor: { id: input.after }, skip: 1 } : {}),
		select: managerSummarySelect, orderBy: [{ status: "asc" }, { id: "desc" }], take: REQUEST_PAGE_SIZE + 1,
	});
}
export function countPendingRequests(familyId: string) {
	return getDb().shoppingRequest.count({ where: { familyId, status: "PENDING_REVIEW" } });
}
