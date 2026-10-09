import "server-only";
import { z } from "zod";
import type { AdultActor } from "@/server/auth/require-adult";
import type { DeviceActor } from "@/server/auth/device-policy";
import { assertDevicePermission } from "@/server/auth/require-device";
import { AppError } from "@/server/errors";
import { formatMoney } from "@/lib/format";
import { REQUEST_PAGE_SIZE } from "../limits";
import { closeRequestSchema, removeRequestItemSchema, requestListSchema, submitRequestSchema, updateRequestItemSchema } from "../schemas";
import type { ManagerDetailDto, ManagerSummaryDto, RequestDetailDto, RequestPage, RequestSummaryDto } from "../types";
import { insertRequest } from "./submission-repository";
import { closeRequest, editRequestItem } from "./mutation-repository";
import { countPendingRequests, readDeviceRequest, readDeviceRequests, readManagerRequest, readManagerRequests } from "./repository";

function assertManager(actor: AdultActor) {
	if (!actor || actor.type !== "adult" || !["OWNER", "MANAGER"].includes(actor.role)) throw new AppError("FORBIDDEN");
}
function requestId(value: string) {
	if (!z.uuid().safeParse(value).success) throw new AppError("NOT_FOUND");
	return value;
}
function page<T extends { id: string }>(rows: T[]): RequestPage<T> {
	return { requests: rows.slice(0, REQUEST_PAGE_SIZE), nextCursor: rows.length > REQUEST_PAGE_SIZE ? rows[REQUEST_PAGE_SIZE - 1].id : null };
}
export function submitRequest(actor: DeviceActor, input: unknown) {
	assertDevicePermission(actor, "create-own-request");
	return insertRequest(actor, submitRequestSchema.parse(input));
}
export function cancelRequest(actor: DeviceActor, input: unknown) {
	assertDevicePermission(actor, "create-own-request");
	return closeRequest(actor, closeRequestSchema.parse(input));
}
export function declineRequest(actor: AdultActor, input: unknown) {
	assertManager(actor);
	return closeRequest(actor, closeRequestSchema.parse(input));
}
export function updateRequestItem(actor: AdultActor, input: unknown) {
	assertManager(actor);
	return editRequestItem(actor, updateRequestItemSchema.parse(input));
}
export function removeRequestItem(actor: AdultActor, input: unknown) {
	assertManager(actor);
	return editRequestItem(actor, removeRequestItemSchema.parse(input));
}
export function countWaitingRequests(actor: AdultActor) {
	assertManager(actor);
	return countPendingRequests(actor.familyId);
}
export async function listOwnRequests(actor: DeviceActor, input: unknown = {}): Promise<RequestPage<RequestSummaryDto>> {
	assertDevicePermission(actor, "view-own-requests");
	const rows = await readDeviceRequests(actor, requestListSchema.parse(input));
	return page(rows.map((row) => ({ id: row.id, status: row.status, submittedAt: row.submittedAt.toISOString(), itemCount: row.basket?._count.items ?? 0 })));
}
export async function listFamilyRequests(actor: AdultActor, input: unknown = {}): Promise<RequestPage<ManagerSummaryDto>> {
	assertManager(actor);
	const rows = await readManagerRequests(actor.familyId, requestListSchema.parse(input));
	return page(rows.map((row) => ({ id: row.id, status: row.status, submittedAt: row.submittedAt.toISOString(),
		itemCount: row.basket?._count.items ?? 0, displayName: row.profile.displayName,
		subtotal: row.basket ? formatMoney(row.basket.subtotalMinor, row.basket.currency) : "—" })));
}
export async function getOwnRequest(actor: DeviceActor, id: string): Promise<RequestDetailDto> {
	assertDevicePermission(actor, "view-own-requests");
	const row = await readDeviceRequest(actor, requestId(id));
	if (!row?.basket) throw new AppError("NOT_FOUND");
	return { id: row.id, status: row.status, submittedAt: row.submittedAt.toISOString(), revision: row.revision,
		itemCount: row.basket.items.length, editable: row.status === "PENDING_REVIEW" && row.basket.lockedAt === null,
		items: row.basket.items.map((item) => ({ id: item.id, quantity: item.quantity, ...item.product })) };
}
export async function getFamilyRequest(actor: AdultActor, id: string): Promise<ManagerDetailDto> {
	assertManager(actor);
	const row = await readManagerRequest(actor.familyId, requestId(id));
	if (!row?.basket) throw new AppError("NOT_FOUND");
	const currency = row.basket.currency;
	return { id: row.id, status: row.status, submittedAt: row.submittedAt.toISOString(), revision: row.revision,
		itemCount: row.basket.items.length, editable: row.status === "PENDING_REVIEW" && row.basket.lockedAt === null,
		displayName: row.profile.displayName, inputText: row.inputText, subtotal: formatMoney(row.basket.subtotalMinor, currency),
		budget: row.budgetMinor == null ? null : formatMoney(row.budgetMinor, "USD"),
		items: row.basket.items.map((item) => ({ ...item.product, id: item.id, quantity: item.quantity,
			unitPrice: formatMoney(item.unitPriceMinor, currency), lineTotal: formatMoney(item.quantity * item.unitPriceMinor, currency),
			origin: item.origin, isSubstitute: item.isSubstitute, substitutionNote: item.substitutionNote })) };
}
