import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FamilyLayout from "./layout";

vi.mock("@clerk/nextjs", () => import("@/test/mocks/clerk-nextjs"));
vi.mock("next/navigation", () => ({ usePathname: () => "/family" }));

function renderLayout() {
  return render(
    <FamilyLayout>
      <p>Dashboard content</p>
    </FamilyLayout>,
  );
}

describe("FamilyLayout", () => {
  it("starts with a skip link to the family main content", () => {
    renderLayout();

    const [firstLink] = screen.getAllByRole("link");
    expect(firstLink).toHaveAccessibleName("Skip to main content");
    expect(firstLink).toHaveAttribute("href", "#family-main");
  });

  it("renders page content inside the main landmark", () => {
    renderLayout();

    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "family-main");
    expect(within(main).getByText("Dashboard content")).toBeInTheDocument();
  });

  it("labels the family navigation and marks the current page", () => {
    renderLayout();

    const nav = screen.getByRole("navigation", { name: "Family manager" });
    const overview = within(nav).getByRole("link", { name: "Overview" });
    expect(overview).toHaveAttribute("href", "/family");
    expect(overview).toHaveAttribute("aria-current", "page");
  });

  it("offers the Clerk account menu", () => {
    renderLayout();

    expect(screen.getByRole("button", { name: "Open account menu" })).toBeInTheDocument();
  });

  it("links only to implemented routes", () => {
    renderLayout();

    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(new Set(hrefs)).toEqual(new Set(["#family-main", "/family"]));
  });
});
