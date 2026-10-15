import { fireEvent, render, screen, within } from "@testing-library/react";
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

  it("opens with one clear headline and a fictional product preview", () => {
    render(<HomePage />);

    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(
      "Ask for groceries. Your family handles the rest.",
    );
    expect(screen.getByRole("figure")).toHaveTextContent(/illustrative preview/i);
    expect(screen.getByRole("figure")).toHaveTextContent(/not a real grocery order/i);
  });

  it("moves through the information slides with manual controls", () => {
    render(<HomePage />);

    expect(screen.getByText("Slide 1 of 4: Welcome")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(screen.getByText("Slide 2 of 4: How it works")).toBeInTheDocument();
    const stepTitles = within(screen.getByRole("group", { name: "A clear path from request to review." }))
      .getAllByRole("heading", { level: 3 })
      .map((heading) => heading.textContent);

    expect(stepTitles).toEqual(["Ask", "Check", "Review", "Decide"]);
  });

  it("offers direct access to every slide", () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole("button", { name: "Show For families" }));
    expect(screen.getByText("Slide 3 of 4: For families")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "For the person asking" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "For the family manager" })).toBeInTheDocument();
  });

  it("pauses automatic playback when keyboard users focus slide navigation", () => {
    render(<HomePage />);
    const next = screen.getByRole("button", { name: "Next slide" });
    fireEvent.focus(next);
    expect(screen.getByRole("button", { name: "Play slideshow" })).toBeInTheDocument();
  });

  it("switches to a distinct background for each slide while retaining the page chrome", () => {
    const { container } = render(<HomePage />);
    const backgrounds = Array.from(container.querySelectorAll<HTMLImageElement>('img[alt=""]'));
    expect(backgrounds).toHaveLength(4);
    expect(new Set(backgrounds.map((image) => image.getAttribute("src"))).size).toBe(4);

    for (const [label, filename] of [
      ["How it works", "choosing-groceries"],
      ["For families", "family-review"],
      ["Trust", "home-essentials"],
      ["Welcome", "family-kitchen"],
    ]) {
      fireEvent.click(screen.getByRole("button", { name: `Show ${label}` }));
      const active = backgrounds.find((image) => image.getAttribute("src")?.includes(filename));
      expect(active).toHaveStyle({ opacity: "1" });
      for (const image of backgrounds.filter((image) => image !== active)) {
        expect(image).toHaveStyle({ opacity: "0" });
      }
      expect(screen.getByRole("banner")).toBeInTheDocument();
      expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    }
  });

  it("keeps authentication actions in the minimal header", () => {
    render(<HomePage />);

    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Get Started" })).toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: "Main" })).not.toBeInTheDocument();
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
