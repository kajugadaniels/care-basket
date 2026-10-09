import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FamilyNavMenu } from "./FamilyNavMenu";

describe("FamilyNavMenu", () => {
	it("renders every link unmarked while the current path is unknown", () => {
		render(<FamilyNavMenu />);

		const links = screen.getAllByRole("link");
		expect(links.map((link) => link.getAttribute("href"))).toEqual([
			"/family",
			"/family/members",
			"/family/devices",
			"/family/catalog",
			"/family/requests",
		]);
		for (const link of links) {
			expect(link).not.toHaveAttribute("aria-current");
		}
	});

	it.each(["/family/requests", "/family/requests/request-id"])(
		"marks only Requests active at %s",
		(pathname) => {
			render(<FamilyNavMenu pathname={pathname} />);

			const requestsLink = screen.getByRole("link", { name: "Requests" });
			expect(requestsLink).toHaveAttribute("href", "/family/requests");
			expect(requestsLink).toHaveAttribute("aria-current", "page");
			for (const link of screen.getAllByRole("link")) {
				if (link !== requestsLink) {
					expect(link).not.toHaveAttribute("aria-current");
				}
			}
		},
	);

	it("marks only the overview on the overview path", () => {
		render(<FamilyNavMenu pathname="/family" />);

		expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "Family Members" })).not.toHaveAttribute("aria-current");
	});
});
