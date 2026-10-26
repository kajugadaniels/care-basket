import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CreateFamilyFormState } from "@/features/family/types";

const mocks = vi.hoisted(() => ({ createFamilyAction: vi.fn(), replace: vi.fn() }));

vi.mock("@/features/family/actions", () => ({ createFamilyAction: mocks.createFamilyAction }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));

import { CreateFamilyForm } from "./CreateFamilyForm";
import { familySetupCopy } from "@/features/family/copy";

function submit() {
  fireEvent.click(screen.getByRole("button", { name: "Create My Family" }));
}

describe("CreateFamilyForm", () => {
  beforeEach(() => {
    mocks.createFamilyAction.mockReset();
		mocks.replace.mockReset();
  });

  it("asks for two names and explicit adult confirmation, without birth dates", () => {
    render(<CreateFamilyForm defaultDisplayName="" />);

    expect(screen.getAllByRole("textbox")).toHaveLength(2);
    expect(screen.getByRole("textbox", { name: "Family name" })).toHaveAccessibleDescription(
      "For example, Jane's Family",
    );
    expect(screen.getByRole("textbox", { name: "Your display name" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create My Family" })).toBeEnabled();
		const consent = screen.getByRole("checkbox", { name: familySetupCopy.adultConfirmation });
		expect(consent).not.toBeChecked();
		expect(consent).toBeRequired();
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
		created: false,
		feedback: null,
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
		created: false,
		feedback: null,
    } satisfies CreateFamilyFormState);
    render(<CreateFamilyForm defaultDisplayName="Jane" />);

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't create your family. Please try again in a moment.",
    );
  });

	it("describes and focuses an unconfirmed adult-access checkbox", async () => {
		mocks.createFamilyAction.mockResolvedValue({
			values: { familyName: "Jane's Family", displayName: "Jane" },
			error: {
				code: "VALIDATION_FAILED", message: "Please check the highlighted fields.",
				fieldErrors: { adultConfirmed: [familySetupCopy.adultConfirmationError] },
			},
			created: false,
			feedback: null,
		} satisfies CreateFamilyFormState);
		render(<CreateFamilyForm defaultDisplayName="Jane" />);
		submit();
		const consent = screen.getByRole("checkbox", { name: familySetupCopy.adultConfirmation });
		await waitFor(() => expect(consent).toHaveFocus());
		expect(consent).toHaveAccessibleDescription(
			`${familySetupCopy.adultConfirmationHint} ${familySetupCopy.adultConfirmationError}`,
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

	it("announces success before opening the family dashboard", async () => {
		mocks.createFamilyAction.mockResolvedValue({
			values: { familyName: "Jane's Family", displayName: "Jane" },
			error: null,
			created: true,
			feedback: { kind: "success", message: familySetupCopy.created },
		} satisfies CreateFamilyFormState);
		render(<CreateFamilyForm defaultDisplayName="Jane" />);

		submit();

		await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/family"));
	});
});
