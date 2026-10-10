import { Suspense } from "react";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { makeDeviceActor } from "@/test/factories/devices";
import { resolveServerTree } from "@/test/resolve-server-tree";
import { AppError } from "@/server/errors";
import { assistantCopy } from "@/features/assistant/copy";

const fake = vi.hoisted(() => ({ device: vi.fn(), review: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/server/auth/require-device", () => ({ requireDevice: fake.device }));
vi.mock("@/features/assistant/components/ProposalReview/ProposalReviewScreen", () => ({
	ProposalReviewScreen: (props: { child: boolean }) => {
		fake.review(props);
		return <h1>{assistantCopy.review}</h1>;
	},
}));

import ReviewPage, { metadata } from "./page";

describe("dedicated assistant review route", () => {
	beforeEach(() => {
		vi.resetAllMocks();
		fake.device.mockResolvedValue(makeDeviceActor());
	});

	it("streams device authentication with a review-specific title", () => {
		expect(ReviewPage().type).toBe(Suspense);
		expect(fake.device).not.toHaveBeenCalled();
		expect(metadata.title).toBe(assistantCopy.reviewPageTitle);
	});

	it.each(["ASSISTED_ADULT", "CHILD"] as const)("derives child controls from the %s device actor", async (profileKind) => {
		fake.device.mockResolvedValue({ ...makeDeviceActor(), profileKind });
		render(await resolveServerTree(ReviewPage()));
		expect(fake.review).toHaveBeenCalledExactlyOnceWith({ child: profileKind === "CHILD" });
	});

	it.each(["missing", "expired", "revoked"])("shows reconnect instead of review for a %s device", async () => {
		fake.device.mockRejectedValue(new AppError("UNAUTHENTICATED"));
		render(await resolveServerTree(ReviewPage()));
		expect(fake.review).not.toHaveBeenCalled();
		expect(screen.getByRole("link", { name: "Connect Again" })).toHaveAttribute("href", "/connect");
	});

	it("leaves unexpected failures to the inherited error boundary", async () => {
		const error = new Error("unavailable");
		fake.device.mockRejectedValue(error);
		await expect(resolveServerTree(ReviewPage())).rejects.toBe(error);
	});
});
