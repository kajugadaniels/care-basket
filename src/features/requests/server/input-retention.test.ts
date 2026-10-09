// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestIds, requestNow } from "@/test/factories/requests";
const fake = vi.hoisted(() => ({ find: vi.fn(), update: vi.fn(), audit: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/db/client", () => ({ getDb: () => ({ $transaction: (work: (tx: unknown) => unknown) =>
	work({ shoppingRequest: { findMany: fake.find, updateMany: fake.update }, auditLog: { create: fake.audit } }) }) }));
import { purgeRequestInputText } from "./input-retention";
describe("developer-invoked request text retention", () => {
	beforeEach(() => { vi.resetAllMocks(); fake.find.mockResolvedValue([]); fake.update.mockResolvedValue({ count: 1 }); });
	it("bounds maintenance to fifty final requests in the explicit family scope", async () => {
		expect(await purgeRequestInputText(requestIds.family, requestNow)).toEqual({ cleared: 0 });
		expect(fake.find).toHaveBeenCalledWith({ where: { familyId: requestIds.family, inputText: { not: null },
			status: { in: ["DECLINED", "CANCELLED"] }, updatedAt: { lte: new Date(requestNow.getTime() - 90 * 24 * 60 * 60_000) } },
			select: { id: true }, take: 50, orderBy: { id: "asc" } });
		expect(fake.update).not.toHaveBeenCalled();
	});
	it("clears only selected scoped text and audits the maintenance without its content", async () => {
		fake.find.mockResolvedValue([{ id: requestIds.request }]);
		expect(await purgeRequestInputText(requestIds.family, requestNow)).toEqual({ cleared: 1 });
		expect(fake.update).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ familyId: requestIds.family,
			id: { in: [requestIds.request] } }), data: { inputText: null } }));
		expect(fake.audit).toHaveBeenCalledWith({ data: { familyId: requestIds.family, actorType: "SYSTEM", actorId: requestIds.family,
			action: "request.input_text_cleared", targetType: "Family", targetId: requestIds.family } });
	});
});
