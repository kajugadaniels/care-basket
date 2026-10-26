import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { profilesCopy } from "@/features/profiles/copy";
import type { ProfileMutationResult } from "@/features/profiles/types";

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), push: vi.fn() }));
vi.mock("@/features/profiles/actions", () => ({
  createManagedProfileAction: mocks.create, updateManagedProfileAction: mocks.update,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
import { ProfileForm } from "./ProfileForm";

describe("ProfileForm", () => {
  beforeEach(() => { mocks.create.mockReset(); mocks.update.mockReset(); mocks.push.mockReset(); });
  it("asks only for name, type, a preset avatar, and explicit consent", () => {
    render(<ProfileForm />);
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.getByRole("textbox", { name: profilesCopy.nameLabel })).toHaveAccessibleDescription(profilesCopy.nameHint);
    expect(screen.getByRole("group", { name: "Profile type" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Choose an avatar" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: profilesCopy.consent })).not.toBeChecked();
		expect(screen.queryByRole("radio", { name: /^Child/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: /email|phone|birth|address/i })).not.toBeInTheDocument();
  });
  it("uses accessible native radios for profile type and avatars", () => {
    render(<ProfileForm />);
    const adult = screen.getByRole("radio", { name: /^Assisted Adult/ });
    fireEvent.click(adult);
    expect(adult).toBeChecked();
    const flower = screen.getByRole("radio", { name: /^Flower/ });
    fireEvent.click(flower);
    expect(flower).toBeChecked();
    expect(screen.getByRole("radio", { name: /^Smile/ })).not.toBeChecked();
  });
  it("describes radio validation on the native fieldset group", async () => {
    mocks.create.mockResolvedValue({ ok: false, error: {
      code: "VALIDATION_FAILED", message: profilesCopy.validationSummary,
      fieldErrors: { kind: [profilesCopy.errors.kind] },
    } });
    render(<ProfileForm />);
    fireEvent.click(screen.getByRole("button", { name: profilesCopy.add }));
    const group = screen.getByRole("group", { name: profilesCopy.kindLabel });
    await waitFor(() => expect(group).toHaveAccessibleDescription(profilesCopy.errors.kind));
    expect(screen.getByRole("radio", { name: /^Assisted Adult/ })).not.toHaveAttribute("aria-invalid");
  });
  it("preserves input and choices, shows errors, and focuses the invalid field", async () => {
    mocks.create.mockResolvedValue({ ok: false, error: {
      code: "VALIDATION_FAILED", message: profilesCopy.validationSummary,
      fieldErrors: { displayName: [profilesCopy.errors.nameUnsafe] },
    } });
    render(<ProfileForm />);
    const name = screen.getByRole("textbox", { name: profilesCopy.nameLabel });
    fireEvent.change(name, { target: { value: "Rose" } });
    fireEvent.click(screen.getByRole("radio", { name: /^Assisted Adult/ }));
    fireEvent.click(screen.getByRole("radio", { name: /^Flower/ }));
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: profilesCopy.add }));
    expect(await screen.findByRole("alert")).toHaveTextContent(profilesCopy.validationSummary);
    expect(name).toHaveValue("Rose");
    await waitFor(() => expect(name).toHaveFocus());
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription(`${profilesCopy.nameHint} ${profilesCopy.errors.nameUnsafe}`);
    expect(screen.getByRole("radio", { name: /^Assisted Adult/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /^Flower/ })).toBeChecked();
    expect(screen.getByRole("checkbox")).toBeChecked();
    expect(mocks.create).toHaveBeenCalledWith({ displayName: "Rose", kind: "ASSISTED_ADULT", avatarKey: "flower", consent: true });
  });
  it("keeps progress in the submit button and prevents repeat submissions", async () => {
    let resolveRequest!: (value: ProfileMutationResult) => void;
    mocks.create.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve; }));
    render(<ProfileForm />);
    fireEvent.click(screen.getByRole("button", { name: profilesCopy.add }));
    const button = await screen.findByRole("button", { name: profilesCopy.adding });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.click(button);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    await act(async () => { resolveRequest({
		ok: true,
		data: { profileId: "profile-rose" },
		feedback: { kind: "success", message: "Rose was added to your family." },
	}); });
		await waitFor(() => expect(mocks.push).toHaveBeenCalledWith("/family/members/profile-rose"));
  });
  it("keeps the type immutable and omits consent and permission fields during editing", async () => {
    mocks.update.mockResolvedValue({ ok: false, error: { code: "INTERNAL", message: profilesCopy.errors.internal } });
    render(<ProfileForm profile={{ id: "profile-rose", displayName: "Rose", kind: "CHILD", avatarKey: "sun", createdAt: "2026-10-08T12:00:00Z" }} />);
    expect(screen.queryByRole("group", { name: "Profile type" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rosie" } });
    fireEvent.click(screen.getByRole("button", { name: profilesCopy.save }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith({ profileId: "profile-rose", displayName: "Rosie", avatarKey: "sun" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
  });
});
