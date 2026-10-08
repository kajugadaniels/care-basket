import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const fake = vi.hoisted(() => ({ start: vi.fn() }));
vi.mock("../../actions", () => ({ startPairingAction: fake.start }));
vi.mock("../PairingWaiting/PairingWaiting", () => ({ PairingWaiting: ({ pairing }: { pairing: { code: string } }) => <output aria-label="Your connection code">{pairing.code}</output> }));
import { ConnectDevice } from "./ConnectDevice";
describe("requester device connection", () => {
  beforeEach(() => vi.resetAllMocks());
  it("starts only after the person's deliberate click and then displays their code", async () => {
    fake.start.mockResolvedValue({ ok: true, data: { code: "000042", expiresAt: "2026-10-08T12:10:00Z" } });
    render(<ConnectDevice />);
    expect(fake.start).not.toHaveBeenCalled(); expect(screen.getByRole("heading", { name: "Connect your device" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Connect This Device" }));
    expect(await screen.findByLabelText("Your connection code")).toHaveTextContent("000042");
    expect(fake.start).toHaveBeenCalledWith({});
  });
  it("offers a calm error and never recreates pairing automatically", async () => {
    fake.start.mockResolvedValue({ ok: false, error: { message: "Please wait before trying again." } });
    render(<ConnectDevice />); fireEvent.click(screen.getByRole("button", { name: "Connect This Device" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Please wait"); expect(fake.start).toHaveBeenCalledTimes(1);
  });
});
