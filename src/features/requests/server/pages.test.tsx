import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveServerTree } from "@/test/resolve-server-tree";
import { makeManagerRequest, makeOwnRequest, requestIds, requestManager, requester } from "@/test/factories/requests";
import { AppError } from "@/server/errors";
const fake = vi.hoisted(() => ({ device: vi.fn(), adult: vi.fn(), own: vi.fn(), family: vi.fn(),
	ownList: vi.fn(), familyList: vi.fn(), notFound: vi.fn(), refresh: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ notFound: fake.notFound, useRouter: () => ({ refresh: fake.refresh }) }));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: fake.device }));
vi.mock("@/server/auth/require-adult", () => ({ requireAdult: fake.adult }));
vi.mock("@/features/requests/server/service", () => ({ getOwnRequest: fake.own, getFamilyRequest: fake.family,
	listOwnRequests: fake.ownList, listFamilyRequests: fake.familyList }));
vi.mock("@/features/requests/actions", () => ({ submitRequestAction: vi.fn(), cancelRequestAction: vi.fn(), declineRequestAction: vi.fn(),
	updateRequestItemAction: vi.fn(), removeRequestItemAction: vi.fn() }));
vi.mock("@/features/requests/components/BasketReview/BasketReview", () => ({ BasketReview: () => <h1>Protected shopping draft</h1> }));
import BasketPage from "@/app/(device)/shop/basket/page";
import HistoryPage from "@/app/(device)/shop/requests/page";
import OwnDetailPage from "@/app/(device)/shop/requests/[requestId]/page";
import InboxPage from "@/app/(manager)/family/requests/page";
import ManagerDetailPage from "@/app/(manager)/family/requests/[requestId]/page";

const params = Promise.resolve({ requestId: requestIds.request });
describe("streamed authenticated shopping routes", () => {
	beforeEach(() => {
		vi.resetAllMocks(); fake.device.mockResolvedValue(requester); fake.adult.mockResolvedValue(requestManager);
		fake.ownList.mockResolvedValue({ requests: [], nextCursor: null }); fake.familyList.mockResolvedValue({ requests: [], nextCursor: null });
		fake.own.mockResolvedValue(makeOwnRequest()); fake.family.mockResolvedValue(makeManagerRequest());
		fake.notFound.mockImplementation(() => { throw new Error("NEXT_NOT_FOUND"); });
	});
	it("does not access request-time auth outside Suspense", () => {
		BasketPage(); HistoryPage({ searchParams: Promise.resolve({}) }); OwnDetailPage({ params });
		InboxPage({ searchParams: Promise.resolve({}) }); ManagerDetailPage({ params });
		expect(fake.device).not.toHaveBeenCalled(); expect(fake.adult).not.toHaveBeenCalled();
	});
	it.each(["missing", "revoked", "expired"])("shows reconnect instead of a basket for a %s device", async () => {
		fake.device.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		render(await resolveServerTree(BasketPage()));
		expect(screen.getByRole("link", { name: "Connect Again" })).toHaveAttribute("href", "/connect");
		expect(screen.queryByText("Protected shopping draft")).not.toBeInTheDocument();
	});
	it("requires the actor before reading history", async () => {
		render(await resolveServerTree(HistoryPage({ searchParams: Promise.resolve({}) })));
		expect(fake.ownList).toHaveBeenCalledWith(requester, {});
		expect(fake.device.mock.invocationCallOrder[0]).toBeLessThan(fake.ownList.mock.invocationCallOrder[0]);
	});
	it("maps foreign profile details to the not-found boundary", async () => {
		fake.own.mockRejectedValue(new AppError("NOT_FOUND"));
		await expect(resolveServerTree(OwnDetailPage({ params }))).rejects.toThrow("NEXT_NOT_FOUND");
		expect(fake.notFound).toHaveBeenCalledOnce();
	});
	it("maps foreign family details to the same not-found boundary", async () => {
		fake.family.mockRejectedValue(new AppError("NOT_FOUND"));
		await expect(resolveServerTree(ManagerDetailPage({ params }))).rejects.toThrow("NEXT_NOT_FOUND");
		expect(fake.family).toHaveBeenCalledWith(requestManager, requestIds.request);
	});
	it("protects inbox reads with an adult family role and validates filters", async () => {
		render(await resolveServerTree(InboxPage({ searchParams: Promise.resolve({ status: "PENDING_REVIEW" }) })));
		expect(fake.adult).toHaveBeenCalledWith({ roles: ["OWNER", "MANAGER"] });
		expect(fake.familyList).toHaveBeenCalledWith(requestManager, { status: "PENDING_REVIEW" });
	});
	it("does not swallow redirects or unexpected database failures", async () => {
		fake.adult.mockRejectedValue(new Error("NEXT_REDIRECT"));
		await expect(resolveServerTree(InboxPage({ searchParams: Promise.resolve({}) }))).rejects.toThrow("NEXT_REDIRECT");
		expect(fake.familyList).not.toHaveBeenCalled(); expect(fake.notFound).not.toHaveBeenCalled();
	});
});
