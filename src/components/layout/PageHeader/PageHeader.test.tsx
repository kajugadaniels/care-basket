import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
	it("pairs a labelled back link with the page title", () => {
		render(
			<PageHeader
				title="Add a family member"
				description="A first name is all we need."
				back={{ href: "/family/members", label: "Back to Family Members" }}
			/>,
		);

		expect(screen.getByRole("heading", { level: 1, name: "Add a family member" })).toBeInTheDocument();
		expect(screen.getByText("A first name is all we need.")).toBeInTheDocument();
		const back = screen.getByRole("link", { name: "Back to Family Members" });
		expect(back).toHaveAttribute("href", "/family/members");
		expect(back.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
	});

	it("renders page actions and omits the back link when none is given", () => {
		render(
			<PageHeader
				title="Family Members"
				actions={<Link href="/family/members/add">Add Family Member</Link>}
			/>,
		);

		expect(screen.getAllByRole("link")).toHaveLength(1);
		expect(screen.getByRole("link", { name: "Add Family Member" })).toHaveAttribute("href", "/family/members/add");
	});
});
