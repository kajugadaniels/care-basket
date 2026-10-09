import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { profilesCopy } from "@/features/profiles/copy";
import { ProfileList } from "./ProfileList";
import { ProfileListSkeleton } from "./ProfileListSkeleton";

describe("ProfileList", () => {
  it("shows a helpful empty state without repeating the page's add action", () => {
    render(<ProfileList profiles={[]} />);
    expect(screen.getByRole("heading", { name: "Who would you like to help?" })).toBeInTheDocument();
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
    expect(within(rose).getByText("Assisted Adult")).toBeInTheDocument();
    expect(within(rose).getByRole("link", { name: "View Profile" })).toHaveAttribute("href", "/family/members/rose");
    expect(within(screen.getByRole("article", { name: "Sam" })).getByText("Child")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByText(/balance|requests received|device connected/i)).not.toBeInTheDocument();
  });
});
