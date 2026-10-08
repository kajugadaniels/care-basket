import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ revoke: vi.fn() }));
vi.mock("../../actions", () => ({ revokeDeviceAction: fake.revoke }));
import { RevokeDeviceDialog } from "./RevokeDeviceDialog";
const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "showModal");
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, "close");
describe("device revocation confirmation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    Object.defineProperty(HTMLDialogElement.prototype, "showModal", { configurable: true, value: function (this: HTMLDialogElement) { this.open = true; } });
    Object.defineProperty(HTMLDialogElement.prototype, "close", { configurable: true, value: function (this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event("close")); } });
  });
  afterEach(() => {
    if (originalShow) Object.defineProperty(HTMLDialogElement.prototype, "showModal", originalShow); else Reflect.deleteProperty(HTMLDialogElement.prototype, "showModal");
    if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, "close", originalClose); else Reflect.deleteProperty(HTMLDialogElement.prototype, "close");
  });
  function open() {
    render(<RevokeDeviceDialog deviceId="test-device" label="Rose's tablet" />);
    const trigger = screen.getByRole("button", { name: "Disconnect Device" }); fireEvent.click(trigger);
    return { trigger, dialog: screen.getByRole("dialog", { name: "Disconnect Rose's tablet?" }) };
  }
  it("starts unchecked and returns focus on cancellation without revoking", () => {
    const { trigger, dialog } = open(); expect(within(dialog).getByRole("checkbox")).not.toBeChecked();
    expect(within(dialog).getByRole("button", { name: "Disconnect Device" })).toBeDisabled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" })); expect(trigger).toHaveFocus(); expect(fake.revoke).not.toHaveBeenCalled();
  });
  it("requires confirmation and announces success", async () => {
    fake.revoke.mockResolvedValue({ ok: true, data: { done: true } }); const { dialog } = open();
    fireEvent.click(within(dialog).getByRole("checkbox")); fireEvent.click(within(dialog).getByRole("button", { name: "Disconnect Device" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Device disconnected.");
    await waitFor(() => expect(screen.getByRole("status")).toHaveFocus());
    expect(fake.revoke).toHaveBeenCalledWith({ deviceId: "test-device", confirmed: true });
  });
  it("keeps the dialog open with safe failure feedback", async () => {
    fake.revoke.mockResolvedValue({ ok: false, error: { message: "Try again." } }); const { dialog } = open();
    fireEvent.click(within(dialog).getByRole("checkbox")); fireEvent.click(within(dialog).getByRole("button", { name: "Disconnect Device" }));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Try again."); expect(dialog).toBeVisible();
  });
});
