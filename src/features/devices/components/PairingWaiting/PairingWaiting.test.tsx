import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ status: "PENDING", error: false, expiring: false, complete: vi.fn() }));
vi.mock("../../actions", () => ({ completePairingAction: fake.complete }));
vi.mock("../../hooks/use-pairing-status", () => ({ usePairingStatus: () => ({ status: fake.status, hasError: fake.error, isExpiring: fake.expiring }) }));
import { PairingWaiting } from "./PairingWaiting";
const pairing = { code: "000042", expiresAt: "2026-10-08T12:10:00Z" };
describe("accessible pairing waiting states", () => {
  beforeEach(() => { fake.status = "PENDING"; fake.error = false; fake.expiring = false; fake.complete.mockReset(); });
  it("groups the code visually and reads all six digits including zeros", () => {
    render(<PairingWaiting pairing={pairing} onRestart={vi.fn()} />);
    expect(screen.getByLabelText("Your connection code: 0 0 0 0 4 2")).toHaveTextContent("000 042");
    expect(screen.getByText(/Tell your family member this code/)).toBeInTheDocument(); expect(fake.complete).not.toHaveBeenCalled();
  });
  it.each(["EXPIRED", "REJECTED"])("offers a fresh code after %s without automatic restarting", (status) => {
    fake.status = status; const restart = vi.fn(); render(<PairingWaiting pairing={pairing} onRestart={restart} />);
    expect(screen.getByRole("button", { name: "Get a New Code" })).toBeInTheDocument(); expect(restart).not.toHaveBeenCalled();
  });
  it("completes approval separately and once, with safe retry feedback", async () => {
    fake.status = "APPROVED"; fake.complete.mockResolvedValue({ ok: false, error: { message: "Try again." } });
    render(<PairingWaiting pairing={pairing} onRestart={vi.fn()} />);
    await waitFor(() => expect(fake.complete).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("alert")).toHaveTextContent("Try again."); expect(screen.getByRole("button", { name: "Try Again" })).toBeInTheDocument();
  });
  it("shows a way back home after completed polling", () => {
    fake.status = "COMPLETED"; render(<PairingWaiting pairing={pairing} onRestart={vi.fn()} />);
    expect(screen.getByRole("link", { name: "Open My CareBasket" })).toHaveAttribute("href", "/shop"); expect(fake.complete).not.toHaveBeenCalled();
  });
});
