import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeDeviceActor } from "@/test/factories/devices";
import { resolveServerTree } from "@/test/resolve-server-tree";
import { AppError } from "@/server/errors";
import { assistantCopy } from "@/features/assistant/copy";
import type { Proposal } from "@/features/assistant/types";

const fake = vi.hoisted(() => ({ device: vi.fn(), review: vi.fn(), restore: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: fake.device }));
vi.mock("@/features/assistant/server/saved-review", () => ({ restoreShoppingReview: fake.restore }));
vi.mock("@/features/assistant/components/ProposalReview/ProposalReviewScreen", () => ({
	ProposalReviewScreen: ({ savedProposal }: { savedProposal?: Proposal | null }) => {
		fake.review(savedProposal);
		return <h1>{assistantCopy.review}</h1>;
	},
}));

import ReviewPage, { metadata } from "./page";

describe("dedicated assistant review route", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.device.mockResolvedValue(makeDeviceActor());
		fake.restore.mockResolvedValue(null);
	});

	it("streams device authentication with a review-specific title", () => {
		expect(ReviewPage().type).toBe(Suspense);
		expect(fake.device).not.toHaveBeenCalled();
		expect(metadata.title).toBe(assistantCopy.reviewPageTitle);
	});

	it.each(["ASSISTED_ADULT", "CHILD"] as const)("authenticates the %s device before showing the budget-free review", async (profileKind) => {
		fake.device.mockResolvedValue({ ...makeDeviceActor(), profileKind });
		render(await resolveServerTree(ReviewPage()));
		expect(fake.device).toHaveBeenCalledOnce();
		expect(fake.review).toHaveBeenCalledExactlyOnceWith(undefined);
		expect(fake.restore).not.toHaveBeenCalled();
	});

	it("restores the URL's private review below Suspense on a fresh request", async () => {
		const id = "0199a100-0000-7000-8000-000000000007";
		const proposal: Proposal = { reviewId: id, inputMode: "TEXT", inputText: "milk", local: true,
			budgetMinor: null, items: [], questions: [], unrecognized: [] };
		fake.restore.mockResolvedValue(proposal);
		const page = ReviewPage({ searchParams: Promise.resolve({ review: id }) });
		expect(page.type).toBe(Suspense);
		expect(fake.restore).not.toHaveBeenCalled();
		render(await resolveServerTree(page));
		expect(fake.restore).toHaveBeenCalledExactlyOnceWith(makeDeviceActor(), id);
		expect(fake.review).toHaveBeenCalledExactlyOnceWith(proposal);
		expect(fake.device.mock.invocationCallOrder[0]).toBeLessThan(fake.restore.mock.invocationCallOrder[0]);
	});

	it.each(["invalid", "expired", "another-device", "another-family"])("uses recovery for an %s lookup instead of in-memory data", async (id) => {
		render(await resolveServerTree(ReviewPage({ searchParams: Promise.resolve({ review: id }) })));
		expect(fake.review).toHaveBeenCalledExactlyOnceWith(null);
	});

	it.each(["missing", "expired", "revoked"])("shows reconnect instead of review for a %s device", async () => {
		fake.device.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		render(await resolveServerTree(ReviewPage({ searchParams: Promise.resolve({ review: "0199a100-0000-7000-8000-000000000007" }) })));
		expect(fake.review).not.toHaveBeenCalled();
		expect(fake.restore).not.toHaveBeenCalled();
		expect(screen.getByRole("link", { name: "Connect Again" })).toHaveAttribute("href", "/connect");
	});

	it("leaves unexpected failures to the inherited error boundary", async () => {
		const error = new Error("unavailable");
		fake.device.mockRejectedValue(error);
		await expect(resolveServerTree(ReviewPage())).rejects.toBe(error);
	});
});
