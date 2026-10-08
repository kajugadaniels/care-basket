import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { profilesCopy } from "@/features/profiles/copy";

const mocks = vi.hoisted(() => ({ remove: vi.fn() }));
vi.mock("@/features/profiles/actions", () => ({ deleteManagedProfileAction: mocks.remove }));
import { DeleteProfileDialog } from "./DeleteProfileDialog";

const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");

describe("DeleteProfileDialog", () => {
  beforeEach(() => {
    mocks.remove.mockReset();
    // jsdom does not implement modal top-layer/focus behavior. Browser checks cover trapping.
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
      configurable: true, value: function (this: HTMLDialogElement) { this.open = true; },
    });
    Object.defineProperty(HTMLDialogElement.prototype, "close", {
      configurable: true, value: function (this: HTMLDialogElement) {
        this.open = false;
        this.dispatchEvent(new Event("close"));
      },
    });
  });
  afterEach(() => {
    if (originalShowModal) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShowModal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });

  function open() {
    render(<DeleteProfileDialog profileId="profile-rose" displayName="Rose" />);
    const trigger = screen.getByRole("button", { name: profilesCopy.remove });
    fireEvent.click(trigger);
    return { trigger, dialog: screen.getByRole("dialog", { name: "Remove Rose?" }) };
  }
  it("identifies the person, explains permanence, and requires an unchecked confirmation", () => {
    const { dialog } = open();
    expect(dialog).toHaveAccessibleDescription(profilesCopy.removeText("Rose"));
    expect(within(dialog).getByRole("checkbox")).not.toBeChecked();
    expect(within(dialog).getByRole("button", { name: profilesCopy.remove })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: profilesCopy.cancel })).toHaveFocus();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("returns focus to the trigger after cancellation without deleting", () => {
    const { trigger, dialog } = open();
    fireEvent.click(within(dialog).getByRole("button", { name: profilesCopy.cancel }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("closes on the native Escape cancel event and returns focus", () => {
    const { trigger, dialog } = open();
    fireEvent(dialog, new Event("cancel", { bubbles: false, cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(mocks.remove).not.toHaveBeenCalled();
  });
  it("sends explicit confirmation and prevents repeated deletion", async () => {
    mocks.remove.mockReturnValue(new Promise(() => undefined));
    const { dialog } = open();
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: profilesCopy.remove }));
    const button = await within(dialog).findByRole("button", { name: profilesCopy.removing });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(mocks.remove).toHaveBeenCalledWith({ profileId: "profile-rose", confirmed: true });
    fireEvent.click(button);
    expect(mocks.remove).toHaveBeenCalledTimes(1);
  });
  it("shows and focuses safe errors without closing the dialog", async () => {
    mocks.remove.mockResolvedValue({ ok: false, error: { code: "INTERNAL", message: profilesCopy.errors.internal } });
    const { dialog } = open();
    fireEvent.click(within(dialog).getByRole("checkbox"));
    fireEvent.click(within(dialog).getByRole("button", { name: profilesCopy.remove }));
    const error = await within(dialog).findByRole("alert");
    expect(error).toHaveTextContent(profilesCopy.errors.internal);
    expect(error).toHaveFocus();
    expect(dialog).toBeVisible();
  });
});
