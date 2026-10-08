import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateFamilyFormState } from "@/features/family/types";

const mocks = vi.hoisted(() => ({ createFamilyAction: vi.fn() }));

vi.mock("@/features/family/actions", () => ({ createFamilyAction: mocks.createFamilyAction }));

import { CreateFamilyForm } from "./CreateFamilyForm";

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Create My Family" }));
}

describe("CreateFamilyForm", () => {
  beforeEach(() => {
    mocks.createFamilyAction.mockReset();
  });

  it("asks only for a family name and a display name", () => {
    render(<CreateFamilyForm defaultDisplayName="" />);

    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByRole("textbox", { name: "Family name" })).toHaveAccessibleDescription(
      "For example, Jane's Family",
    );
    expect(screen.getByRole("textbox", { name: "Your display name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create My Family" })).toBeEnabled();
  });

  it("prefills the display name from the adult's first name", () => {
    render(<CreateFamilyForm defaultDisplayName="Jane" />);

    expect(screen.getByRole("textbox", { name: "Your display name" })).toHaveValue("Jane");
  });

  it("shows field errors, keeps the input, and focuses the first invalid field", async () => {
    const errorState: CreateFamilyFormState = {
      values: { familyName: "J", displayName: "Jane" },
      error: {
        code: "VALIDATION_FAILED",
        message: "Please check the highlighted fields.",
        fieldErrors: { familyName: ["Use at least 2 characters."] },
      },
    };
    mocks.createFamilyAction.mockResolvedValue(errorState);
    render(<CreateFamilyForm defaultDisplayName="Jane" />);

    submit();

    expect(await screen.findByText("Use at least 2 characters.")).toBeInTheDocument();
    const familyName = screen.getByRole("textbox", { name: "Family name" });
    expect(familyName).toHaveAttribute("aria-invalid", "true");
    expect(familyName).toHaveAccessibleDescription(
      "For example, Jane's Family Use at least 2 characters.",
    );
    expect(familyName).toHaveValue("J");
    await waitFor(() => expect(familyName).toHaveFocus());
  });

  it("shows a general error when the problem is not a specific field", async () => {
    mocks.createFamilyAction.mockResolvedValue({
      values: { familyName: "Jane's Family", displayName: "Jane" },
      error: {
        code: "INTERNAL",
        message: "We couldn't create your family. Please try again in a moment.",
      },
    } satisfies CreateFamilyFormState);
    render(<CreateFamilyForm defaultDisplayName="Jane" />);

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't create your family. Please try again in a moment.",
    );
  });

  it("disables the button while sending, so the form cannot be submitted twice", async () => {
    mocks.createFamilyAction.mockReturnValue(new Promise(() => undefined));
    render(<CreateFamilyForm defaultDisplayName="Jane" />);

    submit();

    const button = await screen.findByRole("button", { name: "Creating your family…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
