import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { profilesCopy } from "@/features/profiles/copy";
import { ProfileList } from "./ProfileList";
import { ProfileListSkeleton } from "./ProfileListSkeleton";

describe("ProfileList", () => {
  it("shows a helpful empty state without repeating the page's add action", () => {
    render(<ProfileList profiles={[]} />);
    expect(screen.getByRole("heading", { name: "Who would you like to help?" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: profilesCopy.emptyTitle })).toHaveTextContent(profilesCopy.emptyText);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("announces loading while its placeholder cards stay out of the accessibility tree", () => {
    render(<ProfileListSkeleton />);
    expect(screen.getByRole("status")).toHaveTextContent(profilesCopy.loading);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
  it("renders real profile cards with names, types, and scoped detail links", () => {
    render(<ProfileList profiles={[
      { id: "rose", displayName: "Rose", kind: "ASSISTED_ADULT", avatarKey: "flower", createdAt: "2026-10-08T12:00:00Z" },
      { id: "sam", displayName: "Sam", kind: "CHILD", avatarKey: "sun", createdAt: "2026-10-08T12:00:00Z" },
    ]} />);
    const rose = screen.getByRole("article", { name: "Rose" });
		expect(screen.getByRole("list", { name: profilesCopy.title })).toBeInTheDocument();
		expect(within(rose).getByRole("heading", { level: 2, name: "Rose" })).toBeInTheDocument();
    expect(within(rose).getByText("Assisted Adult")).toBeInTheDocument();
    expect(within(rose).getByRole("link", { name: "View Profile" })).toHaveAttribute("href", "/family/members/rose");
    expect(within(screen.getByRole("article", { name: "Sam" })).getByText("Child")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText(/balance|requests received|device connected/i)).not.toBeInTheDocument();
  });
	it("keeps the directory free of repeated headings, explanations, and metadata", () => {
		render(<ProfileList profiles={[
			{ id: "rose", displayName: "Rose", kind: "ASSISTED_ADULT", avatarKey: "flower", createdAt: "2026-10-08T12:00:00Z" },
		]} />);

		const card = screen.getByRole("article", { name: "Rose" });
		expect(screen.getAllByRole("heading")).toHaveLength(1);
		expect(within(card).getAllByRole("link")).toHaveLength(1);
		expect(within(card).queryByRole("button")).not.toBeInTheDocument();
		expect(screen.queryByText("Member profiles")).not.toBeInTheDocument();
		expect(screen.queryByText(/choose a profile|shopping with/i)).not.toBeInTheDocument();
		expect(screen.queryByText(profilesCopy.createdLabel)).not.toBeInTheDocument();
	});
	it("keeps long names and duplicate display names attached to distinct profiles", () => {
		const displayName = "Alexandria Catherine Montgomery Williams";
		render(<ProfileList profiles={[
			{ id: "first", displayName, kind: "ASSISTED_ADULT", avatarKey: "leaf", createdAt: "2026-10-08T23:30:00-07:00" },
			{ id: "second", displayName, kind: "CHILD", avatarKey: "smile", createdAt: "2026-10-08T12:00:00Z" },
		]} />);

		const cards = screen.getAllByRole("article", { name: displayName });
		expect(cards).toHaveLength(2);
		expect(within(cards[0]).getByRole("link", { name: profilesCopy.view })).toHaveAttribute("href", "/family/members/first");
		expect(within(cards[1]).getByRole("link", { name: profilesCopy.view })).toHaveAttribute("href", "/family/members/second");
		expect(cards[0].getAttribute("aria-labelledby")).not.toBe(cards[1].getAttribute("aria-labelledby"));
	});
});
