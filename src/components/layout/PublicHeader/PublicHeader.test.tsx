import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetClerkMock, setSignedIn } from "@/test/mocks/clerk-nextjs";
import { PublicHeader } from "./PublicHeader";

vi.mock("@clerk/nextjs", () => import("@/test/mocks/clerk-nextjs"));

describe("PublicHeader", () => {
  beforeEach(() => {
    resetClerkMock();
  });

  it("starts with a skip link to the main content", () => {
    render(<PublicHeader />);

    const [firstLink] = screen.getAllByRole("link");
    expect(firstLink).toHaveAccessibleName("Skip to main content");
    expect(firstLink).toHaveAttribute("href", "#main-content");
  });

  it("links the brand to the home page", () => {
    render(<PublicHeader />);

    expect(screen.getByRole("link", { name: "CareBasket" })).toHaveAttribute("href", "/");
  });

  it("labels the main navigation and links to the landing sections", () => {
    render(<PublicHeader />);

    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "How it works" })).toHaveAttribute(
      "href",
      "#how-it-works",
    );
    expect(within(nav).getByRole("link", { name: "For families" })).toHaveAttribute(
      "href",
      "#families",
    );
  });

  describe("when signed out", () => {
    it("offers sign-in and account creation links", () => {
      render(<PublicHeader />);

      expect(screen.getByRole("link", { name: "Sign In" })).toHaveAttribute("href", "/sign-in");
      expect(screen.getByRole("link", { name: "Get Started" })).toHaveAttribute(
        "href",
        "/sign-up",
      );
    });

    it("shows no family link or account menu", () => {
      render(<PublicHeader />);

      expect(screen.queryByRole("link", { name: "My Family" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Open account menu" })).not.toBeInTheDocument();
    });
  });

  describe("when signed in", () => {
    beforeEach(() => {
      setSignedIn(true);
    });

    it("links to the family workspace and shows the account menu", () => {
      render(<PublicHeader />);

      expect(screen.getByRole("link", { name: "My Family" })).toHaveAttribute("href", "/family");
      expect(screen.getByRole("button", { name: "Open account menu" })).toBeInTheDocument();
    });

    it("hides the sign-in and account creation links", () => {
      render(<PublicHeader />);

      expect(screen.queryByRole("link", { name: "Sign In" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Get Started" })).not.toBeInTheDocument();
    });
  });
});
