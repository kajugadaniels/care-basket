import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetClerkMock } from "@/test/mocks/clerk-nextjs";
import HomePage from "./page";

// The public header reads the Clerk session; these tests use the signed-out state.
vi.mock("@clerk/nextjs", () => import("@/test/mocks/clerk-nextjs"));
// The auth dialog opener reads the query string; no dialog is requested here.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("HomePage", () => {
  beforeEach(() => {
    resetClerkMock();
  });

  it("shows the hero headline as the only level-one heading", () => {
    render(<HomePage />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(
      "Just tell us what you need. Your family takes care of the rest.",
    );
  });

  it("offers one primary action that leads to How CareBasket works", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "See How It Works" })).toHaveAttribute(
      "href",
      "#how-it-works",
    );
  });

  it("lists the four steps in order", () => {
    render(<HomePage />);

    const section = screen.getByRole("region", { name: "How CareBasket works" });
    const stepTitles = within(section)
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(stepTitles).toEqual([
      "Say what you need.",
      "CareBasket prepares your basket.",
      "Your family reviews the request.",
      "They can approve payment through PayPal.",
    ]);
  });

  it("explains both family experiences", () => {
    render(<HomePage />);

    const section = screen.getByRole("region", { name: "Built for families" });
    expect(within(section).getByText("No complicated account registration")).toBeInTheDocument();
    expect(within(section).getByText("Decide whether to pay")).toBeInTheDocument();
  });

  it("labels the product preview as an illustration, not a working feature", () => {
    render(<HomePage />);

    expect(screen.getByRole("figure")).toHaveTextContent(/illustrative preview/i);
    expect(screen.getByRole("figure")).toHaveTextContent(/not a working feature/i);
  });

  it("points every in-page link at an element that exists", () => {
    const { container } = render(<HomePage />);

    const anchors = container.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) {
      const targetId = anchor.getAttribute("href")?.slice(1) ?? "";
      expect(container.querySelector(`#${targetId}`)).not.toBeNull();
    }
  });

  it("has no actions besides the sign-in and sign-up dialog buttons", () => {
    render(<HomePage />);

    const buttonNames = screen.getAllByRole("button").map((button) => button.textContent);
    expect(buttonNames).toEqual(["Sign In", "Get Started"]);
    expect(within(screen.getByRole("main")).queryAllByRole("button")).toHaveLength(0);
  });

  it("discloses the hackathon demo and PayPal independence in the footer", () => {
    render(<HomePage />);

    const footer = screen.getByRole("contentinfo");
    expect(within(footer).getByText(/PayPal AI Hackathon 2026/)).toBeInTheDocument();
    expect(
      within(footer).getByText(/not affiliated with or endorsed by PayPal/),
    ).toBeInTheDocument();
  });
});
