import { render, screen } from "@testing-library/react";
import Link from "next/link";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";
import styles from "./PageHeader.module.css";

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
		expect(screen.getByRole("banner")).toHaveClass(styles.withActions);
	});

	it.each([undefined, null, false, "", 0, BigInt(0)])("omits the action layout for falsy actions: %s", (actions) => {
		render(<PageHeader title="Family Members" actions={actions} />);

		const header = screen.getByRole("banner");
		expect(header).not.toHaveClass(styles.withActions);
		expect(header.querySelector(`.${styles.actions}`)).not.toBeInTheDocument();
		expect(header).toHaveTextContent(/^Family Members$/);
	});
});
