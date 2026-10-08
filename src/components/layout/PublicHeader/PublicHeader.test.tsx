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
    it("offers buttons that open the sign-in and sign-up dialogs", () => {
      render(<PublicHeader />);

      const signIn = screen.getByRole("button", { name: "Sign In" });
      const getStarted = screen.getByRole("button", { name: "Get Started" });
      expect(signIn).toHaveAttribute("aria-haspopup", "dialog");
      expect(getStarted).toHaveAttribute("aria-haspopup", "dialog");
      expect(signIn.closest("[data-clerk-dialog]")).toHaveAttribute("data-clerk-dialog", "sign-in");
      expect(getStarted.closest("[data-clerk-dialog]")).toHaveAttribute(
        "data-clerk-dialog",
        "sign-up",
      );
    });

    it("opens both dialogs in modal mode rather than on a separate page", () => {
      render(<PublicHeader />);

      for (const trigger of document.querySelectorAll("[data-clerk-dialog]")) {
        expect(trigger).toHaveAttribute("data-mode", "modal");
      }
      expect(screen.queryByRole("link", { name: /sign in|get started/i })).not.toBeInTheDocument();
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

    it("hides the sign-in and sign-up buttons", () => {
      render(<PublicHeader />);

      expect(screen.queryByRole("button", { name: "Sign In" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Get Started" })).not.toBeInTheDocument();
    });
  });
});
