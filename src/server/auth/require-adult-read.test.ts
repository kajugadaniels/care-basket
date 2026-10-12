// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestManager } from "@/test/factories/requests";

const fake = vi.hoisted(() => ({ auth: vi.fn(), find: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@clerk/nextjs/server", () => ({ auth: fake.auth }));
vi.mock("@/server/users/user-repository", () => ({ findExistingAdultByClerkId: fake.find }));
import { requireAdultRead } from "./require-adult-read";

describe("read-only adult API authentication", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.auth.mockResolvedValue({ userId: "clerk-current-manager" });
		fake.find.mockResolvedValue({ id: requestManager.userId, membership: { familyId: requestManager.familyId, role: "OWNER" } });
	});

	it.each(["OWNER", "MANAGER"] as const)("resolves the %s actor from the verified session only", async (role) => {
		fake.find.mockResolvedValue({ id: requestManager.userId, membership: { familyId: requestManager.familyId, role } });
		expect(await requireAdultRead()).toEqual({ ...requestManager, role });
		expect(fake.find).toHaveBeenCalledWith("clerk-current-manager");
	});

	it("rejects a missing adult session, including device-only sessions, before reading the database", async () => {
		fake.auth.mockResolvedValue({ userId: null });
		await expect(requireAdultRead()).rejects.toMatchObject({ code: "UNAUTHENTICATED" });
		expect(fake.find).not.toHaveBeenCalled();
	});

	it.each([null, { id: requestManager.userId, membership: null },
		{ id: requestManager.userId, membership: { familyId: requestManager.familyId, role: "REQUESTER" } }])(
		"never creates missing users or grants access without a manager membership (%j)", async (user) => {
			fake.find.mockResolvedValue(user);
			await expect(requireAdultRead()).rejects.toMatchObject({ code: "FORBIDDEN" });
		},
	);
});
