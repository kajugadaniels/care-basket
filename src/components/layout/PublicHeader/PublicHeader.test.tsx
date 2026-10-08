import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PublicHeader } from "./PublicHeader";

describe("PublicHeader", () => {
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

  it("does not link to authentication routes that do not exist yet", () => {
    render(<PublicHeader />);

    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/sign-(in|up)/);
    }
  });
});
