import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetClerkMock } from "@/test/mocks/clerk-nextjs";
import SignUpPage from "./page";

vi.mock("@clerk/nextjs", () => import("@/test/mocks/clerk-nextjs"));

describe("SignUpPage", () => {
  beforeEach(() => {
    resetClerkMock();
  });

  it("renders Clerk's sign-up form for family managers", () => {
    render(<SignUpPage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Create your family manager account" }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("clerk-sign-up")).toBeInTheDocument();
  });

  it("states that accounts are for adults without claiming any age verification", () => {
    render(<SignUpPage />);

    expect(screen.getByText("Family manager accounts are for adults.")).toBeInTheDocument();
    expect(screen.queryByText(/verified/i)).not.toBeInTheDocument();
  });

  it("links to sign-in for existing account holders", () => {
    render(<SignUpPage />);

    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  });
});
