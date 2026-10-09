// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds, requester } from "@/test/factories/requests";
const fake = vi.hoisted(() => ({ first: vi.fn(), many: vi.fn(), count: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => ({ shoppingRequest: { findFirst: fake.first, findMany: fake.many, count: fake.count } }) }));
import { countPendingRequests, readDeviceRequest, readDeviceRequests, readManagerRequest, readManagerRequests } from "./repository";

describe("family-scoped request reads", () => {
	beforeEach(() => { vi.resetAllMocks(); fake.many.mockResolvedValue([]); fake.first.mockResolvedValue(null); });
	it("scopes device details and explicitly excludes all prices and adult data", async () => {
		await readDeviceRequest(requester, requestIds.request);
		const query = fake.first.mock.calls[0][0];
		expect(query.where).toEqual({ id: requestIds.request, familyId: requester.familyId, profileId: requester.profileId });
		const selection = JSON.stringify(query.select);
		for (const field of ["unitPriceMinor", "subtotalMinor", "currency", "reviewedBy", "profile", "inputText"]) expect(selection).not.toContain(field);
	});
	it("bounds requester history to 21 rows without prices", async () => {
		await readDeviceRequests(requester, { after: requestIds.other });
		expect(fake.many).toHaveBeenCalledWith(expect.objectContaining({ where: {
			familyId: requester.familyId, profileId: requester.profileId, id: { lt: requestIds.other },
		}, take: 21, orderBy: { id: "desc" } }));
		expect(JSON.stringify(fake.many.mock.calls[0][0].select)).not.toContain("subtotalMinor");
	});
	it("scopes manager detail and pending counts to its family", async () => {
		await readManagerRequest(requestIds.family, requestIds.request); await countPendingRequests(requestIds.family);
		expect(fake.first).toHaveBeenCalledWith(expect.objectContaining({ where: { id: requestIds.request, familyId: requestIds.family } }));
		expect(fake.count).toHaveBeenCalledWith({ where: { familyId: requestIds.family, status: "PENDING_REVIEW" } });
	});
	it("orders pending first and uses bounded cursor pagination with status filter", async () => {
		fake.first.mockResolvedValue({ id: requestIds.other });
		await readManagerRequests(requestIds.family, { after: requestIds.other, status: "PENDING_REVIEW" });
		expect(fake.many).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: requestIds.family, status: "PENDING_REVIEW" },
			cursor: { id: requestIds.other }, skip: 1, take: 21, orderBy: [{ status: "asc" }, { id: "desc" }] }));
	});
	it("does not permit another family's cursor", async () => {
		await expect(readManagerRequests(requestIds.family, { after: requestIds.other })).rejects.toMatchObject({ code: "NOT_FOUND" });
		expect(fake.many).not.toHaveBeenCalled();
	});
});
