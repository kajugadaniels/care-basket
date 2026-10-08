import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deviceIds, deviceTestNow, makePairingReview } from "@/test/factories/devices";
const fake = vi.hoisted(() => ({ approve: vi.fn(), reject: vi.fn() }));
vi.mock("../../actions", () => ({ approvePairingAction: fake.approve, rejectPairingAction: fake.reject }));
import { ApprovalReview } from "./ApprovalReview";
const review = makePairingReview();
describe("explicit manager device review", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.spyOn(Date, "now").mockReturnValue(deviceTestNow.getTime()); });
  afterEach(() => vi.restoreAllMocks());
  it("requires profile choice, label, and a deliberate confirmation", async () => {
    fake.approve.mockResolvedValue({ ok: true, data: { done: true } });
    render(<ApprovalReview review={review} profiles={[{ id: deviceIds.profile, displayName: "Rose" }]} />);
    const approve = screen.getByRole("button", { name: "Approve Connection" }); expect(approve).toBeDisabled(); expect(fake.approve).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole("combobox", { name: "Family member" }), { target: { value: deviceIds.profile } });
    fireEvent.change(screen.getByRole("textbox", { name: "Device label" }), { target: { value: "Rose's tablet" } });
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(approve);
    await waitFor(() => expect(fake.approve).toHaveBeenCalledWith({ pairingId: review.pairingId,
      reviewTicket: review.reviewTicket, expiresAt: review.expiresAt, profileId: deviceIds.profile, label: "Rose's tablet", confirmed: true }));
    expect(await screen.findByRole("status")).toHaveTextContent("Approved");
  });
  it("does not preselect a forged profile and preserves input on server failure", async () => {
    fake.approve.mockResolvedValue({ ok: false, error: { message: "Connection changed." } });
    render(<ApprovalReview review={review} profiles={[{ id: deviceIds.profile, displayName: "Rose" }]} preselected={deviceIds.otherFamily} />);
    expect(screen.getByRole("combobox")).toHaveValue("");
    fireEvent.change(screen.getByRole("textbox", { name: "Device label" }), { target: { value: "Tablet" } });
    fireEvent.click(screen.getByRole("checkbox")); fireEvent.click(screen.getByRole("button", { name: "Approve Connection" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection changed");
    expect(screen.getByRole("textbox", { name: "Device label" })).toHaveValue("Tablet");
  });
  it("supports rejection without an accidental approval", async () => {
    fake.reject.mockResolvedValue({ ok: true, data: { done: true } });
    render(<ApprovalReview review={review} profiles={[]} />); fireEvent.click(screen.getByRole("button", { name: "Reject Connection" }));
    expect(await screen.findByRole("status")).toHaveTextContent("rejected"); expect(fake.approve).not.toHaveBeenCalled();
  });
});
