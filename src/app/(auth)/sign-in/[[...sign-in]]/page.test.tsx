import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetClerkMock } from "@/test/mocks/clerk-nextjs";
import SignInPage from "./page";

vi.mock("@clerk/nextjs", () => import("@/test/mocks/clerk-nextjs"));

describe("SignInPage", () => {
  beforeEach(() => {
    resetClerkMock();
  });

  it("renders Clerk's sign-in form under a clear heading", () => {
    render(<SignInPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByTestId("clerk-sign-in")).toBeInTheDocument();
  });

  it("offers a path to account creation", () => {
    render(<SignInPage />);

    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute(
      "href",
      "/sign-up",
    );
  });
});
