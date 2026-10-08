import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetClerkMock, setClerkStatus } from "@/test/mocks/clerk-nextjs";
import { AuthShell } from "./AuthShell";

vi.mock("@clerk/nextjs", () => import("@/test/mocks/clerk-nextjs"));

function renderShell() {
  return render(
    <AuthShell
      title="Welcome back"
      description="Sign in to look after your family's shopping requests."
      switchPrompt="New to CareBasket?"
      switchLabel="Create an account"
      switchHref="/sign-up"
    >
      <div data-testid="clerk-form" />
    </AuthShell>,
  );
}

describe("AuthShell", () => {
  beforeEach(() => {
    resetClerkMock();
  });

  it("shows the page heading inside the main landmark", () => {
    renderShell();

    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { level: 1, name: "Welcome back" }),
    );
  });

  it("links back to the home page and to the other auth page", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });

  it("renders the Clerk form it is given", () => {
    renderShell();

    expect(screen.getByTestId("clerk-form")).toBeInTheDocument();
  });

  it("announces a loading state while Clerk loads", () => {
    setClerkStatus("loading");
    renderShell();

    expect(screen.getByRole("status")).toHaveTextContent("Loading the secure form");
  });

  it("explains how to recover when Clerk fails to load", () => {
    setClerkStatus("failed");
    renderShell();

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't load this form.");
  });
});
